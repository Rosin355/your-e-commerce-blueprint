import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseCustomerCsv, sha256 } from '../lib/customer-preflight.mjs';
import {
  buildHistoricalOrder,
  validateCensus,
  requireFact,
  legacyId,
  MigrationStop,
} from '../lib/historical-order.mjs';
import { openJournal } from './journal.mjs';
import {
  SHOP,
  OPTIONS,
  queries,
  graphql,
  checkContext,
  snapshot,
  lookupOrder,
  verifyOrder,
  created,
} from './shopify.mjs';

const normalize = (value) => (value ?? '').trim().toLowerCase();
const phone = (value) => (value ?? '').replace(/[ ().-]/g, '');
export function privateDirectory(name) {
  const dir = fs.realpathSync(name),
    repo = fileURLToPath(new URL('../../', import.meta.url));
  for (let current = dir; ; current = path.dirname(current)) {
    requireFact(!fs.existsSync(path.join(current, '.git')), 'PRIVATE_DIRECTORY_OUTSIDE_GIT_REQUIRED');
    if (current === path.dirname(current)) break;
  }
  const stat = fs.statSync(dir);
  requireFact(
    !dir.startsWith(repo) && stat.isDirectory() && stat.uid === process.getuid() && (stat.mode & 0o077) === 0,
    'PRIVATE_DIRECTORY_PERMISSIONS',
  );
  return dir;
}
export function privatePath(dir, name, optional = false) {
  const file = path.join(dir, name);
  if (optional && !fs.existsSync(file)) return file;
  const stat = fs.lstatSync(file);
  requireFact(
    stat.isFile() && stat.nlink === 1 && stat.uid === process.getuid() && (stat.mode & 0o077) === 0,
    'PRIVATE_FILE_PERMISSIONS',
  );
  return file;
}
export function identity(source, review, order, customers, classification, journalRow) {
  requireFact((source?.roles ?? source?.role) === 'customer', 'ROLE_OR_ACCOUNT_EXCLUDED');
  requireFact(classification, 'CUSTOMER_QUARANTINED_OR_INELIGIBLE');
  requireFact(
    review?.evidence?.trim() && review?.reviewer?.trim() && ['create', 'existing'].includes(review.action),
    'IDENTITY_REVIEW_REQUIRED',
  );
  requireFact(
    normalize(source.email) &&
      normalize(source.email) === normalize(order.billing?.email) &&
      phone(source.billing_phone) &&
      phone(source.billing_phone) === phone(order.billing?.phone),
    'INDEPENDENT_BILLING_CORROBORATION_REQUIRED',
  );
  const id = legacyId(order.customer_id);
  const tagged = customers.filter((r) => r.legacy?.value === id);
  const matches = customers.filter(
    (r) => normalize(r.defaultEmailAddress?.emailAddress) === normalize(source.email),
  );
  requireFact(matches.length <= 1 && tagged.length <= 1, 'CUSTOMER_REMOTE_COLLISION');
  const match = matches[0],
    owned = tagged[0];
  if (owned || journalRow?.gid || review.action === 'existing') {
    const expected = journalRow?.gid ?? (review.action === 'existing' ? review.shopifyId : owned?.id);
    requireFact(
      expected &&
        match?.id === expected &&
        (!owned || owned.id === expected) &&
        (!match.legacy || match.legacy.value === id),
      'CUSTOMER_MAPPING_CONFLICT',
    );
    requireFact(review.action === 'existing' || !!owned, 'CUSTOMER_REMOTE_MARKER_MISSING');
    if (review.action === 'existing')
      requireFact(
        review.shopifyId === expected && review.shopifyEvidence?.trim(),
        'EXISTING_IDENTITY_EVIDENCE_REQUIRED',
      );
    return expected;
  }
  requireFact(
    !match && classification === 'candidate' && !review.shopifyId,
    'EXISTING_PROFILE_REQUIRES_REVIEW',
  );
  return null;
}

