/** Read-only capability assessment; it neither calls Sendcloud nor creates Shopify rates. */
export function assessSendcloud({ shop, applications, carrierServices, accountConnectionVerified = false, checkoutMechanism = 'unresolved' }) {
  if (shop?.myshopifyDomain !== 'ecom-blueprint-gen-6ud1s.myshopify.com') throw new Error('WRONG_SHIPPING_STORE');
  if (applications?.pageInfo?.hasNextPage !== false || carrierServices?.pageInfo?.hasNextPage !== false) throw new Error('INCOMPLETE_SENDCLOUD_AUDIT');
  const installed = applications.nodes.some(row => row.app.handle === 'sendcloud');
  const dynamicCheckoutInstalled = applications.nodes.some(row => row.app.handle !== 'sendcloud' && /sendcloud/i.test(row.app.title) && /dynamic.*checkout|checkout.*dynamic/i.test(row.app.title));
  const blockers = [];
  if (!installed) blockers.push('SENDCLOUD_NOT_INSTALLED');
  if (!accountConnectionVerified) blockers.push('SENDCLOUD_ACCOUNT_CONNECTION_UNVERIFIED');
  if (checkoutMechanism === 'unresolved') blockers.push('CHECKOUT_MECHANISM_UNRESOLVED');
  if (checkoutMechanism === 'sendcloud_dynamic_checkout') {
    if (shop.plan?.shopifyPlus !== true) blockers.push('SENDCLOUD_DYNAMIC_CHECKOUT_REQUIRES_SHOPIFY_PLUS');
    if (!dynamicCheckoutInstalled) blockers.push('SENDCLOUD_DYNAMIC_CHECKOUT_APP_NOT_INSTALLED');
    // Being eligible or installed never demonstrates an approved complete cart/geography configuration.
    blockers.push('SENDCLOUD_DYNAMIC_CHECKOUT_CONFIGURATION_AND_MIXED_CARTS_UNVERIFIED');
  } else if (checkoutMechanism !== 'unresolved') blockers.push('CHECKOUT_MECHANISM_REQUIRES_SEPARATE_EVIDENCE_AND_APPROVAL');
  return {
    status: 'BLOCKED', logisticsPlatform: 'sendcloud', installed, accountConnectionVerified,
    shopifyPlan: shop.plan?.publicDisplayName, dynamicCheckoutInstalled,
    documentedDynamicCheckoutEligibleOnShopifyPlan: shop.plan?.shopifyPlus === true,
    shippingRulesSetCustomerCheckoutPrice: false,
    registeredCarrierServiceCount: carrierServices.nodes.length,
    carrierSelectionRequiredForTariffEngineDesign: false,
    customerPriceSource: 'approved_fixed_AB_tables', blockers,
  };
}
