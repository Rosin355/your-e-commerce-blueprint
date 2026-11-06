// UI-only fixtures. Every non-local request is mocked or blocked; never authenticates live.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const engines = await import(process.env.OG_PLAYWRIGHT_MODULE ?? 'playwright');
const engine = process.env.OG_ADMIN_QA_ENGINE ?? 'chromium';
const output = process.env.OG_ADMIN_QA_OUTPUT ?? 'docs/admin-v2-evidence/2026-10-31';
await fs.mkdir(output, { recursive: true });
const browser = await engines[engine].launch(engine === 'chromium' ? { channel: 'chrome', headless: true } : { headless: true });
const report = {
  mode: 'SIMULATED_API_NO_LIVE',
  engine,
  filterRequests: [],
  simulatedAssignments: 0,
  checks: [],
  errors: [],
  blockedExternalRequests: 0,
};
const id = '20000000-0000-4000-8000-000000000001', pid = '30000000-0000-4000-8000-000000000001';
let mode = 'normal';
const catalog = () => ({
  categories: mode === 'empty' ? [] : [{
    id,
    display_name: 'Arbusti',
    slug: 'arbusti',
    parent_id: null,
    level: 1,
    is_active: true,
    visible_storefront: true,
    productCount: 1,
    maps: [{ shopify_handle: 'arbusti', map_status: 'verified', last_checked_at: null }],
  }],
  products: mode === 'empty' ? [] : [{ id: pid, sku: 'QA-SIMULATO-001', categoryIds: [id] }, {
    id: '30000000-0000-4000-8000-000000000002',
    sku: 'QA-SENZA-CATEGORIA',
    categoryIds: [],
  }],
  notice: 'SIMULAZIONE QA — conteggi interni, nessun dato live.',
  observedAt: new Date().toISOString(),
  missingCanonicalHandles: [],
  canSaveDraft: true,
  canSendDraft: false,
  canAssign: mode === 'confirm',
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
await context.addInitScript(() => {
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'qa@example.invalid',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
  };
  const token = [
    btoa(JSON.stringify({ alg: 'none' })),
    btoa(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })),
    'simulation',
  ].join('.');
  localStorage.setItem(
    'sb-iekwvvihjwghosqdxrdi-auth-token',
    JSON.stringify({
      access_token: token,
      refresh_token: 'local-fixture-only',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: 'bearer',
      user,
    }),
  );
});
await context.route('**/*', async (route) => {
  const req = route.request(), url = new URL(req.url());
  if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
  const json = (body) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  if (url.pathname.includes('/rest/v1/user_roles')) return json({ role: 'admin' });
  if (url.pathname.includes('/functions/v1/product-admin-api')) {
    const p = req.postDataJSON();
    if (p.action === 'get_admin_context') {
      return json({
        ok: true,
        roles: ['admin'],
        canWrite: true,
        writesEnabled: true,
        canSync: false,
        readOnlyReason: 'Simulazione QA',
      });
    }
    if (p.action === 'catalog_categories') {
      if (mode === 'error') {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: false,
            error: {
              code: 'CATALOG_UNAVAILABLE',
              message: 'Catalogo non disponibile (simulazione).',
            },
          }),
        });
      }
      return json({ ok: true, ...catalog() });
    }
    if (p.action === 'get_field_definitions') {
      return json({
        ok: true,
        definitions: [{
          key: 'periodo_di_fioritura',
          label: 'Periodo di fioritura',
          field_group: 'seasonal',
          visible: true,
          editable: true,
          manual_only: false,
          editor_type: 'multiselect',
          data_type: 'array',
          validation_rules: {},
          required: false,
        }],
      });
    }
    if (p.action === 'preview_categories') {
      return json({
        ok: true,
        diff: { add: p.categoryIds.filter(x => !(p.productId === pid ? [id] : []).includes(x)), remove: (p.productId === pid ? [id] : []).filter(x => !p.categoryIds.includes(x)), keep: p.categoryIds.filter(x => (p.productId === pid ? [id] : []).includes(x)) },
        executable: mode === 'confirm',
        reason: 'Anteprima simulata: nessuna scrittura.',
      });
    }
    if (p.action === 'apply_categories') {
      report.simulatedAssignments++;
      return json({ok:true,reason:'Assegnazione simulata verificata'});
    }
    if (p.action === 'preview_new_product') {
      return json({ ok: true, warnings: ['Anteprima simulata. Nessuna chiamata live.'] });
    }
    if (p.action === 'save_new_product') {
      return json({
        ok: true,
        result: {
          productId: pid,
          operationId: '40000000-0000-4000-8000-000000000001',
          state: 'LOCAL_DRAFT',
        },
      });
    }
    if (p.action === 'get_product') return json({ok:true,product:{productId:pid,sku:'QA-SIMULATO-001',entityType:'simple',parentProductId:null,parentSku:null,isActive:true,updatedAt:new Date().toISOString()},sections:[],history:[],shopifyLive:{available:false,mapped:false,productId:null}});
    if (p.action === 'get_product_operations') return json({ok:true,canSendDraft:false,operations:[{id:'40000000-0000-4000-8000-000000000001',state:'LOCAL_DRAFT',created_at:new Date().toISOString(),admin_operation_events:[]}]});
    if (p.action === 'list_products') {
      report.filterRequests.push({category:p.category,sku:p.sku});
      const items = [
        {productId:pid,sku:'QA-FILTRO-001',title:'Rosa simulata',categoryEffective:'Rose'},
        {productId:'30000000-0000-4000-8000-000000000002',sku:'QA-FILTRO-002',title:'Arbusto simulato',categoryEffective:'Arbusti'},
      ].map(x=>({...x,entityType:'simple',parentProductId:null,parentSku:null,mainImage:null,reviewPendingCount:0,blockedCount:0,contentStatus:'completo',shopifyStatus:'Mai sincronizzato',updatedAt:new Date().toISOString()}))
      .filter(x=>(!p.category||x.categoryEffective.toLowerCase().includes(p.category.toLowerCase()))&&(!p.sku||x.sku.includes(p.sku)));
      return json({ok:true,items,nextCursor:null});
    }
    throw Error('Unexpected API action ' + p.action);
  }
  if(url.pathname.includes('/functions/v1/product-admin-ai'))return json({ok:true,suggestions:[]});
  report.blockedExternalRequests++;
  return route.abort();
});
const page = await context.newPage();
page.on('pageerror', (e) => report.errors.push(e.message));
try {
  if (process.env.OG_ADMIN_QA_SKIP_BASELINE !== 'true') for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('http://127.0.0.1:5188/admin/categories');
    await page.getByText('In preparazione', { exact: true }).waitFor();
    await page.screenshot({ path: `${output}/before-categories-${width}.png`, fullPage: true });
  }
  for (const width of [320, 375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('http://127.0.0.1:5189/admin/categories');
    await page.getByRole('heading', { name: 'Categorie', exact: true }).waitFor();
    await page.getByText('QA-SIMULATO-001', { exact: true }).waitFor();
    await page.getByRole('link',{name:'QA-SIMULATO-001',exact:true}).click();
    await page.getByRole('heading',{name:'Creazione e sincronizzazione',exact:true}).waitFor();
    await page.getByText('Bozza interna — non inviata',{exact:true}).waitFor();
    await page.goto('http://127.0.0.1:5189/admin/categories');
    await page.getByText('QA-SIMULATO-001',{exact:true}).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.getByLabel('Mostra', { exact: true }).selectOption('none');
    await page.getByText('QA-SENZA-CATEGORIA', { exact: true }).waitFor();
    assert.equal(await page.getByText('QA-SIMULATO-001', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Proponi categorie', exact: true }).click();
    await page.getByRole('button', { name: 'Verifica proposta', exact: true }).click();
    await page.getByText('Anteprima simulata: nessuna scrittura.', { exact: true }).waitFor();
    if ([390, 1440].includes(width)) {
      await page.screenshot({ path: `${output}/after-categories-${width}.png`, fullPage: true });
    }
    await page.goto('http://127.0.0.1:5189/admin/products/new');
    await page.getByRole('heading', { name: 'Nuovo prodotto', exact: true }).waitFor();
    await page.getByLabel('Nome prodotto', { exact: true }).fill('Prodotto simulato per QA');
    await page.getByLabel('SKU famiglia', { exact: true }).fill('QA-MANUALE-001');
    await page.getByLabel('Descrizione verificata', { exact: true }).fill(
      'Solo fixture locale, non un prodotto in vendita.',
    );
    await page.getByRole('button', { name: '4. Immagini e formati', exact: true }).click();
    await page.getByLabel('Prezzo', { exact: true }).fill('12.30');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    if ([390, 1440].includes(width)) {
      await page.screenshot({ path: `${output}/new-product-formats-${width}.png`, fullPage: true });
    }
    await page.getByRole('button', { name: '5. Botanica e SEO', exact: true }).click();
    await page.getByLabel('Periodo di fioritura: Marzo', { exact: true }).check();
    await page.getByRole('button', { name: '6. Anteprima', exact: true }).click();
    await page.getByRole('button', { name: 'Verifica anteprima', exact: true }).click();
    await page.getByText('Anteprima simulata. Nessuna chiamata live.', { exact: true }).waitFor();
    await page.getByRole('checkbox', { name: 'Confermo i dati: salva soltanto una bozza interna.' })
      .check();
    await page.getByRole('button', { name: 'Salva bozza nell’Admin', exact: true }).click();
    await page.getByRole('heading', { name: 'Bozza interna — non inviata', exact: true }).waitFor();
    assert.equal(
      await page.getByRole('button', { name: 'Crea bozza Shopify', exact: true }).count(),
      0,
    );
    if ([390, 1440].includes(width)) {
      await page.screenshot({ path: `${output}/new-product-preview-${width}.png`, fullPage: true });
    }
    await page.goto('http://127.0.0.1:5189/admin/products');
    await page.getByText('Rosa simulata',{exact:true}).waitFor();
    await page.getByLabel('Categoria',{exact:true}).fill('Rose');
    await page.getByText('1 prodotto in questa pagina. I filtri si applicano al catalogo.',{exact:true}).waitFor();
    assert.equal(await page.getByText('Arbusto simulato',{exact:true}).count(),0);
    await page.getByRole('button',{name:'Reimposta filtri',exact:true}).click();
    await page.getByLabel('Codice prodotto (SKU)',{exact:true}).fill('QA-FILTRO-002');
    await page.getByText('Arbusto simulato',{exact:true}).waitFor();
    await page.getByText('1 prodotto in questa pagina. I filtri si applicano al catalogo.',{exact:true}).waitFor();
    assert.equal(await page.getByText('Rosa simulata',{exact:true}).count(),0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(()=>document.activeElement!==document.body));
    if ([320,768,1440].includes(width)) await page.screenshot({path:`${output}/catalog-${width}.png`,fullPage:true});
    report.checks.push({
      width,
      overflow: false,
      serverCategoryFilterRequest: true,
      skuSearch: true,
      unclassifiedFilter: true,
      categoryPreview: true,
      manualDraftWithoutAI: true,
      productLinkAndOperationHistory: true,
      shopifySendHidden: true,
    });
  }
  mode = 'confirm';
  await page.goto('http://127.0.0.1:5189/admin/categories');
  await page.getByRole('button',{name:'Proponi categorie',exact:true}).first().click();
  await page.getByRole('button',{name:'Verifica proposta',exact:true}).click();
  await page.getByRole('button',{name:'Conferma assegnazione',exact:true}).waitFor();
  page.once('dialog', dialog=>dialog.dismiss());
  await page.getByRole('button',{name:'Conferma assegnazione',exact:true}).click();
  assert.equal(report.simulatedAssignments,0);
  page.once('dialog', dialog=>dialog.accept());
  await page.getByRole('button',{name:'Conferma assegnazione',exact:true}).click();
  await page.getByText('Assegnazione simulata verificata',{exact:true}).waitFor();
  assert.equal(report.simulatedAssignments,1);
  report.checks.push({nativeConfirmationCancelThenAccept:true,allWritesMocked:true});
  await page.goto('http://127.0.0.1:5189/admin/categories');
  await page.getByRole('heading',{name:'Categorie',exact:true}).waitFor();
  for(let i=0;i<4;i++) await page.keyboard.press('Tab');
  const focus = await page.evaluate(()=>{
    const el=document.activeElement, style=getComputedStyle(el);
    return {text:el.textContent,visible:style.boxShadow!=='none'||style.outlineStyle!=='none'};
  });
  assert.match(focus.text,/Prodotti/);
  assert.ok(focus.visible);
  report.checks.push({keyboardNavigation:true,visibleFocus:true});
  for (const state of ['empty', 'error']) {
    mode = state;
    await page.goto('http://127.0.0.1:5189/admin/categories');
    await page.getByText(
      state === 'empty'
        ? 'Nessuna categoria canonica disponibile nel catalogo interno.'
        : 'Categorie non disponibili',
      { exact: true },
    ).waitFor();
    report.checks.push({ state, visible: true });
  }
  mode = 'normal';
  await page.goto('http://127.0.0.1:5189/admin/products/new');
  await page.getByRole('heading', { name: 'Nuovo prodotto', exact: true }).waitFor();
  await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => document.activeElement !== document.body));
  report.checks.push({ keyboardFocus: true });
  assert.deepEqual(report.errors, []);
  report.result = 'PASS';
} catch (e) {
  report.result = 'FAIL';
  report.failure = String(e);
  throw e;
} finally {
  await fs.writeFile(`${output}/browser-qa.json`, JSON.stringify(report, null, 2));
  await context.close();
  await browser.close();
}
