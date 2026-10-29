// Comparable Phase 8 captures: synthetic products, intercepted checkout, no live writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { products, mockStorefront } from './fixtures.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const phase = process.env.CX_PHASE || 'after';
const baseURL = process.env.UX_BASE_URL || 'http://127.0.0.1:8098';
const output = process.env.UX_OUTPUT_DIR || `docs/customer-experience-implementation-evidence/2026-10-29/${phase}`;
await fs.mkdir(output,{recursive:true});
const dataset=structuredClone(products);
for(const {node} of dataset) node.priceRange.maxVariantPrice={...node.priceRange.minVariantPrice};
const first=dataset[0].node;
first.variants.edges.push({node:{...structuredClone(first.variants.edges[0].node),id:'gid://shopify/ProductVariant/1001',title:'Vaso 20 cm',price:{amount:'29.90',currencyCode:'EUR'},selectedOptions:[{name:'Formato',value:'Vaso 20 cm'}]}});
first.options[0].values.push('Vaso 20 cm'); first.priceRange.maxVariantPrice.amount='29.90';
dataset[2].node.variants.edges[0].node.availableForSale=false;
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={phase,browser:browser.version(),syntheticData:true,externalTrafficIntercepted:true,pages:[],checks:[],pageErrors:[]};
try {
 for(const width of [390,1440]) {
  const state={products:dataset};
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await mockStorefront(context,state);
  const page=await context.newPage(); page.setDefaultTimeout(15000);
  page.on('pageerror',error=>report.pageErrors.push(error.message));
  for(const [name,route,heading] of [['home','/','Piante da giardino, scelte con cura'],['catalogo','/collections/all','Tutti i prodotti'],['pdp','/products/pianta-test-1',first.title]]) {
   await page.goto(baseURL+route);
   await page.getByRole('heading',{name:heading,exact:true}).waitFor();
   if(name==='home') await page.getByRole('link',{name:'Vedi dettagli',exact:true}).first().waitFor();
   if(name==='catalogo') await page.locator('article').first().waitFor();
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(img=>img.complete).map(img=>img.decode().catch(()=>{})));});
   await page.screenshot({path:path.join(output,`${name}-${width}.png`),fullPage:false,animations:'disabled'});
   await page.screenshot({path:path.join(output,`${name}-${width}-full.png`),fullPage:true,animations:'disabled'});
   const metrics=await page.evaluate(()=>{
    const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {top:Math.round(r.top+scrollY),width:Math.round(r.width),height:Math.round(r.height)}};
    const buttons=[...document.querySelectorAll('button')];
    return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,title:rect(document.querySelector('h1')),firstProduct:rect(document.querySelector('article,main a[aria-label^="Vedi "]')),format:rect(buttons.find(el=>el.textContent.trim()==='Vaso 14 cm')),cta:rect(buttons.find(el=>el.textContent.trim()==='Aggiungi al carrello')),gallery:rect(document.querySelector('button[aria-label*="ingrand"]'))};
   });
   assert.ok(metrics.scrollWidth<=width+1,`${name} overflow ${width}: ${metrics.scrollWidth}`);
   report.pages.push({name,width,...metrics});
   if(phase==='after' && name==='pdp') {
    const format=page.getByRole('button',{name:'Vaso 20 cm',exact:true});await format.click();
    assert.equal(await format.getAttribute('aria-pressed'),'true');
    if(width===390){const bar=page.locator('[data-testid="sticky-add-to-cart"]');await bar.getByText('Vaso 20 cm',{exact:false}).waitFor();await bar.getByText(/29,90/).waitFor();}
    await page.getByRole('button',{name:'Aggiungi al carrello',exact:true}).click();
    const cart=await page.evaluate(async()=>{const {useCartStore}=await import('/src/stores/cartStore.ts');return useCartStore.getState().items;});
    assert.equal(cart[0].variantId,'gid://shopify/ProductVariant/1001');assert.equal(cart[0].price.amount,'29.90');
    report.checks.push({name:`Selected variant, price and cart ${width}`,status:'PASS'});
   }
  }
  await context.close();
 }
 assert.deepEqual(report.pageErrors,[]);
} finally {await browser.close();await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
