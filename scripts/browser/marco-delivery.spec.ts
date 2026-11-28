import { readFileSync } from 'node:fs';
import { validateEditorialDescription } from '../../supabase/functions/_shared/admin-ai-description';
import type { FieldDefinition } from '../../supabase/functions/_shared/admin-v2-types';
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

async function simulate(page: Page, options: {historicalBotany?:boolean; interruptedSave?:boolean; article?: 'complete'|'partial'|'legacy'|'semantic'; assets?:boolean; lifecycle?:boolean; existingAi?:boolean; syncReview?:boolean; conflictAfterSave?:boolean; readError?: boolean; legacy?: boolean; media?: boolean; allowDraftSend?: boolean; currentText?: string; aiFailures?: string[]; allowAi?: boolean; sheet?: boolean; noTypeDomain?: boolean; modelSeo?: boolean; denyDescription?: boolean } = {}) {
  let changedFormat='Unico';
  let botanicalConfirmed=false;
  let originalSaveKey:string|undefined;
  const gallery:{id:string;alt:string;url:string;variant:boolean}[]=[];
  const failures = [...(options.aiFailures ?? [])];
  let saved = structuredClone(initial);
  if (options.legacy) saved.description = '<p onclick="">Testo <strong>verificato</strong>.</p><ul><li>Voce</li></ul><script type="application/json">contenuto escluso</script>';
  let value = options.currentText ?? saved.description;
  let version = 1;
  let liveContent = value;
  let receipt: {action:string;state:string;created_at:string}|null=null;
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
      case 'get_admin_context': return reply({ lifecycleActions:options.lifecycle?['archive_catalog_product']:[], roles: ['editor'], canWrite: true, canUseAi: options.allowAi !== false, ordinaryCatalog: true, canManageGallery: options.assets===true, canRenameFormats:options.assets===true, canSync:options.assets===true, supportsCatalogSourceAndProductType: true, supportsDistinctDescriptions: true, supportsSheetEvidence:!!options.article, canUploadImages: options.media === true, editableFieldKeys: [...(options.denyDescription ? [] : ['description']), ...(options.article?['faq','key_features','key_benefits']:[]), ...(options.sheet ? ['short_description', 'seo_title', 'seo_description', 'periodo_di_fioritura'] : [])], canPublish: true });
      case 'get_product': return reply({
        product: { productId, sku: saved.sku, entityType: 'simple', isActive: true },
        shopifyLive: options.assets ? {available:true,mapped:true,identityVerified:true,publicationStatus:'DRAFT'} : sent ? { available: true, mapped: true, publicationStatus: 'DRAFT' } : { available: false, mapped: false }, history: [],
        sections: [{ key: 'content', label: 'Contenuti', fields: [{
          key: 'description', label: 'Descrizione', aiAllowed:options.existingAi===true, value, version,
          ...(options.syncReview?{shopifyBaselineHash:version>1 && options.conflictAfterSave?'changed':'initial-hash',shopifySyncAllowed:true,shopifyLiveValue:liveContent}:{}), dataType: 'text', editorType: 'richtext',
          sourceState: 'original_absent', validationRules: {}, syncState: 'INTERNAL_ONLY',
          capabilities: { currentValueExists: true, canUpdate: true, canSuggestAi: true },
        }, {key:'gtin',label:'EAN tecnico',value:'EAN-SINTETICO',version:1,dataType:'text',editorType:'text',sourceState:'original_absent',
          validationRules:{},syncState:'INTERNAL_ONLY',capabilities:{currentValueExists:true,canUpdate:false,updateBlockReason:'role_forbidden'}}] }],
      });
      case 'get_product_operations': return reply({ canManageDraft: true, ordinaryCatalog: true, canSendDraft: options.allowDraftSend === true, operations: [{
        id: 'operation', state: sent ? 'VERIFIED_DRAFT' : 'LOCAL_DRAFT', created_at: '2026-11-20', admin_operation_events: [],
        summary: projectDraft(saved, names),
        ...(options.historicalBotany ? {botanicalReview:{hash:'immutable',entries:[['periodo_di_fioritura',['Febbraio','Maggio','Novembre']]],completed:botanicalConfirmed,canConfirm:true}} : {}),
      }] });
      case 'get_catalog_lifecycle_receipt': return reply({receipt});
      case 'preview_catalog_lifecycle': return reply({hash:'fixture-hash',plan:{title:'Scheda tecnica',status:'DRAFT',variants:[],channels:[]}});
      case 'archive_catalog_product': expect(input.planHash).toBe('fixture-hash');receipt={action,state:'COMPLETE',created_at:'2026-11-25T12:00:00Z'};return reply({result:{state:'ARCHIVED'}});
      case 'sync_field': expect(input.expectedVersion).toBe(version);expect(input.expectedShopifyHash).toBe('initial-hash');liveContent=value;return reply({result:{state:'SYNCED'}});
      case 'update_field': expect(input.expectedVersion).toBe(version); value=input.value;version++;return reply({result:{version}});
      case 'get_product_formats': return reply({updatedAt:changedFormat,formats:[{id:'option-value',name:changedFormat}],variants:[{sku:'QA',format:changedFormat,price:'10.00'}]});
      case 'get_product_gallery': return reply({updatedAt:'v'+gallery.length,images:gallery});
      case 'rename_catalog_format': expect(input.expectedUpdatedAt).toBe('Unico'); changedFormat=input.name;return reply({result:{state:'VERIFIED'}});
      case 'set_catalog_image': expect(input.change).toBe('add');expect(input.libraryId).toBe('ready-file');
        gallery.push({id:'fixture-file',variant:false,...initial.images[0]});return reply({result:{state:'VERIFIED'}});
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
      case 'catalog_categories': return reply({ categories: [], canAuthorDraft: true, canSaveDraft: true, canSendDraft:options.allowDraftSend===true });
      case 'list_editorial_collections': return reply({ collections: [{ id: collection, title: categoryName, handle: 'technical-handle' }] });
      case 'list_catalog_media': return reply({ media: [{ id: 'ready-file', state: 'READY', ...initial.images[0] }] });
      case 'upload_catalog_image':
        uploadKeys.push(input.idempotencyKey);
        if (uploadKeys.length === 1) return route.fulfill({ status: 503, json: { error: { code: 'INTERNAL_ERROR' } } });
        return reply({ media: { id: 'file-1', state: 'READY', url: initial.images[0].url, alt: input.alt } });
      case 'get_field_definitions': {
        const def = {key:'description',label:'Descrizione',editor_type:'richtext',data_type:'text',visible:true,editable:true,ai_allowed:true,manual_only:false,validation_rules:{}};
        return reply({definitions:[def,...(options.article?['key_features','key_benefits','faq'].map(key=>({...def,key,label:key,data_type:'json',editor_type:key==='faq'?'faq':'multiselect',ai_allowed:key!=='faq'})):[]), ...(options.sheet ? [
          {...def, key:'short_description', editor_type:'textarea'}, {...def, key:'seo_title', editor_type:'text'}, {...def, key:'seo_description', editor_type:'textarea'},
          {...def, key:'tags', editor_type:'multiselect', data_type:'json', ai_allowed:false},
          {...def, key:'periodo_di_fioritura', label:'Periodo di fioritura', editor_type:'multiselect', data_type:'json', ai_allowed:false},
          ...(options.noTypeDomain ? [] : [{...def, key:'shopify_product_type', editor_type:'select', shopify_mapping:{ type:'core',field:'productType' }, validation_rules:{enum:['Alberi','Arbusti']}}]),
        ] : [])]});
      }
      case 'suggest_confirmed_field': {
        if(options.article && input.article) {
          expect(input.confirmed).toBe(true);
          if(options.article==='legacy')return reply({source:'model',value:'<p>V2</p>',promptVersion:'online-garden-editoriale-it@2'});
          const partial = options.article === 'partial' && !input.section;
          const fixture = partial ? 'v3-uat-parziale' : options.article === 'semantic' ? 'v3-semantica' : 'v3';
          const data=JSON.parse(readFileSync(new URL('../tests/fixtures/yucca-filamentosa-' + fixture + '.json',import.meta.url),'utf8'));
          if(input.section) {
            expect(input.revision.target).toBe(input.section);
            expect(input.fieldKey).toBe('description');
            expect(input).not.toHaveProperty('draftTitle');
            if(input.revision.instruction==='errore simulato')return route.fulfill({status:422,json:{ok:false,error:{code:'INVALID_MODEL_PROPOSAL'}}});
            data.sections=data.sections.filter((s:{heading:string})=>s.heading===input.section);
            if(input.section==='Fioritura' && input.revision.instruction==='Rendi più naturale')data.sections[0].text=data.sections[0].text.replace('si osserva','si vede');
          }
          return reply({...validateEditorialDescription({key:'description',editor_type:'richtext',data_type:'text',validation_rules:{}} as FieldDefinition,input.facts,data,{article:true,review:true,section:input.section,productName:input.draftTitle}),editorial:{seoTitle:{value:'Yucca filamentosa – arbusto sempreverde',source:'model'},seoDescription:{value:'Yucca filamentosa – arbusto sempreverde. Predilige un terreno fertile e ben drenato.',source:'deterministic'},tags:{value:['Yucca filamentosa','arbusto sempreverde'],source:'deterministic'}}});
        }
        expect(Object.keys(input).sort()).toEqual(['action','confirmed',...('draftTitle' in input ? ['draftTitle'] : []),'facts','fieldKey',...('productName' in input ? ['productName'] : []),'requestKey']);
        if ('draftTitle' in input) expect(input.draftTitle).toBeTruthy();
        expect(input.fieldKey).toBe('description');
        expect(input.confirmed).toBe(true);
        const failure = failures.shift();
        if (failure === 'connection') return route.abort('failed');
        if (failure) return route.fulfill({status:failure === 'FORBIDDEN' ? 403 : 422,json:{ok:false,error:{code:failure}}});
        return reply({...(options.modelSeo && input.draftTitle ? {editorial:{
          seoTitle:{value:input.draftTitle+' (Farnia)',source:'model'},seoDescription:{value:input.facts[0],source:'model'},
          tags:{value:[input.draftTitle],source:'deterministic'},
        }} : {}),source:'model',value:input.facts.map((line:string) => `<p>${line}</p>`).join('')});
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
        if (options.historicalBotany) {
          expect(input.operationId).toBe('operation');
          expect(input.expectedHash).toBe('immutable');
          expect(input.botanicalConfirmedKeys).toEqual(['periodo_di_fioritura']);
          expect(input.draft).toBeUndefined();
          botanicalConfirmed=true;
          return reply({botanicalReview:{operationId:input.operationId,payloadHash:input.expectedHash}});
        }
        if (options.interruptedSave && !originalSaveKey) {
          originalSaveKey=input.idempotencyKey;
          saved=input.draft;
          return route.fulfill({status:409,json:{error:{code:'NEEDS_RECONCILIATION',message:'Bozza salvata, rilettura interrotta.'}}});
        }
        if (options.interruptedSave) {
          expect(input.idempotencyKey).toBe(originalSaveKey);
          expect(input.draft).toEqual(saved);
        }
        saved = input.draft;
        value = saved.description;
        return reply({ result: { productId, operationId: 'operation', state: 'LOCAL_DRAFT' } });
      default: unexpected.push(action); return route.fulfill({ status: 403, json: { ok: false } });
    }
  });
  return { calls, unexpected, uploadKeys, saved: () => structuredClone(saved), advanceVersion: () => { version++; } };
}

