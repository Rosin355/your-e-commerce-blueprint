import { expect, test, type Page } from '@playwright/test';
import { projectDraft } from '../../supabase/functions/_shared/admin-draft-view';
import type { AdminAiSuggestion } from '../../src/adminv2/lib/adminApi';
import type { ProductDraft } from '../../supabase/functions/_shared/admin-operational-core';

const productId = 'b998f5bb-e9d4-4d53-a448-7a5129f91ddc';
const collection = 'gid://shopify/Collection/123';
const categoryName = 'Aromatiche da esterno';
const names = new Map([[collection, categoryName]]);
const initial: ProductDraft = {
  sku: 'TEST-OG-AI-001', title: 'TEST — Lavanda officinale — NON IN VENDITA',
  description: '<p>Descrizione <strong>originale</strong>.</p>', currency: 'EUR', vendor: 'Fornitore sintetico',
  variants: [{ sku: 'TEST-OG-AI-001', option: 'Formato unico', price: '10.00', compareAtPrice: null }],
  categoryIds: [], collectionIds: [collection], tags: ['collaudo'], botanical: {},
  images: [{ url: 'https://cdn.shopify.com/synthetic.png', alt: 'Foto lavanda sintetica' }],
  seoTitle: 'Titolo SEO sintetico', seoDescription: 'Descrizione SEO sintetica',
};

