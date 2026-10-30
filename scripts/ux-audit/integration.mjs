import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { makeProduct, mockStorefront } from './fixtures.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.UX_BASE_URL || 'http://127.0.0.1:8082';
const output=process.env.UX_OUTPUT_DIR || '/tmp/online-garden-integration-browser';
await fs.mkdir(output,{recursive:true});
const report={synthetic:true,browser:browser.version(),checks:[],pageErrors:[]};
const navigate=(page,path)=>page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));},path);
async function check(name,run){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const state={};await mockStorefront(context,state);
 const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.pageErrors.push(e.message));
 try{await run(page,state);report.checks.push({name,status:'PASS'});console.log('PASS',name);}
 catch(e){report.checks.push({name,status:'FAIL',error:e.stack});console.error('FAIL',name,e.message);}
 finally{await context.close();}
}
try{
 await check('10.000 prodotti completi, ultima card ricercabile, descrizione/handle/vendor/tag/tipo e categorie canoniche preservati',async(page,state)=>{
  state.products=Array.from({length:10000},(_,i)=>makeProduct(i+1,{title:`Catalogo ${i+1}`,publishedAt:new Date(Date.UTC(2026,0,1)+(i*60000)).toISOString()}));
  state.products[9999]=makeProduct(10000,{title:'Ultima pianta',description:'Descrizione univoca integrata',vendor:'Fornitore univoco',tags:['EtichettaUnivoca'],productType:'TipoUnivoco',handle:'handle-univoco',publishedAt:'2026-10-28T00:00:00Z'});
  await page.goto(base+'/collections/all');
  await page.getByText('9-di-10000 prodotti',{exact:true}).waitFor();
  assert.equal(state.requests.filter(r=>r.query.includes('GetProductsPage')).length,100);
  await page.getByLabel('Ordina per').selectOption('date-new');
  assert.equal(await page.locator('article h2').first().textContent(),'Ultima pianta');
  await page.getByLabel('Ordina per').selectOption('featured');
  for(const term of ['Descrizione univoca integrata','handle-univoco','Fornitore univoco','EtichettaUnivoca','TipoUnivoco']){
   await navigate(page,'/collections/all?q='+encodeURIComponent(term));
   await page.getByText('1 prodotto trovato',{exact:true}).waitFor();
   assert.equal(await page.locator('article h2').textContent(),'Ultima pianta');
  }
  await navigate(page,'/collections/all?q=Rósa');
  await page.getByText('10000 prodotti trovati',{exact:true}).waitFor();
  assert.equal(state.requests.filter(r=>r.query.includes('GetProductsPage')).length,100);
  await page.screenshot({path:output+'/catalog-10000-mobile.png'});
 });
 await check('Viewport mobili compatti: overflow, sticky acquisto e dialog carrello a 320×568, 375×812, 390×844 e 430×932',async(page,state)=>{
  state.products=[makeProduct(1)];
  for(const [width,height] of [[320,568],[375,812],[390,844],[430,932]]){
   await page.setViewportSize({width,height});
   await page.goto(base+'/products/pianta-test-1');
   await page.getByRole('heading',{name:state.products[0].node.title,exact:true}).waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const sticky=page.getByRole('button',{name:'Aggiungi',exact:true});
   const box=await sticky.boundingBox();assert.ok(box.y>=0 && box.y+box.height<=height+1);
   await sticky.click();
   await page.getByRole('button',{name:/Carrello, .* articoli/}).filter({visible:true}).click();
   const dialog=page.getByRole('dialog');await dialog.waitFor();
   await page.waitForFunction(()=>{const el=document.querySelector('[role=dialog]');if(!el)return false;const b=el.getBoundingClientRect();return b.left>=-1 && b.right<=innerWidth+1;});
   const bounds=await dialog.boundingBox();assert.ok(bounds.x>=-1 && bounds.x+bounds.width<=width+1,JSON.stringify({width,height,bounds}));
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  }
 });
 await check('Prodotti test nascosti in catalogo, collezione, home e accesso diretto PDP; nessun JSON-LD o acquisto',async(page,state)=>{
  state.products=[makeProduct(15357653156180,{title:'TEST-001'}),makeProduct(15357653188948,{title:'TEST-002'}),makeProduct(1)];
  await page.goto(base+'/collections/all');await page.getByText('1-di-1 prodotti',{exact:true}).waitFor();
  assert.equal(await page.locator('article').count(),1);
  await navigate(page,'/collections/rose');await page.getByText('1 prodotti caricati',{exact:true}).waitFor();
  assert.equal(await page.locator('article').count(),1);
  await navigate(page,'/');await page.getByRole('link',{name:'Vedi dettagli',exact:true}).first().waitFor();
  assert.equal(await page.getByText('TEST-001',{exact:true}).count(),0);
  assert.equal(await page.getByText('TEST-002',{exact:true}).count(),0);
  for(const id of [15357653156180,15357653188948]){
   await navigate(page,'/products/pianta-test-'+id);await page.getByRole('heading',{name:'Prodotto non trovato'}).waitFor();
   assert.equal(await page.locator('script[data-storefront-product]').count(),0);
   assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
   assert.equal(await page.getByRole('button',{name:'Acquista ora',exact:true}).count(),0);
  }
  assert.equal(state.checkoutCalls,0);
 });
}finally{
 await browser.close();report.summary={passed:report.checks.filter(c=>c.status==='PASS').length,failed:report.checks.filter(c=>c.status==='FAIL').length};
 await fs.writeFile(output+'/integration-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));
 if(report.summary.failed || report.pageErrors.length)process.exitCode=1;
}
