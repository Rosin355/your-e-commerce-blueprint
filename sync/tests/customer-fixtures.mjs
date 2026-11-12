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
    snapshotMetadata: { schemaVersion: 1, complete: true, exportedAt: '2026-11-12T11:00:00Z', rowCount: 1, sha256: sha256(snapshotCsv), shopDomain: 'fixture-only.myshopify.com' },
    expectedShop: 'fixture-only.myshopify.com', now, synthetic: true,
  };
}
