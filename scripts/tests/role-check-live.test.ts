import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Read-only release check: no test users, mutations, paid providers, or token output.
const sessionText = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const session = sessionText ? JSON.parse(sessionText) : undefined;
const settings = readFileSync('.env', 'utf8');
const setting = (key: string) => process.env[key] ?? settings.match(new RegExp(`^${key}=["']?([^"'\\r\\n]+)`, 'm'))?.[1];
const url = setting('VITE_SUPABASE_URL');
const apiKey = setting('VITE_SUPABASE_PUBLISHABLE_KEY');
async function rpc(name: string, body: object, token?: string) {
  assert.ok(url && apiKey, 'App connection must be configured');
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: apiKey, Authorization: `Bearer ${token ?? apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, value: await response.json() };
}
test('authenticated Admin can still check their own admin role', async () => {
  assert.ok(session?.user?.id && session?.access_token, 'Authorized Admin session required');
  const result = await rpc('has_role', { _user_id: session.user.id, _role: 'admin' }, session.access_token);
  assert.equal(result.status, 200);
  assert.equal(result.value, true);
});
test('authenticated caller cannot disclose the existing other editor role', async () => {
  assert.ok(session?.access_token, 'Authorized session required');
  const result = await rpc('has_role', { _user_id: '19f12250-ae40-4b75-8c55-7143f7c46891', _role: 'editor' }, session.access_token);
  assert.equal(result.status, 200);
  assert.equal(result.value, false);
});
test('anonymous callers remain denied execution of role checks', async () => {
  const result = await rpc('has_role', { _user_id: '19f12250-ae40-4b75-8c55-7143f7c46891', _role: 'editor' });
  assert.ok([401, 403].includes(result.status));
});
test('authenticated Admin retains edit permission through the dependent helper', async () => {
  assert.ok(session?.access_token && session?.user?.id, 'Authorized session required');
  const result = await rpc('can_edit_products', { _user_id: session.user.id }, session.access_token);
  assert.equal(result.status, 200);
  assert.equal(result.value, true);
});