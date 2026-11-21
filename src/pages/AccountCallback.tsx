import { SHOPIFY_CUSTOMER_AUTH_ENABLED } from '@/customer/config';
import { CustomerBoundary, CustomerCallback, HostedCustomerAccount } from '@/customer/CustomerPages';

export default function AccountCallback() {
  return SHOPIFY_CUSTOMER_AUTH_ENABLED ? <CustomerBoundary><CustomerCallback /></CustomerBoundary> : <HostedCustomerAccount />;
}
