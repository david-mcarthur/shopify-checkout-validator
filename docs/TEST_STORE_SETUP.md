# Test Store Setup and Validation Manual

## 1. What this manual covers

This manual sets up Billing Address Blocker on a Shopify test store by creating
the app in Shopify Dev Dashboard first, linking this repository second, and
testing the checkout rule before releasing an app version.

Use a development/sandbox store containing synthetic data only. Do not begin on
a live merchant store.

## 2. Safety decision

The repository is suitable for a Plus test store with the limitations listed
below.

### Safe properties verified in the repository

- No real API key, app secret, access token, password, private key, or GitHub
  token is embedded in tracked source.
- `.env` is ignored by Git.
- `.shopify/` CLI state is ignored by Git.
- SQLite database and journal files are ignored by Git.
- Build output and generated extension manifests are ignored by Git.
- The checkout extension has `network_access = false`.
- The app currently requests no Admin API scopes.
- The dashboard no longer queries the shop owner's email.
- The checkout extension dependency audit reports zero vulnerabilities.
- The extension and Admin API configurations use supported version `2026-07`.

### Residual test-only limitations

- The Remix 2 dashboard inherits npm advisories from React Router 6 and
  `turbo-stream`. The high-severity Single Fetch advisory does not apply because
  Single Fetch is not enabled. Current routes do not accept attacker-controlled
  navigation targets or manually hydrate attacker-controlled errors. Keep this
  app on a synthetic test store until the web app is migrated to Shopify's
  current React Router template.
- Checkout blocking uses the deprecated buyer-journey interceptor. It blocks
  only when the merchant grants `block_progress` and Shopify reports
  `canBlockProgress = true`.
- An empty billing country is allowed so checkout can initialize normally.
- The dashboard labels describe repository configuration; they are not live
  deployment or capability checks.

Do not treat a successful test as production authorization. Production should
also migrate validation to a cart and checkout validation function and use a
durable shared database.

## 3. Never expose or commit these values

Never place any of the following in source, screenshots, issue comments, chat,
or Git commits:

- Shopify client secret.
- Admin API access token or Storefront access token.
- OAuth authorization code, refresh token, session token, cookie, or HMAC.
- Contents of the local SQLite session database.
- Production database credentials.
- Cloudflare tunnel credentials.
- GitHub personal access token, SSH private key, or deployment token.
- `.env` contents.

The Shopify client ID is public and can appear in a linked Shopify TOML config.
The app handle, extension handle, scopes, and public HTTPS URLs are also
non-secret configuration.

Before every push, run the safety checks in section 15.

## 4. Prerequisites

### Shopify access

You need:

1. A Shopify organization account with app-development permission.
2. Access to https://dev.shopify.com/dashboard.
3. A Shopify Plus development store or Plus sandbox store.
4. Permission to install apps and customize checkout on that store.
5. At least one test product with an available variant.

The extension target is in the payment step. Checkout UI extensions on the
information, shipping, and payment pages require Shopify Plus for live-store
use. A Plus test store is therefore the correct test environment.

### Local software

- Windows PowerShell 5.1 or newer.
- Git.
- Node.js 20 or 22 LTS. The package permits Node `>=18.20.0`, but an LTS release
  is preferred over experimental/current Node releases.
- npm.
- A current Shopify CLI, supplied by this repository's dev dependency.

Confirm tools:

```powershell
node --version
npm --version
npx shopify version
git --version
```

## 5. Create or select a Plus test store

This step happens in Shopify Dev Dashboard before linking the repository.

1. Open https://dev.shopify.com/dashboard and select the correct organization.
2. Open **Stores**.
3. Create a development store or Plus sandbox store, or select an existing one.
4. Choose Shopify Plus capabilities when the store-creation form offers plan or
   feature options.
5. Open the store admin and confirm the store has checkout customization under
   **Settings > Checkout**.
6. Create a simple test product and make one variant available to the Online
   Store sales channel.
7. Record the permanent `your-store.myshopify.com` domain. Do not use a custom
   storefront domain in CLI commands.

If the store cannot customize the payment step or does not expose app checkout
extensions, stop and obtain a Plus-enabled development/sandbox store.

## 6. Create the app in Dev Dashboard

1. In Dev Dashboard, open **Apps**.
2. Select **Create app** and choose the Dev Dashboard workflow.
3. Name the test app, for example `billing-address-blocker-dev`.
4. Create the app.
5. Open the app's **Settings** page.
6. Record the **Client ID**. This value is public.
7. Do not paste the client secret into any tracked file.

### Distribution warning

Choose distribution deliberately. Custom distribution can be irreversible and
can restrict where the app may be installed. This code currently configures the
server SDK for App Store distribution. For a test app, keep the Dev Dashboard
app unreleased and install it only on the selected development store until the
final distribution model is decided.

### Enable protected customer fields

Shopify treats names, street addresses, postcodes, and phone numbers as Level 2
protected customer data. Complete these steps before testing the character rule:

1. Select the intended app distribution method; Shopify requires this before
  protected-data access can be configured.
