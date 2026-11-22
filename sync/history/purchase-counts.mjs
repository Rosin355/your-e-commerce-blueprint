import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import {
  buildCustomerReport,
  parseCustomerCsv,
  sha256,
} from '../lib/customer-preflight.mjs';
import { privateDirectory, privatePath } from './import.mjs';
import { SHOP } from './shopify.mjs';

function check(ok, code) {
  if (!ok) throw new Error(code);
}
const read = (dir, name) => fs.readFileSync(privatePath(dir, name), 'utf8');
const sortedRows =
  'SELECT woo_id, purchases, role, assessment FROM accounts ORDER BY length(woo_id), woo_id';
const rowsDigest = (rows) =>
  sha256(
    JSON.stringify(
      rows.map((r) => [r.woo_id, r.purchases, r.role, r.assessment]),
    ),
  );
const dbName = 'registro.sqlite';

function checkedSnapshot(raw) {
  const s = JSON.parse(raw);
  const pages = s.pages ?? [{ ...s.customers, after: null }];
  check(Array.isArray(pages) && pages.length > 0, 'SNAPSHOT_INCOMPLETE');
  let cursor = null;
  const seen = new Set();
  for (const [index, page] of pages.entries()) {
    const more = index < pages.length - 1;
    check(
      Array.isArray(page.nodes) &&
        page.after === cursor &&
        page.pageInfo?.hasNextPage === more,
      'SNAPSHOT_INCOMPLETE',
    );
    if (more) {
      cursor = page.pageInfo.endCursor;
      check(
        page.nodes.length &&
          typeof cursor === 'string' &&
          cursor &&
          !seen.has(cursor),
        'SNAPSHOT_INCOMPLETE',
      );
      seen.add(cursor);
    }
  }
  const nodes = pages.flatMap((page) => page.nodes);
  check(
    s.shop?.myshopifyDomain === SHOP &&
      s.customersCount.precision === 'EXACT' &&
      s.countAfter.precision === 'EXACT' &&
      s.customersCount.count === nodes.length &&
      s.countAfter.count === nodes.length &&
      nodes.every((n) => /^gid:\/\/shopify\/Customer\/[1-9]\d*$/.test(n.id)) &&
      new Set(nodes.map((n) => n.id)).size === nodes.length,
    'SNAPSHOT_INCOMPLETE',
  );
  check(
    Number.isFinite(Date.parse(s.startedAt)) &&
      Date.parse(s.startedAt) <= Date.parse(s.exportedAt) &&
      Number.isFinite(Date.parse(s.exportedAt)) &&
      Date.parse(s.exportedAt) <= Date.now() + 300000,
    'INVALID_SNAPSHOT_TIME',
  );
  const contacts = [
    ['Email', 'Phone'],
    ...nodes.map((n) => [
      n.defaultEmailAddress?.emailAddress ?? '',
      n.defaultPhoneNumber?.phoneNumber ?? '',
    ]),
  ];
  const csv =
    contacts
      .map((row) =>
        row.map((v) => '"' + v.replaceAll('"', '""') + '"').join(','),
      )
      .join('\r\n') + '\r\n';
  const metadata = {
    schemaVersion: 2,
    complete: true,
    exportedAt: s.exportedAt,
    rowCount: nodes.length,
    sha256: sha256(csv),
    shopDomain: SHOP,
    coverage: {
      scope: 'all-customers',
      filtersApplied: false,
      startedAt: s.startedAt,
      countBefore: nodes.length,
      countAfter: nodes.length,
      countPrecision: 'EXACT',
      uniqueCustomerIds: nodes.length,
      cursorChainVerified: true,
      pages: pages.map((page) => ({
        rowCount: page.nodes.length,
        hasNextPage: page.pageInfo.hasNextPage,
      })),
    },
  };
  return { csv, metadata, nodes };
}

