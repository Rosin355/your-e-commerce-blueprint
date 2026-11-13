import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildCustomerReport, parseCustomerCsv, sha256 } from '../lib/customer-preflight.mjs';
import { fixtureHeaders, encodeCsv, syntheticRows, syntheticScenario, syntheticCoverage, syntheticJoinScenario } from './customer-fixtures.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const reportFor = (change) => { const rows = syntheticRows(); change(rows); return buildCustomerReport(syntheticScenario(rows)); };
function snapshot(scenario, rows) {
  scenario.snapshotCsv = encodeCsv([['email', 'phone'], ...rows]);
  scenario.snapshotMetadata.rowCount = rows.length;
  scenario.snapshotMetadata.sha256 = sha256(scenario.snapshotCsv);
  scenario.snapshotMetadata.coverage = syntheticCoverage(rows.length);
  return scenario;
}
function invoke(script, args, cwd = root) {
  return spawnSync(process.execPath, ['--require', path.join(root, 'ci/offline-network.cjs'), path.join(root, 'sync', script), ...args], {
    cwd, encoding: 'utf8', env: { PATH: process.env.PATH, SHOPIFY_ADMIN_ACCESS_TOKEN: 'SYNTHETIC_NOT_A_SECRET', WOO_CUSTOMERS_CSV_PATH: '/must-not-be-read', SHOPIFY_ADMIN_SHOP: 'fixture-only.myshopify.com' },
  });
}
function privateDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'og-synthetic-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('reconciles 1108 synthetic rows, 858 buyers, 953 orders; existing profile skipped', () => {
  const report = buildCustomerReport(syntheticScenario());
  assert.equal(report.status, 'OFFLINE_REVIEW_COMPLETE');
  assert.deepEqual(report.observed, { sourceRows: 1108, accountsWithOrders: 858, historicalOrders: 953 });
  assert.equal(report.outcomes.proposedNew, 857);
  assert.equal(report.outcomes.existingEmailSkipped, 1);
  assert.equal(report.outcomes.excludedNoOrders, 248);
  assert.equal(report.outcomes.excludedPrivileged, 2);
  assert.equal(Object.values(report.outcomes).reduce((a, b) => a + b, 0), 1108);
  assert.equal(report.productionAuthorized, false);
  assert.equal(report.networkRequests + report.customerWrites + report.personalArtifactsWritten, 0);
  assert.deepEqual(report.marketing, { emailEnabled: 0, smsEnabled: 0, whatsappEnabled: 0 });
});

test('missing snapshot never classifies a row as new', () => {
  const report = buildCustomerReport({ sourceCsv: syntheticScenario().sourceCsv });
  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.outcomes.proposedNew, 0);
  assert.equal(report.outcomes.unmatchedAwaitingSnapshot, 858);
  assert.ok(report.blockers.includes('SHOPIFY_SNAPSHOT_MISSING'));
});

test('email aliases support cleaned and Woo schemas, trim/case normalization', () => {
  for (const name of ['email', 'user_email', 'billing_email']) {
    const scenario = syntheticScenario();
    scenario.sourceCsv = scenario.sourceCsv.replace('"email"', `"${name}"`).replace('"fixture-1@example.invalid"', '" FIXTURE-1@EXAMPLE.INVALID "');
    assert.equal(buildCustomerReport(scenario).outcomes.existingEmailSkipped, 1);
  }
});

test('ambiguous aliases quarantine and are also included in global collisions', () => {
  const rows = syntheticRows().map((row, i) => [...row, i === 0 ? 'fixture-2@example.invalid' : '']);
  const scenario = syntheticScenario();
  scenario.sourceCsv = encodeCsv([[...fixtureHeaders, 'user_email'], ...rows]);
  const report = buildCustomerReport(scenario);
  assert.equal(report.reasons.invalidOrConflictingEmail, 1);
  assert.equal(report.reasons.duplicateEmail, 1);
});

test('duplicate email has no arbitrary winner, including duplicates outside cohort', () => {
  const report = reportFor((rows) => { rows[1][3] = rows[0][3].toUpperCase(); rows[858][3] = rows[2][3]; });
  assert.equal(report.reasons.duplicateEmail, 3);
  assert.equal(report.collisions.duplicateEmailGroups, 2);
  assert.equal(report.outcomes.quarantined, 3);
  assert.equal(report.status, 'BLOCKED');
});

