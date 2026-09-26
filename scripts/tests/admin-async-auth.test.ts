import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Esegue gli handler e l'helper auth reali; rete e repository sono mock chiusi.
// Nessun import del client Supabase, nessuna variabile ambiente reale.
const root = resolve(import.meta.dirname, '../..');
const adminEmail = 'admin@example.invalid';
type Scenario = 'anon' | 'invalid' | 'non-admin' | 'admin' | 'rejected' | 'role-rejected';
type Handler = (request: Request) => Promise<Response>;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function load(functionName: string, scenario: Scenario, gate?: Promise<void>, mutation = false) {
  let handler!: Handler;
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const authCalls: string[] = [];
  const job = { id: 'synthetic-job', status: 'pending', mode: 'sync',
    created_at: '2026-01-01T00:00:00Z', report_json: {} };
  const repo = Object.fromEntries(['createSyncJob', 'getSyncJob', 'updateSyncJob',
    'upsertCsvCatalogRows', 'getCatalogDashboard'].map((name) => [name, async (...args: unknown[]) => {
      calls.push({ name, args });
      if (name === 'upsertCsvCatalogRows') return { written: 1 };
      if (name === 'getCatalogDashboard') return { total: 1 };
      return job;
    }]));
  const createClient = (_url: string, key: string) => ({
    auth: { getUser: async () => {
      authCalls.push('getUser');
      assert.equal(key, 'synthetic-anon');
      if (gate) await gate;
      if (scenario === 'rejected') throw new Error('synthetic auth Promise rejected');
      return { data: { user: scenario === 'invalid' ? null : {
        id: 'synthetic-user', email: adminEmail, user_metadata: { role: 'admin' },
      } }, error: scenario === 'invalid' ? new Error('invalid token') : null };
    } },
    from: (table: string) => {
      assert.equal(key, 'synthetic-service');
      assert.equal(table, 'user_roles');
      authCalls.push('user_roles');
      const query = {
        select: () => query,
        eq: (field: string, value: string) => {
          assert.equal(value, field === 'role' ? 'admin' : 'synthetic-user');
          return query;
        },
        maybeSingle: async () => {
          if (scenario === 'role-rejected') throw new Error('synthetic roles Promise rejected');
          return { data: scenario === 'admin' ? { role: 'admin' } : null, error: null };
        },
      };
      return query;
    },
  });
  function module(file: string, entry = false): Record<string, unknown> {
    let source = readFileSync(resolve(root, file), 'utf8');
    if (entry && mutation) source = source.replace('await assertAdminRequest(request)', 'assertAdminRequest(request)');
    const compiled = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    } }).outputText;
    const exports = {};
    const require = (id: string): unknown => {
      if (id.startsWith('https://deno.land/') && id.endsWith('/http/server.ts'))
        return { serve: (fn: Handler) => { handler = fn; } };
      if (id.startsWith('https://esm.sh/@supabase/supabase-js@')) return { createClient };
      if (id === '../_shared/admin-auth.ts') return module('supabase/functions/_shared/admin-auth.ts');
      if (id === '../_shared/cors.ts') return module('supabase/functions/_shared/cors.ts');
      if (id === '../_shared/product-sync-source.ts') return module('supabase/functions/_shared/product-sync-source.ts');
      if (id === '../_shared/job-repo.ts' || id === '../_shared/product-catalog-repo.ts') return repo;
      throw new Error(`Import non autorizzato nel test offline: ${id}`);
    };
    vm.runInNewContext(compiled, { exports, require, Request, Response, URL, Error,
      Deno: { env: { get: (key: string) => ({
        SUPABASE_URL: 'https://fixture.invalid', SUPABASE_ANON_KEY: 'synthetic-anon',
        SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service',
      })[key] } },
    }, { filename: file });
    return exports;
  }
  module(`supabase/functions/${functionName}/index.ts`, true);
  assert.equal(typeof handler, 'function');
  return { handler, calls, authCalls };
}

