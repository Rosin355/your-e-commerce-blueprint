import { SHOPIFY_CUSTOMER_AUTH_ENABLED } from '@/customer/config';
import { CustomerBoundary, CustomerAccount, HostedCustomerAccount } from '@/customer/CustomerPages';

export default function Account() {
  return SHOPIFY_CUSTOMER_AUTH_ENABLED ? <CustomerBoundary><CustomerAccount /></CustomerBoundary> : <HostedCustomerAccount />;
}
