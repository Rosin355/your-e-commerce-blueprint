import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(resolve(import.meta.dirname,
  '../../supabase/functions/enrichment-run/index.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;

function load(authorize: () => Promise<string>) {
  let handler!: (req: Request) => Promise<Response>;
  let authorized = false;
  let clients = 0;
  const tables: string[] = [];
  const client = {
    from: (table: string) => {
      assert.equal(authorized, true, 'DB access prima di auth');
      tables.push(table);
      assert.ok(['product_enrichment_runs', 'product_enrichment_run_items', 'product_sync_csv_products'].includes(table));
      const result = { data: [{ status: 'done' }], error: null };
      const query: Record<string, unknown> = {};
      for (const name of ['select','insert','update','eq','in','is','order','limit']) query[name] = () => query;
      query.single = query.maybeSingle = async () => ({ data: { id: 'synthetic-run' }, error: null });
      query.range = async () => ({ data: [], error: null });
      query.then = (done: (value: unknown) => unknown) => Promise.resolve(result).then(done);
      return query;
    },
  };
  vm.runInNewContext(compiled, { exports: {}, Request, Response, Error, console,
    Deno: { env: { get: (key: string) => ({ SUPABASE_URL: 'https://fixture.invalid',
      SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-role' })[key] } },
    require: (id: string) => {
      if (id.startsWith('https://deno.land/')) return { serve: (fn: typeof handler) => { handler = fn; } };
      if (id === '../_shared/admin-auth.ts') return { assertAdminRequest: async () => {
        const email = await authorize(); authorized = true; return email;
      } };
      if (id.startsWith('https://esm.sh/@supabase/supabase-js@')) return {
        createClient: (url: string, key: string, options: { auth: unknown; global?: unknown }) => {
          assert.equal(authorized, true);
          assert.equal(url, 'https://fixture.invalid');
          assert.equal(key, 'synthetic-service-role');
          assert.equal(options.global, undefined, 'nessun JWT utente inoltrato al client privilegiato');
          assert.equal(JSON.stringify(options.auth), JSON.stringify({ persistSession: false, autoRefreshToken: false }));
          clients++; return client;
        },
      };
      throw new Error(`Import non autorizzato: ${id}`);
    },
  });
  return { invoke: (action: string) => handler(new Request('https://fixture.invalid', {
    method: 'POST', body: JSON.stringify({ action, data: { skus: ['SYNTH-ONLY'],
      runId: 'synthetic-run', sku: 'SYNTH-ONLY', status: 'done' } }),
  })), tables, clientCount: () => clients };
}

for (const action of ['start','update_item','finish','get_open_run','get_run','get_catalog_status']) {
  test(`enrichment-run ${action}: client database service separato dopo auth`, async () => {
    const h = load(async () => 'admin@example.invalid');
    assert.equal((await h.invoke(action)).status, 200);
    assert.equal(h.clientCount(), 1);
    assert.ok(h.tables.length > 0);
  });
}
for (const message of ['Forbidden: admin role required', 'synthetic auth failure']) {
  test(`enrichment-run: ${message} non crea client DB`, async () => {
    const h = load(async () => { throw new Error(message); });
    assert.equal((await h.invoke('start')).status, 401);
    assert.equal(h.clientCount(), 0);
    assert.equal(h.tables.length, 0);
  });
}
test('enrichment-run: auth pendente blocca la costruzione del client service', async () => {
  let authorize!: (email: string) => void;
  const gate = new Promise<string>((done) => { authorize = done; });
  const h = load(() => gate);
  const pending = h.invoke('get_run');
  await new Promise<void>((done) => setImmediate(done));
  assert.equal(h.clientCount(), 0);
  authorize('admin@example.invalid');
  assert.equal((await pending).status, 200);
});
