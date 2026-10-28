import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { makeProduct, mockStorefront } from './fixtures.mjs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({channel:'chrome',headless:true});
const base = process.env.UX_BASE_URL || 'http://127.0.0.1:8080';
const output = process.env.UX_OUTPUT_DIR || '/tmp/online-garden-scalability';
await fs.mkdir(output,{recursive:true});
const report = {browser:browser.version(),syntheticData:true,checks:[],pageErrors:[]};
const catalog = Array.from({length:1205},(_,i)=>makeProduct(i+1,{title:`Catalogo prova ${i+1}`,availableForSale:true}));
const variants = Array.from({length:205},(_,i)=>({node:{id:`gid://shopify/ProductVariant/${i+1}`,title:`Formato ${i+1}`,availableForSale:i>=10,price:{amount:String(i+1),currencyCode:'EUR'},selectedOptions:[{name:'Formato',value:`Formato ${i+1}`} ]}}));
const variantProduct = makeProduct(9999,{title:'Prodotto 205 varianti',availableForSale:true,variants:{edges:variants},options:[{name:'Formato',values:variants.map(v=>v.node.title)}],seo:{title:'Titolo SEO verificato',description:'Descrizione SEO da fixture.'}});
async function scenario(name, run) {
  const context = await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});
  const state = {products:catalog};
  await mockStorefront(context,state);
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror',e=>report.pageErrors.push(e.message));
  try { await run(page,state); report.checks.push({name,status:'PASS'}); console.log(`PASS ${name}`); }
  catch(error) { report.checks.push({name,status:'FAIL',error:error.stack}); console.error(`FAIL ${name}: ${error.message}`); }
  finally { await context.close(); }
}
const navigate = (page,path)=>page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));},path);
const titleIs = (page,text)=>page.waitForFunction(text=>document.title===text,text);
try {
  await scenario('Ricerca client su 1.205 risultati, prodotto oltre 1.000 e sort globale',async(page,state)=>{
    await page.goto(base+'/collections/all?q=Catalogo');
    await page.getByText('1205 prodotti trovati',{exact:true}).waitFor();
    assert.equal(state.requests.filter(r=>r.query.includes('GetProductsPage')).length,13);
    assert.ok(state.requests.filter(r=>r.query.includes('GetProductsPage')).every(r=>r.variables.query === undefined));
    await page.getByLabel('Ordina per').selectOption('za');
    const expected = [...catalog].sort((a,b)=>b.node.title.localeCompare(a.node.title))[0].node.title;
    assert.equal(await page.locator('article h2').first().textContent(),expected);
    await navigate(page,'/collections/all?q=1205');
    await page.getByRole('heading',{name:'Catalogo prova 1205',exact:true}).waitFor();
    await page.screenshot({path:output+'/ricerca-oltre-1000.png'});
  });
  await scenario('Errore seconda pagina catalogo, retry completo senza falso zero',async(page,state)=>{
    state.catalogPageError=true;
    await page.goto(base+'/collections/all?q=Catalogo');
    await page.getByRole('heading',{name:'Impossibile caricare il catalogo'}).waitFor();
    assert.equal(await page.locator('article').count(),0);
    state.catalogPageError=false; await page.getByRole('button',{name:'Riprova',exact:true}).click();
    await page.getByText('1205 prodotti trovati',{exact:true}).waitFor();
  });
  await scenario('205 varianti: prima disponibile oltre 10 e checkout ultima variante',async(page,state)=>{
    state.products=[variantProduct];
    await page.goto(base+'/products/pianta-test-9999');
    await page.getByRole('heading',{name:variantProduct.node.title,exact:true}).waitFor();
    assert.ok(state.requests.some(r=>r.query.includes('GetProductVariants') && r.variables.after==='200'));
    await page.getByRole('button',{name:'Aggiungi al carrello',exact:true}).click();
    const items = await page.evaluate(()=>JSON.parse(localStorage.getItem('shopify-cart')).state.items);
    assert.equal(items[0].variantId,variants[10].node.id);
    await page.getByRole('button',{name:'Formato 205',exact:true}).click();
    await page.getByRole('button',{name:'Acquista ora',exact:true}).click();
    await page.waitForURL('https://checkout.example.test/**');
    assert.equal(state.checkoutCalls,1);
    assert.equal(state.lines.at(-1).merchandiseId,variants[204].node.id);
  });
  await scenario('Errore varianti successive: niente acquisto parziale, retry',async(page,state)=>{
    state.products=[variantProduct]; state.variantPageError=true;
    await page.goto(base+'/products/pianta-test-9999');
    await page.getByRole('heading',{name:'Impossibile caricare il prodotto'}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Acquista ora',exact:true}).count(),0);
    state.variantPageError=false; await page.getByRole('button',{name:'Riprova',exact:true}).click();
    await page.getByRole('button',{name:'Formato 205',exact:true}).waitFor();
  });
  await scenario('SEO homepage, alias, ricerca, collezione, PDP e assenza dati residui',async(page,state)=>{
    state.products=[variantProduct];
    await page.goto(base+'/'); await titleIs(page,'Online Garden — Piante online');
    await navigate(page,'/products'); await titleIs(page,'Tutti i prodotti | Online Garden');
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),base+'/collections/all');
    await navigate(page,'/collections/all?q=Rosa'); await titleIs(page,'Ricerca: Rosa | Online Garden');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
    await navigate(page,'/collections/rose'); await titleIs(page,'Rose di prova | Online Garden');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'index,follow');
    await navigate(page,'/products/pianta-test-9999'); await titleIs(page,'Titolo SEO verificato | Online Garden');
    assert.equal(await page.locator('meta[name="description"]').getAttribute('content'),'Descrizione SEO da fixture.');
    assert.equal(await page.locator('meta[property="og:type"]').getAttribute('content'),'product');
    assert.equal(await page.locator('meta[property="og:image"]').count(),1);
    await navigate(page,'/products/missing'); await titleIs(page,'Prodotto non trovato | Online Garden');
    assert.equal(await page.locator('meta[property="og:image"]').count(),0);
    assert.equal(await page.locator('meta[name="description"]').count(),0);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
    await navigate(page,'/'); await titleIs(page,'Online Garden — Piante online');
    assert.equal(await page.locator('meta[property="og:type"]').getAttribute('content'),'website');
    assert.equal(await page.locator('link[rel="canonical"]').count(),1);
  });
  await scenario('Card: disponibile se solo variante 11 è vendibile',async(page,state)=>{
    state.products=[makeProduct(1,{availableForSale:true,variants:{edges:variants.slice(0,10)},options:variantProduct.node.options})];
    await page.goto(base+'/collections/all'); await page.locator('article').waitFor();
    assert.equal(await page.locator('article').getByText('Esaurito',{exact:true}).count(),0);
    await navigate(page,'/');
    const button=page.getByRole('button',{name:'Scegli formato',exact:true}).first(); await button.waitFor();
    assert.ok(await button.isEnabled());
    await button.click(); await page.waitForURL('**/products/pianta-test-1');
  });
} finally {
  await browser.close();
  report.summary={passed:report.checks.filter(c=>c.status==='PASS').length,failed:report.checks.filter(c=>c.status==='FAIL').length};
  await fs.writeFile(output+'/scalability-report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report.summary));
  if(report.summary.failed || report.pageErrors.length) process.exitCode=1;
}