async function simulate(page: Page, options: { readError?: boolean; legacy?: boolean; media?: boolean; allowDraftSend?: boolean; currentText?: string; aiFailures?: string[]; allowAi?: boolean } = {}) {
  const failures = [...(options.aiFailures ?? [])];
  let saved = structuredClone(initial);
  if (options.legacy) saved.description = '<p onclick="">Testo <strong>verificato</strong>.</p><ul><li>Voce</li></ul><script type="application/json">contenuto escluso</script>';
  let value = options.currentText ?? saved.description;
  let version = 1;
  let sent = false;
  let pending: AdminAiSuggestion | undefined;
  const uploadKeys: string[] = [];
  const calls: string[] = [];
  const unexpected: string[] = [];
  await page.addInitScript(() => {
    localStorage.setItem('sb-127-auth-token', JSON.stringify({
      access_token: 'synthetic-token', refresh_token: 'synthetic-refresh', token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'synthetic-editor', aud: 'authenticated' },
    }));
  });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.href === initial.images[0].url) return route.fulfill({
      contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAANElEQVR4nGM4cnkLGiqNmIqGiFHDMGoQHQ0iTxummlGD6GnQ4EtHowYRNmjwpaNRgwiqAQBEoSLd7BZengAAAABJRU5ErkJggg==', 'base64'),
    });
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
    if (!url.pathname.startsWith('/functions/v1/')) return route.continue();
    const input = route.request().postDataJSON();
    const action = input.action;
    calls.push(action);
    const reply = (result: object) => route.fulfill({ json: { ok: true, ...result } });
    switch (action) {
      case 'get_admin_context': return reply({ roles: ['editor'], canWrite: true, canUseAi: options.allowAi !== false, ordinaryCatalog: true, supportsCatalogSourceAndProductType: true, canUploadImages: options.media === true, editableFieldKeys: ['description'], canPublish: true });
      case 'get_product': return reply({
        product: { productId, sku: saved.sku, entityType: 'simple', isActive: true },
        shopifyLive: sent ? { available: true, mapped: true, publicationStatus: 'DRAFT' } : { available: false, mapped: false }, history: [],
        sections: [{ key: 'content', label: 'Contenuti', fields: [{
          key: 'description', label: 'Descrizione', value, version, dataType: 'text', editorType: 'richtext',
          sourceState: 'original_absent', validationRules: {}, syncState: 'INTERNAL_ONLY',
          capabilities: { currentValueExists: true, canUpdate: true, canSuggestAi: true },
        }] }],
      });
      case 'get_product_operations': return reply({ canManageDraft: true, ordinaryCatalog: true, canSendDraft: options.allowDraftSend === true, operations: [{
        id: 'operation', state: sent ? 'VERIFIED_DRAFT' : 'LOCAL_DRAFT', created_at: '2026-11-20', admin_operation_events: [],
        summary: projectDraft(saved, names),
      }] });
      case 'get_ai_suggestions':
        if (options.readError) return route.fulfill({ status: 503, json: { error: { code: 'INTERNAL_ERROR' } } });
        return reply({ suggestions: pending ? [pending] : [] });
      case 'generate_ai_suggestion':
        pending = { id: 'suggestion-' + calls.length, fieldKey: 'description', productId, baseVersion: version,
          suggestedValue: '<p>Proposta sintetica.</p>', status: 'pending', promptVersion: 'mock', model: 'mock', createdAt: '' };
        return reply({ suggestion: pending });
      case 'reject_ai_suggestion': {
        const result = pending;
        pending = undefined;
        return reply({ suggestion: result });
      }
      case 'accept_ai_suggestion': {
        expect(input.expectedVersion).toBe(version);
        expect(input.suggestionId).toBe(pending?.id);
        expect(input.idempotencyKey).toBeTruthy();
        value = input.value;
        version++;
        const result = pending;
        pending = undefined;
        return reply({ suggestion: result, result: { version } });
      }
      case 'catalog_categories': return reply({ categories: [], canAuthorDraft: true, canSaveDraft: true });
      case 'list_editorial_collections': return reply({ collections: [{ id: collection, title: categoryName, handle: 'technical-handle' }] });
      case 'list_catalog_media': return reply({ media: [{ id: 'ready-file', state: 'READY', ...initial.images[0] }] });
      case 'upload_catalog_image':
        uploadKeys.push(input.idempotencyKey);
        if (uploadKeys.length === 1) return route.fulfill({ status: 503, json: { error: { code: 'INTERNAL_ERROR' } } });
        return reply({ media: { id: 'file-1', state: 'READY', url: initial.images[0].url, alt: input.alt } });
      case 'get_field_definitions': return reply({definitions:[{key:'description',label:'Descrizione',editor_type:'richtext',data_type:'text',visible:true,editable:true,ai_allowed:true,manual_only:false,validation_rules:{}}]});
      case 'suggest_confirmed_field': {
        expect(input.fieldKey).toBe('description');
        expect(input.confirmed).toBe(true);
        const failure = failures.shift();
        if (failure === 'connection') return route.abort('failed');
        if (failure) return route.fulfill({status:failure === 'FORBIDDEN' ? 403 : 422,json:{ok:false,error:{code:failure}}});
        return reply({source:'confirmed_facts',value:input.facts.map((line:string) => `<p>${line}</p>`).join('')});
      }
      case 'preview_new_product': return reply({ warnings: [], shopifySkuVerified:true });
      case 'prepare_catalog_approval': return reply({ approvalId: 'synthetic-approval' });
      case 'create_shopify_draft':
        expect(options.allowDraftSend).toBe(true);
        expect(input.approvalId).toBe('synthetic-approval');
        sent = true;
        return reply({ result: { state: 'VERIFIED_DRAFT' } });
      case 'save_new_product':
        expect(input.approvalId).toBe('synthetic-approval');
        saved = input.draft;
        value = saved.description;
        return reply({ result: { productId, operationId: 'operation', state: 'LOCAL_DRAFT' } });
      default: unexpected.push(action); return route.fulfill({ status: 403, json: { ok: false } });
    }
  });
  return { calls, unexpected, uploadKeys, advanceVersion: () => { version++; } };
}

