export const customerAuthEnabled = (value: unknown) => value === 'true';
export const SHOPIFY_CUSTOMER_AUTH_ENABLED = customerAuthEnabled(import.meta.env?.VITE_SHOPIFY_CUSTOMER_AUTH_ENABLED);
// Verified on the merchant's CustomerAccountsV2 configuration. Public destination.
export const hostedCustomerAccount = 'https://shopify.com/102600966484/account';
export interface CustomerConfig { storefront: string; issuer: string; clientId: string; origin: string }
export function readCustomerConfig(): CustomerConfig {
  const storefront = import.meta.env.VITE_SHOPIFY_CUSTOMER_STOREFRONT;
  const issuer = import.meta.env.VITE_SHOPIFY_CUSTOMER_ISSUER;
  const clientId = import.meta.env.VITE_SHOPIFY_CUSTOMER_CLIENT_ID;
  const origin = window.location.origin;
  if (!SHOPIFY_CUSTOMER_AUTH_ENABLED || !storefront || !issuer || !clientId || !origin.startsWith('https://')) throw new Error('CUSTOMER_CONFIG');
  for (const value of [storefront, issuer]) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('CUSTOMER_CONFIG');
  }
  if (new URL(storefront).origin !== storefront) throw new Error('CUSTOMER_CONFIG');
  return { storefront, issuer, clientId, origin };
}