test('privileged and multi-role accounts excluded even with orders', () => {
  const report = reportFor((rows) => { rows[0][1] = 'CUSTOMER, Administrator'; rows[1][1] = 'author'; });
  assert.equal(report.outcomes.excludedPrivileged, 4);
  assert.equal(report.outcomes.proposedNew, 856);
});

test('missing/unknown roles fail closed', () => {
  const report = reportFor((rows) => { rows[0][1] = ''; rows[1][1] = 'editor'; rows[2][1] = 'customer;shop_manager'; });
  assert.equal(report.reasons.invalidRole, 1);
  assert.equal(report.outcomes.excludedOtherRole, 2);
  assert.equal(report.status, 'BLOCKED');
});

test('orders require nonnegative safe integers and exact historical totals', () => {
  for (const bad of ['-1', '1.5', '1e2', 'x', '', '9007199254740992']) {
    const report = reportFor((rows) => { rows[0][2] = bad; });
    assert.equal(report.reasons.invalidOrders, 1);
    assert.ok(report.blockers.includes('HISTORICAL_TOTALS_MISMATCH'));
  }
  assert.ok(reportFor((rows) => { rows[0][2] = '3'; }).blockers.includes('HISTORICAL_TOTALS_MISMATCH'));
});

test('invalid and duplicate IDs quarantined', () => {
  const report = reportFor((rows) => { rows[0][0] = ''; rows[1][0] = rows[2][0]; });
  assert.equal(report.reasons.invalidId, 1);
  assert.equal(report.reasons.duplicateId, 2);
});

test('invalid emails, controls and spreadsheet formulas never become candidates', () => {
  for (const bad of ['a@@example.invalid', 'a..b@example.invalid', 'a@-example.invalid', '=cmd@example.invalid', 'x\ny@example.invalid', 'x@domain', 'x@exämple.invalid']) {
    assert.equal(reportFor((rows) => { rows[0][3] = bad; }).reasons.invalidOrConflictingEmail, 1);
  }
  for (const bad of ['=HYPERLINK("synthetic")', '@SUM(A1)', 'Name\rInjected', 'x'.repeat(256)]) {
    assert.equal(reportFor((rows) => { rows[0][4] = bad; }).reasons.invalidProfile, 1);
  }
});

test('optional phones: no guessing country, source collisions quarantine, snapshot collisions skip', () => {
  const report = reportFor((rows) => { rows[0][6] = '+39 (000) 000 0001'; rows[1][6] = '+390000000001'; rows[2][6] = '000123456'; });
  assert.equal(report.reasons.duplicatePhone, 2);
  assert.equal(report.reasons.invalidPhone, 1);
  const rows = syntheticRows(); rows[1][6] = '+390000000002';
  const scenario = snapshot(syntheticScenario(rows), [['different@example.invalid', '+390000000002']]);
  assert.equal(buildCustomerReport(scenario).outcomes.existingPhoneSkipped, 1);
});

test('address minimum completeness, country and Italian postcode validated', () => {
  const headers = [...fixtureHeaders, 'billing_address_1', 'billing_city', 'billing_country', 'billing_postcode'];
  for (const address of [['Via Sintetica', 'Citta Fixture', 'IT', '00000'], ['Via Sintetica', '', 'IT', '00000'], ['Via Sintetica', 'Citta Fixture', 'ZZ', '00000'], ['Via Sintetica', 'Citta Fixture', 'IT', 'oops']]) {
    const scenario = syntheticScenario();
    scenario.sourceCsv = encodeCsv([headers, ...syntheticRows().map((r, i) => [...r, ...(i ? ['', '', '', ''] : address)])]);
    assert.equal(buildCustomerReport(scenario).reasons.invalidProfile, address[1] && address[2] === 'IT' && address[3] === '00000' ? 0 : 1);
  }
});

