// Customer Account API only: identity is determined by the access token, never a search.
export const CUSTOMER_QUERY = `query OnlineGardenCustomer($after: String) {
  customer {
    id firstName lastName emailAddress { emailAddress }
    orders(first: 20, after: $after, reverse: true) {
      nodes { id name processedAt totalPrice { amount currencyCode } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;
export interface CustomerData {
  id: string; firstName: string | null; lastName: string | null;
  emailAddress: { emailAddress: string } | null;
  orders: { nodes: { id: string; name: string; processedAt: string; totalPrice: { amount: string; currencyCode: string } }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
}
