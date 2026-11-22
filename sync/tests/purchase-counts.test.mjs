import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { syntheticEmailOnlyScenario } from './customer-fixtures.mjs';
import { parseCustomerCsv } from '../lib/customer-preflight.mjs';
import { SHOP } from '../history/shopify.mjs';
import {
  archiveCounts,
  prepareCounts,
  recordVerifiedLink,
  readCounts,
  deliverViewer,
} from '../history/purchase-counts.mjs';

function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'og-count-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const { sourceCsv, ordersCsv, snapshotCsv } = syntheticEmailOnlyScenario();
  const nodes = parseCustomerCsv(snapshotCsv, 'snapshot').map((r, i) => ({
    id: 'gid://shopify/Customer/' + (i + 1),
    defaultEmailAddress: { emailAddress: r.email },
    defaultPhoneNumber: { phoneNumber: r.phone },
  }));
  const time = new Date().toISOString(),
    count = { count: nodes.length, precision: 'EXACT' };
  const snapshot = JSON.stringify({
    shop: { myshopifyDomain: SHOP },
    startedAt: time,
    exportedAt: time,
    customersCount: count,
    countAfter: count,
    customers: { nodes, pageInfo: { hasNextPage: false } },
  });
  return {
    dir,
    sourceCsv,
    ordersCsv,
    snapshot,
    input: prepareCounts(sourceCsv, ordersCsv, snapshot),
  };
}
test('archivia tutti i conteggi, conserva i ruoli e rifiuta fonti duplicate o non riconciliate', (t) => {
  const { dir, sourceCsv, ordersCsv, snapshot, input } = setup(t);
  assert.throws(
    () => prepareCounts(sourceCsv, ordersCsv + '"1","1"\r\n', snapshot),
    /CENSUS/,
  );
  assert.throws(
    () =>
      prepareCounts(
        sourceCsv,
        ordersCsv,
        JSON.stringify({
          ...JSON.parse(snapshot),
          countAfter: { count: 0, precision: 'EXACT' },
        }),
      ),
    /INCOMPLETE/,
  );
  const paginated = JSON.parse(snapshot);
  const nodes = paginated.customers.nodes;
  delete paginated.customers;
  paginated.pages = [
    {
      after: null,
      nodes: nodes.slice(0, 4),
      pageInfo: { hasNextPage: true, endCursor: 'page-1' },
    },
    {
      after: 'page-1',
      nodes: nodes.slice(4),
      pageInfo: { hasNextPage: false },
    },
  ];
  assert.deepEqual(
    prepareCounts(sourceCsv, ordersCsv, JSON.stringify(paginated)).rows,
    input.rows,
  );
  paginated.pages[1].after = 'broken';
  assert.throws(
    () => prepareCounts(sourceCsv, ordersCsv, JSON.stringify(paginated)),
    /INCOMPLETE/,
  );
  assert.equal(archiveCounts(dir, input), 'ARCHIVED');
  assert.equal(archiveCounts(dir, input), 'ALREADY_ARCHIVED');
  assert.throws(
    () => archiveCounts(dir, { ...input, countsHash: 'changed' }),
    /CHANGED/,
  );
  const { rows } = readCounts(dir);
  assert.equal(rows.length, 858);
  assert.equal(
    rows.reduce((sum, r) => sum + r.purchases, 0),
    953,
  );
  assert.equal(rows.filter((r) => r.role === 'author').length, 1);
  assert.equal(rows.filter((r) => r.shopify_gid !== null).length, 0);
  deliverViewer(dir);
  const view = fs.readFileSync(path.join(dir, 'conteggi.json'), 'utf8');
  assert.doesNotMatch(view, /@example|billing_|phoneNumber/);
  for (const file of fs.readdirSync(dir))
    assert.equal(fs.statSync(path.join(dir, file)).mode & 0o077, 0);
  const db = new DatabaseSync(path.join(dir, 'registro.sqlite'));
  assert.equal(db.prepare('SELECT count(*) AS n FROM archive').get().n, 1);
  db.exec(
    'UPDATE accounts SET purchases=purchases+1 WHERE woo_id=(SELECT MIN(woo_id) FROM accounts)',
  );
  db.close();
  assert.throws(() => readCounts(dir), /READBACK/);
});
test('il collegamento richiede prove distinte e decisione, esclude autore e quarantena, vieta doppi legami', (t) => {
  const { dir, input, snapshot } = setup(t);
  const candidate = input.rows.find((r) => r.assessment === 'candidate');
  const other = input.rows.find(
    (r) => r.assessment === 'candidate' && r !== candidate,
  );
  const blocked = input.rows.find(
    (r) => r.assessment === 'candidate' && r !== candidate && r !== other,
  );
  blocked.assessment = 'quarantine';
  archiveCounts(dir, input);
  const d = {
    wooId: candidate.woo_id,
    gid: 'gid://shopify/Customer/1',
    approvedAt: new Date().toISOString(),
    shop: SHOP,
    reviewer: 'staff-test',
    authorization: 'decision-test',
    verified: true,
    legacyOwnershipEvidence: 'proof-old',
    shopifyOwnershipEvidence: 'proof-new',
  };
  for (const patch of [
    { verified: false },
    { shopifyOwnershipEvidence: d.legacyOwnershipEvidence },
    { gid: 'gid://shopify/Customer/999' },
  ])
    assert.throws(
      () => recordVerifiedLink(dir, { ...d, ...patch }, snapshot),
      /REVIEW/,
    );
  for (const id of [
    blocked.woo_id,
    input.rows.find((r) => r.role === 'author').woo_id,
  ])
    assert.throws(
      () => recordVerifiedLink(dir, { ...d, wooId: id }, snapshot),
      /NOT_ELIGIBLE/,
    );
  assert.equal(recordVerifiedLink(dir, d, snapshot), 'VERIFIED_LINK_RECORDED');
  assert.equal(recordVerifiedLink(dir, d, snapshot), 'ALREADY_LINKED');
  assert.throws(
    () => recordVerifiedLink(dir, { ...d, wooId: other.woo_id }, snapshot),
    /CONFLICT/,
  );
  assert.equal(
    readCounts(dir).rows.filter((r) => r.shopify_gid === d.gid).length,
    1,
  );
});
