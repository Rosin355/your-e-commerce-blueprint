import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adminDiagnosticStatus,
  canViewAdminDiagnostics,
  parseAdminDiagnostics,
} from '../../src/adminv2/lib/adminDiagnostics.ts';

const response = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  roles: ['admin'],
  writesEnabled: false,
  writeMode: 'canary',
  shopifySyncEnabled: false,
  ...overrides,
});

test('diagnostica visibile solo ai ruoli admin e tech_admin', () => {
  for (const roles of [undefined, null, [], ['editor'], ['publisher'], ['user'], 'admin']) {
    assert.equal(canViewAdminDiagnostics(roles), false);
    assert.equal(parseAdminDiagnostics(response({ roles })), null);
  }
  assert.equal(canViewAdminDiagnostics(['admin']), true);
  assert.equal(canViewAdminDiagnostics(['tech_admin']), true);
  assert.equal(canViewAdminDiagnostics(['editor', 'tech_admin']), true);
});

test('READ-ONLY richiede entrambi gli interruttori di scrittura spenti', () => {
  assert.equal(adminDiagnosticStatus(parseAdminDiagnostics(response())), 'READ-ONLY');
  assert.equal(adminDiagnosticStatus(parseAdminDiagnostics(response({ writeMode: 'full' }))), 'READ-ONLY');
  assert.equal(adminDiagnosticStatus(parseAdminDiagnostics(response({ writesEnabled: true }))), 'SCRITTURE ABILITATE');
  assert.equal(adminDiagnosticStatus(parseAdminDiagnostics(response({ shopifySyncEnabled: true }))), 'SCRITTURE ABILITATE');
});

test('risposte fallite, parziali o con tipi errati restano NON VERIFICATO', () => {
  for (const payload of [
    undefined,
    null,
    {},
    response({ ok: false }),
    response({ writesEnabled: undefined }),
    response({ writesEnabled: 'false' }),
    response({ shopifySyncEnabled: undefined }),
    response({ writeMode: undefined }),
    response({ writeMode: 'off' }),
  ]) {
    assert.equal(adminDiagnosticStatus(parseAdminDiagnostics(payload)), 'NON VERIFICATO');
  }
});

test('la diagnostica estrae solo i tre campi previsti e non propaga dati aggiuntivi', () => {
  const parsed = parseAdminDiagnostics(response({ unexpectedField: 'fixture' }));
  assert.deepEqual(parsed, {
    writesEnabled: false,
    writeMode: 'canary',
    shopifySyncEnabled: false,
  });
});
