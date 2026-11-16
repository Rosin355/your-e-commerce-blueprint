import test from 'node:test';
import assert from 'node:assert/strict';
import { selectSynthetic, simulateSyntheticPilot, fictionalRows, fictionalContext } from './customer-pilot-model.mjs';

const run = (scenario = [], context = {}) => simulateSyntheticPilot(fictionalRows(), { ...fictionalContext(), ...context }, scenario);
function safety(r) {
  assert.equal(r.productionAuthorized, false);
  assert.equal(r.customerWrites, 0);
  assert.equal(r.proposedNew, 0);
  assert.equal(r.selected, r.simulatedAttempts + r.notAttempted);
  assert.equal(r.simulatedAttempts, r.simulatedCreated + r.simulatedUnknown + r.simulatedRejected);
  assert.ok(r.simulatedVerified <= r.simulatedCreated);
  assert.ok(r.simulatedAttempts <= 10);
  assert.ok(!r.trace.some(v => /UPDATE|UPSERT|INVITE|SEND_EMAIL|DELETE|RETRY/.test(v)));
  for (let i = 0; i < r.trace.length; i++) {
    if (r.trace[i] === 'SIMULATED_ATTEMPT') assert.equal(r.trace[i - 1], 'INTENT_DURABLE');
    if (r.trace[i] === 'VERIFIED') assert.equal(r.trace[i - 1], 'CREATED_UNVERIFIED');
  }
}

