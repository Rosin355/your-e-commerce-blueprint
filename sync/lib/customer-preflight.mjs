// Offline-only: no network, environment, credentials, logging or customer export.
import { createHash } from 'node:crypto';

export class PreflightError extends Error {}
const fail = (code) => { throw new PreflightError(code); };
const sourceColumns = new Set([
  'id', 'customer_id', 'role', 'roles', 'orders', 'email', 'user_email', 'billing_email',
  'first_name', 'last_name', 'billing_first_name', 'billing_last_name', 'billing_phone',
  'billing_company', 'billing_address_1', 'billing_address_2', 'billing_city',
  'billing_state', 'billing_country', 'billing_postcode',
]);
const snapshotColumns = new Set(['email', 'phone']);
const orderColumns = new Set(['id', 'customer_id', 'orders']);
const isNullLiteral = (value) => /^null$/i.test(value?.trim() ?? '');
const orderCount = (value) => /^(0|[1-9]\d*)$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
const validId = (value) => typeof value === 'string' && /^[1-9]\d*$/.test(value);
const exactKeys = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every((k) => Object.hasOwn(value, k));
const countries = new Set(('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' '));

export const sha256 = (text) => createHash('sha256').update(text).digest('hex');

// Strict RFC-style CSV: reject broken quoting, ragged rows and duplicate headers.
export function parseCustomerCsv(text, kind = 'source') {
  if (!['source', 'accounts', 'orders', 'snapshot'].includes(kind)) fail('INPUT_KIND_NOT_ALLOWED');
  if (typeof text !== 'string' || text.length > 32 * 1024 * 1024 || text.includes('\0') || text.includes('\uFFFD')) fail('INPUT_ENCODING_OR_SIZE');
  text = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', state = 'start';
  const endField = () => { row.push(field); field = ''; state = 'start'; };
  const endRow = () => { endField(); rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (state === 'quoted') {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') state = 'closed';
      else field += c;
      continue;
    }
    if (c === ',') endField();
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      endRow();
    } else if (state === 'closed') fail('INPUT_CSV_QUOTING');
    else if (c === '"') {
      if (state !== 'start') fail('INPUT_CSV_QUOTING');
      state = 'quoted';
    } else { field += c; state = 'plain'; }
  }
  if (state === 'quoted') fail('INPUT_CSV_QUOTING');
  if (field || row.length || state !== 'start') endRow();
  if (!rows.length) fail('INPUT_EMPTY');
  const headers = rows.shift().map((h) => h.trim().toLowerCase());
  const allowed = kind === 'snapshot' ? snapshotColumns : kind === 'orders' ? orderColumns : sourceColumns;
  if (new Set(headers).size !== headers.length) fail('INPUT_DUPLICATE_COLUMNS');
  if (headers.some((h) => !allowed.has(h))) fail('INPUT_COLUMNS_NOT_ALLOWED');
  const has = (...keys) => keys.some((k) => headers.includes(k));
  if (kind === 'snapshot' ? !has('email') || !has('phone') :
    !has('id', 'customer_id') || (kind !== 'accounts' && !has('orders')) ||
    (kind !== 'orders' && (!has('role', 'roles') || !has('email', 'user_email', 'billing_email')))) fail('INPUT_REQUIRED_COLUMNS');
  if (['accounts', 'orders'].includes(kind) && headers.includes('id') && headers.includes('customer_id')) fail('INPUT_ID_COLUMN_AMBIGUOUS');
  if (kind === 'accounts' && headers.includes('orders')) fail('INPUT_ORDERS_ALREADY_PRESENT');
  if (rows.some((r) => r.length !== headers.length)) fail('INPUT_ROW_WIDTH');
  return rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i].trim()])));
}