test('snapshot integrity, completeness, freshness, shop binding and row quality are mandatory', () => {
  const mutations = [
    (s) => { s.snapshotMetadata.complete = false; },
    (s) => { s.snapshotMetadata.rowCount++; },
    (s) => { s.snapshotMetadata.sha256 = '0'.repeat(64); },
    (s) => { s.snapshotMetadata.shopDomain = 'wrong.myshopify.com'; },
    (s) => { s.snapshotMetadata.exportedAt = '2026-11-10T00:00:00Z'; },
    (s) => { s.snapshotMetadata.exportedAt = '2026-11-13T00:00:00Z'; },
    (s) => { s.snapshotMetadata.secret = 'SYNTHETIC_SENTINEL'; },
    (s) => snapshot(s, [['broken', '']]),
    (s) => snapshot(s, [['', '']]),
    (s) => snapshot(s, [['same@example.invalid', ''], ['SAME@example.invalid', '']]),
    (s) => snapshot(s, [['same@example.invalid', '123']]),
  ];
  for (const mutate of mutations) {
    const scenario = syntheticScenario(); mutate(scenario);
    const report = buildCustomerReport(scenario);
    assert.equal(report.status, 'BLOCKED');
    assert.equal(report.outcomes.proposedNew, 0);
    assert.equal(report.shopifySnapshot.verified, false);
  }
  assert.equal(buildCustomerReport(snapshot(syntheticScenario(), [['', '+390000000000']])).shopifySnapshot.verified, true);
  assert.equal(buildCustomerReport(snapshot(syntheticScenario(), [])).shopifySnapshot.verified, true);
});

test('CSV supports BOM, CRLF, quotes and embedded delimiters; malformed CSV rejected', () => {
  assert.equal(parseCustomerCsv('\uFEFF' + syntheticScenario().sourceCsv).length, 1108);
  assert.equal(parseCustomerCsv('ID,role,orders,email,first_name\r\n1,customer,1,x@example.invalid,"Synthetic, ""Quoted"""')[0].first_name, 'Synthetic, "Quoted"');
  for (const csv of ['ID,role,orders,email\n1,customer,1,"unclosed', 'ID,role,orders,email\n1,customer,1,"x"z', 'ID,role,orders,email\n1,customer,1,x"y', 'ID,role,orders,email\n1,customer', 'ID,role,orders,email,Email\n1,customer,1,a,b', 'email\nx@example.invalid', '', 'ID,role,orders,email\n1,customer,1,\uFFFD']) assert.throws(() => parseCustomerCsv(csv));
});

test('security, consent and unknown columns reject the whole input without echoing values', () => {
  for (const header of ['user_pass', 'session_tokens', 'password', 'token', 'marketing_consent', 'note', '__proto__']) {
    assert.throws(() => parseCustomerCsv(`ID,role,orders,email,${header}\n1,customer,1,x@example.invalid,SYNTHETIC_SENTINEL`), { message: 'INPUT_COLUMNS_NOT_ALLOWED' });
  }
});

test('report contains only aggregates, fixed codes and policy values; deterministic', () => {
  const scenario = syntheticScenario();
  const report = JSON.stringify(buildCustomerReport(scenario));
  assert.equal(report, JSON.stringify(buildCustomerReport(scenario)));
  for (const value of ['@', 'Cliente sintetico', 'Fixture', 'fixture-only', '+39', 'user_pass']) assert.ok(!report.includes(value));
});

test('both entry points run synthetic offline and reject all write/unknown flags', () => {
  for (const script of ['customers-convert.mjs', 'customers-sync-shopify.mjs']) {
    const success = invoke(script, ['--synthetic']);
    assert.equal(success.status, 0, success.stderr);
    assert.equal(JSON.parse(success.stdout).outcomes.proposedNew, 857);
    for (const flag of ['--write', '--apply', '--execute', '--force', '--dryrun', '--limit']) {
      const result = invoke(script, ['--synthetic', flag]);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /ARGUMENTS_NOT_ALLOWED/);
    }
    assert.equal(invoke(script, []).status, 1);
    assert.equal(invoke(script, ['--dry-run']).status, 1);
  }
});

test('CLI redacts file paths, parser errors and security sentinels', (t) => {
  const dir = privateDirectory(t);
  const file = path.join(dir, 'personal-name@example.invalid.csv');
  fs.writeFileSync(file, 'ID,role,orders,email,user_pass\n1,customer,1,private@example.invalid,SYNTHETIC_SECURITY_SENTINEL');
  for (const args of [['--input', file], ['--input', file + '-absent'], ['--synthetic', '--input', file], ['--input', file, '--input', file]]) {
    const result = invoke('customers-convert.mjs', args);
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout + result.stderr, /@|SYNTHETIC_SECURITY_SENTINEL|og-synthetic-test|Error:| at /);
  }
});

