# Billing Address Blocker Programmer Manual

## 1. Purpose and scope

Billing Address Blocker is a Shopify embedded app with a checkout UI extension.
Its current business rule is:

> Allow checkout progression when the billing country is Australia (`AU`) or
> has not been entered yet. Block progression when an explicit non-Australian
> billing country is present and Shopify has granted blocking permission.

The repository contains two separate runtimes:

1. A Remix web application rendered inside Shopify Admin.
2. A sandboxed checkout UI extension rendered by Shopify Checkout.

The checkout extension enforces the rule. The Remix application is an
authenticated, read-only status dashboard. The extension does not call the
Remix server, and the Remix server does not participate in checkout validation.

## 2. System architecture

```text
Shopify Admin
    |
    | authenticated embedded request
    v
Remix application
    |-- Shopify Admin GraphQL API (shop metadata only)
    `-- Prisma session storage -> local SQLite database

Shopify Checkout
    |
    | purchase.checkout.payment-method-list.render-after
    v
Checkout UI extension sandbox
    |-- reads billing address signal
    |-- renders Polaris web components
    `-- intercepts buyer progression when permission is granted
```

These runtimes are built together by Shopify CLI but execute independently.
An outage of the Remix dashboard does not make the checkout extension call the
server. Conversely, a healthy dashboard does not prove that the extension is
deployed, active, or permitted to block checkout.

## 3. Repository map

| Path | Responsibility |
| --- | --- |
| `app/root.tsx` | Root HTML document, global authentication, App Bridge provider, Polaris CSS, and root error boundary. |
| `app/shopify.server.ts` | Shopify server SDK configuration, API version, authentication helpers, and Prisma session adapter. |
| `app/db.server.ts` | Creates and reuses the Prisma client. |
| `app/routes/_index.tsx` | Authenticates `/` and redirects to `/app`. |
| `app/routes/app.tsx` | Authenticated layout route for the embedded app. |
| `app/routes/app._index.tsx` | Queries store metadata and renders the dashboard. |
| `app/routes/auth.$.tsx` | Delegates `/auth/*` requests to Shopify authentication. |
| `extensions/billing-address-validator/src/Checkout.tsx` | Checkout extension entry point and country validation rule. |
| `extensions/billing-address-validator/shopify.extension.toml` | Extension API version, target, and capabilities. |
| `extensions/billing-address-validator/package.json` | Independent Preact extension dependencies. |
| `prisma/schema.prisma` | SQLite data source and Shopify session schema. |
| `shopify.app.toml` | App identity placeholders, URLs, scopes, webhooks, and build behavior. |
| `shopify.web.toml` | Tells Shopify CLI how to run and build the Remix process. |
| `vite.config.ts` | Remix/Vite plugins, tunnel-aware HMR, ports, and file-system access. |
| `.env.example` | Names the runtime variables without containing real credentials. |

## 4. Web application lifecycle

### 4.1 Shopify SDK initialization

`app/shopify.server.ts` calls `shopifyApp()` once when the server module loads.
The important options are:

- `apiKey`: read from `SHOPIFY_API_KEY`.
- `apiSecretKey`: read from `SHOPIFY_API_SECRET`.
- `apiVersion`: `ApiVersion.July26`, corresponding to Admin API `2026-07`.
- `scopes`: split from `SCOPES` when the variable is present.
- `appUrl`: read from `SHOPIFY_APP_URL`.
- `authPathPrefix`: `/auth`.
- `sessionStorage`: `PrismaSessionStorage` backed by the shared Prisma client.
- `distribution`: currently `AppDistribution.AppStore`.
- `unstable_newEmbeddedAuthStrategy`: enables Shopify's embedded authentication
  strategy based on session tokens/token exchange.

The module exports `authenticate`, `unauthenticated`, `login`, session helpers,
and boundary helpers used by Remix routes.

Do not import this module into browser-only code. It consumes the app secret and
database-backed sessions and belongs on the server.

### 4.2 Request flow

For an embedded dashboard request:

1. Shopify Admin opens the configured application URL in the embedded context.
2. The root loader in `app/root.tsx` calls `authenticate.admin(request)`.
3. The `/app` layout loader authenticates the request again.
4. The index loader in `app/routes/app._index.tsx` authenticates and receives an
   Admin GraphQL client.
5. The loader queries `shop` for name, MyShopify domain, plan display name, and
   `checkoutApiSupported`.
6. The loader serializes this non-secret store metadata to the React component.
7. Polaris components render the dashboard inside Shopify Admin.

The repeated authentication is conservative but redundant. It can be reduced
later after confirming the desired route-boundary behavior.

### 4.3 Route behavior

#### `/`

`app/routes/_index.tsx` authenticates the request and redirects to `/app`.
Unauthenticated requests are handled by the Shopify SDK rather than custom OAuth
code.

#### `/app`

`app/routes/app.tsx` is a layout route. It authenticates, renders `<Outlet />`,
and delegates errors/headers to Shopify's Remix boundary helpers.

#### `/app` index