test('scheda reale: proposta immediata, refresh, scarto, obsolescenza e applicazione interna', async ({ page }) => {
  const model = await simulate(page);
  await page.goto('/admin/products/' + productId);
  const generate = page.getByRole('button', { name: 'Migliora il testo con AI' });
  await expect(page.getByText('Bozza interna non inviata · fuori vendita')).toBeVisible();
  await expect(page.getByText('Prezzo di vendita 10,00 EUR', { exact: false })).toBeVisible();
  await expect(page.locator('dd:visible').filter({hasText:categoryName})).toBeVisible();
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
  await page.getByRole('button',{name:'Editor avanzato',exact:true}).click();
  await page.getByLabel('Nome prodotto').fill(initial.title);
  await page.getByText('Opzioni avanzate · Dati tecnici e permessi', {exact:true}).click();
  await page.locator('#sku').fill(initial.sku);
  await page.getByRole('textbox', { name: 'Descrizione verificata' }).fill('Lavanda di prova.');
  await page.getByLabel('Fornitore').fill(initial.vendor);
  await page.locator('#productType').fill('Arbusto sintetico');
  await page.locator('#tags').fill('collaudo');
  await page.getByLabel('Cerca categoria').fill('aromatiche');
  await page.getByRole('checkbox', { name: categoryName }).check();
  await expect(page.getByText('Selezionate · ' + categoryName)).toBeVisible();
  await page.getByRole('textbox', { name: 'Prezzo di vendita 1' }).fill('10,00');
  await page.getByText('Scegli fra le tue immagini già caricate').click();
  await page.getByRole('button', { name: /Foto lavanda sintetica/ }).click();
  await page.getByText('SEO facoltativa').click();
  await page.getByLabel('Titolo SEO').fill(initial.seoTitle);
  await page.getByLabel('Descrizione SEO').fill(initial.seoDescription);
  await page.getByRole('button', { name: 'Vai all’anteprima' }).click();
  await expect(page.getByRole('img', { name: initial.images[0].alt })).toBeVisible();
  await expect(page.locator('.prose p:visible')).toHaveText('Lavanda di prova.');
  await expect(page.locator('dd:visible').filter({hasText:categoryName})).toBeVisible();
  await expect(page.getByText(/Prezzo di vendita 10,00 EUR/)).toBeVisible();
  await page.getByText('Codici e dettagli avanzati').click();
  await expect(page.locator('dd:visible').filter({hasText:initial.seoTitle})).toBeVisible();
  await expect(page.locator('dd:visible').filter({hasText:initial.seoDescription})).toBeVisible();
  await expect(page.locator('dd:visible').filter({hasText:initial.vendor})).toBeVisible();
  await page.locator('fieldset').screenshot({ path: testInfo.outputPath('anteprima.png') });
  await page.getByRole('button', { name: 'Verifica anteprima' }).click();
  await page.getByRole('checkbox', { name: /Confermo i dati/ }).check();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Salva bozza nell’Admin' }).click();
  await page.getByRole('link', { name: 'Apri scheda prodotto e storico' }).click();
  await expect(page.getByRole('heading', { name: 'Riepilogo della bozza interna salvata' })).toBeVisible();
  await expect(page.getByText(/Prezzo di vendita 10,00 EUR/)).toBeVisible();
  await expect(page.locator('dd:visible').filter({hasText:categoryName})).toBeVisible();
  const summary = page.getByRole('heading', { name: 'Riepilogo della bozza interna salvata' }).locator('..');
  await summary.getByText('Codici e dettagli avanzati').click();
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
  await page.getByRole('button', { name: 'Modifica Descrizione estesa', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Descrizione' })).toBeEditable();
  expect(model.calls).not.toContain('generate_ai_suggestion');
});

test('riepilogo legacy in sola lettura: struttura sicura, foto e SEO', async ({ page }) => {
  const model = await simulate(page, { legacy: true });
  await page.goto('/admin/products/' + productId);
  const summary = page.getByRole('heading', { name: 'Riepilogo della bozza interna salvata' }).locator('..');
  await summary.getByText('Codici e dettagli avanzati').click();
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
  await page.getByRole('button',{name:'Editor avanzato',exact:true}).click();
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
  await page.getByRole('button',{name:'Editor avanzato',exact:true}).click();
  await page.getByLabel('Nome prodotto (obbligatorio)').fill('Quercus robur');
  await page.getByRole('textbox',{name:'Prezzo di vendita 1'}).fill('10');
  const panel = page.getByRole('region',{name:'Assistenza AI nuova scheda'});
  const description = page.getByRole('textbox',{name:'Descrizione verificata'});
  const facts = panel.getByRole('textbox',{name:/Informazioni verificate/});
  const run = panel.getByRole('button',{name:/Completa scheda con AI|Riprova la descrizione/});
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
    await expect(message.startsWith('Connessione') ? alert : panel.getByRole('status')).toContainText(message);
    await expect(facts).toHaveValue(verifiedParagraph);
    await expect(panel.getByRole('checkbox')).toBeChecked();
    await expect(description).toHaveText('');
  }
  await run.press('Enter');
  await expect(alert).toHaveCount(0);
  await expect(panel.getByRole('status')).toContainText('Proposta editoriale generata con AI');
  await expect(description).toHaveText('');
  const apply=panel.getByRole('button',{name:'Accetta Descrizione estesa',exact:true});
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
  await summary.getByText('Codici e dettagli avanzati').click();
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
  await expect(panel.getByRole('status')).toContainText('Proposta editoriale generata con AI');
  await expect(panel.getByRole('button',{name:'Applica alla compilazione'})).toBeVisible();
  page.once('dialog',dialog=>dialog.accept());
  await panel.getByRole('button',{name:'Applica alla compilazione'}).click();
  await expect(page.getByRole('textbox',{name:'Descrizione',exact:true})).toHaveText(verifiedParagraph);
  expect(model.calls).not.toContain('update_field');
  expect(model.unexpected).toEqual([]);
});

test('AI descrizione editor senza grant: compilazione manuale disponibile', async ({page})=>{
  const model=await simulate(page,{allowAi:false});
  await page.goto('/admin/products/new');
  await page.getByRole('button',{name:'Editor avanzato',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Descrizione verificata'})).toBeEditable();
  await expect(page.getByRole('button',{name:'Completa scheda con AI'})).toHaveCount(0);
  expect(model.calls).not.toContain('suggest_confirmed_field');
});

test('Scheda AI Editor: approvazione parziale e cumulativa, due formati e riapertura interna', async ({page}) => {
  const model = await simulate(page, {sheet:true,media:true});
  await page.goto('/admin/products/new');
  await page.getByRole('button',{name:'Editor avanzato',exact:true}).click();
  await page.getByLabel('Nome prodotto (obbligatorio)').fill('Quercus robur');
  await page.getByRole('checkbox',{name:categoryName}).check();
  await page.getByText('Scegli fra le tue immagini già caricate').click();
  await page.getByRole('button',{name:/Foto lavanda sintetica/}).click();
  await page.getByRole('button',{name:'Aggiungi formato'}).click();
  await page.getByLabel('Nome formato 1',{exact:true}).fill('Piccolo');
  await page.getByLabel('Nome formato 2',{exact:true}).fill('Grande');
  await page.getByLabel('Prezzo di vendita 1',{exact:true}).fill('12.00');
  await page.getByLabel('Prezzo di vendita 2',{exact:true}).fill('17.50');
  const advanced = page.getByText('Opzioni avanzate · Dati tecnici e permessi',{exact:true});
  await advanced.click();
  const sku = await page.locator('#sku').inputValue();
  await page.getByText('Informazioni botaniche e FAQ facoltative').click();
  for (const month of ['Novembre','Febbraio','Maggio']) await page.getByRole('checkbox',{name:'Periodo di fioritura: '+month,exact:true}).check();
  await page.getByRole('checkbox',{name:'Confermo la fonte e il valore di periodo di fioritura.'}).check();
  await page.locator('#vendor').fill('Fornitore manuale');
  await page.locator('#tags').fill('Tag manuale');
  await page.getByText('SEO facoltativa').click();
  await page.locator('#seoTitle').fill('SEO manuale');
  await advanced.click();

  const assistant = page.getByRole('region',{name:'Assistenza AI nuova scheda'});
  await assistant.getByRole('textbox',{name:'Informazioni verificate'}).fill(verifiedParagraph);
  await assistant.getByRole('checkbox').check();
  await assistant.getByRole('button',{name:'Completa scheda con AI'}).click();
  const preview = assistant.getByRole('region',{name:'Proposte per la bozza'});
  await expect(preview.getByRole('heading',{level:4})).toHaveCount(6);
  await expect(preview.getByLabel('Tipo verificato')).toHaveValue('');
  await expect(preview.getByRole('button',{name:'Accetta Tipo prodotto'})).toHaveCount(0);
  await expect(page.getByRole('textbox',{name:'Descrizione verificata',exact:true})).toHaveText('');
  page.once('dialog',d => d.accept());
  await preview.getByRole('button',{name:'Accetta Descrizione estesa',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Descrizione verificata',exact:true})).toHaveText(verifiedParagraph);
  await page.getByRole('button',{name:'Vai all’anteprima'}).click();
  await page.getByRole('button',{name:'Indietro'}).click();
  await expect(assistant.getByLabel('Informazioni verificate',{exact:true})).toHaveValue(verifiedParagraph);
  await expect(preview.getByRole('group',{name:'Descrizione estesa',exact:true})).toContainText('Presente nella bozza');
  await preview.getByLabel('Tipo verificato').selectOption('Alberi');
  await preview.getByLabel('Proposta Titolo SEO').fill('Quercus robur verificata');
  await advanced.click();
  await page.locator('#seoTitle').fill('SEO modificato durante la revisione');
  await advanced.click();
  const all = preview.getByRole('button',{name:'Accetta tutte le proposte valide non rifiutate'});
  const cancelled = page.waitForEvent('dialog');
  const firstClick = all.click();
  const dialog = await cancelled;
  expect(dialog.message()).toContain('Sostituirai i valori già inseriti in Titolo SEO, Tag.');
  await dialog.dismiss();
  await firstClick;
  await advanced.click();
  await expect(page.locator('#seoTitle')).toHaveValue('SEO modificato durante la revisione');
  await expect(page.locator('#tags')).toHaveValue('Tag manuale');
  await expect(page.locator('#productType')).toHaveValue('');
  await advanced.click();
  page.once('dialog',d=>d.accept());
  await all.click();
  expect(model.calls.filter(a=>a==='suggest_confirmed_field')).toHaveLength(1);
  expect(model.calls).not.toContain('save_new_product');
  await page.getByRole('button',{name:'Vai all’anteprima'}).click();
  await page.getByRole('button',{name:'Verifica anteprima'}).click();
  await page.getByRole('checkbox',{name:/Confermo i dati/}).check();
  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Salva bozza nell’Admin'}).click();
  await page.getByRole('link',{name:'Apri scheda prodotto e storico'}).click();
  await page.reload();
  const summary = page.getByRole('heading',{name:'Riepilogo della bozza interna salvata'}).locator('..');
  await summary.getByText('Codici e dettagli avanzati').click();
  for (const label of ['Quercus robur verificata','Alberi','Fornitore manuale',sku]) {
    await expect(summary.getByText(label,{exact:true})).toBeVisible();
  }
  await expect(summary.getByText('Febbraio, Maggio, Novembre',{exact:true})).toBeVisible();
  await expect(summary.getByText(categoryName,{exact:true}).first()).toBeVisible();
  const saved = model.saved();
  expect(saved).toMatchObject({title:'Quercus robur',description:'<p>'+verifiedParagraph+'</p>',seoTitle:'Quercus robur verificata',
    seoDescription:verifiedParagraph,tags:['Quercus robur',categoryName],productType:'Alberi',sku,currency:'EUR',vendor:'Fornitore manuale',
    collectionIds:[collection],images:initial.images,botanical:{periodo_di_fioritura:['Febbraio','Maggio','Novembre']},
    variants:[{sku:sku+'-1',option:'Piccolo',price:'12.00'},{sku:sku+'-2',option:'Grande',price:'17.50'}]});
  expect(model.calls.filter(a=>a==='save_new_product')).toHaveLength(1);
  expect(model.calls).not.toContain('create_shopify_draft');
  expect(model.unexpected).toEqual([]);
});

test('Scheda AI Editor: un campo negato lascia utilizzabili gli altri', async ({page}) => {
  const model = await simulate(page, {sheet:true,denyDescription:true});
  await page.goto('/admin/products/new');
  await page.getByRole('button',{name:'Editor avanzato',exact:true}).click();
  await page.getByLabel('Nome prodotto (obbligatorio)').fill('Nome verificato');
  const assistant=page.getByRole('region',{name:'Assistenza AI nuova scheda'});
  await assistant.getByLabel('Informazioni verificate',{exact:true}).fill(verifiedParagraph);
  await assistant.getByRole('checkbox').check();
  await assistant.getByRole('button',{name:'Completa scheda con AI'}).click();
  await expect(assistant.getByRole('group',{name:'Descrizione estesa',exact:true})).toContainText('permesso di modifica');
  page.once('dialog',d=>d.accept());
  await assistant.getByRole('button',{name:'Accetta Titolo SEO'}).click();
  await expect(page.locator('#seoTitle')).toHaveValue('Nome verificato');
  await expect(page.getByRole('textbox',{name:'Descrizione verificata',exact:true})).toHaveText('');
  expect(model.calls).not.toContain('suggest_confirmed_field');
  expect(model.calls).not.toContain('save_new_product');
});

test('Scheda AI Editor: il cambio nome scarta la risposta in ritardo e conserva i fatti', async ({page}) => {
  const model = await simulate(page, {sheet:true});
  let started!: () => void;
  const requestStarted = new Promise<void>(resolve => { started=resolve; });
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release=resolve; });
  await page.route('**/functions/v1/product-admin-ai', async route => {
    started();
    await pending;
    await route.fulfill({ json:{ok:true,value:'<p>'+verifiedParagraph+'</p>',source:'model'} });
  });
  await page.goto('/admin/products/new');
  await page.getByRole('button',{name:'Editor avanzato',exact:true}).click();
  const title=page.getByLabel('Nome prodotto (obbligatorio)');
  const assistant=page.getByRole('region',{name:'Assistenza AI nuova scheda'});
  await title.fill('Prima scheda');
  await assistant.getByLabel('Informazioni verificate',{exact:true}).fill(verifiedParagraph);
  await assistant.getByRole('checkbox').check();
  await assistant.getByRole('button',{name:'Completa scheda con AI'}).click();
  await requestStarted;
  await title.fill('Seconda scheda');
  release();
  await expect(assistant.getByRole('button',{name:'Completa scheda con AI'})).toBeDisabled();
  await expect(assistant.getByLabel('Informazioni verificate',{exact:true})).toHaveValue(verifiedParagraph);
  await expect(assistant.getByRole('checkbox')).not.toBeChecked();
  await expect(assistant.getByRole('region',{name:'Proposte per la bozza'})).toHaveCount(0);
  expect(model.calls).not.toContain('save_new_product');
});

test('Scheda AI Editor: metadata utilizzabili durante errore provider e campo escluso preservato al retry', async ({page}) => {
  const model = await simulate(page,{sheet:true,noTypeDomain:true,aiFailures:['AI_PROVIDER_ERROR']});
  await page.goto('/admin/products/new');
  await page.getByRole('button',{name:'Editor avanzato',exact:true}).click();
  await page.getByLabel('Nome prodotto (obbligatorio)').fill('Quercus robur');
  await page.getByRole('checkbox',{name:categoryName}).check();
  await page.getByText('Opzioni avanzate · Dati tecnici e permessi',{exact:true}).click();
  await page.locator('#tags').fill('Tag originale');
  const assistant=page.getByRole('region',{name:'Assistenza AI nuova scheda'});
  await assistant.getByLabel('Informazioni verificate',{exact:true}).fill(verifiedParagraph);
  await assistant.getByRole('checkbox').check();
  await assistant.getByRole('button',{name:'Completa scheda con AI'}).click();
  await expect(assistant.getByRole('alert')).toBeVisible();
  await expect(assistant.getByRole('group',{name:'Tipo prodotto',exact:true})).toContainText('Manca un elenco verificato');
  await expect(assistant.getByRole('group',{name:'Tag',exact:true})).toContainText('Quercus robur, '+categoryName);
  await assistant.getByRole('group',{name:'Tag',exact:true}).getByRole('button',{name:'Rifiuta proposta'}).click();
  await assistant.getByLabel('Proposta Titolo SEO').fill('Nome SEO rivisto');
  page.once('dialog',d=>d.accept());
  await assistant.getByRole('button',{name:'Accetta tutte le proposte valide non rifiutate'}).click();
  await expect(page.locator('#seoTitle')).toHaveValue('Nome SEO rivisto');
  await expect(page.locator('#tags')).toHaveValue('Tag originale');
  await expect(page.locator('#productType')).toHaveValue('');
  await expect(page.getByRole('textbox',{name:'Descrizione verificata',exact:true})).toHaveText('');
  await assistant.getByRole('button',{name:'Riprova la descrizione'}).click();
  await expect(assistant.getByRole('alert')).toHaveCount(0);
  await expect(assistant.getByRole('group',{name:'Tag',exact:true}).getByRole('button',{name:'Ripristina proposta'})).toBeVisible();
  await expect(assistant.getByLabel('Proposta Titolo SEO')).toHaveValue('Nome SEO rivisto');
  page.once('dialog', d=>d.accept());
  await assistant.getByRole('button',{name:'Scarta anteprima'}).click();
  await expect(assistant.getByRole('region',{name:'Proposte per la bozza'})).toHaveCount(0);
  await expect(page.locator('#tags')).toHaveValue('Tag originale');
  await expect(page.locator('#seoTitle')).toHaveValue('Nome SEO rivisto');
  expect(model.calls.filter(a=>a==='suggest_confirmed_field')).toHaveLength(2);
  expect(model.calls).not.toContain('save_new_product');
  expect(model.unexpected).toEqual([]);
});

test('Scheda SEO: origine modello e fallback, revisione e riapertura interna', async ({page}) => {
  const model=await simulate(page,{sheet:true,modelSeo:true,noTypeDomain:true});
  await page.goto('/admin/products/new');
  await page.getByRole('button',{name:'Editor avanzato',exact:true}).click();
  await page.getByLabel('Nome prodotto (obbligatorio)').fill('Quercus robur');
  await page.getByLabel('Prezzo di vendita 1',{exact:true}).fill('12.00');
  const assistant=page.getByRole('region',{name:'Assistenza AI nuova scheda'});
  const facts='Il cartellino riporta Quercus robur.\nNome comune: Farnia';
  await assistant.getByLabel('Informazioni verificate',{exact:true}).fill(facts);
  await assistant.getByRole('checkbox').check();
  await assistant.getByRole('button',{name:'Completa scheda con AI'}).click();
  const title=assistant.getByRole('group',{name:'Titolo SEO',exact:true});
  await expect(title).toContainText('Selezione del modello');
  await expect(assistant.getByRole('group',{name:'Meta description SEO'})).toContainText('Selezione del modello');
  await expect(assistant.getByRole('group',{name:'Tag',exact:true})).toContainText('Fallback deterministico');
  await expect(assistant.getByRole('group',{name:'Tipo prodotto'})).toContainText('Manca un elenco verificato');
  await assistant.getByRole('button',{name:'Alberi',exact:true}).click();
  await expect(assistant.getByLabel('Tipo manuale per questa bozza')).toHaveValue('Alberi');
  await assistant.getByLabel('Tag proposti, separati da virgole').fill('Farnia, Quercus robur');
  await assistant.getByLabel('Proposta Titolo SEO').fill('Farnia (Quercus robur)');
  await expect(title).toContainText('Modifica manuale');
  page.once('dialog',d=>d.accept());
  await assistant.getByRole('button',{name:'Accetta tutte le proposte valide non rifiutate'}).click();
  await page.getByRole('button',{name:'Vai all’anteprima'}).click();
  await page.getByRole('button',{name:'Verifica anteprima'}).click();
  await page.getByRole('checkbox',{name:/Confermo i dati/}).check();
  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Salva bozza nell’Admin'}).click();
  await page.getByRole('link',{name:'Apri scheda prodotto e storico'}).click();
  await page.reload();
  const summary=page.getByRole('heading',{name:'Riepilogo della bozza interna salvata'}).locator('..');
  await summary.getByText('Codici e dettagli avanzati').click();
  await expect(summary.getByText('Farnia (Quercus robur)',{exact:true})).toBeVisible();
  expect(model.saved()).toMatchObject({seoTitle:'Farnia (Quercus robur)',seoDescription:facts.split('\n')[0],
    tags:['Farnia','Quercus robur'],productType:'Alberi',currency:'EUR'});
  expect(model.calls.filter(a=>a==='suggest_confirmed_field')).toHaveLength(1);
  expect(model.calls).not.toContain('create_shopify_draft');
  expect(model.unexpected).toEqual([]);
});

for (const width of [390,1280]) test('permessi e dati tecnici dietro un controllo da tastiera a '+width+'px', async ({page})=>{
  await page.setViewportSize({width,height:850});
  await simulate(page);
  await page.goto('/admin/products/'+productId);
  await expect(page.getByRole('button',{name:'Modifica Descrizione estesa'})).toBeVisible();
  const advanced=page.getByText('Opzioni avanzate · Dati tecnici e permessi',{exact:true});
  await expect(advanced.locator('..')).not.toHaveAttribute('open','');
  await expect(page.getByText('EAN tecnico',{exact:true})).not.toBeVisible();
  await advanced.focus(); await page.keyboard.press('Enter');
  await advanced.locator('..').getByText('Contenuti · 1 campo').click();
  await expect(page.getByText('EAN tecnico',{exact:true})).toBeVisible();
  await expect(page.getByText(/Non disponibile per il tuo ruolo o per lo stato/)).toBeVisible();
});

test('breve ed estesa approvate separatamente restano distinte nella bozza riaperta',async({page})=>{
  const model=await simulate(page,{sheet:true});
  await page.goto('/admin/products/new');
  await page.getByRole('button',{name:'Editor avanzato',exact:true}).click();
  await page.getByLabel('Nome prodotto (obbligatorio)').fill('Scheda di collaudo');
  await page.getByRole('textbox',{name:'Prezzo di vendita 1'}).fill('10');
  const panel=page.getByRole('region',{name:'Assistenza AI nuova scheda'});
  const first='Il nome è stato confermato.',second='La fotografia è stata verificata.';
  await panel.getByLabel('Informazioni verificate',{exact:true}).fill(first+'\n'+second);
  await panel.getByRole('checkbox').check();
  await panel.getByRole('button',{name:'Completa scheda con AI'}).click();
  page.on('dialog',dialog=>dialog.accept());
  await panel.getByRole('button',{name:'Accetta Descrizione breve',exact:true}).click();
  await expect(page.locator('#shortDescription')).toHaveValue(first);
  await expect(page.getByRole('textbox',{name:'Descrizione verificata'})).toHaveText('');
  await panel.getByRole('button',{name:'Accetta Descrizione estesa',exact:true}).click();
  await page.getByRole('button',{name:'Vai all’anteprima'}).click();
  await page.getByRole('button',{name:'Verifica anteprima'}).click();
  await page.getByRole('checkbox',{name:/Confermo i dati/}).check();
  await page.getByRole('button',{name:'Salva bozza nell’Admin'}).click();
  await page.getByRole('link',{name:'Apri scheda prodotto e storico'}).click();
  await page.reload();
  const summary=page.getByRole('heading',{name:'Riepilogo della bozza interna salvata'}).locator('..');
  await expect(summary.getByRole('heading',{name:'Descrizione breve'}).locator('..').locator('p')).toHaveText(first);
  await expect(summary.getByRole('heading',{name:'Descrizione estesa'}).locator('..').locator('p')).toHaveText([first,second]);
  expect(model.calls.filter(a=>a==='suggest_confirmed_field')).toHaveLength(1);
  expect(model.calls).not.toContain('create_shopify_draft');
});

for(const kind of ['galleria','formato']) test('Editor nominale · confronto e salvataggio '+kind,async({page})=>{
  const model=await simulate(page,{assets:true,media:true});
  await page.goto('/admin/products/'+productId);
  const section=page.getByText(kind==='galleria'?'Immagini e testi alternativi':'Modifica dei formati',{exact:true});
  await section.click();
  if(kind==='galleria'){
    await page.getByText('Scegli fra le tue immagini già caricate').click();
    await page.getByRole('button',{name:/Foto lavanda sintetica/}).click();
  }else{
    await page.getByLabel('Formato attuale').selectOption('option-value');
    await page.getByLabel('Nuovo nome del formato').fill('Vaso grande');
  }
  await page.getByRole('button',{name:'Salva e confronta la modifica'}).click();
  await page.reload();
  await section.click();
  const comparison=page.getByRole('region',{name:'Confronto con Shopify'});
  await expect(comparison).toContainText(kind==='galleria'?'Foto lavanda sintetica':'Vaso grande');
  const action=kind==='galleria'?'set_catalog_image':'rename_catalog_format';
  expect(model.calls).not.toContain(action);
  page.once('dialog',dialog=>dialog.accept());
  await comparison.getByRole('button',{name:'Invia aggiornamenti a Shopify'}).click();
  await expect(page.getByText('Aggiornato su Shopify. Valori riletti e verificati.')).toBeVisible();
  expect(model.calls.filter(a=>a===action)).toHaveLength(1);
});

test('scheda esistente: fonti precaricate, proposta autorizzata e riepilogo prima del salvataggio',async({page})=>{
  const model=await simulate(page,{existingAi:true,currentText:'Fatto sintetico confermato dal responsabile.'});
  await page.goto('/admin/products/'+productId);
  const assistant=page.getByRole('region',{name:'Assistenza AI prodotto esistente'});
  await expect(assistant.getByLabel('Informazioni verificate',{exact:true})).toHaveValue('Fatto sintetico confermato dal responsabile.');
  await assistant.getByRole('checkbox').check();
  await assistant.getByRole('button',{name:'Migliora scheda con AI'}).click();
  await expect(assistant.getByText('Proposte AI per questo prodotto')).toBeVisible();
  page.once('dialog',d=>d.accept());
  await assistant.getByRole('button',{name:'Accetta Descrizione estesa',exact:true}).click();
  expect(model.calls.filter(a=>a==='suggest_confirmed_field')).toHaveLength(1);
  expect(model.calls).not.toContain('update_field');
  const review=page.getByRole('region',{name:'Revisione modifiche'});
  await review.getByRole('button',{name:/Rivedi modifiche/}).click();
  await review.getByRole('button',{name:'Conferma salvataggio interno'}).click();
  await expect(review.getByText(/salvato in Admin/)).toBeVisible();
  expect(model.calls.filter(a=>a==='update_field')).toHaveLength(1);
  expect(model.calls).not.toContain('sync_field');
});
test('archiviazione nominale: annulla senza scrivere e conferma soltanto il piano selezionato',async({page})=>{
  const model=await simulate(page,{assets:true,lifecycle:true});
  await page.goto('/admin/products/'+productId);
  const panel=page.getByRole('region',{name:'Gestione della vendita'});
  await expect(page.getByRole('button',{name:'Elimina definitivamente'})).toHaveCount(0);
  await panel.getByRole('button',{name:'Archivia prodotto'}).click();
  await panel.getByRole('button',{name:'Annulla'}).click();
  expect(model.calls).not.toContain('archive_catalog_product');
  await panel.getByRole('button',{name:'Archivia prodotto'}).click();
  await panel.getByRole('button',{name:'Conferma · Archivia prodotto'}).click();
  await expect(panel.getByRole('status')).toContainText('Operazione verificata');
  await page.reload();
  await expect(panel.getByText(/Ultima operazione · Archivia prodotto/)).toContainText('verificata');
  expect(model.calls.filter(a=>a==='archive_catalog_product')).toHaveLength(1);
});
test('un solo consenso salva e crea DRAFT, senza pubblicare',async({page})=>{
  const model=await simulate(page,{allowDraftSend:true,sheet:true});
  await page.goto('/admin/products/new');
  await page.getByRole('button',{name:'Editor avanzato',exact:true}).click();
  await page.getByLabel('Nome prodotto (obbligatorio)').fill('Pianta di collaudo');
  await page.getByRole('textbox',{name:'Descrizione verificata'}).fill('Descrizione verificata del prodotto.');
  await page.getByLabel('Prezzo di vendita 1',{exact:true}).fill('10.00');
  await page.getByRole('button',{name:'Vai all’anteprima'}).click();
  await page.getByRole('button',{name:'Verifica anteprima'}).click();
  await page.getByRole('checkbox',{name:/Confermo i dati/}).check();
  let confirmations=0;page.on('dialog',async d=>{confirmations++; await d.accept();});
  await page.getByRole('button',{name:'Salva e crea bozza Shopify'}).click();
  await expect.poll(()=>model.calls.filter(a=>a==='create_shopify_draft').length).toBe(1);
  expect(model.calls.filter(a=>a==='save_new_product')).toHaveLength(1);
  expect(confirmations).toBe(1);
  expect(model.calls).not.toContain('publish_catalog_product');
});

for(const conflict of [false,true])test('revisione Shopify: '+(conflict?'il confronto mutato interrompe la sincronizzazione':'scrive il solo campo approvato'),async({page})=>{
  const model=await simulate(page,{assets:true,syncReview:true,conflictAfterSave:conflict});
  await page.goto('/admin/products/'+productId);
  await page.getByRole('button',{name:'Modifica Descrizione estesa'}).click();
  await page.getByRole('textbox',{name:'Descrizione',exact:true}).fill('Contenuto editoriale confermato.');
  await page.getByRole('button',{name:'Aggiungi alla revisione'}).click();
  const review=page.getByRole('region',{name:'Revisione modifiche'});
  await review.getByRole('button',{name:/Rivedi modifiche/}).click();
  await expect(review).toContainText('Admin e Shopify');
  await review.getByRole('button',{name:'Salva e aggiorna Shopify'}).click();
  if(conflict)await expect(review.getByRole('alert')).toContainText('Shopify è cambiato');
  else await expect(review.getByRole('status')).toContainText('aggiornamento verificato');
  expect(model.calls.filter(a=>a==='update_field')).toHaveLength(1);
  expect(model.calls.filter(a=>a==='sync_field')).toHaveLength(conflict?0:1);
});

const yuccaSource=readFileSync(new URL('../tests/fixtures/yucca-filamentosa-uat-20261127.txt',import.meta.url),'utf8');
async function prepareArticle(page:Page) {
  await page.goto('/admin/products/new');
  await expect(page.getByRole('button',{name:'Anteprima cliente',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('textbox',{name:'Nome prodotto',exact:true}).fill('Yucca filamentosa');
  await page.getByLabel('Informazioni sul prodotto').fill(yuccaSource);
  await page.getByLabel(/Ho verificato le informazioni/).check();
  await page.getByRole('button',{name:'Genera scheda completa con AI'}).click();
}
test('V3 Yucca su tablet: PDP, modifica isolata, confronto, conferme botaniche e riapertura interna',async({page},testInfo)=>{
  await page.setViewportSize({width:900,height:1060});
  const model=await simulate(page,{article:'complete',sheet:true,allowDraftSend:true});
  await prepareArticle(page);
  const article=page.getByRole('article',{name:'Pagina prodotto in anteprima'});
  await expect(article.getByRole('heading',{name:'Yucca filamentosa',exact:true})).toBeVisible();
  await expect(page.getByText(/15 \/ 15 fatti verificati coperti/)).toBeVisible();
  await expect(article.locator('img')).toHaveCount(0);
  await expect(article).not.toContainText('Formato unico');
  const leaf=article.getByRole('region',{name:'Fogliame e caratteristiche distintive',exact:true});
  const flower=article.getByRole('region',{name:'Fioritura',exact:true});
  await leaf.getByRole('button',{name:'Modifica',exact:true}).click();
  const editor=leaf.getByLabel('Testo della sezione');
  const manual=(await editor.inputValue()).replace('sono lineari','si presentano lineari');
  await editor.fill(manual);await leaf.getByRole('button',{name:'Conferma modifica'}).click();
  await flower.getByRole('button',{name:'Modifica con AI'}).click();
  await flower.getByLabel('Istruzione per l’AI').fill('errore simulato');
  await flower.getByRole('button',{name:'Prepara revisione'}).click();
  await expect(flower.getByRole('alert')).toContainText('testo precedente');
  await flower.getByRole('button',{name:'Rendi più naturale'}).click();
  await flower.getByRole('button',{name:'Prepara revisione'}).click();
  await expect(flower.getByText('Dopo',{exact:true})).toBeVisible();
  await flower.getByRole('region',{name:'Modifica di Fioritura'}).screenshot({path:testInfo.outputPath('confronto.png')});
  await flower.getByRole('button',{name:'Annulla'}).click();
  await expect(flower).toContainText('si osserva');
  await flower.getByRole('button',{name:'Modifica con AI'}).click();
  await flower.getByRole('button',{name:'Rendi più naturale'}).click();
  await flower.getByRole('button',{name:'Prepara revisione'}).click();
  await flower.getByRole('button',{name:'Conferma modifica'}).click();
  await expect(flower).toContainText('si vede');await expect(leaf).toContainText(manual);
  await expect(article.getByRole('region',{name:'Curiosità botaniche',exact:true})).toContainText('filamenti');
  await article.getByRole('button',{name:'Come si presenta la fioritura?'}).click();
  await expect(article.getByRole('region',{name:'Domande frequenti',exact:true})).toContainText('giugno e luglio');
  await page.getByRole('button',{name:'Anteprima cliente',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath('anteprima-tablet.png')});
  await page.getByRole('button',{name:'Rivedi scheda completa'}).click();
  const review=page.getByRole('region',{name:'Revisione finale'});
  await expect(review).toContainText('modificato manualmente');
  await expect(review).toContainText('Agavaceae');
  for (const label of ['Domande frequenti','Punti di forza','Caratteristiche principali']) {
    await review.getByLabel('Confermo fonte e valore di ' + label, {exact:false}).check();
  }
  await review.getByLabel(/Ho revisionato i contenuti/).check();
  await page.getByRole('button',{name:'Approva scheda e applica alla bozza'}).click();
  await expect(page.getByText('Contenuti applicati alla bozza interna')).toBeVisible();
  expect(model.calls).not.toContain('save_new_product');
  await page.getByRole('button',{name:'Salva bozza interna',exact:true}).click();
  await page.getByRole('textbox',{name:'Prezzo di vendita 1'}).fill('12,00');
  await page.getByRole('button',{name:'Anteprima cliente',exact:true}).click();
  await page.getByRole('button',{name:'Salva bozza interna',exact:true}).dblclick();
  await page.getByRole('link',{name:'Apri scheda prodotto e storico'}).click();
  await page.reload();
  expect(model.saved().title).toBe('Yucca filamentosa');expect(model.saved().description).toContain('si presentano lineari');
  expect(model.saved().botanicalConfirmedKeys?.slice().sort()).toEqual(['faq','key_benefits','key_features']);
  for (const key of ['faq','key_benefits','key_features']) expect(model.saved().botanical[key]).toBeTruthy();
  expect(model.saved().shortDescription).toContain('Yucca filamentosa');
  expect(model.saved().seoTitle).toBe('Yucca filamentosa – arbusto sempreverde');
  expect(model.saved().seoDescription).toContain('terreno fertile');
  expect(model.saved().tags).toEqual(['Yucca filamentosa','arbusto sempreverde']);
  expect(model.saved().botanical).not.toHaveProperty('curiosity');
  const restored=page.getByRole('heading',{name:'Riepilogo della bozza interna salvata'}).locator('..');
  await expect(restored).toContainText('si presentano lineari');
  await expect(restored).toContainText('12,00 EUR');
  expect(model.calls.filter(a=>a==='save_new_product')).toHaveLength(1);
  expect(model.calls.filter(a=>/shopify_draft|publish|sync_field/.test(a))).toEqual([]);
  expect(model.unexpected).toEqual([]);
});
test('V3 blocca la risposta UAT parziale e recupera per sezione; @2 e grant mancanti chiudono il percorso',async({page})=>{
  const model=await simulate(page,{article:'partial',sheet:true});await prepareArticle(page);
  await page.getByRole('button',{name:'Rivedi scheda completa'}).click();
  await expect(page.getByRole('button',{name:'Approva scheda e applica alla bozza'})).toBeDisabled();
  const recovery = page.getByRole('region',{name:'Recupero della descrizione'});
  await expect(recovery).toContainText('Alcune informazioni non sono ancora incluse');
  await expect(recovery.getByRole('button',{name:'Recupera fatto'})).toHaveCount(0);
  const group = recovery.locator('details').filter({has:page.locator('summary',{hasText:'Descrizione botanica'})});
  await group.locator('summary').click();
  await group.getByRole('button',{name:'Integra manualmente'}).click();
  await page.getByRole('button',{name:'Annulla',exact:true}).click();
  expect(model.calls.filter(a=>a==='suggest_confirmed_field')).toHaveLength(1);
  await group.getByRole('button',{name:'Rivedi con AI'}).click();
  await page.getByRole('button',{name:'Prepara revisione'}).click();
  await page.getByRole('button',{name:'Conferma modifica'}).click();
  await expect(page.getByRole('article').getByRole('region',{name:'Introduzione',exact:true})).toBeVisible();
  expect(model.calls.filter(a=>a==='suggest_confirmed_field')).toHaveLength(2);
  expect(model.calls).not.toContain('save_new_product');
});
test('V3 respinge la risposta del backend @2',async({page})=>{
  await simulate(page,{article:'legacy',sheet:true});await prepareArticle(page);
  await expect(page.getByRole('alert')).toContainText('contratto editoriale V3');
  await expect(page.getByRole('button',{name:'Rivedi scheda completa'})).toHaveCount(0);
});
test('V3 impedisce l’inferenza senza grant per description',async({page})=>{
  const model=await simulate(page,{article:'complete',sheet:true,denyDescription:true});await page.goto('/admin/products/new');
  await page.getByRole('textbox',{name:'Nome prodotto',exact:true}).fill('Yucca filamentosa');
  await page.getByLabel('Informazioni sul prodotto').fill(yuccaSource);await page.getByLabel(/Ho verificato le informazioni/).check();
  await expect(page.getByRole('button',{name:'Genera scheda completa con AI'})).toBeDisabled();
  expect(model.calls).not.toContain('suggest_confirmed_field');
});

test('V3 completa manualmente la fixture UAT oltre 250 parole senza altre richieste AI',async({page})=>{
  const model=await simulate(page,{article:'partial',sheet:true});
  await prepareArticle(page);
  const approved=JSON.parse(readFileSync(new URL('../tests/fixtures/yucca-filamentosa-v3.json',import.meta.url),'utf8'));
  const article=page.getByRole('article',{name:'Pagina prodotto in anteprima'});
  for(const section of approved.sections as {heading:string;text:string;factIndices:number[]}[]) {
    const block=article.getByRole('region',{name:section.heading,exact:true});
    await block.getByRole('button',{name:'Modifica',exact:true}).click();
    await block.getByLabel('Testo della sezione').fill(section.text);
    await block.getByText('Fonti utilizzate per questa sezione',{exact:true}).click();
    for(const i of section.factIndices) await block.getByRole('checkbox',{name:new RegExp('^Riga '+(i+1)+' ·')}).check();
    await block.getByRole('button',{name:'Conferma modifica'}).click();
    await expect(block.getByLabel('Testo della sezione')).toHaveCount(0);
  }
  const summary=page.getByText(/15 \/ 15 fatti verificati coperti/);
  await expect(summary).toBeVisible();
  const words=Number((await summary.innerText()).match(/(\d+) parole/)?.[1]);
  expect(words).toBeGreaterThanOrEqual(250);expect(words).toBeLessThanOrEqual(450);
  expect(model.calls.filter(a=>a==='suggest_confirmed_field')).toHaveLength(1);
  expect(model.calls).not.toContain('save_new_product');
});

test('V3 espone copertura distinta e provenienza delle parole della generazione parziale',async({page})=>{
  const state=await simulate(page,{article:'semantic',sheet:true});
  await prepareArticle(page);
  await expect(page.getByText(/5 \/ 15 fatti verificati coperti/)).toBeVisible();
  await expect(page.getByText(/4 \/ 14 fatti distinti coperti/)).toBeVisible();
  await page.getByText('Misure della prima generazione',{exact:true}).click();
  await expect(page.getByText(/Parole generate dal modello: 13/)).toContainText('26 derivate localmente');
  await expect(page.getByText(/Parole generate dal modello: 13/)).toContainText('4 del modello accettate');
  await expect(page.getByText(/Parole generate dal modello: 13/)).toContainText('30 finali iniziali');
  const body=page.getByRole('article',{name:'Pagina prodotto in anteprima'});
  await expect(body).toContainText('Il portamento è verticale.');
  await expect(body).not.toContainText('I fiori sono eleganti.');
  await expect(body).not.toContainText('irrigazioni quotidiane');
  await page.getByText(/^Verifica editoriale/).click();
  await expect(page.getByText(/Portamento e sviluppo · frase 2/)).toBeVisible();
  expect(state.calls.filter(a=>a==='suggest_confirmed_field')).toHaveLength(1);
  expect(state.calls).not.toContain('save_new_product');
});

test('riapertura bozza storica: confermare mesi sulla stessa scheda precede ogni invio',async({page})=>{
  const model=await simulate(page,{historicalBotany:true,allowDraftSend:true});
  await page.goto('/admin/products/'+productId);
  const button=page.getByRole('button',{name:'Conferma sulla bozza interna'});
  await expect(button).toBeDisabled();
  await expect(page.getByRole('button',{name:'Crea bozza Shopify'})).toHaveCount(0);
  await page.getByRole('checkbox',{name:/Febbraio.*Maggio.*Novembre/}).check();
  page.once('dialog',dialog=>dialog.accept());
  await button.click();
  await expect(page.getByText('Conferma botanica registrata su questa bozza interna.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button',{name:'Crea bozza Shopify'})).toBeVisible();
  expect(model.calls.filter(action=>action==='save_new_product')).toHaveLength(1);
  expect(model.calls).not.toContain('create_shopify_draft');
});

test('rilettura locale interrotta: il pulsante di recupero invia la stessa chiave e apre la stessa bozza',async({page})=>{
  const model=await simulate(page,{interruptedSave:true});
  await page.goto('/admin/products/new');
  await page.getByRole('button',{name:'Editor avanzato',exact:true}).click();
  await page.getByLabel('Nome prodotto (obbligatorio)').fill('Pianta sintetica');
  await page.getByRole('textbox',{name:'Prezzo di vendita 1'}).fill('10');
  await page.getByRole('textbox',{name:'Descrizione verificata'}).fill('Descrizione sintetica della bozza.');
  await page.getByRole('button',{name:'Vai all’anteprima'}).click();
  await page.getByRole('button',{name:'Verifica anteprima'}).click();
  await page.getByRole('checkbox',{name:/Confermo i dati/}).check();
  page.on('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Salva bozza nell’Admin'}).click();
  await page.getByRole('button',{name:'Recupera salvataggio con la stessa richiesta'}).click();
  await expect(page.getByRole('link',{name:'Apri scheda prodotto e storico'})).toHaveAttribute('href','/admin/products/'+productId);
  expect(model.calls).not.toContain('create_shopify_draft');
});

test('mesi manuali, revoca della conferma, salvataggio e riapertura della stessa bozza',async({page})=>{
 const model=await simulate(page,{sheet:true});
 await page.goto('/admin/products/new');
 await page.getByRole('button',{name:'Editor avanzato',exact:true}).click();
 await page.getByLabel('Nome prodotto (obbligatorio)').fill('Scheda sintetica');
 await page.getByRole('textbox',{name:'Descrizione verificata'}).fill('Test descrizione.');
 await page.getByRole('textbox',{name:'Prezzo di vendita 1'}).fill('10');
 await page.getByText('Opzioni avanzate · Dati tecnici e permessi',{exact:true}).click();
 await page.getByText('Informazioni botaniche e FAQ facoltative',{exact:true}).click();
 const month=(name:string)=>page.getByRole('checkbox',{name:'Periodo di fioritura: '+name,exact:true});
 await month('Novembre').check(); await month('Febbraio').check();
 const source=page.getByRole('checkbox',{name:/Confermo la fonte e il valore di periodo di fioritura/i});
 await source.check(); await month('Maggio').check(); await expect(source).not.toBeChecked();
 await page.getByRole('button',{name:'Vai all’anteprima'}).click();
 await expect(page.getByText('Conferma la fonte di questo dato prima di salvare.')).toBeVisible();
 await source.check();
 await page.getByRole('button',{name:'Vai all’anteprima'}).click();
 await page.getByRole('button',{name:'Verifica anteprima'}).click();
 await page.getByRole('checkbox',{name:/Confermo i dati/}).check();
 page.once('dialog',d=>d.accept()); await page.getByRole('button',{name:'Salva bozza nell’Admin'}).click();
 await page.getByRole('link',{name:'Apri scheda prodotto e storico'}).click(); await page.reload();
 const summary=page.getByRole('heading',{name:'Riepilogo della bozza interna salvata'}).locator('..');
 await summary.getByText('Codici e dettagli avanzati').click();
 await expect(summary.getByText('Febbraio, Maggio, Novembre',{exact:true})).toBeVisible();
 expect(model.saved()?.botanicalConfirmedKeys).toEqual(['periodo_di_fioritura']);
 expect(model.calls).not.toContain('create_shopify_draft');
});