2. Open the app's **API access requests** or **Protected customer data** page.
3. Select protected customer data and the **Name**, **Address**, and **Phone**
  fields, stating that they are processed transiently to validate checkout.
4. Complete the requested data-protection details and save.

For an app installed only on development stores, Shopify allows development
access after the fields are selected; app-review submission is not required.
The extension does not store or transmit these address values. If Shopify does
not expose a field, the extension cannot validate that field, so confirm every
field in the test matrix rather than assuming access from a successful build.

## 7. Prepare the local repository

From the repository root:

```powershell
npm ci
npm ci --prefix extensions/billing-address-validator
```

There are two lockfiles because the Remix app and extension have independent
dependency trees. Install both.

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

For Shopify CLI development, the minimum local value normally needed is:

```dotenv
DATABASE_URL="file:dev.sqlite"
```

`shopify app dev` injects the client ID, client secret, tunnel URL, scopes, and
ports into the web process. Leave placeholder credential values out of `.env`
unless a non-CLI local workflow specifically requires them.

## 8. Link the repository to the Dev Dashboard app

Authenticate interactively:

```powershell
npx shopify auth login
```

Link using the public Client ID recorded earlier:

```powershell
npx shopify app config link --client-id YOUR_DEV_APP_CLIENT_ID
```

Important behavior:

- Linking can update `shopify.app.toml` or create/select a named app config.
- Review the resulting diff before committing it.
- A client ID is safe to commit.
- A client secret is not safe to commit.
- Never manually add a token to a Git remote URL.

Inspect the active app configuration without printing secret values into issue
logs:

```powershell
npx shopify app info
```

For separate development and production apps, use named configuration files
such as `shopify.app.development.toml` and select one explicitly with Shopify
CLI. Review every named configuration before committing it.

## 9. Initialize the local database

Generate Prisma Client:

```powershell
npm run setup
```

Create/update the local SQLite schema:

```powershell
npx prisma db push
```

### Corporate TLS troubleshooting

On this machine, Prisma engine download failed because the TLS chain contains a
self-signed corporate certificate. The safe fix is to export the organization's
trusted CA certificate and configure Node to use it, for example:

```powershell
$env:NODE_EXTRA_CA_CERTS = "C:\path\to\company-root-ca.pem"
npm run setup
```

