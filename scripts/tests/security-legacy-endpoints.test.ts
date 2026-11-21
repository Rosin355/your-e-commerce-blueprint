import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Actual handlers and actual JWT/role helper, with strictly offline providers.
const root = resolve(import.meta.dirname, '../..');
type Handler = (request: Request) => Promise<Response>;
type Scenario = 'anon' | 'invalid' | 'non-admin' | 'admin' | 'auth-error' | 'role-error';
function fixture(fn: string, scenario: Scenario, gate?: Promise<void>) {
  let handler: Handler | undefined;
  const effects: string[] = [];
  const logs: unknown[][] = [];
  const outbound: Array<{ url: string; init?: RequestInit }> = [];
  const environment: Record<string, string> = {
    SUPABASE_URL: 'https://fixture.invalid', SUPABASE_ANON_KEY: 'synthetic-anon',
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service', LOVABLE_API_KEY: 'synthetic-ai',
    SHOPIFY_CLIENT_ID: 'synthetic-client', SHOPIFY_CLIENT_SECRET: 'synthetic-secret',
    SHOPIFY_STORE_PERMANENT_DOMAIN: 'synthetic.myshopify.com',
  };
  const createClient = (_url: string, key: string) => ({
    auth: { getUser: async () => {
      assert.equal(key, 'synthetic-anon');
      if (gate) await gate;
      if (scenario === 'auth-error') throw new Error('private-error-sentinel');
      return { data: { user: scenario === 'invalid' ? null : {
        id: 'synthetic-user', email: 'synthetic@example.invalid', user_metadata: { role: 'admin' },
      } }, error: null };
    } },
    from: (table: string) => {
      assert.equal(key, 'synthetic-service');
      if (table === 'user_roles') {
        const roles = {
          select: () => roles,
          eq: (field: string, value: string) => {
            assert.equal(value, field === 'user_id' ? 'synthetic-user' : 'admin');
            return roles;
          },
          maybeSingle: async () => {
            if (scenario === 'role-error') throw new Error('private-error-sentinel');
            return { data: scenario === 'admin' ? { role: 'admin' } : null, error: null };
          },
        };
        return roles;
      }
      assert.equal(table, 'product_sync_csv_products');
      effects.push('catalog');
      const query: Record<string, unknown> = {};
      for (const name of ['select', 'not', 'neq', 'is', 'or', 'order', 'range', 'limit', 'eq', 'in'])
        query[name] = () => query;
      query.update = () => { effects.push('update'); return query; };
      query.then = (done: (value: unknown) => unknown) => Promise.resolve(done({ data: [], count: 0, error: null }));
      return query;
    },
    storage: { from: () => {
      effects.push('storage');
      return { download: async () => ({ data: new Blob(['sku,title\n']), error: null }) };
    } },
  });
  function load(file: string): Record<string, unknown> {
    const exports = {};
    const source = readFileSync(resolve(root, file), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    } }).outputText;
    const serve = (value: Handler) => { handler = value; };
    const require = (id: string): unknown => {
      if (id.startsWith('https://esm.sh/@supabase/supabase-js@')) return { createClient };
      if (id.endsWith('/http/server.ts')) return { serve };
      if (id.endsWith('/encoding/base64.ts')) return { decode: () => { throw new Error('Unexpected image generation'); } };
      if (id === '../_shared/shopify-admin-client.ts') return {
        corsHeaders: {}, jsonResponse: (body: unknown, status = 200) => Response.json(body, { status }),
        shopifyAdminGraphQL: async () => { effects.push('shopify'); return {}; },
      };
      if (id.startsWith('.')) return load(resolve(dirname(file), id).slice(root.length + 1));
      throw new Error(`Unexpected import: ${id}`);
    };
    vm.runInNewContext(compiled, {
      exports, require, Request, Response, URL, Blob, TextDecoder, Uint8Array, Error,
      console: Object.fromEntries(['log', 'error', 'warn', 'info', 'debug'].map(name => [name, (...args: unknown[]) => logs.push(args)])),
      fetch: async (url: string, init?: RequestInit) => {
        // Only synthetic OAuth is permitted. Paid AI and real network are impossible.
        assert.equal(url, 'https://synthetic.myshopify.com/admin/oauth/access_token');
        effects.push('oauth'); outbound.push({ url, init });
        return Response.json({ access_token: 'synthetic-response' });
      },
      Deno: { serve, env: { get: (name: string) => environment[name] } },
    }, { filename: file });
    return exports;
  }
  load(`supabase/functions/${fn}/index.ts`);
  if (!handler) throw new Error('Handler not registered');
  const invoke = handler;
  return { effects, logs, outbound, invoke: (body: unknown, method = 'POST') => invoke(new Request('https://fixture.invalid/?dry=1', {
    method, headers: scenario === 'anon' ? {} : { Authorization: 'Bearer synthetic-token' },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  })) };
}

