import { SHOPIFY_CUSTOMER_AUTH_ENABLED } from '@/customer/config';
import { CustomerBoundary, CustomerAuth, HostedCustomerAccount } from '@/customer/CustomerPages';

export default function Auth() {
  return SHOPIFY_CUSTOMER_AUTH_ENABLED ? <CustomerBoundary><CustomerAuth /></CustomerBoundary> : <HostedCustomerAccount />;
}
