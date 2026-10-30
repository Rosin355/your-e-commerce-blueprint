import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { mockStorefront, makeProduct, products } from './fixtures.mjs';

// Reuse an existing Playwright installation; no project dependencies are added.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.UX_BASE_URL || 'http://127.0.0.1:8080';
const output = process.env.UX_OUTPUT_DIR || '/tmp/online-garden-ux-audit';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { browser: browser.version(), baseURL, syntheticData: true, checks: [], screenshots: [], blockedHosts: [], pageErrors: [] };
const check = async (name, run) => {
  try { await run(); report.checks.push({ name, status: 'PASS' }); console.log(`PASS ${name}`); }
  catch (error) { report.checks.push({ name, status: 'FAIL', error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
};
async function setup(width = 390, state = {}, options = {}) {
  const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce', ...options});
  await mockStorefront(context, state);
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.on('pageerror', error => report.pageErrors.push(error.message));
  return {context, page, state};
}
async function visit(page, route, heading) {
  await page.goto(baseURL + route);
  await page.getByRole('heading', { name: heading, exact: true }).waitFor();
  assert.equal(await page.locator('vite-error-overlay').count(), 0);
}
async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({viewport: innerWidth, page: document.documentElement.scrollWidth}));
  assert.ok(sizes.page <= sizes.viewport + 1, JSON.stringify(sizes));
}
async function screenshot(page, name) {
  await page.screenshot({path: path.join(output, `${name}.png`), fullPage: false, animations: "disabled"});
  report.screenshots.push(`${name}.png`);
}
async function store(page) {
  return page.evaluate(async () => {
    const {useCartStore} = await import('/src/stores/cartStore.ts');
    const {items,isLoading,checkoutUrl} = useCartStore.getState();
    return {items,isLoading,checkoutUrl};
  });
}
try {
  for (const width of [320,375,390,430,768,1440]) {
    await check(`Responsive ${width}: homepage, catalogo, ricerca, collezione, PDP e carrello`, async () => {
      const {context,page,state} = await setup(width);
      try {
        await visit(page, '/', 'Piante da giardino, scelte con cura');
        await page.getByRole('link', {name:'Vedi dettagli',exact:true}).first().waitFor();
        await noOverflow(page); await screenshot(page, `home-${width}`);
        await visit(page, '/collections/all', 'Tutti i prodotti');
        await page.locator('article').first().waitFor();
        await noOverflow(page); await screenshot(page, `catalogo-${width}`);
        await visit(page, '/collections/all?q=Rosa', 'Risultati per «Rosa»');
        await page.locator('article').first().waitFor();
        await noOverflow(page); await screenshot(page, `ricerca-${width}`);
        await visit(page, '/collections/rose', 'Rose di prova');
        await noOverflow(page); await screenshot(page, `collezione-${width}`);
        await visit(page, '/products/pianta-test-1', products[0].node.title);
        await noOverflow(page); await screenshot(page, `pdp-${width}`);
        assert.equal(await page.getByText('Disponibile (', {exact:false}).count(), 0);
        assert.equal(await page.getByText('Basso mantenimento', {exact:false}).count(), 0);
        await page.getByRole('button',{name:'Aggiungi al carrello',exact:true}).click();
        await page.getByRole('button',{name:'Carrello, 1 articoli',exact:true}).filter({visible:true}).click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor(); await noOverflow(page);
        await screenshot(page, `carrello-${width}`);
        const geometry = await dialog.evaluate(el => ({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,scroll:el.scrollWidth,client:el.clientWidth}));
        assert.ok(geometry.left >= -1 && geometry.right <= width + 1 && geometry.scroll <= geometry.client + 1, JSON.stringify(geometry));
        const qtyButton = dialog.getByRole('button',{name:/Aumenta quantità/});
        const box = await qtyButton.boundingBox(); assert.ok(box.width >= 44 && box.height >= 44);
        await qtyButton.click(); assert.equal((await store(page)).items[0].quantity,2);
        await dialog.getByRole('button',{name:/Riduci quantità/}).click();
        await dialog.getByRole('button',{name:/Rimuovi Rosa/}).click();
        await dialog.getByRole('link',{name:'Esplora il catalogo'}).waitFor();
        report.blockedHosts.push(...state.blocked);
      } finally { await context.close(); }
    });
  }
  await check('Ricerca da header, filtri, ordinamento, carica altri e stato vuoto', async () => {
    const {page,context} = await setup();
    try {
      await visit(page,'/','Piante da giardino, scelte con cura');
      await page.getByRole('button',{name:'Apri ricerca prodotti',exact:true}).click();
      await page.getByRole('textbox',{name:'Cerca nel catalogo'}).fill('Rósa');
      await page.getByRole('textbox',{name:'Cerca nel catalogo'}).press('Enter');
      await page.getByRole('heading',{name:'Risultati per «Rósa»'}).waitFor();
      await page.locator('article').first().waitFor();
      // Main canonical Rose scope also includes the other synthetic rose products.
      assert.equal(await page.locator('article').count(),9);
      assert.equal(await page.locator('article h2').first().textContent(),products[0].node.title);
      await page.getByText('14 prodotti trovati',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Cancella ricerca',exact:true}).click();
      await page.locator('article').nth(8).waitFor();
      await page.getByRole('button',{name:'Carica altri'}).click(); assert.equal(await page.locator('article').count(),14);
      await page.getByLabel('Ordina per').selectOption('za');
      await page.getByRole('button',{name:/Filtra e ordina/}).click();
      const filters=page.getByRole('dialog');
      await filters.getByLabel(/Esauriti/).check();
      await filters.getByRole('button',{name:'Applica',exact:true}).click();
      await page.getByText('Nessun prodotto trovato',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Rimuovi filtri',exact:true}).filter({visible:true}).click();
      await page.locator('article').first().waitFor();
    } finally { await context.close(); }
  });
  await check('Errori di rete distinti da assenza dati, retry catalogo/collezione/PDP', async () => {
    const state={apiError:true}; const {page,context}=await setup(390,state);
    try {
      for (const [route,errorHeading,successHeading] of [
        ['/collections/all','Impossibile caricare il catalogo','Tutti i prodotti'],
        ['/collections/rose','Impossibile caricare la collezione','Rose di prova'],
        ['/products/pianta-test-1','Impossibile caricare il prodotto',products[0].node.title],
      ]) {
        state.apiError=true; await visit(page,route,errorHeading);
        await screenshot(page, `errore-${route.split('/')[1]}`);
        state.apiError=false; await page.getByRole('button',{name:'Riprova',exact:true}).click();
        await page.getByRole('heading',{name:successHeading,exact:true}).waitFor();
        await page.getByRole('button',{name:'Riprova',exact:true}).waitFor({state:'hidden'});
      }
      await visit(page,'/products/missing','Prodotto non trovato');
      await page.goto(baseURL+'/collections/missing'); await page.getByText('Collezione non disponibile',{exact:true}).waitFor();
      state.products=[]; await page.goto(baseURL+'/collections/rose'); await page.getByText('Nessun prodotto in questa collezione',{exact:true}).waitFor();
    } finally { await context.close(); }
  });
  await check('Checkout: doppio invio, errore, retry senza duplicare quantità e navigazione nella stessa scheda', async () => {
    const state={checkoutDelay:500,checkoutError:true}; const {page,context}=await setup(390,state);
    try {
      await visit(page,'/products/pianta-test-1',products[0].node.title);
      await page.getByRole('button',{name:'Acquista ora',exact:true}).evaluate(button=>{button.click();button.click();});
      await page.getByRole('button',{name:'Preparazione checkout…',exact:true}).waitFor();
      await page.getByRole('button',{name:'Acquista ora',exact:true}).waitFor();
      assert.equal(state.checkoutCalls,1); assert.equal((await store(page)).items[0].quantity,1);
      assert.equal((await store(page)).checkoutUrl,null); assert.equal((await store(page)).isLoading,false);
      await page.getByRole('button',{name:'Acquista ora',exact:true}).click();
      await page.getByRole('button',{name:'Preparazione checkout…',exact:true}).waitFor();
      await page.getByRole('button',{name:'Acquista ora',exact:true}).waitFor();
      assert.equal(state.checkoutCalls,2); assert.equal((await store(page)).items[0].quantity,1);
      await page.getByRole('button',{name:'Carrello, 1 articoli',exact:true}).filter({visible:true}).click();
      await page.getByRole('button',{name:'Procedi al Checkout'}).click();
      await page.getByRole('alert').filter({hasText:'Il carrello è stato conservato'}).waitFor();
      state.checkoutError=false;
      await page.getByRole('button',{name:'Procedi al Checkout'}).click();
      await page.waitForURL('https://checkout.example.test/**');
      assert.equal(context.pages().length,1); assert.equal(state.lines[0].quantity,1);
      assert.ok(page.url().includes('channel=online_store'));
    } finally {await context.close();}
  });
  await check('Persistenza: caricamento e vecchio checkout ignorati dopo refresh; quantità non valide rifiutate', async () => {
    const {page,context}=await setup();
    try {
      await visit(page,'/products/pianta-test-1',products[0].node.title);
      await page.getByRole('button',{name:'Aggiungi al carrello',exact:true}).click();
      await page.evaluate(()=>{
        const persisted=JSON.parse(localStorage.getItem('shopify-cart'));
        persisted.state.isLoading=true; persisted.state.checkoutUrl='https://stale.example.test';
        localStorage.setItem('shopify-cart',JSON.stringify(persisted));
      });
      await page.reload(); await page.getByRole('heading',{name:products[0].node.title,exact:true}).waitFor();
      assert.equal((await store(page)).isLoading,false); assert.equal((await store(page)).checkoutUrl,null);
      await page.evaluate(async()=>{
        const {useCartStore}=await import('/src/stores/cartStore.ts'); const state=useCartStore.getState();
        state.updateQuantity(state.items[0].variantId,NaN); state.updateQuantity(state.items[0].variantId,1.5);
      });
      assert.equal((await store(page)).items[0].quantity,1);
    } finally {await context.close();}
  });
  await check('Varianti: selezione disponibile, sold out e scelta formato dalla homepage', async () => {
    const multi=makeProduct(1);
    multi.node.variants.edges.unshift({node:{...multi.node.variants.edges[0].node,id:'gid://shopify/ProductVariant/sold',title:'Vaso 10 cm',availableForSale:false,selectedOptions:[{name:'Formato',value:'Vaso 10 cm'}]}});
    multi.node.options[0].values.unshift('Vaso 10 cm');
    const sold=makeProduct(2); sold.node.variants.edges[0].node.availableForSale=false;
    const {page,context}=await setup(390,{products:[multi,sold]});
    try {
      await visit(page,'/','Piante da giardino, scelte con cura');
      await page.getByRole('button',{name:'Scegli formato'}).first().click();
      await page.getByRole('heading',{name:multi.node.title,exact:true}).waitFor();
      assert.equal((await store(page)).items.length,0);
      assert.equal(await page.getByRole('button',{name:'Aggiungi al carrello',exact:true}).isEnabled(),true);
      await visit(page,'/products/pianta-test-2',sold.node.title);
      assert.equal(await page.getByRole('button',{name:'Aggiungi al carrello',exact:true}).isDisabled(),true);
      assert.equal(await page.getByRole('button',{name:'Acquista ora',exact:true}).isDisabled(),true);
    } finally {await context.close();}
  });
  await check('Tastiera: skip link, menu, zoom Escape e ripristino focus, pausa hero', async () => {
    const {page,context}=await setup(390,{}, {reducedMotion:'no-preference'});
    try {
      await visit(page,'/','Piante da giardino, scelte con cura');
      await page.keyboard.press('Tab'); assert.equal(await page.locator(':focus').innerText(),'Salta al contenuto');
      await page.keyboard.press('Enter'); assert.equal(await page.locator(':focus').getAttribute('id'),'main-content');
      await page.getByRole('button',{name:'Pausa presentazione'}).click();
      await page.getByRole('button',{name:'Riprendi presentazione'}).waitFor();
      await page.getByRole('button',{name:'Apri menu',exact:true}).click();
      await page.getByRole('dialog').waitFor(); await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({state:'hidden'});
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Apri menu');
      assert.equal(await page.locator(':focus').getAttribute('aria-label'),'Apri menu');
      await visit(page,'/products/pianta-test-1',products[0].node.title);
      await page.getByRole('button',{name:'Ingrandisci immagine'}).click();
      await page.getByRole('dialog').waitFor(); await page.keyboard.press('Tab');
      assert.equal(await page.locator(':focus').evaluate(el=>!!el.closest('[role="dialog"]')),true);
      await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({state:'hidden'});
      assert.equal(await page.locator(':focus').getAttribute('aria-label'),'Ingrandisci immagine');
    } finally {await context.close();}
  });
  await check('PDP: navigazione rapida non viene sovrascritta da risposta precedente', async () => {
    const {page,context}=await setup(390,{delays:{'pianta-test-1':800}});
    try {
      await page.goto(baseURL+'/products/pianta-test-1');
      await page.waitForTimeout(80);
      await page.evaluate(()=>{history.pushState({},'', '/products/pianta-test-2'); dispatchEvent(new PopStateEvent('popstate'));});
      await page.getByRole('heading',{name:'Pianta di prova 2',exact:true}).waitFor();
      await page.waitForTimeout(900);
      assert.equal(await page.getByRole('heading',{level:1}).innerText(),'Pianta di prova 2');
    } finally {await context.close();}
  });
  await check('Collezioni: oltre 60 prodotti, errore pagina successiva, retry e cambio collezione', async () => {
    const state={products:Array.from({length:65},(_,i)=>makeProduct(i+1)),collectionPageError:true};
    const {page,context}=await setup(390,state);
    try {
      await visit(page,'/collections/rose','Rose di prova');
      assert.equal(await page.locator('article').count(),60);
      await page.getByRole('button',{name:'Carica altri prodotti'}).click();
      await page.getByRole('alert').waitFor();
      assert.equal(await page.locator('article').count(),60);
      state.collectionPageError=false; await page.getByRole('button',{name:'Riprova',exact:true}).click();
      await page.getByText('65 prodotti caricati',{exact:true}).waitFor();
      assert.equal(await page.locator('article').count(),65);
      assert.equal(await page.getByRole('button',{name:'Carica altri prodotti'}).count(),0);
      await page.evaluate(()=>{history.pushState({},'', '/collections/alberi'); dispatchEvent(new PopStateEvent('popstate'));});
      await page.getByText('60 prodotti caricati',{exact:true}).waitFor();
      assert.equal(await page.locator('article').count(),60);
      await page.evaluate(()=>{history.pushState({},'', '/collections/rose'); dispatchEvent(new PopStateEvent('popstate'));});
      await page.getByRole('button',{name:'Carica altri prodotti'}).waitFor();
      await page.waitForTimeout(100);
      assert.equal(await page.locator('article').count(),60);
    } finally {await context.close();}
  });
  await check('Nessuna eccezione JavaScript non gestita', async()=>assert.deepEqual(report.pageErrors,[]));
} finally {
  await browser.close();
  report.blockedHosts=[...new Set(report.blockedHosts)];
  report.summary={passed:report.checks.filter(c=>c.status==='PASS').length,failed:report.checks.filter(c=>c.status==='FAIL').length};
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report.summary));
  if(report.summary.failed) process.exitCode=1;
}