const routes = [
  { fn: 'update-product-prices', body: { action: 'update_prices', rows: [] }, status: 200, effect: false },
  { fn: 'update-product-prices', body: { action: 'propagate_variants' }, status: 200, effect: true },
  { fn: 'ai-enrich-products', body: { count_only: true }, status: 200, effect: true },
  { fn: 'ai-enrich-products', body: { reset_style_conflict: true }, status: 200, effect: true },
  { fn: 'generate-product-images', body: { count_only: true }, status: 200, effect: true },
  { fn: 'setup-collections', body: {}, status: 200, effect: true },
  { fn: 'export-complete-products-csv', body: {}, status: 200, effect: true },
  { fn: 'export-enriched-csv', body: {}, status: 404, effect: true },
  { fn: 'export-shopify-native-csv', body: {}, status: 200, effect: true },
  { fn: 'inspect-woo-source-csv', body: {}, status: 200, effect: true },
  { fn: 'shopify-oauth-exchange', body: { shop: 'synthetic.myshopify.com', code: 'synthetic-code' }, status: 200, effect: true },
];
for (const route of routes) {
  for (const scenario of ['anon', 'invalid', 'non-admin', 'auth-error', 'role-error'] as Scenario[]) {
    test(`${route.fn} ${JSON.stringify(route.body)}: ${scenario} cannot reach privileged operations`, async () => {
      const h = fixture(route.fn, scenario);
      assert.ok([401, 403].includes((await h.invoke(route.body)).status));
      assert.equal(h.effects.length, 0);
      assert.equal(h.outbound.length, 0);
      assert.equal(h.logs.length, 0);
    });
  }
  test(`${route.fn}: verified Admin retains existing safe operation`, async () => {
    const h = fixture(route.fn, 'admin');
    assert.equal((await h.invoke(route.body)).status, route.status);
    assert.equal(h.effects.length > 0, route.effect);
  });
  test(`${route.fn}: pending identity check blocks every provider`, async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>(resolveGate => { release = resolveGate; });
    const h = fixture(route.fn, 'admin', gate);
    let completed = false;
    const pending = h.invoke(route.body).then(response => { completed = true; return response; });
    await new Promise<void>(done => setImmediate(done));
    assert.equal(completed, false);
    assert.equal(h.effects.length, 0);
    if (!release) throw new Error('Gate not initialized');
    release();
    assert.equal((await pending).status, route.status);
  });
  test(`${route.fn}: preflight does not authenticate or contact providers`, async () => {
    const h = fixture(route.fn, 'anon');
    assert.equal((await h.invoke({}, 'OPTIONS')).status, 200);
    assert.equal(h.effects.length, 0);
  });
}
for (const shop of ['attacker.example', 'other.myshopify.com', 'synthetic.myshopify.com.attacker.example',
  'synthetic.myshopify.com@attacker.example', 'https://synthetic.myshopify.com',
  'synthetic.myshopify.com/path', 'synthetic.myshopify.com:443', '//attacker.example']) {
  test(`OAuth denies unapproved destination ${shop}, even for Admin`, async () => {
    const h = fixture('shopify-oauth-exchange', 'admin');
    assert.equal((await h.invoke({ shop, code: 'synthetic-code' })).status, 400);
    assert.equal(h.outbound.length, 0);
  });
}
test('OAuth targets only the configured store and forbids redirects', async () => {
  const h = fixture('shopify-oauth-exchange', 'admin');
  assert.equal((await h.invoke({ shop: 'synthetic.myshopify.com', code: 'synthetic-code' })).status, 200);
  assert.equal(h.outbound.length, 1);
  assert.equal(h.outbound[0].init?.redirect, 'error');
  assert.equal(h.logs.length, 0);
});
test('retired email-order endpoint denies every caller without imports or providers', async () => {
  for (const scenario of ['anon', 'admin'] as Scenario[]) {
    const h = fixture('get-customer-orders', scenario);
    assert.equal((await h.invoke({ email: 'other@example.invalid' })).status, 410);
    assert.equal(h.effects.length, 0);
    assert.equal(h.outbound.length, 0);
  }
});