export function prepareCounts(sourceCsv, ordersCsv, snapshotRaw) {
  const snap = checkedSnapshot(snapshotRaw);
  const assessed = new Map();
  const report = buildCustomerReport(
    {
      sourceCsv,
      ordersCsv,
      snapshotCsv: snap.csv,
      snapshotMetadata: snap.metadata,
      expectedShop: SHOP,
      emailOnly: true,
      now: Date.parse(snap.metadata.exportedAt),
    },
    (id, state) => assessed.set(id, state),
  );
  check(
    report.shopifySnapshot.verified &&
      report.blockers.every((x) => x === 'SOURCE_QUARANTINE_REQUIRES_REVIEW'),
    'CENSUS_OR_IDENTITY_REVIEW_FAILED',
  );
  const source = parseCustomerCsv(sourceCsv, 'accounts');
  const roles = new Map(
    source.map((r) => [r.id ?? r.customer_id, r.roles ?? r.role]),
  );
  const rows = parseCustomerCsv(ordersCsv, 'orders')
    .filter((r) => Number(r.orders) > 0)
    .map((r) => {
      const woo_id = r.id ?? r.customer_id,
        role = roles.get(woo_id);
      check(role === 'customer' || role === 'author', 'UNEXPECTED_ROLE');
      const result = assessed.get(woo_id);
      const assessment =
        role === 'author'
          ? 'author'
          : result === 'existing'
            ? 'email_review'
            : result === 'candidate'
              ? 'candidate'
              : 'quarantine';
      return { woo_id, purchases: Number(r.orders), role, assessment };
    })
    .sort(
      (a, b) =>
        a.woo_id.length - b.woo_id.length || (a.woo_id < b.woo_id ? -1 : 1),
    );
  check(
    rows.length === 858 &&
      rows.reduce((s, r) => s + r.purchases, 0) === 953 &&
      rows.filter((r) => r.role === 'author' && r.purchases === 1).length ===
        1 &&
      rows.filter((r) => r.role === 'customer').length === 857 &&
      rows.filter((r) => r.assessment === 'quarantine').length ===
        report.outcomes.quarantined,
    'COHORT_MISMATCH',
  );
  return {
    rows,
    accountsHash: sha256(sourceCsv),
    countsHash: sha256(ordersCsv),
    snapshotHash: sha256(snapshotRaw),
  };
}