`app/routes/app._index.tsx` is read-only. It has no Remix action and performs no
mutation. The displayed extension state is descriptive configuration, not a
live query of deployment status or checkout-editor activation.

The GraphQL response is currently assumed to contain `data.shop`. A network,
schema, or GraphQL error falls through to the route error boundary. A future
hardening change could validate `response.ok`, inspect GraphQL `errors`, and
return a dedicated dashboard error state.

#### `/auth/*`

`app/routes/auth.$.tsx` delegates to `authenticate.admin()`. Authentication and
callback details remain inside the official Shopify library.

### 4.4 Rendering and error boundaries

`app/root.tsx` creates the HTML shell, includes Polaris CSS, mounts App Bridge's
`AppProvider`, defines the Home navigation item, and renders nested routes.

Both root and app route boundaries call:

- `boundary.error(useRouteError())` to produce Shopify-compatible error output.
- `boundary.headers(headersArgs)` to preserve required response headers.

## 5. Sessions and database

### 5.1 Prisma client reuse

`app/db.server.ts` creates a new Prisma client in production. During development
it caches the client on `global.prismaGlobal`; this prevents hot reloads from
creating an unbounded number of database connections.

### 5.2 Session model

`prisma/schema.prisma` defines one model, `Session`. It stores:

- Session identity: `id`, `shop`, `state`, `isOnline`, and `expires`.
- Authorization: `scope` and `accessToken`.
- Optional Shopify user metadata: user ID, name, email, locale, ownership,
  collaborator status, and email verification.

The `accessToken` column is sensitive. SQLite database files must never be
committed, copied into documentation, or attached to support tickets.

### 5.3 SQLite limitations

SQLite is suitable for local development and a single test process. Production
hosting must provide a persistent disk. Ephemeral filesystems can erase sessions
on restart, and horizontally scaled instances should use a shared database such
as PostgreSQL instead.

There is no checked-in Prisma migration directory. A fresh development database
can be initialized with `npx prisma db push` after setting `DATABASE_URL`.

## 6. Checkout extension lifecycle

### 6.1 Registration and target

`shopify.extension.toml` declares:

- API version `2026-07`.
- Extension type `ui_extension`.
- Handle `billing-address-validator`.
- Module `./src/Checkout.tsx`.
- Target `purchase.checkout.payment-method-list.render-after`.
- Capability `block_progress = true`.
- `network_access = false`.

The static target places the UI after the payment-method list. Payment-step
checkout UI extensions require Shopify Plus on live stores and should be tested
on a Plus development or sandbox store.

The capability declaration makes blocking available for merchant approval. It
does not grant permission by itself.

### 6.2 Preact entry point

`Checkout.tsx` imports:

- `@shopify/ui-extensions/preact` to initialize the extension Preact runtime.
- The target-specific type module so TypeScript recognizes allowed Polaris web
  components such as `<s-banner>`.
- `render` from Preact.
- Billing address, buyer journey, capability, and editor hooks from
  `@shopify/ui-extensions/checkout/preact`.

The default export renders `BillingAddressValidator` into `document.body`, which
is the entry contract expected by Shopify CLI for current checkout extensions.

### 6.3 Validation algorithm

The constants are:

```ts
const ALLOWED_COUNTRY = "AU";
const ALLOWED_COUNTRY_NAME = "Australia";
```

On each reactive render:

1. `useBillingAddress()` returns the proposed billing address.
2. A missing address or country becomes an empty string.
3. `isAustralia` is true when the country is empty or exactly `AU`.
4. `useExtensionCapability("block_progress")` reports whether blocking is
   granted to the extension.
5. `useExtensionEditor()` identifies editor context.
6. `useBuyerJourneyIntercept()` registers a top-level interceptor.
7. If `canBlockProgress` is true and `isAustralia` is false, the interceptor
   returns `behavior: "block"`, a diagnostic reason, and a page-level message.
8. Otherwise it returns `behavior: "allow"`.
9. An editor-only warning appears when the merchant has not granted blocking.
10. A critical banner appears to buyers when an explicit non-AU country is set.

When the buyer changes the country, the billing-address hook updates, the
component rerenders, and the interceptor evaluates the new country on the next
progress attempt.

### 6.4 Intentional fail-open cases

The extension allows progression in these cases:

- Billing country is absent or empty.
- Shopify reports `canBlockProgress` as false.
- The merchant has not granted the block-progress capability.

The empty-country behavior avoids blocking checkout before payment/billing data
exists, but it means accelerated checkout paths require explicit testing.

The interceptor is checkout UI logic, not a Shopify Function and not server-side
validation. Shopify marks buyer-journey interception as deprecated in favor of a
cart and checkout validation function. Migrating the enforcement rule to a
Shopify Function is the recommended long-term hardening path.

## 7. Configuration reference

### 7.1 Environment variables

