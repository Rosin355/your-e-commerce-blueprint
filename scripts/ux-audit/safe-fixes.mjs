import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { mockStorefront, products, makeProduct } from './fixtures.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.UX_BASE_URL||'http://127.0.0.1:8080';
const output=process.env.UX_OUTPUT_DIR||'/tmp/online-garden-phase4';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={browser:browser.version(),synthetic:true,checks:[],pageErrors:[]};
async function check(name,run){
  const context=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});const state={};
  await mockStorefront(context,state);const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.pageErrors.push(e.message));
  try{await run(page,state);report.checks.push({name,status:'PASS'});console.log(`PASS ${name}`);}
  catch(e){report.checks.push({name,status:'FAIL',error:e.message});console.error(`FAIL ${name}: ${e.message}`);}
  finally{await context.close();}
}
const navigate=(page,path)=>page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));},path);
const jsonLd=page=>page.locator('script[data-storefront-product]');
try {
  await check('NotFound diretto e navigazione: noindex, canonical, niente residui PDP e ripristino home',async page=>{
    await page.goto(base+'/missing?q=test');await page.waitForFunction(()=>document.title==='Pagina non trovata | Online Garden');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),base+'/missing');
    await navigate(page,'/products/pianta-test-1');await page.getByRole('heading',{name:products[0].node.title,exact:true}).waitFor();
    assert.equal(await jsonLd(page).count(),1);
    await navigate(page,'/missing');await page.waitForFunction(()=>document.title==='Pagina non trovata | Online Garden');
    assert.equal(await jsonLd(page).count(),0);assert.equal(await page.locator('meta[property="og:image"]').count(),0);
    await navigate(page,'/');await page.waitForFunction(()=>document.title==='Online Garden — Piante online');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'index,follow');
    assert.equal(await page.locator('link[rel="canonical"]').count(),1);
  });
  await check('JSON-LD descrittivo, cleanup al loading/missing/error, nessun dato commerciale',async(page,state)=>{
    state.products=[makeProduct(1,{title:'Nome </script><script>non eseguire</script>'})];
    await page.goto(base+'/products/pianta-test-1');await jsonLd(page).waitFor({state:'attached'});
    const data=JSON.parse(await jsonLd(page).textContent());assert.equal(data['@graph'][0].name,state.products[0].node.title);
    assert.ok(!(await jsonLd(page).textContent()).includes('<'));assert.equal(data['@graph'][1]['@type'],'BreadcrumbList');
    for(const field of ['offers','price','availability','aggregateRating','review','brand'])assert.ok(!JSON.stringify(data).includes(`"${field}"`));
    state.delays={'pianta-test-2':500};await navigate(page,'/products/pianta-test-2');
    await page.getByRole('status').filter({hasText:'Caricamento prodotto'}).waitFor();assert.equal(await jsonLd(page).count(),0);
    await page.getByRole('heading',{name:'Prodotto non trovato'}).waitFor();assert.equal(await jsonLd(page).count(),0);
    state.apiError=true;await navigate(page,'/products/pianta-test-1');await page.getByRole('heading',{name:'Impossibile caricare il prodotto'}).waitFor();
    assert.equal(await jsonLd(page).count(),0);
  });
  await check('Uscita dal catalogo cancella la richiesta; cambio query locale riusa il set completo',async(page,state)=>{
    state.products=Array.from({length:1205},(_,i)=>makeProduct(i+1,{title:`Lento ${i+1}`}));
    state.catalogPageDelay=500;
    const failed=[];page.on('requestfailed',request=>{if(request.url().endsWith('/graphql.json'))failed.push(request.failure()?.errorText);});
    await page.goto(base+'/collections/all?q=Lento');
    await page.waitForRequest(r=>r.postData()?.includes('GetProductsPage'));
    await navigate(page,'/missing');
    await page.waitForFunction(()=>document.title==='Pagina non trovata | Online Garden');
    await page.waitForTimeout(650);
    assert.ok(failed.length>0);
    assert.equal(state.requests.filter(r=>r.query.includes('GetProductsPage')&&r.variables.after).length,0);
    state.catalogPageDelay=0;
    await navigate(page,'/collections/all?q=1205');
    await page.getByRole('heading',{name:'Lento 1205',exact:true}).waitFor();
    const calls=state.requests.length;
    await navigate(page,'/collections/all?q=1204');
    await page.getByRole('heading',{name:'Lento 1204',exact:true}).waitFor();
    assert.equal(state.requests.length,calls);
  });
  await check('Catalogo leggero: sort e filtri globali, homepage con descrizione invariata',async(page,state)=>{
    state.products=Array.from({length:1205},(_,i)=>makeProduct(i+1));
    state.products[1204]=makeProduct(1205,{options:[{name:'Formato',values:['Formato tardivo']}],availableForSale:false});
    await page.goto(base+'/collections/all');await page.locator('article').first().waitFor();
    const queries=state.requests.filter(r=>r.query.includes('GetProductsPage'));assert.equal(queries.length,13);
    assert.ok(queries.every(r=>r.query.includes('description')&&!r.query.includes('variants(')));
    await page.getByLabel('Ordina per').selectOption('za');
    const first=[...state.products].sort((a,b)=>b.node.title.localeCompare(a.node.title))[0].node.title;
    assert.equal(await page.locator('article h2').first().textContent(),first);
    await page.getByRole('button',{name:/Filtra e ordina/}).click();
    const filters=page.getByRole('dialog');await filters.getByLabel(/Formato tardivo/).check();
    await filters.getByRole('button',{name:'Applica',exact:true}).click();
    assert.equal(await page.locator('article').count(),1);
    assert.equal(await page.locator('article h2').textContent(),state.products[1204].node.title);
    assert.equal(await page.locator('article').getByText('Esaurito',{exact:true}).count(),1);
    await navigate(page,'/');await page.getByText('Prodotto sintetico per verificare il percorso di acquisto. Non in vendita.',{exact:true}).first().waitFor();
    assert.ok(state.requests.some(r=>r.query.includes('query GetProducts(')&&r.query.includes('description')));
  });
}finally{
  await browser.close();report.summary={passed:report.checks.filter(c=>c.status==='PASS').length,failed:report.checks.filter(c=>c.status==='FAIL').length};
  await fs.writeFile(output+'/safe-fixes-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));
  if(report.summary.failed||report.pageErrors.length)process.exitCode=1;
}
