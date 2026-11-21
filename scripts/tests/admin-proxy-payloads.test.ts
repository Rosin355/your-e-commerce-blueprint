import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeCustomerPayload, parseCustomerId, sanitizeProductCreatePayload } from '../../supabase/functions/_shared/admin-proxy-payloads.ts';

test('customer payload keeps only import fields', () => {
  const out = sanitizeCustomerPayload({ id: 5, email: 'a@b.it', first_name: 'A', last_name: 'B', phone: '1',
    tags: 'vip', note: 'x', tax_exempt: true, verified_email: true, password: 'p', state: 'enabled',
    addresses: [{ address1: 'v', city: 'c', zip: 'z', country: 'IT', default: true, company: 'k' }] });
  assert.deepEqual(out, { email: 'a@b.it', first_name: 'A', last_name: 'B', phone: '1',
    addresses: [{ address1: 'v', city: 'c', zip: 'z', country: 'IT' }] });
});

test('customer marketing consent only for explicit single opt-in subscribe', () => {
  const ok = sanitizeCustomerPayload({ email_marketing_consent: { state: 'subscribed', opt_in_level: 'single_opt_in', consent_updated_at: 't', extra: 1 } });
  assert.deepEqual(ok.email_marketing_consent, { state: 'subscribed', opt_in_level: 'single_opt_in', consent_updated_at: 't' });
  assert.equal(sanitizeCustomerPayload({ email_marketing_consent: { state: 'unsubscribed', opt_in_level: 'x' } }).email_marketing_consent, undefined);
});

test('customer id must be numeric, path injection refused', () => {
  assert.equal(parseCustomerId(123456789), '123456789');
  for (const bad of ['1/../orders', '', 'abc', '0', null]) assert.throws(() => parseCustomerId(bad));
});

test('product create keeps only mapper fields and https images', () => {
  const out = sanitizeProductCreatePayload({ title: 'T', body_html: '<p>x</p>', vendor: 'V', product_type: 'P', tags: 't',
    status: 'active', published_scope: 'global', template_suffix: 'x', metafields: [{}],
    variants: [{ sku: 's', price: '5', compare_at_price: '6', inventory_quantity: 3, inventory_policy: 'continue', taxable: false }],
    images: [{ src: 'https://cdn/x.jpg', alt: 'a' }, { src: 'javascript:1' }] });
  assert.deepEqual(out, { title: 'T', vendor: 'V', product_type: 'P', tags: 't', body_html: '<p>x</p>',
    variants: [{ sku: 's', price: '5', compare_at_price: '6', inventory_quantity: 3 }], images: [{ src: 'https://cdn/x.jpg' }] });
});
