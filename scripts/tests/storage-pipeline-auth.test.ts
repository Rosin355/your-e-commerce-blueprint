import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Esegue gli handler reali con Auth, DB e Storage simulati in memoria.
// Nessuna richiesta di rete, nessun job reale e nessun file privato.
const root = resolve(import.meta.dirname, '../..');

type Scenario = 'anon' | 'non-admin' | 'admin' | 'rejected';
type Handler = (request: Request) => Promise<Response>;
type AuthResult = {
  data: { user: { id: string; email: string } | null };
  error: Error | null;
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function load(functionName: string, scenario: Scenario, authGate?: Promise<AuthResult>) {
  let handler!: Handler;
  const authEvents: string[] = [];
  const privilegedEvents: string[] = [];

  const completedJob = {
    id: 'synthetic-job',
    status: 'completed',
    input_file_path: 'jobs/synthetic-job/input.csv',
  };

  const createClient = (_url: string, key: string) => {
    const isPublicClient = key === 'synthetic-anon';
    assert.ok(isPublicClient || key === 'synthetic-service');

    const client = {
      auth: {
        getUser: async () => {
          assert.equal(isPublicClient, true);
          authEvents.push('getUser');
          if (authGate) return await authGate;
          if (scenario === 'rejected') throw new Error('synthetic auth rejection');
          if (scenario === 'anon') {
            return { data: { user: null }, error: new Error('missing token') };
          }
          return {
            data: { user: { id: 'synthetic-user', email: 'admin@example.invalid' } },
            error: null,
          };
        },
      },
      from: (table: string) => {
        if (table === 'user_roles') {
          assert.equal(isPublicClient, false);
          authEvents.push('user_roles');
          const roleQuery = {
            select: () => roleQuery,
            eq: () => roleQuery,
            maybeSingle: async () => ({
              data: scenario === 'admin' ? { role: 'admin' } : null,
              error: null,
            }),
          };
          return roleQuery;
        }

        assert.equal(table, 'pipeline_jobs');
        assert.equal(isPublicClient, false);
        privilegedEvents.push(`db:${table}`);
        const query = {
          select: () => query,
          insert: async () => ({ error: null }),
          update: () => query,
          eq: () => query,
          single: async () => ({ data: completedJob, error: null }),
        };
        return query;
      },
      storage: {
        from: (bucket: string) => {
          assert.equal(isPublicClient, false);
          privilegedEvents.push(`storage:${bucket}`);
          return {
            createSignedUploadUrl: async (path: string) => ({
              data: { signedUrl: 'synthetic-upload-capability', token: 'synthetic-upload-token', path },
              error: null,
            }),
            download: async () => ({
              data: new Blob(['Nome,SKU,Tipo,Prezzo di listino\nPianta,SYNTH-1,simple,10\n'], { type: 'text/csv' }),
              error: null,
            }),
          };
        },
      },
    };

    return client;
  };

  const compile = (path: string) => ts.transpileModule(readFileSync(resolve(root, path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  function execute(path: string, entry = false): Record<string, unknown> {
    const exports = {};
    const require = (id: string): unknown => {
      if (id.startsWith('https://deno.land/') && id.endsWith('/http/server.ts')) {
        return { serve: (fn: Handler) => { handler = fn; } };
      }
      if (id.startsWith('https://esm.sh/@supabase/supabase-js@')) return { createClient };
      if (id === '../_shared/admin-auth.ts') return execute('supabase/functions/_shared/admin-auth.ts');
      throw new Error(`Import non autorizzato nel test offline: ${id}`);
    };

    vm.runInNewContext(compile(path), {
      exports,
      require,
      Request,
      Response,
      Blob,
      crypto: globalThis.crypto,
      fetch: async () => { throw new Error('Rete non consentita nel test offline'); },
      console: { log() {}, error() {}, warn() {}, info() {}, debug() {} },
      Deno: {
        env: {
          get: (name: string) => ({
            SUPABASE_URL: 'https://fixture.invalid',
            SUPABASE_ANON_KEY: 'synthetic-anon',
            SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service',
          })[name],
        },
      },
    }, { filename: path });

    if (entry) assert.equal(typeof handler, 'function');
    return exports;
  }

  execute(`supabase/functions/${functionName}/index.ts`, true);
  return { handler, authEvents, privilegedEvents };
}

const routes = [
  {
    fn: 'csv-upload-url',
    body: { fileName: 'fixture.csv' },
    privileged: 'storage:csv-pipeline',
  },
  {
    fn: 'woo-enrichment-pipeline',
    body: {
      jobId: 'synthetic-job',
      inputPath: 'jobs/synthetic-job/input.csv',
      dryRun: true,
      useAi: false,
    },
    privileged: 'storage:csv-pipeline',
  },
  {
    fn: 'process-woo-job',
    body: { jobId: 'synthetic-job', batchSize: 1 },
    privileged: 'db:pipeline_jobs',
  },
];

function request(body: unknown, scenario: Scenario, method = 'POST') {
  return new Request('https://fixture.invalid', {
    method,
    headers: scenario === 'anon'
      ? { 'Content-Type': 'application/json' }
      : { Authorization: 'Bearer synthetic-token', 'Content-Type': 'application/json' },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  });
}

for (const route of routes) {
  test(`${route.fn}: OPTIONS non autentica e non usa service_role`, async () => {
    const h = load(route.fn, 'anon');
    const response = await h.handler(request(route.body, 'anon', 'OPTIONS'));
    assert.equal(response.status, 200);
    assert.deepEqual(h.authEvents, []);
    assert.deepEqual(h.privilegedEvents, []);
  });

  for (const scenario of ['anon', 'non-admin', 'rejected'] as Scenario[]) {
    test(`${route.fn}: ${scenario} negato prima di DB o Storage`, async () => {
      const h = load(route.fn, scenario);
      const response = await h.handler(request(route.body, scenario));
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { success: false, error: 'Non autorizzato' });
      assert.deepEqual(h.privilegedEvents, []);
    });
  }

  test(`${route.fn}: Admin ammesso al percorso applicativo esistente`, async () => {
    const h = load(route.fn, 'admin');
    const response = await h.handler(request(route.body, 'admin'));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).success, true);
    assert.ok(h.authEvents.includes('getUser'));
    assert.ok(h.authEvents.includes('user_roles'));
    assert.ok(h.privilegedEvents.includes(route.privileged));
  });

  test(`${route.fn}: Promise Auth pendente blocca ogni accesso privilegiato`, async () => {
    const gate = deferred<AuthResult>();
    const h = load(route.fn, 'admin', gate.promise);
    let settled = false;
    const pending = h.handler(request(route.body, 'admin')).then((response) => {
      settled = true;
      return response;
    });

    await new Promise<void>((done) => setImmediate(done));
    assert.equal(settled, false);
    assert.deepEqual(h.privilegedEvents, []);

    gate.resolve({
      data: { user: { id: 'synthetic-user', email: 'admin@example.invalid' } },
      error: null,
    });
    assert.equal((await pending).status, 200);
    assert.ok(h.privilegedEvents.includes(route.privileged));
  });
}
