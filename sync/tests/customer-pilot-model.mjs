// TEST MODEL ONLY. No I/O, adapters, payloads, credentials, API calls or production mode.
// Boolean evidence is fictional; this model cannot certify real identities or authorization.
const reviewKeys = ['identity', 'email', 'alternatives', 'phoneOnly', 'twoReviewers'];
const gateKeys = ['shopMatches', 'authorizationValid', 'bindingMatches', 'snapshotComplete',
  'snapshotFresh', 'silenceProven', 'accessPlanApproved', 'journalReady', 'lockHeld'];
const fail = () => { throw new Error('SYNTHETIC_CONTRACT_INVALID'); };

export function selectSynthetic(rows, size = 5) {
  if (!Number.isInteger(size) || size < 5 || size > 10 || !Array.isArray(rows)) fail();
  const ranks = new Set();
  for (const r of rows) {
    if (r.fixture !== true || typeof r.rank !== 'string' || !/^[1-9]\d*$/.test(r.rank) || ranks.has(r.rank)) fail();
    ranks.add(r.rank);
  }
  const eligible = rows.filter(r => r.candidate === true && r.role === 'customer' &&
    r.orders > 0 && r.quarantined === false && r.existing === false &&
    reviewKeys.every(k => r.review?.[k] === true));
  eligible.sort((a, b) => BigInt(a.rank) < BigInt(b.rank) ? -1 : 1);
  return eligible.length < size ? [] : eligible.slice(0, size);
}

export function simulateSyntheticPilot(rows, context, scenarios = []) {
  const result = { mode: 'SYNTHETIC_MODEL_ONLY', productionAuthorized: false,
    proposedNew: 0, customerWrites: 0, simulatedAttempts: 0, simulatedCreated: 0,
    simulatedVerified: 0, simulatedUnknown: 0, simulatedRejected: 0,
    selected: 0, notAttempted: 0, status: 'STOP', reason: 'GATE', trace: [] };
  const selected = selectSynthetic(rows, context.size ?? 5);
  result.selected = selected.length;
  const event = name => result.trace.push(name);
  const stop = reason => {
    result.reason = reason;
    result.notAttempted = result.selected - result.simulatedAttempts;
    event('STOP');
    return result;
  };
  if (!selected.length) return stop('INSUFFICIENT_REVIEWED');
  if (!gateKeys.every(k => context[k] === true)) return stop('GATE');
  // A restart is never implicitly authorized, including an already-complete prior run.
  if (context.priorRun !== 'clean') return stop('PRIOR_RUN_REVIEW');
  for (let i = 0; i < selected.length; i++) {
    // Missing scenarios mean an explicit fictional successful case, never live evidence.
    const s = { liveComplete: true, liveFresh: true, liveAgeSeconds: 0,
      shopMatches: true, authorizationValid: true, bindingMatches: true, lockHeld: true,
      ...(scenarios[i] ?? {}) };
    const kind = s.kind ?? 'success';
    if (i === 1 && context.sentinelApproved !== true) return stop('SENTINEL_REVIEW');
    event('LIVE_CHECK');
    if (s.liveComplete !== true || s.liveFresh !== true ||
      !Number.isFinite(s.liveAgeSeconds) || s.liveAgeSeconds < 0 || s.liveAgeSeconds > 60) return stop('LIVE_INVALID');
    if (s.shopMatches !== true || s.authorizationValid !== true || s.bindingMatches !== true || s.lockHeld !== true) return stop('GATE_CHANGED');
    if (['email-match', 'phone-match', 'phone-only-match', 'alternative-match', 'ambiguous'].includes(kind)) return stop('CONFLICT');
    if (kind === 'read-error') return stop('LIVE_INVALID');
    if (kind === 'journal-before-failure') return stop('JOURNAL_UNAVAILABLE');
    event('INTENT_DURABLE');
    event('SIMULATED_ATTEMPT');
    result.simulatedAttempts++;
    if (['timeout', 'transport-error', 'http-5xx', 'partial-response', 'crash-after-send', 'journal-after-failure'].includes(kind)) {
      result.simulatedUnknown++; event('UNKNOWN'); return stop('RECONCILE_READ_ONLY');
    }
    if (['duplicate-race', 'user-error', 'throttled'].includes(kind)) {
      result.simulatedRejected++; event('REJECTED'); return stop('REJECTED');
    }
    if (!['success', 'subscribed', 'pending-consent', 'unreadable-consent', 'unexpected-message', 'profile-mismatch'].includes(kind)) fail();
    result.simulatedCreated++; event('CREATED_UNVERIFIED');
    if (kind !== 'success') return stop('POSTCHECK_FAILED');
    result.simulatedVerified++; event('VERIFIED');
  }
  result.notAttempted = 0;
  result.status = 'SIMULATION_COMPLETE';
  result.reason = 'NONE';
  return result;
}

export function fictionalRows(count = 12) {
  return Array.from({ length: count }, (_, i) => ({ fixture: true, rank: String(i + 1),
    candidate: true, role: 'customer', orders: 1, quarantined: false, existing: false,
    review: Object.fromEntries(reviewKeys.map(k => [k, true])) }));
}

export function fictionalContext() {
  return { size: 5, ...Object.fromEntries(gateKeys.map(k => [k, true])),
    priorRun: 'clean', sentinelApproved: true };
}
