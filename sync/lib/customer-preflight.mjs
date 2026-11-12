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
const countries = new Set(('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' '));

export const sha256 = (text) => createHash('sha256').update(text).digest('hex');

// Strict RFC-style CSV: reject broken quoting, ragged rows and duplicate headers.
export function parseCustomerCsv(text, kind = 'source') {
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
  const allowed = kind === 'source' ? sourceColumns : snapshotColumns;
  if (new Set(headers).size !== headers.length) fail('INPUT_DUPLICATE_COLUMNS');
  if (headers.some((h) => !allowed.has(h))) fail('INPUT_COLUMNS_NOT_ALLOWED');
  const has = (...keys) => keys.some((k) => headers.includes(k));
  if (kind === 'source' ? !has('id', 'customer_id') || !has('role', 'roles') || !has('orders') || !has('email', 'user_email', 'billing_email') : !has('email') || !has('phone')) fail('INPUT_REQUIRED_COLUMNS');
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
  const s = value.replace(/[ ().-]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}
function aliases(row, keys, normalize = (v) => v) {
  const values = keys.map((k) => row[k]).filter(Boolean).map(normalize);
  return values.includes(null) || new Set(values).size > 1 ? null : values[0] ?? '';
}
const safeText = (s) => s.length <= 255 && !/[\x00-\x1f\x7f]/.test(s) && !/^[=+@-]/.test(s);
const frequencies = (values) => {
  const counts = new Map();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
};

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
  const keys = ['schemaVersion', 'complete', 'exportedAt', 'rowCount', 'sha256', 'shopDomain'];
  const exported = Date.parse(metadata?.exportedAt);
  const validMetadata = metadata && Object.keys(metadata).length === keys.length && keys.every((k) => Object.hasOwn(metadata, k)) &&
    metadata.schemaVersion === 1 && metadata.complete === true && metadata.rowCount === rows.length &&
    /^[a-f0-9]{64}$/.test(metadata.sha256) && metadata.sha256 === sha256(text) &&
    typeof expectedShop === 'string' && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(expectedShop) && metadata.shopDomain === expectedShop &&
    typeof metadata.exportedAt === 'string' && /Z$/.test(metadata.exportedAt) && Number.isFinite(exported) && now - exported >= -300000 && now - exported <= 86400000;
  const normalized = rows.map((r) => ({ email: r.email ? email(r.email) : '', phone: phone(r.phone) }));
  const emails = frequencies(normalized.map((r) => r.email));
  const validRows = normalized.every((r) => r.email !== null && r.phone !== null && (r.email || r.phone) && (!r.email || emails.get(r.email) === 1));
  return { available: true, valid: Boolean(validMetadata && validRows), rows: normalized, blockers: validMetadata && validRows ? [] : ['SHOPIFY_SNAPSHOT_UNVERIFIED'] };
}

// Only aggregate constants/counts leave this function. Personal values stay in memory.
export function buildCustomerReport({ sourceCsv, snapshotCsv, snapshotMetadata, expectedShop, now = Date.now(), synthetic = false }) {
  const rows = parseCustomerCsv(sourceCsv);
  const snapshot = inspectSnapshot(snapshotCsv, snapshotMetadata, expectedShop, now);
  const prepared = rows.map((r) => ({
    row: r,
    id: aliases(r, ['id', 'customer_id']),
    email: aliases(r, ['email', 'user_email', 'billing_email'], email),
    phone: phone(r.billing_phone),
    orders: /^(0|[1-9]\d*)$/.test(r.orders) && Number.isSafeInteger(Number(r.orders)) ? Number(r.orders) : null,
    roles: aliases(r, ['role', 'roles'], (v) => v.toLowerCase()),
  }));
  // Include every source row in collision checks, even out-of-cohort/staff rows.
  const ids = frequencies(prepared.map((r) => r.id));
  const allEmails = prepared.flatMap((r) => [...new Set(['email', 'user_email', 'billing_email'].map((k) => email(r.row[k])).filter(Boolean))]);
  const emails = frequencies(allEmails);
  const phones = frequencies(prepared.map((r) => r.phone));
  const existingEmails = new Set(snapshot.rows.map((r) => r.email).filter(Boolean));
  const existingPhones = new Set(snapshot.rows.map((r) => r.phone).filter(Boolean));
  const report = {
    schemaVersion: 1,
    mode: 'offline-dry-run',
    dataKind: synthetic ? 'synthetic' : 'private-unverified',
    productionAuthorized: false,
    networkRequests: 0, customerWrites: 0, personalArtifactsWritten: 0,
    expected: { accountsWithOrders: 858, historicalOrders: 953 },
    observed: { sourceRows: rows.length, accountsWithOrders: 0, historicalOrders: 0 },
    outcomes: { excludedPrivileged: 0, excludedOtherRole: 0, excludedNoOrders: 0, quarantined: 0, existingEmailSkipped: 0, existingPhoneSkipped: 0, unmatchedAwaitingSnapshot: 0, proposedNew: 0 },
    reasons: { invalidRole: 0, invalidOrders: 0, invalidId: 0, duplicateId: 0, invalidOrConflictingEmail: 0, duplicateEmail: 0, invalidPhone: 0, duplicatePhone: 0, invalidProfile: 0 },
    collisions: { duplicateEmailGroups: [...emails.values()].filter((v) => v > 1).length },
    shopifySnapshot: { supplied: snapshot.available, verified: snapshot.valid, rows: snapshot.rows.length },
    marketing: { emailEnabled: 0, smsEnabled: 0, whatsappEnabled: 0 },
    blockers: [...snapshot.blockers],
  };
  const { outcomes, reasons, observed } = report;
  for (const r of prepared) {
    if (r.orders > 0) { observed.accountsWithOrders++; observed.historicalOrders += r.orders; }
    const roleTokens = r.roles?.split(/[\s,;|]+/);
    if (roleTokens?.some((v) => ['administrator', 'author'].includes(v))) { outcomes.excludedPrivileged++; continue; }
    if (!r.roles) { reasons.invalidRole++; outcomes.quarantined++; continue; }
    if (r.roles !== 'customer') { outcomes.excludedOtherRole++; continue; }
    if (r.orders === null) { reasons.invalidOrders++; outcomes.quarantined++; continue; }
    if (r.orders === 0) { outcomes.excludedNoOrders++; continue; }
    const checks = {
      invalidId: !r.id || !/^[1-9]\d*$/.test(r.id),
      duplicateId: r.id && ids.get(r.id) > 1,
      invalidOrConflictingEmail: !r.email,
      duplicateEmail: r.email && emails.get(r.email) > 1,
      invalidPhone: r.phone === null,
      duplicatePhone: r.phone && phones.get(r.phone) > 1,
      invalidProfile: !profileValid(r.row),
    };
    if (Object.values(checks).some(Boolean)) {
      outcomes.quarantined++;
      for (const [key, value] of Object.entries(checks)) if (value) reasons[key]++;
    } else if (!snapshot.valid) outcomes.unmatchedAwaitingSnapshot++;
    else if (existingEmails.has(r.email)) outcomes.existingEmailSkipped++;
    else if (r.phone && existingPhones.has(r.phone)) outcomes.existingPhoneSkipped++;
    else outcomes.proposedNew++;
  }
  if (observed.accountsWithOrders !== 858 || observed.historicalOrders !== 953) report.blockers.push('HISTORICAL_TOTALS_MISMATCH');
  if (outcomes.quarantined) report.blockers.push('SOURCE_QUARANTINE_REQUIRES_REVIEW');
  if (outcomes.excludedOtherRole) report.blockers.push('OTHER_ROLES_REQUIRE_REVIEW');
  report.status = report.blockers.length ? 'BLOCKED' : 'OFFLINE_REVIEW_COMPLETE';
  return report;
}