test('scheda reale: proposta immediata, refresh, scarto, obsolescenza e applicazione interna', async ({ page }) => {
  const model = await simulate(page);
  await page.goto('/admin/products/' + productId);
  const generate = page.getByRole('button', { name: 'Migliora il testo con AI' });
  await expect(page.getByText('Bozza interna non inviata · fuori vendita')).toBeVisible();
  await expect(page.getByText('Prezzo di vendita 10,00 EUR', { exact: false })).toBeVisible();
  await expect(page.getByText(categoryName, { exact: true })).toBeVisible();
  await expect(generate).toBeVisible();
  const reads = model.calls.filter(action => action === 'get_ai_suggestions').length;
  await generate.click({ clickCount: 2 });
  await expect(page.getByText('Proposta sintetica.', { exact: true })).toBeVisible();
  expect(model.calls.filter(a => a === 'get_ai_suggestions')).toHaveLength(reads);
  await page.reload();
  await expect(page.getByText('Proposta sintetica.', { exact: true })).toBeVisible();
  expect(model.calls.filter(a => a === 'generate_ai_suggestion')).toHaveLength(1);
  model.advanceVersion();
  await page.reload();
  await expect(page.getByText('Proposta AI non più aggiornata')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Applica alla bozza' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Scarta', exact: true }).click();
  await generate.click();
  await page.getByRole('button', { name: 'Modifica proposta' }).click();
  await page.getByRole('textbox', { name: 'Descrizione', exact: true }).fill('Revisione sintetica approvata.');
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Applica alla bozza' }).click();
  await expect(page.getByText('Proposta accettata e salvata nella cronologia.')).toBeVisible();
  await expect(page.getByText('Revisione sintetica approvata.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(generate).toBeVisible();
  expect(model.calls.filter(a => a === 'accept_ai_suggestion')).toHaveLength(1);
  expect(model.calls.filter(a => a === 'reject_ai_suggestion')).toHaveLength(1);
  expect(model.unexpected).toEqual([]);
});

test('wizard reale: categoria, virgola, anteprima e riapertura del riepilogo', async ({ page }, testInfo) => {
  const model = await simulate(page, { media: true });
  await page.goto('/admin/products/new');
  await page.getByLabel('Nome prodotto').fill(initial.title);
  await page.getByLabel('SKU famiglia').fill(initial.sku);
  await page.getByRole('textbox', { name: 'Descrizione verificata' }).fill('Lavanda di prova.');
  await page.getByRole('button', { name: '2. Dati commerciali' }).click();
  await page.getByLabel('Fornitore').fill(initial.vendor);
  await page.getByLabel('Tipo prodotto').fill('Arbusto sintetico');
  await page.getByLabel('Tag separati da virgole').fill('collaudo');
  await page.getByRole('button', { name: '3. Categorie' }).click();
  await page.getByLabel('Cerca categoria').fill('aromatiche');
  await page.getByRole('checkbox', { name: categoryName }).check();
  await expect(page.getByText('Selezionate · ' + categoryName)).toBeVisible();
  await page.getByRole('button', { name: '4. Immagini e formati' }).click();
  await page.getByRole('textbox', { name: 'Prezzo di vendita 1' }).fill('10,00');
  await page.getByText('Scegli fra le tue immagini già caricate').click();
  await page.getByRole('button', { name: /Foto lavanda sintetica/ }).click();
  await page.getByRole('button', { name: '5. Botanica e SEO' }).click();
  await page.getByText('SEO facoltativa').click();
  await page.getByLabel('Titolo SEO').fill(initial.seoTitle);
  await page.getByLabel('Descrizione SEO').fill(initial.seoDescription);
  await page.getByRole('button', { name: '6. Anteprima' }).click();
  await expect(page.getByRole('img', { name: initial.images[0].alt })).toBeVisible();
  await expect(page.locator('.prose p')).toHaveText('Lavanda di prova.');
  await expect(page.getByText(categoryName, { exact: true })).toBeVisible();
  await expect(page.getByText(/Prezzo di vendita 10,00 EUR/)).toBeVisible();
  await expect(page.getByText(initial.seoTitle)).toBeVisible();
  await expect(page.getByText(initial.seoDescription)).toBeVisible();
  await expect(page.getByText(initial.vendor)).toBeVisible();
  await page.locator('fieldset').screenshot({ path: testInfo.outputPath('anteprima.png') });
  await page.getByRole('button', { name: 'Verifica anteprima' }).click();
  await page.getByRole('checkbox', { name: /Confermo i dati/ }).check();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Salva bozza nell’Admin' }).click();
  await page.getByRole('link', { name: 'Apri scheda prodotto e storico' }).click();
  await expect(page.getByRole('heading', { name: 'Riepilogo della bozza interna salvata' })).toBeVisible();
  await expect(page.getByText(/Prezzo di vendita 10,00 EUR/)).toBeVisible();
  await expect(page.getByText(categoryName, { exact: true })).toBeVisible();
  const summary = page.getByRole('heading', { name: 'Riepilogo della bozza interna salvata' }).locator('..');
  const photo = summary.getByRole('img', { name: initial.images[0].alt });
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBe(24);
  await expect(summary.getByText(initial.seoTitle)).toBeVisible();
  await expect(summary.getByText(initial.vendor)).toBeVisible();
  await expect(summary.getByText('Arbusto sintetico')).toBeVisible();
  await expect(summary.getByText(initial.seoDescription)).toBeVisible();
  await expect(summary.getByText('Lavanda di prova.')).toBeVisible();
  await summary.screenshot({ path: testInfo.outputPath('riepilogo.png') });
  expect(model.calls.filter(a => a === 'save_new_product')).toHaveLength(1);
  expect(model.unexpected).toEqual([]);
});

test('lettura pending indisponibile: editing manuale accessibile, generazione bloccata', async ({ page }) => {
  const model = await simulate(page, { readError: true, currentText: 'simple' });
  await page.goto('/admin/products/' + productId);
  await expect(page.getByRole('button', { name: 'Rileggi le proposte salvate' })).toBeVisible();
  await expect(page.getByText('simple', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Migliora il testo con AI' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Modifica', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Descrizione' })).toBeEditable();
  expect(model.calls).not.toContain('generate_ai_suggestion');
});

test('riepilogo legacy in sola lettura: struttura sicura, foto e SEO', async ({ page }) => {
  const model = await simulate(page, { legacy: true });
  await page.goto('/admin/products/' + productId);
  const summary = page.getByRole('heading', { name: 'Riepilogo della bozza interna salvata' }).locator('..');
  await expect(summary.locator('.prose strong')).toHaveText('verificato');
  await expect(summary.locator('.prose li')).toHaveText('Voce');
  await expect(summary.locator('.prose script, .prose [onclick]')).toHaveCount(0);
  await expect(summary).not.toContainText('<p');
  await expect(summary.getByRole('img', { name: 'Foto lavanda sintetica' })).toBeVisible();
  await expect(summary.getByText('Titolo SEO sintetico')).toBeVisible();
  await expect(summary.getByText('Descrizione SEO sintetica')).toBeVisible();
  expect(model.unexpected).toEqual([]);
});

test('upload simulato: una chiave per lo stesso file anche dopo nuova selezione, rimozione solo locale', async ({ page }) => {
  const model = await simulate(page, { media: true });
  await page.goto('/admin/products/new');
  await page.getByRole('button', { name: '4. Immagini e formati' }).click();
  const image = { name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from('fixture locale') };
  const file = page.getByLabel('Scegli immagine dal computer');
  await file.setInputFiles(image);
  await page.getByLabel('Testo alternativo dell’immagine').fill('Foto sintetica');
  const upload = page.getByRole('button', { name: 'Carica immagine' });
  await upload.click();
  await expect(page.getByRole('alert')).toBeVisible();
  await file.setInputFiles(image);
  await upload.click();
  await expect(page.getByText('File pronto nella libreria.')).toBeVisible();
  expect(model.uploadKeys).toHaveLength(2);
  expect(new Set(model.uploadKeys).size).toBe(1);
  await expect(upload).toBeDisabled();
  await page.getByRole('button', { name: 'Rimuovi dalla bozza' }).click();
  await expect(page.getByRole('button', { name: 'Rimuovi dalla bozza' })).toHaveCount(0);
  expect(model.unexpected).toEqual([]);
});


test('invio simulato in DRAFT solo dopo conferma esplicita aggiorna lo stato senza pubblicare', async ({ page }) => {
  const model = await simulate(page, { allowDraftSend: true });
  await page.goto('/admin/products/' + productId);
  await expect(page.getByText('Bozza interna non inviata · fuori vendita')).toBeVisible();
  await page.getByText('Operazioni Shopify e storico').click();
  const send = page.getByRole('button', { name: 'Crea bozza Shopify' });
  page.once('dialog', dialog => dialog.dismiss());
  await send.click();
  expect(model.calls).not.toContain('create_shopify_draft');
  page.on('dialog', dialog => dialog.accept());
  await send.click();
  await expect(page.getByText('Bozza Shopify verificata · fuori vendita')).toBeVisible();
  expect(model.calls.filter(action => action === 'create_shopify_draft')).toHaveLength(1);
  expect(model.calls).not.toContain('publish_catalog_product');
  expect(model.unexpected).toEqual([]);
});

const verifiedParagraph = 'La scheda riporta Quercus robur. Il riferimento è stato controllato.';

for (const width of [390,1280]) test('AI descrizione vuota: errore, riprova e salvataggio interno a '+width+'px', async ({page}) => {
  const model = await simulate(page,{aiFailures:['connection','INVALID_MODEL_PROPOSAL']});
  await page.setViewportSize({width,height:860});
  await page.goto('/admin/products/new');
  await page.getByLabel('Nome prodotto (obbligatorio)').fill('Quercus robur');
  await page.getByRole('textbox',{name:'Prezzo di vendita 1'}).fill('10');
  await page.getByText('Aiuto AI per la descrizione (facoltativo)').click();
  const panel = page.getByRole('region',{name:'Assistenza AI Descrizione'});
  const description = page.getByRole('textbox',{name:'Descrizione verificata'});
  const facts = panel.getByRole('textbox',{name:/Informazioni fattuali/});
  const run = panel.getByRole('button',{name:'Organizza le informazioni con AI'});
  await facts.fill('breve');
  await panel.getByRole('checkbox').check();
  await run.press('Enter');
  const alert = panel.getByRole('alert');
  await expect(alert).toContainText('La riga 1');
  await expect(alert.locator('svg[aria-hidden="true"]')).toBeVisible();
  await expect(alert).toHaveCSS('border-top-style','solid');
  const color = await alert.evaluate(node => getComputedStyle(node).color);
  const [red,green,blue] = color.match(/\d+/g)!.map(Number);
  expect(red).toBeGreaterThan(green);
  expect(red).toBeGreaterThan(blue);
  expect(model.calls).not.toContain('suggest_confirmed_field');
  await facts.fill(verifiedParagraph);
  await expect(alert).toHaveCount(0);
  await panel.getByRole('checkbox').check();
  for (const message of ['Connessione al servizio AI','Il modello ha restituito']) {
    await run.press('Enter');
    await expect(alert).toContainText(message);
    await expect(facts).toHaveValue(verifiedParagraph);
    await expect(panel.getByRole('checkbox')).toBeChecked();
    await expect(description).toHaveText('');
  }
  await run.press('Enter');
  await expect(alert).toHaveCount(0);
  await expect(panel.getByRole('status')).toContainText('righe originali');
  await expect(description).toHaveText('');
  const apply=panel.getByRole('button',{name:'Applica alla compilazione'});
  page.once('dialog',dialog=>dialog.dismiss());
  await apply.press('Enter');
  await expect(description).toHaveText('');
  page.once('dialog',dialog=>dialog.accept());
  await apply.press('Enter');
  await expect(description).toHaveText(verifiedParagraph);
  expect(model.calls).not.toContain('save_new_product');
  await page.getByRole('button',{name:'Vai all’anteprima'}).click();
  await page.getByRole('button',{name:'Verifica anteprima'}).click();
  await page.getByRole('checkbox',{name:/Confermo i dati/}).check();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Salva bozza nell’Admin'}).click();
  await page.getByRole('link',{name:'Apri scheda prodotto e storico'}).click();
  await page.reload();
  const summary = page.getByRole('heading',{name:'Riepilogo della bozza interna salvata'}).locator('..');
  await expect(summary.getByText(verifiedParagraph,{exact:true})).toBeVisible();
  expect(model.calls.filter(action=>action==='save_new_product')).toHaveLength(1);
  expect(model.calls).not.toContain('create_shopify_draft');
  expect(model.unexpected).toEqual([]);
});

test('AI descrizione esistente: permesso negato e proposta applicata solo al modulo editor', async ({page})=>{
  const model = await simulate(page,{currentText:'',aiFailures:['FORBIDDEN']});
  await page.goto('/admin/products/'+productId);
  const panel = page.getByRole('region',{name:'Assistenza AI Descrizione'});
  await panel.getByRole('textbox',{name:/Informazioni fattuali/}).fill(verifiedParagraph);
  await panel.getByRole('checkbox').check();
  const run=panel.getByRole('button',{name:'Organizza le informazioni con AI'});
  await run.click();
  await expect(panel.getByRole('alert')).toContainText('non è autorizzato');
  await run.click();
  await expect(panel.getByRole('status')).toContainText('righe originali');
  page.once('dialog',dialog=>dialog.accept());
  await panel.getByRole('button',{name:'Applica alla compilazione'}).click();
  await expect(page.getByRole('textbox',{name:'Descrizione',exact:true})).toHaveText(verifiedParagraph);
  expect(model.calls).not.toContain('update_field');
  expect(model.unexpected).toEqual([]);
});

test('AI descrizione editor senza grant: compilazione manuale disponibile', async ({page})=>{
  const model=await simulate(page,{allowAi:false});
  await page.goto('/admin/products/new');
  await expect(page.getByRole('textbox',{name:'Descrizione verificata'})).toBeEditable();
  await expect(page.getByText('Aiuto AI per la descrizione (facoltativo)')).toHaveCount(0);
  expect(model.calls).not.toContain('suggest_confirmed_field');
});