test('output is opt-in, aggregate-only, mode 0600 and never overwrites/symlink-follows', (t) => {
  const dir = privateDirectory(t);
  const output = path.join(dir, 'report.json');
  const first = invoke('customers-convert.mjs', ['--synthetic', '--report', output], dir);
  assert.equal(first.status, 0);
  assert.equal(fs.statSync(output).mode & 0o777, 0o600);
  const original = fs.readFileSync(output, 'utf8');
  assert.doesNotMatch(original, /@|Cliente sintetico/);
  assert.equal(invoke('customers-convert.mjs', ['--synthetic', '--report', output]).status, 1);
  const link = path.join(dir, 'link.json'); fs.symlinkSync(output, link);
  assert.equal(invoke('customers-convert.mjs', ['--synthetic', '--report', link]).status, 1);
  assert.equal(fs.readFileSync(output, 'utf8'), original);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['link.json', 'report.json']);
});

test('CLI reads only explicit minimized inputs and reports BLOCKED with exit 2 without snapshot', (t) => {
  const dir = privateDirectory(t);
  const file = path.join(dir, 'customers.csv');
  fs.writeFileSync(file, syntheticScenario().sourceCsv);
  fs.writeFileSync(path.join(dir, '.env'), 'WOO_CUSTOMERS_CSV_PATH=/must-not-be-read\nSHOPIFY_ADMIN_ACCESS_TOKEN=SYNTHETIC_SENTINEL');
  const result = invoke('customers-sync-shopify.mjs', ['--dry-run', '--input', file], dir);
  assert.equal(result.status, 2);
  assert.equal(JSON.parse(result.stdout).outcomes.unmatchedAwaitingSnapshot, 858);
  assert.doesNotMatch(result.stdout + result.stderr, /@|SYNTHETIC_SENTINEL/);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['.env', 'customers.csv']);
});

test('full private CLI path binds metadata to exact bytes, destination and recent time', (t) => {
  const dir = privateDirectory(t);
  const scenario = syntheticScenario();
  scenario.snapshotMetadata.exportedAt = new Date().toISOString();
  scenario.snapshotMetadata.coverage.startedAt = scenario.snapshotMetadata.exportedAt;
  fs.writeFileSync(path.join(dir, 'source.csv'), scenario.sourceCsv);
  fs.writeFileSync(path.join(dir, 'snapshot.csv'), scenario.snapshotCsv);
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(scenario.snapshotMetadata));
  const args = ['--input', path.join(dir, 'source.csv'), '--snapshot', path.join(dir, 'snapshot.csv'), '--snapshot-metadata', path.join(dir, 'metadata.json'), '--shop', scenario.expectedShop];
  const result = invoke('customers-convert.mjs', args);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).dataKind, 'private-unverified');
  fs.writeFileSync(path.join(dir, 'metadata.json'), '{private@example.invalid');
  const failure = invoke('customers-convert.mjs', args);
  assert.equal(failure.status, 1);
  assert.doesNotMatch(failure.stderr, /@/);
});

test('supports full archive shape and an explicitly minimized 858-row cohort', () => {
  const full = Array.from({ length: 5453 }, (_, i) => [String(i + 1), i >= 5450 ? (i === 5452 ? 'author' : 'administrator') : 'customer', String(i < 95 ? 2 : i < 858 ? 1 : 0), `fixture-${i + 1}@example.invalid`, 'Cliente sintetico', 'Fixture', '']);
  const fullReport = buildCustomerReport(syntheticScenario(full));
  assert.equal(fullReport.status, 'OFFLINE_REVIEW_COMPLETE');
  assert.equal(fullReport.observed.sourceRows, 5453);
  assert.equal(fullReport.outcomes.excludedPrivileged, 3);
  assert.equal(fullReport.outcomes.excludedNoOrders, 4592);
  const cohortReport = buildCustomerReport(syntheticScenario(full.slice(0, 858)));
  assert.equal(cohortReport.status, 'OFFLINE_REVIEW_COMPLETE');
  assert.equal(cohortReport.observed.sourceRows, 858);
  assert.equal(cohortReport.outcomes.proposedNew, 857);
});