test('selection is deterministic under input permutation and preserves original fixture', () => {
  const rows = fictionalRows(); const original = structuredClone(rows);
  assert.deepEqual(selectSynthetic(rows).map(r => r.rank), ['1', '2', '3', '4', '5']);
  assert.deepEqual(selectSynthetic([...rows].reverse()), selectSynthetic(rows));
  assert.deepEqual(rows, original);
});
test('numeric sorting handles IDs beyond Number precision without lexical ordering', () => {
  const rows = fictionalRows(5); ['9007199254740993','9007199254740992','10','2','1'].forEach((v,i)=>rows[i].rank=v);
  assert.deepEqual(selectSynthetic(rows).map(r=>r.rank), ['1','2','10','9007199254740992','9007199254740993']);
});
test('quarantines, existing profile, author/admin with orders and non-candidates stay outside sample', () => {
  const rows = fictionalRows(12); rows[0].quarantined=true; rows[1].existing=true;
  rows[2].role='author'; rows[3].role='administrator'; rows[4].candidate=false;
  rows[5].orders=0; rows[6].role='customer author';
  assert.deepEqual(selectSynthetic(rows).map(r=>r.rank), ['8','9','10','11','12']);
});
test('every individual review dimension is mandatory; unknown does not mean absent', () => {
  for (const key of ['identity','email','alternatives','phoneOnly','twoReviewers']) {
    for (const value of [false,undefined]) { const rows=fictionalRows(5); rows[0].review[key]=value; assert.deepEqual(selectSynthetic(rows),[]); }
  }
});
test('limits, duplicate and invalid IDs, and unbranded fixtures fail before any simulated attempt', () => {
  for(const size of [0,4,11,5.5]) assert.throws(()=>selectSynthetic(fictionalRows(),size),/SYNTHETIC_CONTRACT_INVALID/);
  for(const rank of ['0','01','-1','x','2',1]) {const rows=fictionalRows(); rows[0].rank=rank; assert.throws(()=>selectSynthetic(rows));}
  const rows=fictionalRows(); rows[0].fixture=false; assert.throws(()=>selectSynthetic(rows));
});
test('insufficient eligible cases stop, no lower-threshold fallback', () => {
  const r=simulateSyntheticPilot(fictionalRows(4),fictionalContext()); safety(r); assert.equal(r.reason,'INSUFFICIENT_REVIEWED');
});
test('five and ten simulated successes remain unauthorized and never become proposedNew', () => {
  for(const size of [5,10]) {const r=run([],{size}); safety(r); assert.equal(r.simulatedVerified,size); assert.equal(r.status,'SIMULATION_COMPLETE');}
});
test('all shop, approval, manifest, coverage, privacy and operational gates fail closed', () => {
  for(const key of ['shopMatches','authorizationValid','bindingMatches','snapshotComplete','snapshotFresh','silenceProven','accessPlanApproved','journalReady','lockHeld']) {
    for(const value of [false,undefined]) {const r=run([],{[key]:value}); safety(r); assert.equal(r.simulatedAttempts,0); assert.equal(r.reason,'GATE');}
  }
});
test('live coverage, age and read errors block even with a valid old manifest', () => {
  for(const s of [{liveComplete:false},{liveFresh:false},{liveAgeSeconds:61},{liveAgeSeconds:-1},{liveAgeSeconds:NaN},{liveComplete:undefined},{liveAgeSeconds:undefined},{kind:'read-error'}]) {
    const r=run([s]); safety(r); assert.equal(r.simulatedAttempts,0); assert.equal(r.reason,'LIVE_INVALID');
  }
  assert.equal(run([{liveAgeSeconds:60}]).simulatedVerified,5);
});
test('every live collision stops the whole lot with no substitute or existing-profile update', () => {
  for(const kind of ['email-match','phone-match','phone-only-match','alternative-match','ambiguous']) {
    const r=run([{}, {kind}]); safety(r); assert.equal(r.simulatedVerified,1); assert.equal(r.notAttempted,4); assert.equal(r.reason,'CONFLICT');
  }
});
test('store, approval, manifest or lock changes between records stop before next attempt', () => {
  for(const key of ['shopMatches','authorizationValid','bindingMatches','lockHeld']) {
    const r=run([{}, {[key]:false}]); safety(r); assert.equal(r.simulatedAttempts,1); assert.equal(r.reason,'GATE_CHANGED');
  }
});
test('journal failure before request prevents attempt; after request is uncertain', () => {
  const before=run([{kind:'journal-before-failure'}]); safety(before); assert.equal(before.simulatedAttempts,0);
  const after=run([{kind:'journal-after-failure'}]); safety(after); assert.equal(after.simulatedUnknown,1); assert.equal(after.simulatedVerified,0);
});
test('uncertain responses and crashes never retry or continue a partial lot', () => {
  for(const kind of ['timeout','transport-error','http-5xx','partial-response','crash-after-send']) {
    const r=run([{}, {kind}, {}]); safety(r); assert.equal(r.simulatedAttempts,2); assert.equal(r.simulatedUnknown,1); assert.equal(r.simulatedVerified,1); assert.equal(r.notAttempted,3);
  }
});
test('duplicate race, application error and throttling stop without upsert or retry', () => {
  for(const kind of ['duplicate-race','user-error','throttled']) {
    const r=run([{}, {kind}]); safety(r); assert.equal(r.simulatedRejected,1); assert.equal(r.simulatedAttempts,2); assert.equal(r.notAttempted,3);
  }
});
test('a prior run including verified records cannot be replayed automatically', () => {
  for(const priorRun of ['INTENT','UNKNOWN','CREATED_UNVERIFIED','VERIFIED','REJECTED','STOP',undefined]) {
    const r=run([],{priorRun}); safety(r); assert.equal(r.simulatedAttempts,0); assert.equal(r.reason,'PRIOR_RUN_REVIEW');
  }
});
test('first successful sentinel requires its checkpoint before the second account', () => {
  const r=run([],{sentinelApproved:false}); safety(r); assert.equal(r.simulatedVerified,1); assert.equal(r.notAttempted,4); assert.equal(r.reason,'SENTINEL_REVIEW');
});
test('marketing, messaging or profile postcheck failures retain created-unverified and stop', () => {
  for(const kind of ['subscribed','pending-consent','unreadable-consent','unexpected-message','profile-mismatch']) {
    const r=run([{kind}]); safety(r); assert.equal(r.simulatedCreated,1); assert.equal(r.simulatedVerified,0); assert.equal(r.reason,'POSTCHECK_FAILED');
  }
});
test('public model result excludes arbitrary raw errors and supplied personal-looking fields', () => {
  const marker='SYNTHETIC_PRIVATE_SENTINEL';
  const r=run([{kind:'transport-error',rawError:marker,email:`${marker}@example.invalid`,phone:marker}]);
  safety(r); assert.ok(!JSON.stringify(r).includes(marker));
});
