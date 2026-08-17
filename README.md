# Billing Address Blocker — Shopify Custom App

A Shopify embedded custom app that restricts checkout to **Australian billing addresses only**.

---

## Architecture

```
billing-address-blocker/
├── app/                          # Remix app (admin dashboard)
│   ├── routes/
│   │   ├── app._index.tsx        # Main dashboard page
│   │   ├── app.tsx               # App shell
│   │   ├── auth.$.tsx            # Auth handler
│   │   └── _index.tsx            # Root redirect
│   ├── shopify.server.ts         # Shopify app config
│   ├── db.server.ts              # Prisma client
│   └── root.tsx                  # HTML root
├── extensions/
│   └── billing-address-validator/
│       ├── src/
│       │   └── Checkout.tsx      # ← Core validation logic
│       ├── shopify.extension.toml
│       └── package.json
├── prisma/
│   └── schema.prisma
├── shopify.app.toml
├── vite.config.ts
└── package.json
```

## How the validation works

The `extensions/billing-address-validator/src/Checkout.tsx` extension:

1. Mounts at `purchase.checkout.billing-address.render-after`
2. Reads the billing address country via `useBillingAddress()`
3. If the country is **not `AU`**, it:
   - Renders a red error `<Banner>` explaining the restriction
   - Uses `useBuyerJourneyIntercept` to **block checkout progression** server-side
4. Once the customer changes the country to **Australia**, the error clears automatically

---

## Setup

### 1. Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Shopify CLI 3](https://shopify.dev/docs/apps/tools/cli): `npm install -g @shopify/cli`
- A [Shopify Partner account](https://partners.shopify.com/)
- A development store with **checkout extensibility enabled**

### 2. Create the app in Partner Dashboard

1. Go to [partners.shopify.com](https://partners.shopify.com) → Apps → Create app
2. Choose **Custom app**
3. Copy the **API key** and **API secret**

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment

```bash
cp .env.example .env
# Edit .env with your API key and secret
```

### 5. Set up the database

```bash
npx prisma migrate dev --name init
```

### 6. Run the app (local dev)

```bash
shopify app dev
```

This will:
- Start a Cloudflare tunnel
- Launch the Remix dev server
- Hot-reload the checkout extension in your dev store

### 7. Enable the extension in your theme

In your Shopify admin: **Online Store → Themes → Customize → Checkout → Add app block** → select **Billing Address Validator**.

---

## Deploying

```bash
shopify app deploy
```

---

## Customisation

To change the allowed country, edit `extensions/billing-address-validator/src/Checkout.tsx`:

```ts
const ALLOWED_COUNTRY = "AU";        // ISO 3166-1 alpha-2 code
const ALLOWED_COUNTRY_NAME = "Australia";
```
