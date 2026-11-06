import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canRecoverDraftAfterError } from '../../src/adminv2/lib/operationalUiPolicy.ts';
import {
  approvalMatches,
  CANONICAL_HANDLES,
  canonicalMembershipAligned,
  categoryDiff,
  escapeHtml,
  operationalAccess,
  parseOperationalApproval,
  type ProductDraft,
  validateDraft,
  verifyCreatedMapping,
} from '../../supabase/functions/_shared/admin-operational-core.ts';
const fixture = (): ProductDraft => ({
  title: 'Prodotto simulato',
  sku: 'QA-001',
  description: 'Descrizione inserita dal tester',
  currency: 'EUR',
  vendor: '',
  tags: [],
  categoryIds: [],
  images: [],
  seoTitle: '',
  seoDescription: '',
  botanical: {},
  variants: [{ sku: 'QA-001', price: '12.30', compareAtPrice: null, option: 'Unico' }],
});
const off = { drafts: false, shopify: false, approval: false };
const on = { drafts: true, shopify: true, approval: true };
test('recupero UI disponibile solo con scritture attive, operazione salvata e ruolo Admin', () => {
  assert.equal(canRecoverDraftAfterError({ writesEnabled: false, roles: ['admin'] }, true, true), false);
  assert.equal(canRecoverDraftAfterError({ writesEnabled: true, roles: ['editor'] }, true, true), false);
  assert.equal(canRecoverDraftAfterError({ writesEnabled: true, roles: ['admin'] }, false, true), false);
  assert.equal(canRecoverDraftAfterError({ writesEnabled: true, roles: ['admin'] }, true, false), false);
  assert.equal(canRecoverDraftAfterError({ writesEnabled: true, roles: ['tech_admin'] }, true, true), true);
});
test('bozza manuale completa senza generazione AI e senza categoria inventata', () => {
  const d = validateDraft(fixture());
  assert.equal(d.title, 'Prodotto simulato');
  assert.deepEqual(d.categoryIds, []);
  assert.equal(CANONICAL_HANDLES.length, 23);
});
for (const role of ['viewer', 'user', 'moderator']) {
  test(`${role}: tutte le operazioni negate`, () => {
    for (
      const action of [
        'catalog_categories',
        'save_new_product',
        'create_shopify_draft',
        'recover_shopify_draft',
        'apply_categories',
      ]
    ) assert.throws(() => operationalAccess(action, [role], on, true), /consentita/);
  });
}
test('publisher legge, ma non salva né invia né riconcilia', () => {
  operationalAccess('catalog_categories', ['publisher'], off);
  for (
    const action of [
      'save_new_product',
      'create_shopify_draft',
      'recover_shopify_draft',
      'apply_categories',
    ]
  ) assert.throws(() => operationalAccess(action, ['publisher'], on, true));
});
test('editor salva solo interno quando abilitato, mai Shopify', () => {
  operationalAccess('save_new_product', ['editor'], on, true);
  assert.throws(() => operationalAccess('save_new_product', ['editor'], off, true));
  assert.throws(() => operationalAccess('create_shopify_draft', ['editor'], on, true));
});
test('invio richiede ruolo amministrativo, flag, approvazione operativa e conferma', () => {
  for (const flags of [off, { ...on, shopify: false }, { ...on, approval: false }]) {
    assert.throws(() => operationalAccess('create_shopify_draft', ['admin'], flags, true));
  }
  assert.throws(() => operationalAccess('create_shopify_draft', ['admin'], on, false));
  operationalAccess('create_shopify_draft', ['admin'], on, true);
});
test('approvazione operativa limitata a una richiesta e a 24 ore; false non abilita scritture', () => {
  const now = Date.parse('2026-10-31T12:00:00.000Z');
  const expiresAt = new Date(now + 60_000).toISOString();
  const draft = parseOperationalApproval(JSON.stringify({
    action: 'create_shopify_draft', target: '40000000-0000-4000-8000-000000000001', expiresAt,
  }), now);
  assert.ok(draft);
  assert.equal(approvalMatches(draft, 'create_shopify_draft', draft.target), true);
  assert.equal(approvalMatches(draft, 'create_shopify_draft', '40000000-0000-4000-8000-000000000002'), false);
  assert.equal(approvalMatches(draft, 'apply_categories', 'a'.repeat(64)), false);
  assert.equal(parseOperationalApproval('false', now), null);
  assert.equal(parseOperationalApproval('LOCAL-QA-ONLY', now), null);
  assert.equal(parseOperationalApproval(JSON.stringify({ ...draft, expiresAt: new Date(now - 1).toISOString() }), now), null);
  assert.equal(parseOperationalApproval(JSON.stringify({ ...draft, expiresAt: new Date(now + 25 * 60 * 60_000).toISOString() }), now), null);
});
for (
  const [name, change] of Object.entries({
    negative: { price: '-1' },
    nan: { price: 'NaN' },
    exponent: { price: '1e3' },
    precision: { price: '1.234' },
    compare: { price: '10', compareAtPrice: '9' },
  })
) {
  test(`validazione prezzo: ${name}`, () => {
    const d = fixture();
    Object.assign(d.variants[0], change);
    assert.throws(() => validateDraft(d));
  });
}
test('SKU univoco case insensitive e distinto tra famiglia e varianti', () => {
  const d = fixture();
  d.variants.push({ ...d.variants[0], sku: 'qa-001', option: 'Altro' });
  assert.throws(() => validateDraft(d));
  d.variants[1].sku = 'QA-002';
  assert.throws(() => validateDraft(d));
  d.sku = 'QA-PARENT';
  assert.equal(validateDraft(d).variants.length, 2);
});
test('immagini rifiutano URL esterni, credenziali URL, protocollo non sicuro e alt assente', () => {
  for (
    const url of [
      'http://cdn.shopify.com/a.jpg',
      'https://example.org/a.jpg',
      'https://user:password@cdn.shopify.com/a.jpg',
      'javascript:alert(1)',
    ]
  ) assert.throws(() => validateDraft({ ...fixture(), images: [{ url, alt: 'Foto' }] }));
  assert.throws(() =>
    validateDraft({ ...fixture(), images: [{ url: 'https://cdn.shopify.com/a.jpg', alt: '' }] })
  );
});
test('categorie: differenze esatte, nessuna classificazione dal titolo', () => {
  assert.deepEqual(categoryDiff(['a', 'b'], ['b', 'c'], ['a', 'b', 'c']), {
    add: ['c'],
    remove: ['a'],
    keep: ['b'],
  });
  assert.throws(() => categoryDiff([], ['unknown'], ['a']));
  assert.throws(() => categoryDiff([], ['a', 'a'], ['a']));
  assert.throws(() => categoryDiff(['stale'], [], ['a']), /riconciliata/);
  assert.deepEqual(categoryDiff([], [], []), { add: [], remove: [], keep: [] });
});
test('drift Shopify/Supabase blocca rimozioni non mostrate in anteprima', () => {
  assert.equal(canonicalMembershipAligned([], ['gid://shopify/Collection/1'], ['gid://shopify/Collection/1']), false);
  assert.equal(canonicalMembershipAligned(['gid://shopify/Collection/1'], [], ['gid://shopify/Collection/1']), false);
  assert.equal(canonicalMembershipAligned(['gid://shopify/Collection/1'],
    ['gid://shopify/Collection/1', 'gid://shopify/Collection/other'],
    ['gid://shopify/Collection/1']), true);
});
test('mapping richiede DRAFT e corrispondenza SKU/variant GID esatta', () => {
  const p = {
    id: 'gid://shopify/Product/1',
    status: 'DRAFT',
    variants: [{ id: 'gid://shopify/ProductVariant/2', sku: 'QA-001' }],
  };
  assert.equal(verifyCreatedMapping(fixture(), p)[0].variantGid, p.variants[0].id);
  assert.throws(() => verifyCreatedMapping(fixture(), { ...p, status: 'ACTIVE' }));
  assert.throws(() => verifyCreatedMapping(fixture(), { ...p, variants: [] }));
  assert.throws(() =>
    verifyCreatedMapping(fixture(), { ...p, variants: [{ ...p.variants[0], sku: 'qa-001' }] })
  );
});
test('descrizioni non eseguono HTML ricevuto dal browser', () => {
  assert.equal(escapeHtml('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
});
test('nessuna pubblicazione o inventory mutation nel nuovo servizio', () => {
  const s = readFileSync('supabase/functions/_shared/admin-operational-service.ts', 'utf8');
  assert.doesNotMatch(s, /publishablePublish|inventorySetQuantities|status:'ACTIVE'/);
  assert.match(s, /status:\s*'DRAFT'/);
  assert.ok(s.indexOf("db.rpc('admin_claim_draft'") < s.indexOf('mutation AdminCreateDraft'));
});
test('journal e mapping negano accesso diretto al browser e RPC pubbliche', () => {
  const s = readFileSync('docs/release/pending/20261031184521_admin_operational_drafts.sql', 'utf8');
  for (
    const t of ['admin_product_operations', 'admin_product_shopify_links', 'admin_operation_events']
  ) assert.match(s, new RegExp(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`));
  assert.match(s, /FROM PUBLIC,anon,authenticated/);
  assert.doesNotMatch(s, /SECURITY DEFINER/);
});