const routes = [
  { fn: 'start-product-sync', method: 'POST', denied: 400, expected: ['createSyncJob'] },
  { fn: 'process-product-sync', method: 'GET', denied: 401, expected: ['getSyncJob'] },
  { fn: 'process-product-sync', method: 'POST', denied: 401,
    expected: ['getSyncJob', 'updateSyncJob', 'upsertCsvCatalogRows', 'updateSyncJob'] },
  { fn: 'get-product-sync-dashboard', method: 'GET', denied: 400, expected: ['getCatalogDashboard'] },
  { fn: 'get-product-sync-dashboard', method: 'POST', denied: 400, expected: ['getCatalogDashboard'] },
];
function request(method: string, scenario: Scenario) {
  return new Request('https://fixture.invalid/?job_id=synthetic-job', {
    method, headers: scenario === 'anon' ? {} : { authorization: 'Bearer synthetic-token', 'Content-Type': 'application/json' },
    ...(method === 'POST' ? { body: JSON.stringify({ mode: 'sync', job_id: 'synthetic-job',
      rows: [{ sku: 'SYNTH-ONLY' }], total_rows: 1 }) } : {}),
  });
}
for (const route of routes) {
  for (const scenario of ['anon', 'invalid', 'non-admin', 'rejected', 'role-rejected'] as Scenario[]) {
    test(`${route.fn} ${route.method}: ${scenario} negato prima dei repository`, async () => {
      const h = load(route.fn, scenario);
      const response = await h.handler(request(route.method, scenario));
      assert.equal(response.status, route.denied); // conserva il contratto HTTP esistente
      assert.equal((await response.json()).success, false);
      assert.equal(h.calls.length, 0);
      if (scenario === 'anon') assert.equal(h.authCalls.length, 0);
    });
  }
  test(`${route.fn} ${route.method}: Admin ammesso, identità risolta`, async () => {
    const h = load(route.fn, 'admin');
    const response = await h.handler(request(route.method, 'admin'));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.deepEqual(h.calls.map((c) => c.name), route.expected);
    if (route.fn === 'start-product-sync') assert.equal(h.calls[0].args[1], adminEmail);
    if (route.fn === 'process-product-sync' && route.method === 'GET') assert.equal(body.adminEmail, adminEmail);
  });
  for (const scenario of ['admin', 'non-admin'] as Scenario[]) {
    test(`${route.fn} ${route.method}: attende la Promise ${scenario}`, async () => {
      const gate = deferred<void>();
      const h = load(route.fn, scenario, gate.promise);
      let settled = false;
      const pending = h.handler(request(route.method, scenario)).then((r) => { settled = true; return r; });
      await new Promise<void>((done) => setImmediate(done));
      assert.equal(settled, false);
      assert.equal(h.calls.length, 0);
      gate.resolve();
      assert.equal((await pending).status, scenario === 'admin' ? 200 : route.denied);
      if (scenario === 'non-admin') assert.equal(h.calls.length, 0);
    });
  }
  test(`${route.fn} ${route.method}: il test rileva la regressione senza await`, async () => {
    const gate = deferred<void>();
    const h = load(route.fn, 'admin', gate.promise, true);
    const pending = h.handler(request(route.method, 'admin'));
    await new Promise<void>((done) => setImmediate(done));
    assert.ok(h.calls.length > 0, 'la baseline difettosa entra nel repository con auth pendente');
    gate.resolve();
    await pending;
  });
}
for (const fn of ['start-product-sync', 'process-product-sync', 'get-product-sync-dashboard']) {
  test(`${fn}: OPTIONS resta privo di side effect`, async () => {
    const h = load(fn, 'anon');
    assert.equal((await h.handler(request('OPTIONS', 'anon'))).status, 200);
    assert.equal(h.calls.length, 0);
    assert.equal(h.authCalls.length, 0);
  });
}