test('joins minimized Sheet2 shape with ID/orders only, independent of row order', () => {
  const scenario = syntheticJoinScenario();
  const report = buildCustomerReport(scenario);
  assert.equal(report.status, 'OFFLINE_REVIEW_COMPLETE');
  assert.deepEqual(report.observed, { sourceRows: 1108, accountsWithOrders: 858, historicalOrders: 953 });
  assert.deepEqual(report.extraction, {
    mode: 'id-orders-join', selectedRows: 1108, orderRows: 5453, matchedRows: 1108,
    missingOrderRows: 0, ambiguousSelectedRows: 0, invalidSelectedIds: 0,
    duplicateSelectedIdGroups: 0, invalidOrderIds: 0, duplicateOrderIdGroups: 0,
    invalidOrderValues: 0, orderRowsOutsideSelection: 4345, buyersOutsideSelection: 0,
    orderSourceBuyers: 858, orderSourceHistoricalOrders: 953,
  });
  assert.equal(report.outcomes.excludedNoOrders, 248);
  assert.equal(report.outcomes.excludedPrivileged, 2);
  assert.equal(report.outcomes.proposedNew, 857);
  scenario.ordersCsv = encodeCsv([['customer_id', 'orders'], ...parseCustomerCsv(scenario.ordersCsv, 'orders').map((r) => [r.id, r.orders])]);
  assert.deepEqual(buildCustomerReport(scenario), report);
});

test('join fails closed for missing, duplicate, noncanonical IDs, null orders and buyers outside selection', () => {
  const base = parseCustomerCsv(syntheticJoinScenario().ordersCsv, 'orders');
  const cases = [
    [base.filter((r) => r.id !== '1'), 'missingOrderRows'],
    [[...base, { id: '1', orders: '2' }], 'duplicateOrderIdGroups'],
    [[...base, { id: '1109', orders: '0' }], 'duplicateOrderIdGroups'],
    [base.map((r) => r.id === '1' ? { id: '01', orders: '2' } : r), 'invalidOrderIds'],
    [base.map((r) => r.id === '1' ? { ...r, orders: ' null ' } : r), 'invalidOrderValues'],
    [base.map((r) => r.id === '1109' ? { ...r, orders: '1' } : r), 'buyersOutsideSelection'],
  ];
  for (const [rows, reason] of cases) {
    const scenario = syntheticJoinScenario();
    scenario.ordersCsv = encodeCsv([['ID', 'orders'], ...rows.map((r) => [r.id, r.orders])]);
    const report = buildCustomerReport(scenario);
    assert.ok(report.extraction[reason] > 0, reason);
    assert.equal(report.status, 'BLOCKED');
    assert.ok(report.blockers.includes('SOURCE_JOIN_REQUIRES_REVIEW'));
    assert.equal(report.outcomes.proposedNew, 0);
    assert.equal(Object.values(report.outcomes).reduce((sum, n) => sum + n, 0), 1108);
    assert.doesNotMatch(JSON.stringify(report), /@|Cliente sintetico/);
  }
});

test('join never chooses a duplicate selected ID or treats an absent match as zero orders', () => {
  for (const badId of ['2', '01', 'null', '']) {
    const scenario = syntheticJoinScenario();
    const rows = parseCustomerCsv(scenario.sourceCsv, 'accounts');
    rows[0].id = badId;
    scenario.sourceCsv = encodeCsv([fixtureHeaders.filter((h) => h !== 'orders'), ...rows.map((r) => [r.id, r.role, r.email, r.first_name, r.last_name, r.billing_phone])]);
    const report = buildCustomerReport(scenario);
    assert.ok(report.extraction.ambiguousSelectedRows > 0);
    assert.equal(report.outcomes.proposedNew, 0);
    assert.equal(report.outcomes.excludedNoOrders, 248);
  }
  const scenario = syntheticJoinScenario();
  scenario.ordersCsv = 'ID,orders\n';
  const report = buildCustomerReport(scenario);
  assert.equal(report.extraction.missingOrderRows, 1108);
  assert.equal(report.outcomes.excludedNoOrders, 0);
});

test('join accepts only already-minimized schemas; no sensitive fields or ambiguous ID aliases', () => {
  const scenario = syntheticJoinScenario();
  for (const column of ['user_pass', 'session_tokens', 'email', 'token']) {
    assert.throws(() => buildCustomerReport({ ...scenario, ordersCsv: `ID,orders,${column}\n1,2,SYNTHETIC_SENTINEL` }), { message: 'INPUT_COLUMNS_NOT_ALLOWED' });
  }
  assert.throws(() => buildCustomerReport({ ...scenario, ordersCsv: 'ID,customer_id,orders\n1,1,2' }), { message: 'INPUT_ID_COLUMN_AMBIGUOUS' });
  assert.throws(() => buildCustomerReport({ ...scenario, sourceCsv: syntheticScenario().sourceCsv }), { message: 'INPUT_ORDERS_ALREADY_PRESENT' });
  assert.throws(() => parseCustomerCsv(scenario.sourceCsv), { message: 'INPUT_REQUIRED_COLUMNS' });
  assert.throws(() => parseCustomerCsv('Email,Phone\n', 'unknown'), { message: 'INPUT_KIND_NOT_ALLOWED' });
});