Obtain the CA file from your IT/security team. Do not disable TLS validation and
do not set `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## 10. Run preflight checks

Run:

```powershell
npm run typecheck
npm run build
npx shopify app build
npm audit --omit=dev
npm audit --omit=dev --prefix extensions/billing-address-validator
```

Expected results for the current repository:

- Typecheck succeeds for the Remix and extension TypeScript projects.
- Remix production build succeeds.
- Shopify CLI bundles the checkout extension.
- Extension production audit reports zero vulnerabilities.
- Root audit reports inherited Remix 2 advisories described in section 2.

Do not use `npm audit fix --force` blindly. It can downgrade or replace the
framework with incompatible versions. Treat framework migration as a planned,
tested change.

## 11. Start local development

Start Shopify CLI and identify the store by its MyShopify domain:

```powershell
npm run dev -- --store your-store.myshopify.com
```

Shopify CLI should:

1. Read `shopify.app.toml` and `shopify.web.toml`.
2. Start the Remix Vite process.
3. Start a secure development tunnel.
4. Build and watch the checkout extension.
5. Prompt to install/update the app on the selected test store.
6. Provide Dev Console, app preview, and checkout preview links.

Keep this terminal running during tests. Development URLs and extension bundles
exist only while the dev session is active.

If CLI prompts for a login or store selection, complete the prompt in the
terminal. Never send passwords, one-time codes, secrets, or tokens through chat.

## 12. Install and enable checkout blocking

After CLI installs the app:

1. Open the Plus test store admin.
2. Go to **Settings > Checkout**.
3. Under checkout configurations, customize the active test configuration.
4. Navigate to the payment page/section.
5. Locate **Billing Address Validator** in the Apps area.
6. Select the extension.
7. Under **Checkout behavior**, enable **Allow app to block checkout**.
8. Confirm the permission prompt.
9. Save the checkout configuration.

The TOML setting `block_progress = true` only requests the capability. The
merchant/editor setting grants it. Without the grant, the invalid-address banner
can render but checkout progression is allowed.

If Shop Pay is part of the test matrix, enable the extension for express
checkouts where the editor provides that option.

## 13. Execute the checkout test matrix

Add the test product to cart and open checkout. Use only test customer details.

| Test | Billing details | Expected result |
| --- | --- | --- |
| Initial state | No billing address yet | No blocker; checkout can initialize. |
| Allowed | Australia; printable English characters | No critical banner; progression allowed. |
| Blocked NZ | New Zealand | Critical banner; progression blocked. |
| Blocked US | United States | Critical banner; progression blocked. |
| Unsupported script | Australia; non-ASCII characters in a name, company, street, city, postcode, province, or phone field | English-character banner; progression blocked. |
| Accented Latin | Australia; a character such as `é` | English-character banner; progression blocked. |
| Corrected | Invalid country or characters corrected | Banner clears; progression allowed. |
| Permission disabled | Invalid billing details | Banner can appear, but progression is not guaranteed to block. |
| Same as shipping | Invalid shipping address reused for billing | Confirm billing hook receives the values and blocks. |
| Different billing | Explicit invalid billing address | Confirm block and message. |
| Browser navigation | Back/forward after invalid address | Rule remains effective on next progress attempt. |
| Accelerated checkout | Shop Pay/nonstandard path | Confirm billing details become available and the rules cannot be bypassed. |

Run applicable cases in one-page and three-page checkout configurations. The
extension target is in the payment section, so the banner may not appear until
that part of checkout is rendered.

### Test payment setup

To complete a test order, use Shopify Payments test mode or a supported test
payment provider on the development store. Never enter a real card into a test
workflow.

## 14. Deploy an app version for persistent extension testing

Local `shopify app dev` is temporary. To create a Shopify-hosted extension
version without immediately releasing it:

```powershell
npx shopify app deploy --no-release
```

Review the generated version in **Dev Dashboard > Apps > your app > Versions**.
Confirm:

- API version is `2026-07`.
- Target is `purchase.checkout.payment-method-list.render-after`.
- `block_progress` is requested.
- No unexpected scopes are requested.
- No secret appears in configuration.

Release only after review using Dev Dashboard or the CLI command shown for that
version. Reopen the checkout editor after release, confirm the extension is
active and blocking permission remains enabled, then rerun the full test matrix.

`shopify app deploy` deploys app configuration and extensions. It does not host
the Remix server. A persistent Admin dashboard also requires HTTPS web hosting,
runtime secrets, and persistent session storage. Local CLI hosting is sufficient
for this manual's test-store workflow.

## 15. GitHub safety checks

Run these from the repository root before staging:

```powershell
git status --short
git diff --check
git diff -- .gitignore .env.example shopify.app.toml
git ls-files .env .shopify "*.db" "*.db-journal"
```

The last command should print nothing.

Search tracked and untracked source for credential patterns. Review matches; do
not paste secret matches into chat or logs:

```powershell
git grep -n -I -E "(shpat_|shpca_|github_pat_|ghp_|BEGIN .*PRIVATE KEY)"
```

Also verify:

- `.env` is not staged.
- `.shopify/` is not staged.
- No SQLite file is staged.
- No generated build or extension manifest is staged.
- Shopify TOML files contain no client secret or token.
- Git remote URLs contain no username/password/token credential material.
- Manuals contain placeholders, not real store/customer credentials.

Stage only reviewed files, inspect `git diff --cached`, then commit and push.

## 16. Troubleshooting

### Extension does not appear

Check:

- The store is Plus-enabled.
- The app is linked to and installed on the intended store.
- `shopify app dev` is still running.
- Shopify CLI reports a successful extension build.
- You are viewing the payment section.
- The active checkout configuration includes the app extension.

### Banner appears but checkout continues

Enable **Allow app to block checkout** under Checkout behavior, save the active
configuration, and retry. The code intentionally allows progression when
`canBlockProgress` is false.

### Billing address remains empty

Proceed far enough for payment/billing controls to initialize. Test both billing
same-as-shipping and a separate billing address. Accelerated wallets can expose
billing data at different points.

### Admin dashboard fails but checkout extension works

The runtimes are independent. Check the Remix terminal, tunnel URL, app install,
`DATABASE_URL`, Prisma schema, and Shopify authentication environment.

### Prisma engine download fails

Install/configure the trusted corporate CA using `NODE_EXTRA_CA_CERTS`. Do not
disable certificate verification.

### Shopify CLI rejects API version

Run `npx shopify version`, update Shopify CLI and extension packages together,
and use one of Shopify's last four stable checkout extension versions. This
repository currently targets `2026-07`.

### App requests unexpected permissions

The checked-in app scope list is empty. If Dev Dashboard shows old scopes,
deploy/link the latest configuration and reinstall or approve the updated app
permissions. Do not add order/customer scopes merely to make installation pass.

## 17. Exit criteria

The test-store setup is complete only when all are true:

- App and extension builds pass.
- The app is installed on the intended Plus test store.
- The dashboard opens inside Shopify Admin.
- The extension appears in the payment section.
- Blocking permission is enabled and saved.
- AU billing allows progression.
- At least two non-AU countries are blocked.
- Non-ASCII characters in each available billing field are blocked.
- Correcting the country and unsupported characters clears the problem.
- Permission-disabled behavior is understood and recorded.
- No secret or session database is staged in Git.
- The linked app version/configuration has been reviewed in Dev Dashboard.

## 18. Official references

- Dev Dashboard: https://dev.shopify.com/dashboard
- App configuration: https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration
- App structure: https://shopify.dev/docs/apps/build/cli-for-apps/app-structure
- Test checkout extensions: https://shopify.dev/docs/apps/build/checkout/test-checkout-ui-extensions
- Checkout capabilities: https://shopify.dev/docs/apps/build/checkout/capabilities
- Deploy app versions: https://shopify.dev/docs/apps/launch/deployment/app-versions
- API versioning: https://shopify.dev/docs/api/usage/versioning