function open(dir, writable) {
  const parent = privateDirectory(dir);
  if (writable) {
    try {
      fs.closeSync(fs.openSync(path.join(parent, dbName), 'wx', 0o600));
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
  const db = new DatabaseSync(privatePath(parent, dbName), {
    readOnly: !writable,
  });
  db.exec(
    'PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA trusted_schema=OFF;',
  );
  return db;
}
function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
function verify(db) {
  check(
    db.prepare('PRAGMA integrity_check').get().integrity_check === 'ok' &&
      !db.prepare('PRAGMA foreign_key_check').get(),
    'ARCHIVE_INTEGRITY',
  );
  const rows = db.prepare(sortedRows).all();
  const manifest = db.prepare('SELECT * FROM archive WHERE singleton=1').get();
  check(
    manifest &&
      rows.length === 858 &&
      rows.reduce((sum, r) => sum + r.purchases, 0) === 953 &&
      rows.every(
        (r) =>
          /^[1-9]\d*$/.test(r.woo_id) &&
          Number.isSafeInteger(r.purchases) &&
          r.purchases > 0,
      ) &&
      rows.filter((r) => r.role === 'author' && r.purchases === 1).length ===
        1 &&
      rows.filter((r) => r.role === 'customer').length === 857 &&
      rowsDigest(rows) === manifest.rows_hash,
    'ARCHIVE_READBACK_MISMATCH',
  );
  const links = db.prepare('SELECT woo_id, gid FROM verified_links').all();
  const mappings = new Map(links.map((x) => [x.woo_id, x.gid]));
  check(
    links.every((l) =>
      rows.some(
        (r) =>
          r.woo_id === l.woo_id &&
          ['candidate', 'email_review'].includes(r.assessment),
      ),
    ),
    'LINK_NOT_ELIGIBLE',
  );
  return {
    rows: rows.map((r) => ({
      ...r,
      shopify_gid: mappings.get(r.woo_id) ?? null,
    })),
    manifest,
  };
}
export function archiveCounts(dir, input) {
  const db = open(dir, true);
  try {
    return transaction(db, () => {
      db.exec(`CREATE TABLE IF NOT EXISTS archive(singleton INTEGER PRIMARY KEY CHECK(singleton=1), accounts_hash TEXT NOT NULL,
      counts_hash TEXT NOT NULL, snapshot_hash TEXT NOT NULL, rows_hash TEXT NOT NULL, imported_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS accounts(woo_id TEXT PRIMARY KEY NOT NULL,purchases INTEGER NOT NULL CHECK(purchases>0),
      role TEXT NOT NULL CHECK(role IN ('customer','author')),assessment TEXT NOT NULL CHECK(assessment IN ('author','quarantine','email_review','candidate')),
      CHECK((role='author')=(assessment='author'))) STRICT;
      CREATE TABLE IF NOT EXISTS verified_links(woo_id TEXT PRIMARY KEY REFERENCES accounts(woo_id),gid TEXT UNIQUE NOT NULL,
      evidence_hash TEXT NOT NULL,approved_at TEXT NOT NULL,recorded_at TEXT NOT NULL) STRICT;`);
      const prev = db.prepare('SELECT * FROM archive WHERE singleton=1').get();
      const digest = rowsDigest(input.rows);
      if (prev) {
        check(
          prev.accounts_hash === input.accountsHash &&
            prev.counts_hash === input.countsHash &&
            prev.rows_hash === digest,
          'SOURCE_OR_ASSESSMENT_CHANGED',
        );
      } else {
        const add = db.prepare('INSERT INTO accounts VALUES(?,?,?,?)');
        for (const r of input.rows)
          add.run(r.woo_id, r.purchases, r.role, r.assessment);
        db.prepare('INSERT INTO archive VALUES(1,?,?,?,?,?)').run(
          input.accountsHash,
          input.countsHash,
          input.snapshotHash,
          digest,
          new Date().toISOString(),
        );
      }
      verify(db);
      return prev ? 'ALREADY_ARCHIVED' : 'ARCHIVED';
    });
  } finally {
    db.close();
  }
}

// A staff decision refers to distinct evidence of control of each identity. Nothing is written to Shopify.
export function recordVerifiedLink(dir, decision, snapshotRaw) {
  const snap = checkedSnapshot(snapshotRaw);
  const approved = Date.parse(decision.approvedAt),
    collected = Date.parse(snap.metadata.exportedAt);
  check(
    approved <= Date.now() &&
      collected <= Date.now() + 300000 &&
      collected >= Date.now() - 86400000 &&
      decision.shop === SHOP &&
      snap.nodes.some((n) => n.id === decision.gid) &&
      decision.verified === true &&
      [
        decision.reviewer,
        decision.authorization,
        decision.legacyOwnershipEvidence,
        decision.shopifyOwnershipEvidence,
      ].every((x) => typeof x === 'string' && x.trim()) &&
      decision.legacyOwnershipEvidence.trim() !==
        decision.shopifyOwnershipEvidence.trim(),
    'INDEPENDENT_REVIEW_REQUIRED',
  );
  privatePath(dir, dbName);
  const writable = open(dir, true);
  try {
    return transaction(writable, () => {
      verify(writable);
      const row = writable
        .prepare('SELECT assessment FROM accounts WHERE woo_id=?')
        .get(decision.wooId);
      check(
        row && ['candidate', 'email_review'].includes(row.assessment),
        'LINK_NOT_ELIGIBLE',
      );
      const hash = sha256(
        JSON.stringify([
          decision.wooId,
          decision.gid,
          decision.approvedAt,
          decision.reviewer,
          decision.authorization,
          decision.legacyOwnershipEvidence,
          decision.shopifyOwnershipEvidence,
        ]),
      );
      const existing = writable
        .prepare('SELECT * FROM verified_links WHERE woo_id=? OR gid=?')
        .all(decision.wooId, decision.gid);
      if (existing.length) {
        check(
          existing.length === 1 && existing[0].evidence_hash === hash,
          'LINK_CONFLICT',
        );
        return 'ALREADY_LINKED';
      }
      writable
        .prepare('INSERT INTO verified_links VALUES(?,?,?,?,?)')
        .run(
          decision.wooId,
          decision.gid,
          hash,
          decision.approvedAt,
          new Date().toISOString(),
        );
      return 'VERIFIED_LINK_RECORDED';
    });
  } finally {
    writable.close();
  }
}
export function readCounts(dir) {
  const db = open(dir, false);
  try {
    return verify(db);
  } finally {
    db.close();
  }
}
function replacePrivate(dir, name, data) {
  const target = privatePath(dir, name, true);
  const stage = fs.mkdtempSync(path.join(dir, '.stage-'));
  const file = path.join(stage, 'output');
  try {
    fs.writeFileSync(file, data, { flag: 'wx', mode: 0o600, flush: true });
    fs.renameSync(file, target);
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}
export function deliverViewer(dir) {
  const { rows } = readCounts(dir);
  replacePrivate(
    dir,
    'conteggi.json',
    JSON.stringify({ format: 'onlinegarden-purchase-counts-v1', rows }),
  );
  replacePrivate(
    dir,
    'Consulta storico.html',
    fs.readFileSync(
      new URL('../../src/legacy-counts/viewer.html', import.meta.url),
    ),
  );
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    process.umask(0o077);
    const [mode, target, source] = process.argv.slice(2);
    const dir = privateDirectory(target);
    if (mode === 'import' || mode === 'link') {
      const inputs = privateDirectory(source),
        snapshot = read(inputs, 'snapshot-input.json');
      const result =
        mode === 'import'
          ? archiveCounts(
              dir,
              prepareCounts(
                read(inputs, 'sheet2-minimo.csv'),
                read(inputs, 'id-orders.csv'),
                snapshot,
              ),
            )
          : recordVerifiedLink(
              dir,
              JSON.parse(read(inputs, 'decision.json')),
              snapshot,
            );
      console.log(result);
    } else check(['verify', 'viewer'].includes(mode), 'MODE_REQUIRED');
    if (mode === 'viewer' || mode === 'link') deliverViewer(dir);
    const { rows } = readCounts(dir);
    const states = {};
    for (const r of rows)
      states[r.assessment] = (states[r.assessment] ?? 0) + 1;
    console.log(
      JSON.stringify({
        accounts: rows.length,
        purchases: rows.reduce((n, r) => n + r.purchases, 0),
        linked: rows.filter((r) => r.shopify_gid !== null).length,
        states,
      }),
    );
  } catch (err) {
    console.error(
      /^[A-Z][A-Z_]+$/.test(err.message)
        ? err.message
        : 'PRIVATE_REGISTRY_ERROR',
    );
    process.exitCode = 2;
  }
}