test('literal null is never silently converted into optional empty text or a valid alias', () => {
  for (const column of ['first_name', 'last_name', 'billing_phone', 'billing_company', 'billing_address_2']) {
    for (const value of ['null', ' NULL ', 'NuLl']) {
      const scenario = syntheticScenario();
      const rows = parseCustomerCsv(scenario.sourceCsv);
      rows[0][column] = value;
      const headers = [...new Set([...fixtureHeaders.map((h) => h.toLowerCase()), column])];
      scenario.sourceCsv = encodeCsv([headers, ...rows.map((r) => headers.map((h) => r[h] ?? ''))]);
      const report = buildCustomerReport(scenario);
      assert.equal(report.reasons.nullLiteral, 1);
      assert.equal(report.sourceQuality.buyerRowsWithNullLiteral, 1);
      assert.equal(report.outcomes.quarantined, 1);
    }
  }
  const rows = syntheticRows().map((row, i) => [...row, i === 0 ? 'null' : '']);
  const scenario = syntheticScenario();
  scenario.sourceCsv = encodeCsv([[...fixtureHeaders, 'user_email'], ...rows]);
  assert.equal(buildCustomerReport(scenario).reasons.invalidOrConflictingEmail, 1);
  for (const index of [0, 1, 2, 3]) {
    const report = reportFor((rows) => { rows[0][index] = 'null'; });
    assert.equal(report.outcomes.quarantined, 1);
    assert.equal(report.sourceQuality.rowsWithNullLiteral, 1);
  }
});

test('blank optional fields remain absent; nulls and non-E.164 phones have separate aggregate counts', () => {
  const report = reportFor((rows) => {
    rows[0][6] = '3331234567'; rows[1][6] = '00393331234567';
    rows[2][6] = 'null'; rows[3][6] = '+invalid'; rows[858][4] = 'null';
  });
  assert.deepEqual(report.sourceQuality, {
    rowsWithNullLiteral: 2, buyerRowsWithNullLiteral: 1,
    buyerRowsWithNonE164Phone: 3, buyerRowsWithBlankPhone: 854,
  });
  assert.equal(report.reasons.nonE164Phone, 3);
  assert.equal(report.reasons.invalidPhone, 4);
  assert.equal(report.outcomes.quarantined, 4);
  assert.equal(report.outcomes.excludedNoOrders, 248);
  assert.equal(buildCustomerReport(syntheticScenario()).outcomes.quarantined, 0);
});

test('snapshot v1/complete/checksum alone cannot establish coverage; evidence is operator-attested', () => {
  const scenario = syntheticScenario();
  scenario.snapshotMetadata.schemaVersion = 1;
  delete scenario.snapshotMetadata.coverage;
  const report = buildCustomerReport(scenario);
  assert.equal(report.shopifySnapshot.verified, false);
  assert.equal(report.outcomes.proposedNew, 0);
  assert.equal(buildCustomerReport(syntheticScenario()).shopifySnapshot.liveCompletenessProven, false);
});

test('snapshot rejects partial pages, count drift, filters, approximate counts and duplicate-ID attestations', () => {
  const cases = [
    (c) => { c.scope = 'selected-customers'; },
    (c) => { c.filtersApplied = true; },
    (c) => { c.countBefore = 2; },
    (c) => { c.countAfter = 2; },
    (c) => { c.countPrecision = 'AT_LEAST'; },
    (c) => { c.uniqueCustomerIds = 0; },
    (c) => { c.cursorChainVerified = false; },
    (c) => { c.pages = []; },
    (c) => { c.pages[0].hasNextPage = true; },
    (c) => { c.pages[0].rowCount = 2; },
    (c) => { c.pages[0].rowCount = -1; },
    (c) => { c.pages[0].cursor = 'SYNTHETIC_SENTINEL'; },
    (c) => { c.pages = [{ rowCount: 1, hasNextPage: false }, { rowCount: 0, hasNextPage: false }]; },
    (c) => { c.startedAt = '2026-11-12T11:01:00Z'; },
    (c) => { c.startedAt = '2026-11-10T00:00:00Z'; },
    (c) => { c.startedAt = 'invalid'; },
    (c) => { c.extra = true; },
  ];
  for (const change of cases) {
    const scenario = syntheticScenario(); change(scenario.snapshotMetadata.coverage);
    const report = buildCustomerReport(scenario);
    assert.equal(report.shopifySnapshot.verified, false);
    assert.equal(report.outcomes.proposedNew, 0);
  }
  for (const coverage of [null, [], 'invalid', {}]) {
    const scenario = syntheticScenario(); scenario.snapshotMetadata.coverage = coverage;
    assert.equal(buildCustomerReport(scenario).shopifySnapshot.verified, false);
  }
});

