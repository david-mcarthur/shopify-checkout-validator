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

The country and character policies are defined in
`extensions/billing-address-validator/src/validation.ts`:

```ts
const ALLOWED_COUNTRY = "AU";
const UNSUPPORTED_CHARACTER_PATTERN = /[^\x20-\x7E]/;
```

Use an ISO 3166-1 alpha-2 country code, update all corresponding copy, and rerun
the complete checkout test matrix after changing the rule. The character policy
allows printable ASCII only, so accented letters, smart punctuation, and all
non-Latin scripts are intentionally rejected.

## Production note

This repository is appropriate for a synthetic-data Shopify Plus test store.
Before production use, review the residual risks in the programmer manual,
migrate the web app to Shopify's current React Router template, replace the
deprecated buyer-journey interceptor with a cart and checkout validation
function, and use durable shared session storage.