function email(value = '') {
  const s = value.trim().toLowerCase();
  const parts = s.split('@');
  if (s.length > 254 || parts.length !== 2 || parts[0].length > 64 || parts[0].includes('..') || parts[0].endsWith('.')) return null;
  if (!/^[a-z0-9][a-z0-9.!#$%&'*+/=?^_`{|}~-]*$/.test(parts[0])) return null;
  const labels = parts[1].split('.');
  return labels.length >= 2 && labels.every((v) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(v)) && /^[a-z]{2,63}$/.test(labels.at(-1)) ? s : null;
}
function phone(value = '') {
  if (!value) return '';
  if (!value.startsWith('+')) return null;
  const s = value.replace(/[ ().-]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}
// Comparison evidence only: never rewrite a source field or infer a country code.
function phoneEvidence(value = '') {
  const international = phone(value);
  if (international) return { kind: 'international', digits: international.slice(1) };
  if (!value) return { kind: 'absent', digits: '' };
  const compact = value.replace(/[ ().-]/g, '');
  if (/^[0-9(][0-9 ().-]*$/.test(value) && /^(?:\d{7,15}|00\d{7,15})$/.test(compact)) return { kind: 'national', digits: compact };
  return { kind: 'malformed', digits: '' };
}
function comparePhones(a, b) {
  if (!a.digits || !b.digits) return null;
  if (a.kind === 'international' && b.kind === 'international') return a.digits === b.digits ? 'exact' : null;
  // Suffix/00 evidence is only a reason to STOP for private review, never a match
  // authorizing an identity merge. Leading zeroes remain part of the evidence.
  const possible = a.digits.endsWith(b.digits) || b.digits.endsWith(a.digits) ||
    (a.digits.startsWith('00') && a.digits.slice(2) === b.digits) ||
    (b.digits.startsWith('00') && b.digits.slice(2) === a.digits);
  return possible ? 'ambiguous' : null;
}
function ambiguousSourcePhones(prepared) {
  const ambiguous = new Set();
  const numbered = prepared.map((r, index) => ({ evidence: r.phoneEvidence, index })).filter((r) => r.evidence.digits);
  for (let i = 0; i < numbered.length; i++) {
    for (let j = i + 1; j < numbered.length; j++) {
      if (comparePhones(numbered[i].evidence, numbered[j].evidence) === 'ambiguous') {
        ambiguous.add(numbered[i].index); ambiguous.add(numbered[j].index);
      }
    }
  }
  return ambiguous;
}
const privilegedRole = (row) => ['role', 'roles'].some((key) =>
  row[key]?.toLowerCase().split(/[\s,;|]+/).some((v) => ['administrator', 'author'].includes(v)));

function aliases(row, keys, normalize = (v) => v) {
  const values = keys.map((k) => row[k]).filter(Boolean).map((v) => isNullLiteral(v) ? null : normalize(v));
  return values.includes(null) || new Set(values).size > 1 ? null : values[0] ?? '';
}
const safeText = (s) => s.length <= 255 && !/[\x00-\x1f\x7f]/.test(s) && !/^[=+@-]/.test(s);
const frequencies = (values) => {
  const counts = new Map();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
};

// Join only two already-minimized files, in memory. No positional/email matching,
// default-zero, order summation or arbitrary winner for duplicate IDs.
function inspectSource(sourceCsv, ordersCsv) {
  if (ordersCsv === undefined) return { rows: parseCustomerCsv(sourceCsv), extraction: { mode: 'prejoined-input' }, blockers: [] };
  const accounts = parseCustomerCsv(sourceCsv, 'accounts');
  const orders = parseCustomerCsv(ordersCsv, 'orders');
  const id = (r) => r.id ?? r.customer_id;
  const accountIds = frequencies(accounts.map(id));
  const orderIds = frequencies(orders.map(id));
  const index = new Map(orders.filter((r) => validId(id(r)) && orderIds.get(id(r)) === 1).map((r) => [id(r), r.orders]));
  const extraction = {
    mode: 'id-orders-join', selectedRows: accounts.length, orderRows: orders.length,
    matchedRows: 0, missingOrderRows: 0, ambiguousSelectedRows: 0,
    invalidSelectedIds: accounts.filter((r) => !validId(id(r))).length,
    duplicateSelectedIdGroups: [...accountIds.values()].filter((n) => n > 1).length,
    invalidOrderIds: orders.filter((r) => !validId(id(r))).length,
    duplicateOrderIdGroups: [...orderIds.values()].filter((n) => n > 1).length,
    invalidOrderValues: orders.filter((r) => orderCount(r.orders) === null).length,
    orderRowsOutsideSelection: orders.filter((r) => !accountIds.has(id(r))).length,
    buyersOutsideSelection: orders.filter((r) => !accountIds.has(id(r)) && orderCount(r.orders) > 0).length,
    orderSourceBuyers: orders.filter((r) => orderCount(r.orders) > 0).length,
    orderSourceHistoricalOrders: orders.reduce((sum, r) => sum + (orderCount(r.orders) ?? 0), 0),
  };
  const rows = accounts.map((r) => {
    const key = id(r);
    if (!validId(key) || accountIds.get(key) > 1 || orderIds.get(key) > 1) { extraction.ambiguousSelectedRows++; return { ...r, orders: '' }; }
    if (!index.has(key)) { extraction.missingOrderRows++; return { ...r, orders: '' }; }
    extraction.matchedRows++;
    return { ...r, orders: index.get(key) };
  });
  const unsafe = ['missingOrderRows', 'ambiguousSelectedRows', 'invalidSelectedIds', 'duplicateSelectedIdGroups', 'invalidOrderIds', 'duplicateOrderIdGroups', 'invalidOrderValues', 'buyersOutsideSelection'].some((k) => extraction[k] > 0);
  return { rows, extraction, blockers: unsafe ? ['SOURCE_JOIN_REQUIRES_REVIEW'] : [] };
}

function profileValid(row) {
  for (const keys of [['billing_first_name', 'first_name'], ['billing_last_name', 'last_name']]) {
    const value = aliases(row, keys);
    if (value === null || !safeText(value)) return false;
  }
  const addressKeys = ['billing_company', 'billing_address_1', 'billing_address_2', 'billing_city', 'billing_state', 'billing_country', 'billing_postcode'];
  if (addressKeys.some((k) => !safeText(row[k] ?? ''))) return false;
  if (!addressKeys.some((k) => row[k])) return true;
  if (!['billing_address_1', 'billing_city', 'billing_country', 'billing_postcode'].every((k) => row[k])) return false;
  const country = row.billing_country.toUpperCase();
  if (!countries.has(country)) return false;
  return country !== 'IT' || (/^\d{5}$/.test(row.billing_postcode) && (!row.billing_state || /^[A-Za-z]{2}$/.test(row.billing_state)));
}

function inspectSnapshot(text, metadata, expectedShop, now) {
  if (text === undefined) return { available: false, valid: false, rows: [], blockers: ['SHOPIFY_SNAPSHOT_MISSING'] };
  const rows = parseCustomerCsv(text, 'snapshot');
  const keys = ['schemaVersion', 'complete', 'exportedAt', 'rowCount', 'sha256', 'shopDomain', 'coverage'];
  const exported = Date.parse(metadata?.exportedAt);
  const coverage = metadata?.coverage;
  const nonnegativeInteger = (n) => Number.isSafeInteger(n) && n >= 0;
  const started = Date.parse(coverage?.startedAt);
  const validCoverage = exactKeys(coverage, ['scope', 'filtersApplied', 'startedAt', 'countBefore', 'countAfter', 'countPrecision', 'uniqueCustomerIds', 'cursorChainVerified', 'pages']) &&
    coverage.scope === 'all-customers' && coverage.filtersApplied === false && coverage.countPrecision === 'EXACT' &&
    typeof coverage.startedAt === 'string' && /Z$/.test(coverage.startedAt) && Number.isFinite(started) && started <= exported && now - started <= 86400000 &&
    [coverage.countBefore, coverage.countAfter, coverage.uniqueCustomerIds].every((n) => nonnegativeInteger(n) && n === rows.length) &&
    coverage.cursorChainVerified === true && Array.isArray(coverage.pages) && coverage.pages.length > 0 &&
    coverage.pages.every((p, i, pages) => exactKeys(p, ['rowCount', 'hasNextPage']) && nonnegativeInteger(p.rowCount) &&
      (p.rowCount > 0 || (pages.length === 1 && rows.length === 0)) && p.hasNextPage === (i < pages.length - 1)) &&
    coverage.pages.reduce((sum, p) => sum + p.rowCount, 0) === rows.length;
  const validMetadata = exactKeys(metadata, keys) &&
    metadata.schemaVersion === 2 && metadata.complete === true && metadata.rowCount === rows.length && validCoverage &&
    /^[a-f0-9]{64}$/.test(metadata.sha256) && metadata.sha256 === sha256(text) &&
    typeof expectedShop === 'string' && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(expectedShop) && metadata.shopDomain === expectedShop &&
    typeof metadata.exportedAt === 'string' && /Z$/.test(metadata.exportedAt) && Number.isFinite(exported) && now - exported >= -300000 && now - exported <= 86400000;
  const normalized = rows.map((r) => ({ email: r.email ? email(r.email) : '', phone: phone(r.phone) }));
  const emails = frequencies(normalized.map((r) => r.email));
  const validRows = normalized.every((r) => r.email !== null && r.phone !== null && (r.email || r.phone) && (!r.email || emails.get(r.email) === 1));
  return { available: true, valid: Boolean(validMetadata && validRows), rows: normalized, blockers: validMetadata && validRows ? [] : ['SHOPIFY_SNAPSHOT_UNVERIFIED'] };
}

// Only aggregate constants/counts leave this function. Personal values stay in memory.
export function buildCustomerReport({ sourceCsv, ordersCsv, snapshotCsv, snapshotMetadata, expectedShop, now = Date.now(), synthetic = false, emailOnly = false }) {
  if (typeof emailOnly !== 'boolean') fail('ASSESSMENT_MODE_NOT_ALLOWED');
  const { rows, extraction, blockers: sourceBlockers } = inspectSource(sourceCsv, ordersCsv);
  const snapshot = inspectSnapshot(snapshotCsv, snapshotMetadata, expectedShop, now);
  const prepared = rows.map((r) => ({
    row: r,
    id: aliases(r, ['id', 'customer_id']),
    email: aliases(r, ['email', 'user_email', 'billing_email'], email),
    phone: phone(r.billing_phone),
    phoneEvidence: phoneEvidence(r.billing_phone),
    privileged: privilegedRole(r),
    orders: orderCount(r.orders),
    roles: aliases(r, ['role', 'roles'], (v) => v.toLowerCase()),
    nullLiteral: Object.values(r).some(isNullLiteral),
    nonE164Phone: Boolean(r.billing_phone && !isNullLiteral(r.billing_phone) && phone(r.billing_phone) === null),
  }));
  // Include every source row in collision checks, even out-of-cohort/staff rows.
  const ids = frequencies(prepared.map((r) => r.id));
  const allEmails = prepared.flatMap((r) => [...new Set(['email', 'user_email', 'billing_email'].map((k) => email(r.row[k])).filter(Boolean))]);
  const emails = frequencies(allEmails);
  const phones = frequencies(prepared.map((r) => r.phone));
  const existingEmails = new Set(snapshot.rows.map((r) => r.email).filter(Boolean));
  const existingPhones = new Set(snapshot.rows.map((r) => r.phone).filter(Boolean));
  const ambiguousSource = emailOnly ? ambiguousSourcePhones(prepared) : new Set();
  const snapshotPhones = snapshot.rows.map((r) => phoneEvidence(r.phone ?? ''));
  const snapshotEmailIndex = new Map(snapshot.rows.map((r, i) => [r.email, i]).filter(([value]) => value));
  const customerBuyers = prepared.filter((r) => r.orders > 0 && r.roles === 'customer' && !r.privileged);

  const report = {
    schemaVersion: 3,
    mode: 'offline-dry-run',
    assessmentMode: emailOnly ? 'email-only' : 'strict',
    privateIdentityReviewRequired: true,
    dataKind: synthetic ? 'synthetic' : 'private-unverified',
    productionAuthorized: false,
    networkRequests: 0, customerWrites: 0, personalArtifactsWritten: 0,
    expected: { accountsWithOrders: 858, historicalOrders: 953 },
    observed: { sourceRows: rows.length, accountsWithOrders: 0, historicalOrders: 0 },
    extraction,
    cohortRoles: {
      customerBuyers: customerBuyers.length,
      privilegedBuyers: prepared.filter((r) => r.orders > 0 && r.privileged).length,
      otherOrMissingRoleBuyers: prepared.filter((r) => r.orders > 0 && !r.privileged && r.roles !== 'customer').length,
    },
    phoneAssessment: {
      sourceValuesChanged: 0, phoneExportAllowed: false,
      sourcePhoneColumnSupplied: rows.some((r) => Object.hasOwn(r, 'billing_phone')),
      buyerRowsWithE164Phone: prepared.filter((r) => r.orders > 0 && r.phoneEvidence.kind === 'international').length,
      customerBuyerRowsWithNationalPhone: customerBuyers.filter((r) => r.phoneEvidence.kind === 'national').length,
      customerBuyerRowsWithBlankPhone: customerBuyers.filter((r) => r.phoneEvidence.kind === 'absent').length,
      customerBuyerRowsWithMalformedPhone: customerBuyers.filter((r) => r.phoneEvidence.kind === 'malformed').length,
    },
    sourceQuality: {
      rowsWithNullLiteral: prepared.filter((r) => r.nullLiteral).length,
      buyerRowsWithNullLiteral: prepared.filter((r) => r.orders > 0 && r.nullLiteral).length,
      buyerRowsWithNonE164Phone: prepared.filter((r) => r.orders > 0 && r.nonE164Phone).length,
      buyerRowsWithBlankPhone: prepared.filter((r) => r.orders > 0 && !r.row.billing_phone).length,
    },
    outcomes: { excludedPrivileged: 0, excludedOtherRole: 0, excludedNoOrders: 0, quarantined: 0, existingEmailSkipped: 0, existingPhoneSkipped: 0, unmatchedAwaitingSnapshot: 0, unmatchedAwaitingSourceReview: 0, emailOnlyReviewCandidates: 0, proposedNew: 0 },
    reasons: { invalidRole: 0, invalidOrders: 0, invalidId: 0, duplicateId: 0, invalidOrConflictingEmail: 0, duplicateEmail: 0, invalidPhone: 0, nonE164Phone: 0, nullLiteral: 0, duplicatePhone: 0, ambiguousSourcePhone: 0, ambiguousShopifyPhone: 0, conflictingShopifyIdentity: 0, invalidProfile: 0 },
    collisions: { duplicateEmailGroups: [...emails.values()].filter((v) => v > 1).length },
    shopifySnapshot: { supplied: snapshot.available, verified: snapshot.valid, liveCompletenessProven: false, rows: snapshot.rows.length },
    marketing: { emailEnabled: 0, smsEnabled: 0, whatsappEnabled: 0 },
    blockers: [...sourceBlockers, ...snapshot.blockers],
  };
  const { outcomes, reasons, observed } = report;
  for (const [index, r] of prepared.entries()) {
    if (r.orders > 0) { observed.accountsWithOrders++; observed.historicalOrders += r.orders; }
    if (r.privileged) { outcomes.excludedPrivileged++; continue; }
    if (!r.roles) { reasons.invalidRole++; outcomes.quarantined++; continue; }
    if (r.roles !== 'customer') { outcomes.excludedOtherRole++; continue; }
    if (r.orders === null) { reasons.invalidOrders++; outcomes.quarantined++; continue; }
    if (r.orders === 0) { outcomes.excludedNoOrders++; continue; }
    const exactSnapshotPhones = [];
    let ambiguousShopifyPhone = false;
    if (emailOnly && snapshot.valid) {
      for (const [i, evidence] of snapshotPhones.entries()) {
        const comparison = comparePhones(r.phoneEvidence, evidence);
        if (comparison === 'exact') exactSnapshotPhones.push(i);
        if (comparison === 'ambiguous') ambiguousShopifyPhone = true;
      }
    }
    const emailIndex = snapshotEmailIndex.get(r.email);
    const phoneInvalid = emailOnly ? r.phoneEvidence.kind === 'malformed' : r.phone === null;
    const checks = {
      invalidId: !r.id || !/^[1-9]\d*$/.test(r.id),
      duplicateId: r.id && ids.get(r.id) > 1,
      invalidOrConflictingEmail: !r.email,
      duplicateEmail: r.email && emails.get(r.email) > 1,
      invalidPhone: phoneInvalid,
      nonE164Phone: r.nonE164Phone && (!emailOnly || phoneInvalid),
      nullLiteral: r.nullLiteral,
      duplicatePhone: r.phone && phones.get(r.phone) > 1,
      ambiguousSourcePhone: ambiguousSource.has(index),
      ambiguousShopifyPhone: ambiguousShopifyPhone || exactSnapshotPhones.length > 1,
      conflictingShopifyIdentity: emailOnly && emailIndex !== undefined && exactSnapshotPhones.some((i) => i !== emailIndex),
      invalidProfile: !profileValid(r.row),
    };
    if (Object.values(checks).some(Boolean)) {
      outcomes.quarantined++;
      for (const [key, value] of Object.entries(checks)) if (value) reasons[key]++;
    } else if (sourceBlockers.length) outcomes.unmatchedAwaitingSourceReview++;
    else if (!snapshot.valid) outcomes.unmatchedAwaitingSnapshot++;
    else if (existingEmails.has(r.email)) outcomes.existingEmailSkipped++;
    else if (r.phone && existingPhones.has(r.phone)) outcomes.existingPhoneSkipped++;
    else if (emailOnly) outcomes.emailOnlyReviewCandidates++;
    else outcomes.proposedNew++;
  }
  if (observed.accountsWithOrders !== 858 || observed.historicalOrders !== 953) report.blockers.push('HISTORICAL_TOTALS_MISMATCH');
  if (outcomes.quarantined) report.blockers.push('SOURCE_QUARANTINE_REQUIRES_REVIEW');
  if (outcomes.excludedOtherRole) report.blockers.push('OTHER_ROLES_REQUIRE_REVIEW');
  report.status = report.blockers.length ? 'BLOCKED' : emailOnly ? 'OFFLINE_EMAIL_ONLY_REVIEW_REQUIRED' : 'OFFLINE_REVIEW_COMPLETE';
  return report;
}