test('all pages must close in order and sum to the exact customer count, including truly empty stores', () => {
  const scenario = snapshot(syntheticScenario(), [['fixture-1@example.invalid', ''], ['other@example.invalid', '']]);
  scenario.snapshotMetadata.coverage.pages = [{ rowCount: 1, hasNextPage: true }, { rowCount: 1, hasNextPage: false }];
  assert.equal(buildCustomerReport(scenario).shopifySnapshot.verified, true);
  assert.equal(buildCustomerReport(snapshot(syntheticScenario(), [])).shopifySnapshot.verified, true);
  const empty = snapshot(syntheticScenario(), []);
  empty.snapshotMetadata.coverage.countBefore = 1;
  assert.equal(buildCustomerReport(empty).shopifySnapshot.verified, false);
  for (const value of ['null', ' NULL ']) {
    assert.equal(buildCustomerReport(snapshot(syntheticScenario(), [[value, '']])).shopifySnapshot.verified, false);
    assert.equal(buildCustomerReport(snapshot(syntheticScenario(), [['valid@example.invalid', value]])).shopifySnapshot.verified, false);
  }
});

test('both CLI entry points support explicit minimized ID/orders join without leaking identities', (t) => {
  const dir = privateDirectory(t);
  const scenario = syntheticJoinScenario();
  fs.writeFileSync(path.join(dir, 'accounts.csv'), scenario.sourceCsv);
  fs.writeFileSync(path.join(dir, 'orders.csv'), scenario.ordersCsv);
  scenario.snapshotMetadata.exportedAt = new Date().toISOString();
  scenario.snapshotMetadata.coverage.startedAt = scenario.snapshotMetadata.exportedAt;
  fs.writeFileSync(path.join(dir, 'snapshot.csv'), scenario.snapshotCsv);
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(scenario.snapshotMetadata));
  for (const script of ['customers-convert.mjs', 'customers-sync-shopify.mjs']) {
    const args = ['--input', path.join(dir, 'accounts.csv'), '--orders', path.join(dir, 'orders.csv')];
    const result = invoke(script, args);
    assert.equal(result.status, 2, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.extraction.matchedRows, 1108);
    assert.equal(report.outcomes.unmatchedAwaitingSnapshot, 858);
    assert.doesNotMatch(result.stdout + result.stderr, /@|og-synthetic-test|Cliente sintetico/);
    const complete = invoke(script, [...args, '--snapshot', path.join(dir, 'snapshot.csv'), '--snapshot-metadata', path.join(dir, 'metadata.json'), '--shop', scenario.expectedShop]);
    assert.equal(complete.status, 0, complete.stderr);
    assert.equal(JSON.parse(complete.stdout).outcomes.proposedNew, 857);
    assert.equal(JSON.parse(complete.stdout).dataKind, 'private-unverified');
    assert.doesNotMatch(complete.stdout + complete.stderr, /@|og-synthetic-test|Cliente sintetico/);
    assert.equal(invoke(script, ['--synthetic', '--orders', path.join(dir, 'orders.csv')]).status, 1);
  }
  fs.writeFileSync(path.join(dir, 'orders.csv'), 'ID,orders,user_pass\n1,2,SYNTHETIC_SENTINEL');
  const failure = invoke('customers-convert.mjs', ['--input', path.join(dir, 'accounts.csv'), '--orders', path.join(dir, 'orders.csv')]);
  assert.equal(failure.status, 1);
  assert.doesNotMatch(failure.stdout + failure.stderr, /@|SYNTHETIC_SENTINEL|og-synthetic-test/);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['accounts.csv', 'metadata.json', 'orders.csv', 'snapshot.csv']);
});