export function approvalDigest(review, mode = 'pilot') {
  if (mode === 'batch') {
    const scope = review.batchAuthorization ?? {};
    return sha256(JSON.stringify([
      'batch', SHOP, review.archiveSha256, review.accountsSha256, review.countsSha256,
      review.pilotOrderId, review.authorization?.reference, review.pilotAcceptance,
      scope.shop, scope.archiveSha256, scope.reference, scope.approvedAt, scope.expiresAt,
      scope.orderIds, scope.checks,
      review.customers, review.orders,
    ]));
  }
  return sha256(
    JSON.stringify([
      SHOP,
      review.archiveSha256,
      review.accountsSha256,
      review.countsSha256,
      review.pilotOrderId,
      review.authorization?.orderIds,
      review.customers,
      review.orders,
    ]),
  );
}
function authorize(review, digest, mode) {
  const batch = mode === 'batch';
  const auth = batch ? review.batchAuthorization : review.authorization;
  if (batch) {
    const acceptance = review.pilotAcceptance;
    for (const gate of ['stock', 'payments', 'notifications', 'fulfillment', 'customerVisibility', 'otherCustomerDenied', 'reporting'])
      requireFact(acceptance?.[gate]?.trim(), 'PILOT_ACCEPTANCE_REQUIRED');
    const acceptedAt = Date.parse(acceptance.acceptedAt);
    const approvedAt = Date.parse(auth?.approvedAt);
    requireFact(
      review.authorization?.reference?.trim() && auth?.reference?.trim() &&
        auth.reference.trim() !== review.authorization.reference.trim() &&
        acceptedAt < approvedAt && approvedAt <= Date.now(),
      'SEPARATE_BATCH_AUTHORIZATION_REQUIRED',
    );
  }
  requireFact(
    auth?.shop === SHOP &&
      auth.archiveSha256 === digest &&
      auth.reference?.trim() &&
      Date.parse(auth.expiresAt) > Date.now() &&
      Array.isArray(auth.orderIds) &&
      auth.orderIds.length > 0 &&
      (batch || (auth.orderIds.length === 1 && auth.orderIds[0] === review.pilotOrderId)),
    'LIVE_AUTHORIZATION_REQUIRED',
  );
  requireFact(auth.reviewSha256 === approvalDigest(review, mode), 'AUTHORIZATION_REVIEW_CHANGED');
  for (const gate of ['flow', 'messaging', 'logistics', 'invoicing', 'analytics', 'exclusiveWriter'])
    requireFact(auth.checks?.[gate]?.trim(), 'SIDE_EFFECT_EVIDENCE_REQUIRED');
  return auth.orderIds;
}
export async function run(mode, folder) {
  requireFact(['prepare', 'fingerprint', 'batch-fingerprint', 'plan', 'pilot', 'batch'].includes(mode), 'MODE_REQUIRED');
  process.umask(0o077);
  const dir = privateDirectory(folder);
  const read = (name) => fs.readFileSync(privatePath(dir, name), 'utf8');
  if (!fs.lstatSync(path.join(dir, 'orders.json'), { throwIfNoEntry: false }))
    throw new MigrationStop('BLOCKED_SOURCE_UNAVAILABLE');
  const sourceCsv = read('sheet2-minimo.csv'),
    ordersCsv = read('id-orders.csv');
  const raw = read('orders.json'),
    orders = JSON.parse(raw),
    digest = sha256(raw);
  validateCensus(orders, parseCustomerCsv(ordersCsv, 'orders'));
  const accounts = new Map(parseCustomerCsv(sourceCsv, 'accounts').map((row) => [row.id, row]));
  if (mode === 'prepare') {
    const template = {
      archiveSha256: digest,
      accountsSha256: sha256(sourceCsv),
      countsSha256: sha256(ordersCsv),
      customers: {},
      orders: {},
      pilotOrderId: null,
      authorization: null,
      pilotAcceptance: null,
      batchAuthorization: null,
    };
    fs.writeFileSync(path.join(dir, 'review.json'), JSON.stringify(template, null, 2) + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
    console.log(JSON.stringify({ mode, historicalOrders: orders.length, reviewed: 0 }));
    return;
  }
  const review = JSON.parse(read('review.json'));
  requireFact(
    review.archiveSha256 === digest &&
      review.accountsSha256 === sha256(sourceCsv) &&
      review.countsSha256 === sha256(ordersCsv),
    'SOURCE_REVIEW_DIGEST_MISMATCH',
  );
  if (mode === 'fingerprint' || mode === 'batch-fingerprint') {
    console.log(approvalDigest(review, mode === 'batch-fingerprint' ? 'batch' : 'pilot'));
    return;
  }
  const writing = mode !== 'plan';
  const authorizedIds = writing ? authorize(review, digest, mode) : [];
  const selected = new Set(authorizedIds);
  if (writing) {
    const orderIds = new Set(orders.map((o) => legacyId(o.id)));
    requireFact(
      authorizedIds.every((id) => typeof id === 'string' && orderIds.has(id)) &&
        selected.size === authorizedIds.length,
      'AUTHORIZATION_IDS_INVALID',
    );
  }
  await checkContext(writing);
  const journal = openJournal(privatePath(dir, 'history.sqlite', true));
  try {
    journal.bind(digest);
    const pilotId = String(review.pilotOrderId);
    if (writing) journal.pilot(pilotId);
    if (mode === 'batch') {
      const pilot = journal.get('order', pilotId);
      requireFact(
        pilot?.state === 'verified' &&
          review.pilotAcceptance.orderGid === pilot.gid &&
          review.pilotAcceptance.archiveSha256 === digest,
        'VERIFIED_PILOT_REQUIRED',
      );
    }
    let live = await snapshot(sourceCsv, ordersCsv);
    const summary = {};
    const pending = writing ? journal.pending() : [];
    const isPending = (o) =>
      pending.some((row) => row.legacy === String(row.kind === 'customer' ? o.customer_id : o.id));
    const work = writing
      ? orders
          .filter((o) => selected.has(String(o.id)))
          .sort((a, b) => Number(isPending(b)) - Number(isPending(a)))
      : orders;
    requireFact(
      pending.every((row) =>
        work.some((o) => row.legacy === String(row.kind === 'customer' ? o.customer_id : o.id)),
      ),
      'UNRESOLVED_PREVIOUS_BATCH',
    );
    for (const order of work) {
      const id = legacyId(order.id),
        owner = legacyId(order.customer_id);
      const customerReview = review.customers?.[owner],
        orderReview = review.orders?.[id],
        source = accounts.get(owner);
      let customerGid, payload;
      if (writing) live = await snapshot(sourceCsv, ordersCsv);
      try {
        customerGid = identity(
          source,
          customerReview,
          order,
          live.rows,
          live.classifications.get(owner),
          journal.get('customer', owner),
        );
        payload = buildHistoricalOrder(order, orderReview, customerGid);
      } catch (error) {
        if (!(error instanceof MigrationStop)) throw error;
        journal.decision(id, error.message);
        summary[error.message] = (summary[error.message] ?? 0) + 1;
        if (mode === 'pilot' || isPending(order)) throw error;
        continue;
      }
      // Existing remote orders are never overwritten, even if their markers resemble ours.
      const previous = journal.get('order', id);
      const remote = await lookupOrder(id, payload.name);
      requireFact(!remote || customerGid, 'ORDER_WITHOUT_CUSTOMER_MAPPING');
      if (remote || previous?.gid) {
        requireFact(!remote || !previous?.gid || remote === previous.gid, 'ORDER_MAPPING_CONFLICT');
        await verifyOrder(previous?.gid ?? remote, payload, order);
      } else if (previous) throw new MigrationStop('UNKNOWN_ORDER_OUTCOME_NO_RETRY');
      if (!writing) {
        const reason = remote || previous?.gid ? 'EXISTING_VERIFIED' : 'READY_FOR_REVIEW';
        journal.decision(id, reason);
        summary[reason] = (summary[reason] ?? 0) + 1;
        continue;
      }
      authorize(review, digest, mode);
      const customerDigest = sha256(JSON.stringify([owner, source.email]));
      const priorCustomer = journal.get('customer', owner);
      if (priorCustomer) requireFact(priorCustomer.digest === customerDigest, 'CUSTOMER_INPUT_CHANGED');
      else journal.reserve('customer', owner, customerDigest);
      if (!customerGid) {
        requireFact(!priorCustomer, 'UNKNOWN_CUSTOMER_OUTCOME_NO_RETRY');
        const input = {
          email: source.email,
          firstName: order.billing.first_name || undefined,
          lastName: order.billing.last_name || undefined,
          metafields: [
            {
              namespace: 'onlinegarden_migration',
              key: 'woo_customer_id',
              type: 'single_line_text_field',
              value: owner,
            },
          ],
        };
        const result = await graphql(queries.createCustomer, { input });
        customerGid = created(result.customerCreate, 'customer');
        journal.record('customer', owner, customerGid, 'submitted');
        live = await snapshot(sourceCsv, ordersCsv);
        requireFact(
          identity(
            source,
            customerReview,
            order,
            live.rows,
            live.classifications.get(owner),
            journal.get('customer', owner),
          ) === customerGid,
          'CUSTOMER_READBACK_REQUIRED',
        );
      }
      journal.record('customer', owner, customerGid, 'verified');
      requireFact(/^gid:\/\/shopify\/Customer\/[1-9]\d*$/.test(customerGid), 'CUSTOMER_GID_REQUIRED');
      payload.customer = { toAssociate: { id: customerGid } };
      const orderDigest = sha256(JSON.stringify(payload));
      if (previous) requireFact(previous.digest === orderDigest, 'ORDER_INPUT_CHANGED');
      else journal.reserve('order', id, orderDigest);
      let gid = previous?.gid ?? remote;
      if (!gid) {
        authorize(review, digest, mode);
        requireFact(!previous, 'UNKNOWN_ORDER_OUTCOME_NO_RETRY');
        const res = await graphql(queries.createOrder, { order: payload, options: OPTIONS });
        gid = created(res.orderCreate, 'order');
        journal.record('order', id, gid, 'submitted');
      }
      await verifyOrder(gid, payload, order);
      journal.record('order', id, gid, 'verified');
      journal.decision(id, 'VERIFIED');
      summary.VERIFIED = (summary.VERIFIED ?? 0) + 1;
    }
    if (mode === 'pilot') requireFact(summary.VERIFIED === 1, 'PILOT_NOT_VERIFIED');
    console.log(JSON.stringify({ mode, orders: summary }));
  } finally {
    journal.close();
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  run(process.argv[2], process.argv[3]).catch((error) => {
    // Provider errors, file paths, request payloads and customer identifiers never enter stdout/stderr.
    console.error(
      JSON.stringify({
        status: 'BLOCKED',
        reason: error instanceof MigrationStop ? error.message : 'PRIVATE_INPUT_STORAGE_OR_TRANSPORT_ERROR',
      }),
    );
    process.exitCode = 2;
  });
}
