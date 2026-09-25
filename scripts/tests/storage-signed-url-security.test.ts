import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Real handler, offline SDK boundary. No token, object or URL from production.
const root = resolve(import.meta.dirname, '../..');
const compile = (path: string) => ts.transpileModule(readFileSync(resolve(root, path), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const compiled = compile('supabase/functions/storage-signed-url/index.ts');
const cors = { exports: {} };
vm.runInNewContext(compile('supabase/functions/_shared/cors.ts'), { ...cors, Response });
type AuthResult = { data: { user: { id: string; user_metadata?: unknown } | null }; error: unknown };
type SignedResult = { data: { signedUrl: string } | null; error: unknown };
type Call = { bucket: string; path: string; ttl: number; token: string };
const okAuth = (id: string): AuthResult => ({ data: { user: { id } }, error: null });
const unavailable = (): SignedResult => ({ data: null, error: { message: 'sensitive upstream detail' } });

function load(options: {
  auth?: (token: string) => Promise<AuthResult>;
  sign?: (call: Call) => Promise<SignedResult>;
  env?: Record<string, string | undefined>;
} = {}) {
  let handler!: (req: Request) => Promise<Response>;
  const clients: string[] = [];
  const calls: Call[] = [];
  const logs: unknown[][] = [];
  let verified = false;
  const env = { SUPABASE_URL: 'https://fixture.invalid', SUPABASE_ANON_KEY: 'synthetic-public-key', ...options.env };
  const clientFactory = (url: string, key: string, config: {
    auth: Record<string, unknown>; global: { headers: { Authorization: string } };
  }) => {
    assert.equal(url, 'https://fixture.invalid');
    assert.equal(key, env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY);
    assert.equal(config.auth.persistSession, false);
    assert.equal(config.auth.autoRefreshToken, false);
    const token = config.global.headers.Authorization.replace('Bearer ', '');
    clients.push(token);
    return {
      auth: { getUser: async (jwt: string) => {
        assert.equal(jwt, token, 'auth and Storage must use exactly the same JWT');
        const result = options.auth ? await options.auth(jwt) :
          jwt === 'synthetic-invalid' ? { data: { user: null }, error: new Error('invalid') } : okAuth(jwt);
        verified = !result.error && !!result.data.user;
        return result;
      } },
      storage: { from: (bucket: string) => {
        assert.equal(verified, true, 'Storage reached before JWT verification');
        return { createSignedUrl: async (path: string, ttl: number, opts: { download: boolean }) => {
          assert.equal(opts.download, true);
          const call = { bucket, path, ttl, token };
          calls.push(call);
          if (options.sign) return await options.sign(call);
          // Synthetic model of versioned SELECT policies, NOT a live RLS test.
          const allowed = token === 'synthetic-admin' ||
            (bucket === 'sync' && path.startsWith('product-images/'));
          if (!allowed || path.endsWith('missing.csv')) return unavailable();
          return { data: { signedUrl: 'synthetic-capability-not-a-real-url' }, error: null };
        } };
      } },
    };
  };
  vm.runInNewContext(compiled, {
    exports: {}, Request, Response, Error,
    console: Object.fromEntries(['log', 'error', 'warn', 'info', 'debug'].map((name) => [name, (...args: unknown[]) => logs.push(args)])),
    Deno: {
      serve: (fn: typeof handler) => { handler = fn; },
      env: { get: (name: string) => {
        assert.notEqual(name, 'SUPABASE_SERVICE_ROLE_KEY', 'service key must not be read');
        return env[name as keyof typeof env];
      } },
    },
    require: (id: string) => {
      if (id === 'https://esm.sh/@supabase/supabase-js@2.45.0') return { createClient: clientFactory };
      if (id === '../_shared/cors.ts') return cors.exports;
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return {
    clients, calls, logs,
    invoke: (body: unknown = { bucket: 'csv-pipeline', path: 'jobs/fixture/input.csv' },
      token: string | null = 'synthetic-admin', method = 'POST', raw = false) => handler(new Request('https://fixture.invalid', {
        method,
        headers: token === null ? {} : { Authorization: `Bearer ${token}` },
        ...(method === 'POST' ? { body: raw ? String(body) : JSON.stringify(body) } : {}),
      })),
  };
}

for (const token of [null, '', 'synthetic-invalid']) {
  test(`storage signed URL: missing/invalid authentication ${String(token)} denied`, async () => {
    const h = load();
    const r = await h.invoke(undefined, token);
    assert.equal(r.status, 401);
    assert.equal(h.calls.length, 0);
    if (!token) assert.equal(h.clients.length, 0);
    assert.equal(r.headers.get('cache-control'), 'private, no-store');
  });
}
test('storage signed URL: OPTIONS does not authenticate or sign', async () => {
  const h = load();
  assert.equal((await h.invoke(undefined, null, 'OPTIONS')).status, 200);
  assert.equal(h.clients.length, 0);
});
test('storage signed URL: unsupported method does not authenticate or sign', async () => {
  const h = load();
  assert.equal((await h.invoke(undefined, null, 'GET')).status, 405);
  assert.equal(h.clients.length, 0);
});
test('storage signed URL: Admin via RLS succeeds without service credentials', async () => {
  const h = load();
  const r = await h.invoke();
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(await r.json(), { ok: true, signedUrl: 'synthetic-capability-not-a-real-url', expiresIn: 3600 });
  assert.equal(h.calls.length, 1);
  assert.equal(h.logs.length, 0);
});
test('storage signed URL: non-Admin permitted image policy is preserved', async () => {
  const h = load();
  assert.equal((await h.invoke({ bucket: 'sync', path: 'product-images/fixture.webp' }, 'synthetic-user')).status, 200);
});
for (const [bucket, path] of [
  ['csv-pipeline', 'jobs/user-a/input.csv'],
  ['csv-pipeline', 'jobs/user-b/input.csv'],
  ['sync', 'shopify-ready.csv'],
]) {
  test(`storage signed URL: non-Admin denied by policy for ${bucket}/${path}`, async () => {
    const h = load();
    const r = await h.invoke({ bucket, path }, 'synthetic-user-a');
    assert.equal(r.status, 404);
    assert.deepEqual(await r.json(), { ok: false, error: 'File non disponibile' });
  });
}
test('storage signed URL: editable metadata cannot grant Admin privileges', async () => {
  const h = load({ auth: async () => ({ data: { user: { id: 'synthetic-user', user_metadata: { role: 'admin' } } }, error: null }) });
  assert.equal((await h.invoke(undefined, 'synthetic-user')).status, 404);
});
test('storage signed URL: no fallback if policy denies even an Admin', async () => {
  const h = load({ sign: async () => unavailable() });
  assert.equal((await h.invoke()).status, 404);
  assert.equal(h.clients.length, 1);
  assert.equal(h.calls.length, 1);
});
test('storage signed URL: concurrent users never share a privileged client', async () => {
  const h = load();
  const [admin, user] = await Promise.all([h.invoke(), h.invoke(undefined, 'synthetic-user')]);
  assert.equal(admin.status, 200);
  assert.equal(user.status, 404);
  assert.deepEqual(h.clients.sort(), ['synthetic-admin', 'synthetic-user']);
  assert.deepEqual(h.calls.map((call) => call.token).sort(), ['synthetic-admin', 'synthetic-user']);
});
test('storage signed URL: missing object is indistinguishable from policy denial', async () => {
  const h = load();
  const missing = await h.invoke({ bucket: 'csv-pipeline', path: 'jobs/fixture/missing.csv' });
  const denied = await h.invoke(undefined, 'synthetic-user');
  assert.equal(missing.status, denied.status);
  assert.deepEqual(await missing.json(), await denied.json());
});
for (const bucket of ['other-private-bucket', 'csv-pipeline/../sync', '', null, 12]) {
  test(`storage signed URL: forbidden bucket ${String(bucket)}`, async () => {
    const h = load();
    assert.equal((await h.invoke({ bucket, path: 'fixture.csv' })).status, 403);
    assert.equal(h.calls.length, 0);
  });
}
for (const path of ['', '/input.csv', 'a//b', 'a/../b', './a', 'a/.', 'a/', 'a\\b',
  'a/%2e%2e/b', 'a/%252f/b', 'a?b', 'a#b', 'a\u0000b', 'a\nb', ' a', null, 42, 'a'.repeat(1025)]) {
  test(`storage signed URL: rejects invalid path case ${JSON.stringify(path).slice(0, 45)}`, async () => {
    const h = load();
    assert.equal((await h.invoke({ bucket: 'csv-pipeline', path })).status, 400);
    assert.equal(h.calls.length, 0);
  });
}
for (const [expiresIn, expected] of [[undefined, 3600], [1, 60], [60, 60], [600, 600], [3600, 3600], [86400, 3600]]) {
  test(`storage signed URL: TTL ${expiresIn} bounded to ${expected}`, async () => {
    const h = load();
    assert.equal((await h.invoke({ bucket: 'csv-pipeline', path: 'fixture.csv', expiresIn })).status, 200);
    assert.equal(h.calls[0].ttl, expected);
  });
}
for (const expiresIn of ['3600', null, 0, -1, 1.5, {}, Number.MAX_SAFE_INTEGER + 1]) {
  test(`storage signed URL: rejects invalid TTL ${JSON.stringify(expiresIn)}`, async () => {
    const h = load();
    assert.equal((await h.invoke({ bucket: 'csv-pipeline', path: 'fixture.csv', expiresIn })).status, 400);
    assert.equal(h.calls.length, 0);
  });
}
for (const body of ['{broken', 'null', '[]', '42']) {
  test(`storage signed URL: malformed body ${body}`, async () => {
    const h = load();
    assert.equal((await h.invoke(body, 'synthetic-admin', 'POST', true)).status, 400);
    assert.equal(h.calls.length, 0);
  });
}
test('storage signed URL: rejected authentication promise fails closed and redacts error', async () => {
  const h = load({ auth: async () => { throw new Error('sensitive upstream detail'); } });
  const r = await h.invoke();
  assert.equal(r.status, 401);
  assert.doesNotMatch(await r.text(), /sensitive/);
  assert.equal(h.calls.length, 0);
  assert.equal(h.logs.length, 0);
});
for (const allowed of [true, false]) {
  test(`storage signed URL: pending auth (${allowed}) cannot reach storage`, async () => {
    let release!: (result: AuthResult) => void;
    const gate = new Promise<AuthResult>((done) => { release = done; });
    const h = load({ auth: () => gate });
    const pending = h.invoke();
    await new Promise<void>((done) => setImmediate(done));
    assert.equal(h.calls.length, 0);
    release(allowed ? okAuth('synthetic-admin') : { data: { user: null }, error: new Error('denied') });
    assert.equal((await pending).status, allowed ? 200 : 401);
    assert.equal(h.calls.length, allowed ? 1 : 0);
  });
}
test('storage signed URL: waits for asynchronous object authorization/signing', async () => {
  let release!: (result: SignedResult) => void;
  const gate = new Promise<SignedResult>((done) => { release = done; });
  const h = load({ sign: () => gate });
  let completed = false;
  const pending = h.invoke().then((r) => { completed = true; return r; });
  await new Promise<void>((done) => setImmediate(done));
  assert.equal(completed, false);
  release(unavailable());
  assert.equal((await pending).status, 404);
});
test('storage signed URL: rejected Storage promise is sanitized and never logged', async () => {
  const h = load({ sign: async () => { throw new Error('sensitive upstream detail'); } });
  const r = await h.invoke();
  assert.equal(r.status, 500);
  assert.doesNotMatch(await r.text(), /sensitive/);
  assert.equal(h.logs.length, 0);
});
test('storage signed URL: empty SDK result never exposes a capability', async () => {
  const h = load({ sign: async () => ({ data: null, error: null }) });
  assert.equal((await h.invoke()).status, 404);
});
test('storage signed URL: publishable key fallback retains user JWT', async () => {
  const h = load({ env: { SUPABASE_ANON_KEY: undefined, SUPABASE_PUBLISHABLE_KEY: 'synthetic-publishable' } });
  assert.equal((await h.invoke()).status, 200);
});
test('storage signed URL: missing configuration fails closed without signing', async () => {
  const h = load({ env: { SUPABASE_ANON_KEY: undefined } });
  assert.equal((await h.invoke()).status, 500);
  assert.equal(h.clients.length, 0);
});
