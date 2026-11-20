// Offline rehearsal only. No fetch and no changes to the manifest.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { redirectResponse } from './legacy-redirects.mjs';

const draft = JSON.parse(readFileSync(new URL('./redirect-candidates.json', import.meta.url)));
assert.equal(draft.enabled, false);
assert.equal(draft.approvalReference, null);
assert.equal(draft.rules.length, 16);
assert.equal(new Set(draft.rules.map(r => r.oldPath)).size, 16);
const rehearsal = structuredClone(draft);
rehearsal.enabled = true;
rehearsal.approvalReference = 'OFFLINE-REHEARSAL';
for (const rule of rehearsal.rules) {
  assert.equal(rule.reviewApproved, false);
  rule.reviewApproved = true;
}
let cases = 0;
for (const rule of draft.rules) {
  for (const host of ['onlinegarden.it', 'www.onlinegarden.it']) {
    for (const scheme of ['http', 'https']) {
      for (const method of ['GET', 'HEAD']) {
        for (const [query, suffix] of [
          ['', ''], ['?attribute_dimensioni=vaso', ''],
          ['?attribute_dimensioni=vaso&utm_source=gsc&utm_content=a+b', '?utm_source=gsc&utm_content=a+b'],
        ]) {
          const req = new Request(scheme + '://' + host + rule.oldPath + query, {method});
          assert.equal(redirectResponse(req, draft), null);
          const response = redirectResponse(req, rehearsal);
          assert.equal(response?.status, 301);
          assert.equal(response.headers.get('location'), rule.newUrl + suffix);
          assert.equal(redirectResponse(new Request(rule.newUrl + suffix, {method}), rehearsal), null);
          cases++;
        }
      }
    }
  }
  for (const query of ['?add-to-cart=1', '?wc-ajax=checkout', '?variant=1', '?other=1&utm_source=gsc']) {
    assert.equal(redirectResponse(new Request('https://onlinegarden.it' + rule.oldPath + query), rehearsal), null);
  }
  assert.equal(redirectResponse(new Request('https://onlinegarden.it' + rule.oldPath, {method:'POST'}), rehearsal), null);
}
for (const path of ['/admin', '/auth', '/cart', '/checkout', '/prodotto/sconosciuto/', '/']) {
  assert.equal(redirectResponse(new Request('https://onlinegarden.it' + path), rehearsal), null);
}
console.log('PASS: ' + cases + ' simulated redirects, inactive manifest, terminal targets and protected paths.');
