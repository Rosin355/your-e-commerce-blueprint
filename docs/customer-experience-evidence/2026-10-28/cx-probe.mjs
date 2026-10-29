import fs from 'node:fs/promises';
import { chromium } from '/Users/romesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {mockStorefront, products, makeProduct} from '/private/tmp/online-garden-cx-phase7/scripts/ux-audit/fixtures.mjs';
const out='/private/tmp/online-garden-cx-phase7/docs/customer-experience-evidence/2026-10-28';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={baseline:'aa7e6aeb9aa0eafc01f655976f342733562bb824',syntheticData:true,externalRequestsIntercepted:true,observations:[],pageErrors:[]};
try {
for (const width of [390,1440]) {
 const state={}; const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 await mockStorefront(context,state); const page=await context.newPage();
 page.on('pageerror',e=>report.pageErrors.push(e.message));
 for(const [name,route] of [['home','/'],['catalogo','/collections/all'],['collezione','/collections/rose'],['pdp','/products/pianta-test-1']]) {
  await page.goto('http://127.0.0.1:8097'+route);
  if(name==='home') await page.getByRole('link',{name:'Vedi dettagli',exact:true}).first().waitFor();
  else if(name==='pdp') await page.getByRole('button',{name:'Aggiungi al carrello',exact:true}).waitFor();
  else await page.locator('article').first().waitFor();
  await page.evaluate(async()=>{await Promise.all([...document.images].filter(i=>i.complete).map(i=>i.decode().catch(()=>{})));});
  const geometry=await page.evaluate((name)=>{
   const box=e=>e?{top:Math.round(e.getBoundingClientRect().top+scrollY),height:Math.round(e.getBoundingClientRect().height),width:Math.round(e.getBoundingClientRect().width)}:null;
   const text=t=>[...document.querySelectorAll('button,p')].find(e=>e.textContent.trim()===t);
   return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,h1:box(document.querySelector('h1')),firstProduct:box(document.querySelector(name==='home'?'a[aria-label^="Vedi "]':'article')),buyBlock:box(document.querySelector('#product-info')),variant:box(text('Vaso 14 cm')),primaryAdd:box(text('Aggiungi al carrello')),hero:box(document.querySelector('main>section'))};
  },name);
  report.observations.push({name,width,geometry});
  await page.screenshot({path:`${out}/audit-${name}-${width}.png`,fullPage:true,animations:'disabled'});
  if(name==='pdp'&&width===390) {
   await page.locator('#product-info').scrollIntoViewIfNeeded();
   await page.screenshot({path:`${out}/audit-pdp-acquisto-${width}.png`,fullPage:false});
   await page.getByRole('button',{name:'Aggiungi al carrello',exact:true}).click();
   await page.getByRole('button',{name:'Carrello, 1 articoli',exact:true}).filter({visible:true}).click();
   await page.getByRole('dialog').waitFor();
   await page.screenshot({path:`${out}/audit-carrello-${width}.png`});
   await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
   await page.getByRole('button',{name:'Apri menu',exact:true}).click();
   await page.getByRole('dialog').waitFor();
   report.observations.push({name:'menu',width,links:await page.getByRole('dialog').getByRole('link').count()});
   await page.waitForFunction(()=>{const d=document.querySelector('[role="dialog"]');return d&&Math.abs(d.getBoundingClientRect().left)<1});
   await page.screenshot({path:`${out}/audit-menu-${width}.png`,animations:'disabled'});
  }
  if(name==='catalogo') {
   const before=await page.locator('article h2').allTextContents();
   await page.getByLabel('Ordina per').selectOption('best');
   const after=await page.locator('article h2').allTextContents();
   report.observations.push({name:'best-identico-default',width,same:JSON.stringify(before)===JSON.stringify(after),before,after});
  }
 }
 await context.close();
}
const context=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});
const one=makeProduct(1);one.node.variants.edges.push({node:{...one.node.variants.edges[0].node,id:'gid://shopify/ProductVariant/10001',title:'Vaso 20 cm',price:{amount:'29.90',currencyCode:'EUR'},selectedOptions:[{name:'Formato',value:'Vaso 20 cm'}]}});one.node.options[0].values.push('Vaso 20 cm');
const state={products:[one,...products.slice(1)]};await mockStorefront(context,state);const page=await context.newPage();
await page.goto('http://127.0.0.1:8097/products/pianta-test-1');await page.getByRole('button',{name:'Aggiungi al carrello',exact:true}).waitFor();
report.observations.push({name:'variant-semantics',buttons:await page.getByRole('button',{name:/^Vaso (14|20) cm$/}).evaluateAll(es=>es.map(e=>({text:e.textContent,role:e.getAttribute('role'),ariaPressed:e.getAttribute('aria-pressed'),ariaChecked:e.getAttribute('aria-checked'),disabled:e.disabled}))),sticky:await page.locator('.fixed.inset-x-0.bottom-0').textContent()});
await page.goto('http://127.0.0.1:8097/collections/all');await page.locator('article').first().waitFor();
report.observations.push({name:'min-price-card',text:await page.locator('article').first().textContent()});
state.checkoutError=true;
await page.goto('http://127.0.0.1:8097/products/pianta-test-1');await page.getByRole('button',{name:'Aggiungi al carrello',exact:true}).click();
await page.getByRole('button',{name:'Carrello, 1 articoli',exact:true}).filter({visible:true}).click();
await page.getByRole('button',{name:'Procedi al Checkout'}).click();
const alert=page.getByRole('alert').filter({hasText:'Il carrello è stato conservato'});await alert.waitFor();
report.observations.push({name:'checkout-error-style',style:await alert.evaluate(e=>({color:getComputedStyle(e).color,fontSize:getComputedStyle(e).fontSize,fontWeight:getComputedStyle(e).fontWeight,background:getComputedStyle(e.parentElement).backgroundColor}))});
await page.screenshot({path:`${out}/audit-errore-checkout-390.png`});
await context.close();
} finally { await browser.close();await fs.writeFile(`${out}/observations.json`,JSON.stringify(report,null,2)); }
console.log(JSON.stringify(report,null,2));
