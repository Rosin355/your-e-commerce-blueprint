import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createCustomerClient } from '../../src/customer/client';
import { customerAuthEnabled } from '../../src/customer/config';

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  get length() { return this.data.size; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
  clear() { this.data.clear(); }
}
const config = { storefront: 'https://synthetic.myshopify.com', issuer: 'https://shopify.com/authentication/synthetic', clientId: 'synthetic-client', origin: 'https://store.example.test' };
async function fixture() {
  const keys = await generateKeyPair('RS256');
  const publicKey = { ...await exportJWK(keys.publicKey), kid: 'synthetic' };
  let nonce = '', subject = 'synthetic-subject', customerId = 'gid://shopify/Customer/synthetic-a';
  let badNonce = false, badIssuer = false, badAudience = false, expired = false, badSignature = false;
  let apiFail = false, omitRefresh = false, page = false;
  let clock = Date.now(); let refreshes = 0; let calls = 0;
  const otherKeys = await generateKeyPair('RS256');
  const token = () => new SignJWT({ nonce: badNonce ? 'wrong' : nonce }).setProtectedHeader({ alg: 'RS256', kid: 'synthetic' }).setIssuer(badIssuer ? 'https://wrong.example.test' : config.issuer).setAudience(badAudience ? 'wrong' : config.clientId).setSubject(subject).setIssuedAt().setExpirationTime(expired ? Math.floor(Date.now()/1000)-100 : Math.floor(Date.now()/1000)+7200).sign(badSignature ? otherKeys.privateKey : keys.privateKey);
  const storage = new MemoryStorage(); storage.setItem('supabase.synthetic', 'staff-session-sentinel');
  const fetcher: typeof fetch = async (input, init) => {
    calls++;
    const url = String(input);
    if (url.endsWith('openid-configuration')) return Response.json({ issuer: config.issuer, authorization_endpoint: 'https://shopify.com/authentication/oauth/authorize', token_endpoint: 'https://shopify.com/authentication/oauth/token', jwks_uri: 'https://shopify.com/authentication/jwks', end_session_endpoint: 'https://shopify.com/authentication/logout', response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'] });
    if (url.endsWith('customer-account-api')) return Response.json({ graphql_api: 'https://shopify.com/customer-account/api/2026-10/graphql' });
    if (url.endsWith('/jwks')) return Response.json({ keys: [publicKey] });
    if (url.endsWith('/token')) {
      const body = new URLSearchParams(init?.body as URLSearchParams);
      assert.equal(body.get('client_id'), config.clientId);
      if (body.get('grant_type') === 'authorization_code') { assert.ok(body.get('code_verifier')); assert.equal(body.get('redirect_uri'), config.origin+'/account/callback'); }
      else { assert.equal(body.get('grant_type'), 'refresh_token'); refreshes++; }
      return Response.json({ access_token: 'synthetic-access', token_type: 'Bearer', expires_in: 120, id_token: await token(), ...(omitRefresh ? {} : { refresh_token: 'synthetic-refresh' }) });
    }
    if (url.endsWith('/graphql')) {
      assert.equal(new Headers(init?.headers).get('Authorization'), 'synthetic-access');
      const body = JSON.parse(init?.body as string);
      assert.ok(!/email:|phone:|mutation/i.test(body.query));
      if (apiFail) return Response.json({ errors: [{ message: 'private-sentinel' }] });
      const next = !!body.variables.after;
      return Response.json({ data: { customer: { id: customerId, firstName: null, lastName: null, emailAddress: null, orders: { nodes: [{ id: next ? 'order-b' : 'order-a', name: 'Synthetic order', processedAt: null, totalPrice: { amount: '1', currencyCode: 'EUR' } }], pageInfo: { hasNextPage: page && !next, endCursor: next ? 'page-b' : 'page-a' } } } } });
    }
    throw new Error('Unexpected synthetic endpoint');
  };
  const api = createCustomerClient(config, storage, fetcher, () => clock);
  const begin = async () => { const url = new URL(await api.login()); nonce = url.searchParams.get('nonce')!; return url; };
  const callback = (url: URL) => new URL(config.origin+'/account/callback?code=synthetic-code&state='+url.searchParams.get('state'));
  return { api, storage, fetcher, begin, callback, get refreshes() { return refreshes; }, get calls() { return calls; }, set badNonce(v: boolean) { badNonce=v; }, set badIssuer(v: boolean) { badIssuer=v; }, set badAudience(v: boolean) { badAudience=v; }, set expired(v: boolean) { expired=v; }, set badSignature(v: boolean) { badSignature=v; }, set apiFail(v: boolean) { apiFail=v; }, set omitRefresh(v: boolean) { omitRefresh=v; }, set customerId(v: string) { customerId=v; }, set page(v: boolean) { page=v; }, advance() { clock+=90000; } };
}
test('feature flag requires exact true and defaults OFF', () => { for (const v of [undefined, false, true, 'false', 'TRUE', '1', '']) assert.equal(customerAuthEnabled(v), false); assert.equal(customerAuthEnabled('true'), true); });
test('guest restore makes zero requests and preserves Supabase', async () => { const f=await fixture(); await f.api.restore(); assert.equal(f.calls,0); assert.equal(f.storage.getItem('supabase.synthetic'),'staff-session-sentinel'); });
test('PKCE, callback, stable customer identity, restore and logout use customer namespace only', async () => {
 const f=await fixture(); const login=await f.begin(); assert.equal(login.searchParams.get('code_challenge_method'),'S256'); assert.ok(login.searchParams.get('code_challenge')); assert.ok(!login.href.includes('code_verifier'));
 await f.api.callback(f.callback(login)); assert.equal(f.api.getSnapshot().customer?.id,'gid://shopify/Customer/synthetic-a');
 const second=createCustomerClient(config,f.storage,f.fetcher); await second.restore(); assert.equal(second.getSnapshot().status,'authenticated');
 const logout=new URL((await second.logout())!); assert.ok(logout.searchParams.get('id_token_hint')); assert.equal(logout.searchParams.get('post_logout_redirect_uri'),config.origin+'/account/logout');
 assert.equal(second.getSnapshot().customer,null); assert.equal(f.storage.getItem('og.customer.session.v1'),null); assert.equal(f.storage.getItem('supabase.synthetic'),'staff-session-sentinel');
 second.finishLogout(); assert.equal(f.storage.getItem('og.customer.logout-unconfirmed'),null);
});
for (const defect of ['state','nonce','issuer','audience','expiry','signature','origin','path','timeout','api']) test('rejects '+defect+' without leaking provider details', async () => {
 const f=await fixture(); const login=await f.begin(); const callback=f.callback(login);
 if(defect==='state') callback.searchParams.set('state','wrong'); if(defect==='nonce') f.badNonce=true; if(defect==='issuer') f.badIssuer=true; if(defect==='audience') f.badAudience=true; if(defect==='expiry') f.expired=true; if(defect==='signature') f.badSignature=true;
 if(defect==='origin') callback.hostname='wrong.example.test'; if(defect==='path') callback.pathname='/wrong'; if(defect==='timeout') f.storage.setItem('og.customer.transaction.v1',JSON.stringify({state:'x',nonce:'x',verifier:'x',created:0})); if(defect==='api') f.apiFail=true;
 await assert.rejects(f.api.callback(callback),/Impossibile/); assert.equal(f.api.getSnapshot().customer,null); assert.equal(f.storage.getItem('og.customer.session.v1'),null); assert.ok(!JSON.stringify(f.api.getSnapshot()).includes('private-sentinel'));
});
test('callback is consumed once and replay cannot reuse tokens', async () => { const f=await fixture(); const u=await f.begin(); await f.api.callback(f.callback(u)); await assert.rejects(f.api.callback(f.callback(u))); assert.equal(f.api.getSnapshot().customer,null); });
test('expired token refresh is single flight and revalidates identity', async () => { const f=await fixture(); const u=await f.begin(); await f.api.callback(f.callback(u)); f.advance(); await Promise.all([f.api.restore(),f.api.restore()]); assert.equal(f.refreshes,1); assert.equal(f.api.getSnapshot().status,'authenticated'); f.advance(); f.customerId='gid://shopify/Customer/synthetic-b'; await f.api.restore(); assert.equal(f.api.getSnapshot().customer,null); });
test('token without refresh expires safely and cannot retain an old account', async () => { const f=await fixture(); const a=await f.begin(); await f.api.callback(f.callback(a)); f.omitRefresh=true; const b=await f.begin(); f.customerId='gid://shopify/Customer/synthetic-b'; await f.api.callback(f.callback(b)); f.advance(); await f.api.restore(); assert.equal(f.api.getSnapshot().customer,null); assert.equal(f.refreshes,0); });
test('orders paginate in the authenticated customer context', async () => { const f=await fixture(); f.page=true; const u=await f.begin(); await f.api.callback(f.callback(u)); await f.api.moreOrders(); assert.equal(f.api.getSnapshot().customer?.orders.nodes.length,2); });
test('corrupt or unavailable storage fails closed', async () => { const f=await fixture(); f.storage.setItem('og.customer.session.v1','invalid'); await f.api.restore(); assert.equal(f.api.getSnapshot().status,'error'); });
test('integration leaves Admin, Supabase and checkout outside customer flow', () => {
 const read=(p:string)=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
 for(const f of ['src/customer/client.ts','src/customer/CustomerPages.tsx','src/customer/react.ts']) { const s=read(f); assert.ok(!s.includes('supabase')); assert.ok(!/console\.(log|warn|error|info|debug)\s*\(/.test(s)); assert.ok(!s.includes('get-customer-orders')); }
 for(const f of ['Auth','Account','AccountCallback']) assert.match(read('src/pages/'+f+'.tsx'),/SHOPIFY_CUSTOMER_AUTH_ENABLED \? <CustomerBoundary>/);
 assert.match(read('src/admin/components/AdminLogin.tsx'),/signInWithPassword/); assert.match(read('src/hooks/useAuth.tsx'),/scope: 'local'/);
 assert.match(read('src/adminv2/AdminV2Guard.tsx'),/AdminLogin access="staff"/);
 assert.match(read('src/adminv2/AdminV2Guard.tsx'),/isError \|\| !data\?\.roles\?\.length/);
 assert.match(read('src/integrations/supabase/client.ts'),/detectSessionInUrl:.*reset-password/);
 assert.ok(!read('src/App.tsx').includes('/admin/login'));
 assert.ok(!read('src/lib/shopify-checkout.ts').includes('customer/')); assert.ok(!read('src/stores/cartStore.ts').includes('customer/'));
});

test('a late customer response cannot resurrect data after logout', async () => {
 const f=await fixture(); const u=await f.begin();
 let release!: () => void; let entered!: () => void;
 const gate=new Promise<void>(r=>release=r); const ready=new Promise<void>(r=>entered=r);
 const delayed: typeof fetch = async (input, init) => { if(String(input).endsWith('/graphql')) { entered(); await gate; } return f.fetcher(input,init); };
 const api=createCustomerClient(config,f.storage,delayed);
 const completion=api.callback(f.callback(u)); await ready; await api.logout(); release();
 await assert.rejects(completion); assert.equal(api.getSnapshot().customer,null); assert.equal(f.storage.getItem('og.customer.session.v1'),null);
});
