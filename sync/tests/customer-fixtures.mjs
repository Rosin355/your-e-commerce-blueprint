// Generated identities are exclusively synthetic; reserved .invalid domain.
import { sha256 } from '../lib/customer-preflight.mjs';
export const fixtureHeaders = ['ID', 'role', 'orders', 'email', 'first_name', 'last_name', 'billing_phone'];
export const encodeCsv = (rows) => rows.map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n';
export function syntheticRows() {
  return Array.from({ length: 1108 }, (_, i) => [
    String(i + 1), i === 1106 ? 'administrator' : i === 1107 ? 'author' : 'customer',
    String(i < 95 ? 2 : i < 858 ? 1 : 0), `fixture-${i + 1}@example.invalid`, 'Cliente sintetico', 'Fixture', '',
  ]);
}
export function syntheticScenario(rows = syntheticRows()) {
  const snapshotCsv = encodeCsv([['Email', 'Phone'], ['FIXTURE-1@example.invalid', '']]);
  const now = Date.parse('2026-11-12T12:00:00Z');
  return {
    sourceCsv: encodeCsv([fixtureHeaders, ...rows]), snapshotCsv,
    snapshotMetadata: { schemaVersion: 2, complete: true, exportedAt: '2026-11-12T11:00:00Z', rowCount: 1, sha256: sha256(snapshotCsv), shopDomain: 'fixture-only.myshopify.com', coverage: syntheticCoverage(1) },
    expectedShop: 'fixture-only.myshopify.com', now, synthetic: true,
  };
}
export function syntheticCoverage(rowCount) {
  return {
    scope: 'all-customers', filtersApplied: false, startedAt: '2026-11-12T10:59:00Z',
    countBefore: rowCount, countAfter: rowCount, countPrecision: 'EXACT', uniqueCustomerIds: rowCount,
    cursorChainVerified: true, pages: [{ rowCount, hasNextPage: false }],
  };
}

export function syntheticJoinScenario() {
  const scenario = syntheticScenario();
  scenario.sourceCsv = encodeCsv([fixtureHeaders.filter((h) => h !== 'orders'), ...syntheticRows().map((r) => r.filter((_, i) => i !== 2))]);
  // Different order proves that neither source position nor email is a join key.
  scenario.ordersCsv = encodeCsv([['ID', 'orders'], ...syntheticRows().map((r) => [r[0], r[2]]).reverse(), ...Array.from({ length: 4345 }, (_, i) => [String(i + 1109), '0'])]);
  return scenario;
}

// New scenario reflects aggregate role/phone counts from 13 Nov; every value is
// invented. Prefix 000 in the national fixtures intentionally avoids real mobiles.
export function syntheticEmailOnlyScenario() {
  const rows = syntheticRows();
  rows[857][1] = 'author';
  rows[1107][1] = 'customer';
  for (let i = 0; i < 858; i++) rows[i][6] = i < 90 ? `+390000${String(i + 1).padStart(6, '0')}` : `000${String(i + 1).padStart(7, '0')}`;
  const scenario = syntheticScenario(rows);
  scenario.sourceCsv = encodeCsv([fixtureHeaders.filter((h) => h !== 'orders'), ...rows.map((r) => r.filter((_, i) => i !== 2))]);
  scenario.ordersCsv = encodeCsv([['ID', 'orders'], ...rows.map((r) => [r[0], r[2]]).reverse(), ...Array.from({ length: 4345 }, (_, i) => [String(i + 1109), '0'])]);
  const customers = Array.from({ length: 12 }, (_, i) => [i === 0 ? 'fixture-1@example.invalid' : i === 11 ? '' : `shopify-only-${i}@example.invalid`, `+440000${String(i + 9000).padStart(6, '0')}`]);
  scenario.snapshotCsv = encodeCsv([['Email', 'Phone'], ...customers]);
  Object.assign(scenario.snapshotMetadata, { rowCount: 12, sha256: sha256(scenario.snapshotCsv), coverage: syntheticCoverage(12) });
  scenario.emailOnly = true;
  return scenario;
}
