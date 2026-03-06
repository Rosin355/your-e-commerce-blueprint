/**
 * Shopify Customer Account API — OAuth 2.1 PKCE (Public Client)
 *
 * Authorization & token exchange happen entirely client-side.
 * No client secret is required for public clients.
 */

const CLIENT_ID = 'c8bde26b-256c-4534-87d1-26a2a3c72bef';
const SHOP_DOMAIN = 'lovable-project-6tknn.myshopify.com';
const REDIRECT_URI = `${window.location.origin}/account/callback`;
const LOGOUT_URI = window.location.origin;

// Discover endpoints from the shop
let _discoveryCache: {
  authorization_endpoint: string;
  token_endpoint: string;
  graphql_endpoint?: string;
  end_session_endpoint?: string;
} | null = null;

async function discover() {
  if (_discoveryCache) return _discoveryCache;

  // Try OIDC discovery first
  const res = await fetch(`https://${SHOP_DOMAIN}/.well-known/openid-configuration`);
  if (res.ok) {
    _discoveryCache = await res.json();
    return _discoveryCache!;
  }

  // Fallback to customer-account-api discovery
  const res2 = await fetch(`https://${SHOP_DOMAIN}/.well-known/customer-account-api`);
  if (res2.ok) {
    const data = await res2.json();
    _discoveryCache = {
      authorization_endpoint: data.authorization_endpoint,
      token_endpoint: data.token_endpoint,
      graphql_endpoint: data.graphql_api || data.graphql_endpoint,
      end_session_endpoint: data.end_session_endpoint,
    };
    return _discoveryCache!;
  }

  throw new Error('Unable to discover Shopify Customer Account API endpoints');
}

// ─── PKCE helpers ───────────────────────────────────────────

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

function base64urlEncode(buffer: Uint8Array): string {
  let str = '';
  buffer.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(plain));
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = await sha256(verifier);
  return base64urlEncode(new Uint8Array(hash));
}

// ─── Public API ─────────────────────────────────────────────

export async function startLogin() {
  const config = await discover();

  const codeVerifier = generateRandomString(64);
  const state = generateRandomString(32);
  const nonce = generateRandomString(32);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store PKCE values for the callback
  sessionStorage.setItem('shopify_code_verifier', codeVerifier);
  sessionStorage.setItem('shopify_state', state);
  sessionStorage.setItem('shopify_nonce', nonce);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: 'openid email customer-account-api:full',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${config.authorization_endpoint}?${params}`;
}

export async function handleCallback(searchParams: URLSearchParams): Promise<{
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
}> {
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const savedState = sessionStorage.getItem('shopify_state');
  const codeVerifier = sessionStorage.getItem('shopify_code_verifier');

  if (!code) throw new Error('Missing authorization code');
  if (!state || state !== savedState) throw new Error('State mismatch — possible CSRF');
  if (!codeVerifier) throw new Error('Missing code verifier');

  const config = await discover();

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const res = await fetch(config.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  const tokens = await res.json();

  // Clean up PKCE values
  sessionStorage.removeItem('shopify_code_verifier');
  sessionStorage.removeItem('shopify_state');
  sessionStorage.removeItem('shopify_nonce');

  return tokens;
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const config = await discover();

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    refresh_token: refreshToken,
  });

  const res = await fetch(config.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
  return res.json();
}

export async function customerAccountQuery<T = any>(
  accessToken: string,
  query: string,
  variables: Record<string, any> = {},
): Promise<T> {
  const config = await discover();

  // Use discovered graphql endpoint, or fallback
  const endpoint =
    config.graphql_endpoint ||
    `https://${SHOP_DOMAIN}/account/customer/api/2025-07/graphql`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: accessToken, // Customer Account API uses raw token, NOT "Bearer"
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(`Customer API error: ${res.status}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e: any) => e.message).join(', '));
  }
  return json.data as T;
}

export async function logout() {
  const config = await discover();
  sessionStorage.removeItem('shopify_customer_token');
  sessionStorage.removeItem('shopify_refresh_token');

  if (config.end_session_endpoint) {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      post_logout_redirect_uri: LOGOUT_URI,
    });
    window.location.href = `${config.end_session_endpoint}?${params}`;
  } else {
    window.location.href = LOGOUT_URI;
  }
}

// ─── GraphQL Queries ────────────────────────────────────────

export const CUSTOMER_PROFILE_QUERY = `
  query {
    customer {
      firstName
      lastName
      emailAddress {
        emailAddress
      }
      phoneNumber {
        phoneNumber
      }
      defaultAddress {
        address1
        address2
        city
        province
        country
        zip
      }
    }
  }
`;

export const CUSTOMER_ORDERS_QUERY = `
  query($first: Int!) {
    customer {
      orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            id
            number
            processedAt
            financialStatus
            fulfillments(first: 1) {
              status
            }
            totalPrice {
              amount
              currencyCode
            }
            lineItems(first: 20) {
              edges {
                node {
                  title
                  quantity
                  image {
                    url
                    altText
                  }
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const CUSTOMER_ADDRESSES_QUERY = `
  query {
    customer {
      addresses(first: 10) {
        edges {
          node {
            id
            address1
            address2
            city
            province
            country
            zip
            firstName
            lastName
            phone
          }
        }
      }
      defaultAddress {
        id
      }
    }
  }
`;
