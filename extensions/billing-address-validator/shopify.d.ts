import '@shopify/ui-extensions';

//@ts-ignore
declare module './src/Checkout.tsx' {
  const shopify: import('@shopify/ui-extensions/purchase.checkout.payment-method-list.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/validation.ts' {
  const shopify: import('@shopify/ui-extensions/purchase.checkout.payment-method-list.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}
