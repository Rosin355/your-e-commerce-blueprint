import * as oauth from 'oauth4webapi';
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from 'jose';
import type { CustomerConfig } from './config';
import { CUSTOMER_QUERY, type CustomerData } from './queries';

const SESSION = 'og.customer.session.v1';
const TRANSACTION = 'og.customer.transaction.v1';
const NOTICE = 'og.customer.logout-unconfirmed';
const FAILURE = 'Impossibile completare l’operazione. Accedi nuovamente o riprova più tardi.';
interface Session { access: string; refresh?: string; idToken: string; expires: number; subject: string; customerId: string }
interface Transaction { state: string; nonce: string; verifier: string; created: number }
export interface CustomerSnapshot { status: 'guest' | 'loading' | 'authenticated' | 'error'; customer: CustomerData | null; error: string | null }
export function createCustomerClient(config: CustomerConfig, storage: Storage, fetcher: typeof fetch = fetch, now = Date.now) {
  let session: Session | null = null;
  let epoch = 0;
  let pending: Promise<void> | undefined;
  let snapshot: CustomerSnapshot = { status: 'guest', customer: null, error: null };
  const listeners = new Set<() => void>();
  const publish = (next: CustomerSnapshot) => { snapshot = next; listeners.forEach(fn => fn()); };
  const clear = () => { epoch++; session = null; for (const key of [SESSION, TRANSACTION]) { try { storage.removeItem(key); } catch { /* memory remains cleared if storage is unavailable */ } } publish({ status: 'guest', customer: null, error: null }); };
  const fail = () => { clear(); publish({ status: 'error', customer: null, error: FAILURE }); };
  const read = async (url: string) => {
    const res = await fetcher(url, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('REQUEST');
    return res.json();
  };
  let discovery: Promise<{ as: oauth.AuthorizationServer; api: string }> | undefined;
  const endpoints = () => discovery ??= (async () => {
    const [as, api] = await Promise.all([read(config.storefront + '/.well-known/openid-configuration'), read(config.storefront + '/.well-known/customer-account-api')]);
    if (as.issuer !== config.issuer) throw new Error('ISSUER');
    // All destinations must be provisioned Shopify HTTPS endpoints, not arbitrary discovery hosts.
    for (const value of [as.authorization_endpoint, as.token_endpoint, as.jwks_uri, as.end_session_endpoint, api.graphql_api]) {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || ![new URL(config.storefront).hostname, 'shopify.com'].some(host => url.hostname === host || url.hostname.endsWith('.' + host))) throw new Error('ENDPOINT');
    }
    return { as, api: api.graphql_api as string };
  })().catch(() => { discovery = undefined; throw new Error('DISCOVERY'); });
  const client: oauth.Client = { client_id: config.clientId, id_token_signed_response_alg: 'RS256' };
  const options = { [oauth.customFetch]: fetcher, signal: () => AbortSignal.timeout(15000) };
  const verify = async (idToken: string) => {
    const { as } = await endpoints();
    const keys = await read(as.jwks_uri!);
    const result = await jwtVerify(idToken, createLocalJWKSet(keys as JSONWebKeySet), { issuer: config.issuer, audience: config.clientId, algorithms: ['RS256'], currentDate: new Date(now()), requiredClaims: ['exp', 'iat', 'sub'] });
    if (typeof result.payload.sub !== 'string') throw new Error('SUBJECT');
    return result.payload.sub;
  };
  const query = async (s: Session, after: string | null = null): Promise<CustomerData> => {
    const { api } = await endpoints();
    const response = await fetcher(api, { method: 'POST', credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json', Authorization: s.access }, body: JSON.stringify({ query: CUSTOMER_QUERY, variables: { after } }) });
    if (!response.ok) throw new Error('CUSTOMER_API');
    const body = await response.json();
    const customer = body.data?.customer as CustomerData;
    if (body.errors?.length || !customer?.id?.startsWith('gid://shopify/Customer/') || !customer.orders?.pageInfo || !Array.isArray(customer.orders.nodes) || (s.customerId && customer.id !== s.customerId)) throw new Error('IDENTITY');
    return customer;
  };
  const save = (s: Session, customer: CustomerData, generation: number) => {
    if (generation !== epoch) throw new Error('STALE');
    s.customerId = customer.id;
    storage.setItem(SESSION, JSON.stringify(s)); session = s;
    publish({ status: 'authenticated', customer, error: null });
  };
  const restore = () => pending ??= (async () => {
    const generation = epoch;
    try {
      if (session && session.expires > now() + 60000) return;
      if (storage.getItem(NOTICE)) { publish({ status: 'error', customer: null, error: 'Disconnessione Shopify non confermata. Riprova prima di lasciare un dispositivo condiviso.' }); return; }
      const raw = storage.getItem(SESSION);
      if (!raw) return;
      publish({ status: 'loading', customer: null, error: null });
      let s = JSON.parse(raw) as Session;
      if (!s.access || !s.idToken || !s.subject || !s.customerId || !Number.isFinite(s.expires)) throw new Error('SESSION');
      if (s.expires <= now() + 60000) {
        if (!s.refresh) throw new Error('LOGIN_REQUIRED');
        const { as } = await endpoints();
        const response = await oauth.refreshTokenGrantRequest(as, client, oauth.None(), s.refresh, options);
        const tokens = await oauth.processRefreshTokenResponse(as, client, response);
        const idToken = tokens.id_token ?? s.idToken;
        // An expired old ID token must not be used as renewed proof of identity.
        if (await verify(idToken) !== s.subject) throw new Error('SUBJECT');
        s = { ...s, access: tokens.access_token, refresh: tokens.refresh_token ?? s.refresh, idToken, expires: now() + Number(tokens.expires_in) * 1000 };
      } else if (await verify(s.idToken) !== s.subject) throw new Error('SUBJECT');
      if (!Number.isFinite(s.expires) || s.expires <= now()) throw new Error('EXPIRY');
      save(s, await query(s), generation);
    } catch { if (generation === epoch) fail(); }
  })().finally(() => { pending = undefined; });
  return {
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    getSnapshot: () => snapshot,
    restore,
    async login() {
      clear(); const generation = epoch;
      try {
        storage.removeItem(NOTICE);
        const { as } = await endpoints();
        const transaction: Transaction = { state: oauth.generateRandomState(), nonce: oauth.generateRandomNonce(), verifier: oauth.generateRandomCodeVerifier(), created: now() };
        const challenge = await oauth.calculatePKCECodeChallenge(transaction.verifier);
        if (generation !== epoch) throw new Error('STALE');
        storage.setItem(TRANSACTION, JSON.stringify(transaction));
        const url = new URL(as.authorization_endpoint!);
        url.search = new URLSearchParams({ client_id: config.clientId, response_type: 'code', redirect_uri: config.origin + '/account/callback', scope: 'openid email customer-account-api:full', state: transaction.state, nonce: transaction.nonce, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
        return url.href;
      } catch { if (generation === epoch) fail(); throw new Error(FAILURE); }
    },
    async callback(url: URL) {
      const generation = ++epoch;
      try {
        const raw = storage.getItem(TRANSACTION); storage.removeItem(TRANSACTION); storage.removeItem(SESSION); session = null;
        publish({ status: 'loading', customer: null, error: null });
        if (!raw || url.origin !== config.origin || url.pathname !== '/account/callback' || url.hash) throw new Error('CALLBACK');
        const tx = JSON.parse(raw) as Transaction;
        if (!tx.state || !tx.nonce || !tx.verifier || now() - tx.created > 600000 || now() < tx.created) throw new Error('TRANSACTION');
        const { as } = await endpoints();
        const params = oauth.validateAuthResponse(as, client, url, tx.state);
        const response = await oauth.authorizationCodeGrantRequest(as, client, oauth.None(), params, config.origin + '/account/callback', tx.verifier, options);
        const tokens = await oauth.processAuthorizationCodeResponse(as, client, response, { expectedNonce: tx.nonce, requireIdToken: true });
        const subject = await verify(tokens.id_token!);
        const expires = now() + Number(tokens.expires_in) * 1000;
        if (!Number.isFinite(expires) || expires <= now()) throw new Error('EXPIRY');
        const s: Session = { access: tokens.access_token, refresh: tokens.refresh_token, idToken: tokens.id_token!, subject, expires, customerId: '' };
        save(s, await query(s), generation);
      } catch { if (generation === epoch) fail(); throw new Error(FAILURE); }
    },
    async moreOrders() {
      await restore();
      const generation = epoch; const s = session; const current = snapshot.customer;
      if (!s || !current?.orders.pageInfo.hasNextPage || !current.orders.pageInfo.endCursor) return;
      try {
        const next = await query(s, current.orders.pageInfo.endCursor);
        if (next.orders.pageInfo.hasNextPage && next.orders.pageInfo.endCursor === current.orders.pageInfo.endCursor) throw new Error('CURSOR');
        save(s, { ...next, orders: { ...next.orders, nodes: [...current.orders.nodes, ...next.orders.nodes.filter(order => !current.orders.nodes.some(old => old.id === order.id))] } }, generation);
      } catch { if (generation === epoch) { publish({ ...snapshot, error: FAILURE }); } }
    },
    async logout() {
      const idToken = session?.idToken;
      clear();
      try {
        storage.setItem(NOTICE, '1');
        const { as } = await endpoints();
        if (!idToken) throw new Error('LOGOUT');
        const url = new URL(as.end_session_endpoint!);
        url.search = new URLSearchParams({ id_token_hint: idToken, post_logout_redirect_uri: config.origin + '/account/logout' }).toString();
        return url.href;
      } catch { publish({ status: 'error', customer: null, error: 'Disconnessione Shopify non confermata. Riprova prima di lasciare un dispositivo condiviso.' }); return null; }
    },
    finishLogout() { clear(); try { storage.removeItem(NOTICE); } catch { /* no session is restored */ } },
  };
}
export type CustomerClient = ReturnType<typeof createCustomerClient>;
