# Billing Address Blocker

A Shopify embedded app and checkout UI extension that restricts checkout to
Australian billing addresses entered with printable ASCII characters.

## Manuals

- [Programmer manual](docs/PROGRAMMER_MANUAL.md): architecture, request flow,
   source modules, checkout algorithm, database, configuration, security model,
   build commands, limitations, and maintenance.
- [Test store setup manual](docs/TEST_STORE_SETUP.md): Dev Dashboard-first app
   creation, Plus test-store setup, secure local configuration, extension
   activation, test matrix, deployment, troubleshooting, and GitHub safety checks.

## How it works

The checkout extension mounts at
`purchase.checkout.payment-method-list.render-after`, reads the billing address,
and requests that Shopify block buyer progression for explicit non-`AU`
addresses or non-ASCII address characters. It also displays a critical banner
explaining how to continue.

The merchant must enable **Allow app to block checkout** in the checkout editor.
Without that permission, Shopify reports that progress cannot be blocked and the
extension fails open.

The embedded Remix app is a read-only status dashboard. It does not perform the
checkout validation.

## Technology

- Checkout UI Extensions API `2026-07`
- Preact and Shopify Polaris web components
- Remix 2, Vite, React, and Polaris for the Admin dashboard
- Shopify App Remix authentication
- Prisma session storage with SQLite for local development

## Local verification

Install both dependency trees:

```powershell
npm ci
npm ci --prefix extensions/billing-address-validator
```

Run static and production checks:

```powershell
npm test
npm run typecheck
npm run build
npx shopify app build
```

For a real test-store setup, follow the
[test store setup manual](docs/TEST_STORE_SETUP.md). Do not add real credentials
to tracked files.

## Rule customization

The **allowed countries** are set per store by the merchant in the checkout
editor, under this extension's settings. The value is a comma-separated list
of ISO 3166-1 alpha-2 codes (for example `AU` or `AU,NZ`). If left blank the
extension defaults to `AU`.

Character policy and defaults live in
`extensions/billing-address-validator/src/validation.ts`:

```ts
export const DEFAULT_ALLOWED_COUNTRIES: readonly string[] = ["AU"];
const UNSUPPORTED_CHARACTER_PATTERN = /[^\x20-\x7E]/;
```

The character policy allows printable ASCII only, so accented letters, smart
punctuation, and all non-Latin scripts are intentionally rejected. To display
a friendlier name for a country in the block/banner copy, add its ISO code to
the `COUNTRY_NAMES` map in the same file; unknown codes fall back to the raw
code. Rerun the checkout test matrix after changing the character rule or the
country name map.

## Production note

This repository is appropriate for a synthetic-data Shopify Plus test store.
Before production use, review the residual risks in the programmer manual,
migrate the web app to Shopify's current React Router template, replace the
deprecated buyer-journey interceptor with a cart and checkout validation
function, and use durable shared session storage.