| Variable | Secret? | Purpose |
| --- | --- | --- |
| `SHOPIFY_API_KEY` | No | Public app client ID used by server and App Bridge. |
| `SHOPIFY_API_SECRET` | Yes | Verifies Shopify authentication and must remain server-side. |
| `SHOPIFY_APP_URL` | No | HTTPS tunnel or deployed app URL. |
| `SCOPES` | No | Comma-separated Admin API scopes. Currently empty. |
| `DATABASE_URL` | Potentially | Prisma connection string. Local SQLite path is not secret; hosted DB credentials are. |
| `SHOP_CUSTOM_DOMAIN` | No | Optional accepted custom shop domain. |
| `PORT` | No | Remix/Vite server port. |
| `FRONTEND_PORT` | No | Shopify CLI tunnel/HMR port. |

Shopify CLI injects app credentials and URL values into the web process during
`shopify app dev`. A local `.env` is still useful for `DATABASE_URL`.

### 7.2 Shopify app configuration

`shopify.app.toml` intentionally contains placeholder identity and URL values in
source control. `shopify app config link` replaces the client ID for the linked
Dev Dashboard app. The client secret must never be placed in this TOML file.

The app requests no Admin scopes because its current query only reads basic shop
metadata. Add scopes only when implementing code that requires them, and review
protected-customer-data requirements before adding order or customer access.

### 7.3 Web process configuration

`shopify.web.toml` defines one process with both frontend and backend roles:

- Development command: `npm exec remix vite:dev`.
- Build command: `npm run build`.
- Auth callback path: `/auth/callback`.

This allows `shopify app dev` to start the Remix server and supply its runtime
environment.

## 8. Build and test commands

The root and extension have separate dependency trees and lockfiles.

```powershell
npm ci
npm ci --prefix extensions/billing-address-validator
npm run typecheck
npm run build
npx shopify app build
```

`npm run typecheck` first checks the Remix project, then checks the extension
with its Preact JSX configuration.

Database setup:

```powershell
npm run setup
npx prisma db push
```

Shopify preview:

```powershell
npm run dev -- --store your-plus-dev-store.myshopify.com
```

## 9. Security model

### 9.1 Existing controls

- Admin routes call `authenticate.admin()`.
- The app secret remains in server environment variables.
- Session access tokens are stored server-side in Prisma.
- The extension has `network_access = false` and cannot call arbitrary hosts.
- No Admin API scopes are requested by the current implementation.
- The dashboard does not query the shop owner's email.
- `.env`, `.shopify`, SQLite databases, build output, and generated extension
  manifests are ignored by Git.
- Checked-in credential strings are placeholders only.

### 9.2 Residual risks

- Remix 2 currently resolves React Router 6 and `turbo-stream` packages with
  published npm advisories. The reported high-severity Single Fetch issue does
  not apply while Remix Single Fetch remains disabled. The reported navigation
  and hydration issues are not exposed by current application paths, but a
  future migration to Shopify's React Router app template should remove this
  inherited risk before production use.
- Buyer journey interception is deprecated and can fail open when permission is
  unavailable. Use a cart and checkout validation function for stronger future
  enforcement.
- The dashboard does not verify extension deployment or editor activation.
- GraphQL responses are not explicitly checked for `errors`.
- SQLite is not an appropriate default for multi-instance production hosting.

For these reasons, the current repository is appropriate for a synthetic-data
Plus test store after following the setup manual. It is not represented as a
finished production deployment.

## 10. Maintenance guide

### Change the allowed country

Update both constants in `Checkout.tsx`, update customer-facing text and
dashboard copy, then run the full typecheck/build/test matrix. Use ISO 3166-1
alpha-2 country codes.

### Update Shopify API versions

Shopify releases versions quarterly and prevents deploying checkout extensions
that target versions older than 12 months. Review and update together:

- `apiVersion` in `app/shopify.server.ts`.
- `api_version` in `shopify.app.toml`.
- `api_version` in the extension TOML.
- `@shopify/shopify-app-remix`, Shopify CLI, Prisma adapter, and
  `@shopify/ui-extensions` package versions.

Then reinstall both dependency trees and run all builds.

### Add an Admin API feature

1. Identify the exact required scope in Shopify's Admin API documentation.
2. Add only that scope to app configuration.
3. Relink/deploy the configuration and approve the scope change on the store.
4. Avoid retrieving protected customer data unless it is genuinely needed.
5. Update this manual and the setup manual.

### Production hardening backlog

1. Migrate Remix 2 to Shopify's current React Router app template.
2. Replace UI interception with a cart and checkout validation function.
3. Add automated extension behavior tests.
4. Add explicit GraphQL error handling.
5. Move production sessions to a durable shared database.
6. Add uninstall and required compliance webhook handling when distribution
   requirements call for them.

## 11. Official references

- Shopify app structure: https://shopify.dev/docs/apps/build/cli-for-apps/app-structure
- Checkout UI extensions: https://shopify.dev/docs/api/checkout-ui-extensions
- Buyer Journey API: https://shopify.dev/docs/api/checkout-ui-extensions/latest/target-apis/checkout-apis/buyer-journey-api
- API versioning: https://shopify.dev/docs/api/usage/versioning
- Admin `shop` query: https://shopify.dev/docs/api/admin-graphql/latest/queries/shop
- Test checkout UI extensions: https://shopify.dev/docs/apps/build/checkout/test-checkout-ui-extensions