// Phase 9: compact mobile purchase review, synthetic catalogue and intercepted checkout only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { products, mockStorefront } from './fixtures.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.UX_BASE_URL || 'http://127.0.0.1:8099';
const output=process.env.UX_OUTPUT_DIR || 'docs/customer-experience-final-review-evidence/2026-10-29/compact';
await fs.mkdir(output,{recursive:true});
const dataset=structuredClone(products);
const first=dataset[0].node;
first.variants.edges.push({node:{...structuredClone(first.variants.edges[0].node),id:'gid://shopify/ProductVariant/1001',title:'Vaso 20 cm',price:{amount:'29.90',currencyCode:'EUR'},selectedOptions:[{name:'Formato',value:'Vaso 20 cm'}]}});
first.options[0].values.push('Vaso 20 cm');
first.priceRange.maxVariantPrice={amount:'29.90',currencyCode:'EUR'};
dataset[2].node.variants.edges[0].node.availableForSale=false;
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={base,syntheticData:true,externalRequestsIntercepted:true,checks:[],measurements:[],pageErrors:[]};
async function cart(page){return page.evaluate(async()=>{const {useCartStore}=await import('/src/stores/cartStore.ts');return useCartStore.getState().items;});}
async function exposed(locator,page){
 const rect=await locator.boundingBox();assert.ok(rect&&rect.width>=44&&rect.height>=44,JSON.stringify(rect));
 const hit=await locator.evaluate(el=>{const r=el.getBoundingClientRect();const target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {exposed:target===el||el.contains(target),control:el.textContent,hit:target?.outerHTML.slice(0,250),x:r.x,y:r.y,width:r.width,height:r.height};});assert.equal(hit.exposed,true,JSON.stringify(hit));
 assert.ok(rect.y>=0 && rect.y+rect.height<=page.viewportSize().height+1,JSON.stringify(rect));return rect;
}
try{
 for(const [width,height] of [[320,568],[375,812],[390,844],[430,932]]){
  const name=`Multi-format sticky purchase ${width}x${height}`;
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  const state={products:dataset,checkoutError:true};await mockStorefront(context,state);
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.pageErrors.push(e.message));
  try{
   await page.goto(base+'/products/pianta-test-1');await page.getByRole('heading',{level:1,name:first.title,exact:true}).waitFor();
   const bar=page.getByTestId('sticky-add-to-cart');await bar.getByText('Vaso 14 cm',{exact:true}).waitFor();await exposed(bar.getByRole('button',{name:'Aggiungi',exact:true}),page);
   const format=page.getByRole('button',{name:'Vaso 20 cm',exact:true});await format.click();assert.equal(await format.getAttribute('aria-pressed'),'true');
   const formatBox=await exposed(format,page);await bar.getByText('Vaso 20 cm',{exact:true}).waitFor();await bar.getByText(/29,90/).waitFor();
   await page.screenshot({path:path.join(output,`formato-${width}x${height}.png`),animations:'disabled'});
   await page.getByRole('button',{name:'Aumenta quantita',exact:true}).click();
   const stickyButton=bar.getByRole('button',{name:'Aggiungi (2)',exact:true});const stickyBox=await exposed(stickyButton,page);await stickyButton.click();
   const lines=await cart(page);assert.equal(lines.length,1);assert.equal(lines[0].variantId,'gid://shopify/ProductVariant/1001');assert.equal(lines[0].quantity,2);assert.equal(lines[0].price.amount,'29.90');
   await page.getByRole('button',{name:'Carrello, 2 articoli',exact:true}).filter({visible:true}).click();
   const dialog=page.getByRole('dialog');await dialog.waitFor();await dialog.evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished.catch(()=>{}))));await dialog.getByText('Vaso 20 cm',{exact:true}).waitFor();await dialog.getByText(/59,80/).waitFor();
   const checkout=dialog.getByRole('button',{name:'Procedi al Checkout',exact:true});await exposed(checkout,page);await checkout.click();
   await dialog.getByRole('alert').filter({hasText:'Il carrello è stato conservato'}).waitFor();assert.equal(state.checkoutCalls,1);assert.equal(state.lines[0].merchandiseId,'gid://shopify/ProductVariant/1001');assert.equal(state.lines[0].quantity,2);assert.equal((await cart(page))[0].quantity,2);
   // Existing transient error toast can overlap the bottom footer on short screens.
   // Verify the persistent alert, then retry after the toast has automatically disappeared.
   await page.screenshot({path:path.join(output,`carrello-toast-${width}x${height}.png`),animations:'disabled'});
   const toastStart=Date.now();await page.getByText('Errore durante il checkout. Riprova.',{exact:true}).waitFor({state:'hidden'});
   await exposed(checkout,page);await page.screenshot({path:path.join(output,`carrello-${width}x${height}.png`),animations:'disabled'});
   state.checkoutError=false;await checkout.click();await page.waitForURL('https://checkout.example.test/**');assert.equal(state.checkoutCalls,2);assert.equal(state.lines[0].quantity,2);assert.equal(context.pages().length,1);
   const toastWaitMs=Date.now()-toastStart;
   await page.goto(base+'/products/pianta-test-1');await page.getByRole('heading',{name:first.title,exact:true}).waitFor();
   const zoom=page.getByRole('button',{name:'Ingrandisci immagine',exact:true});await zoom.click();await page.getByRole('dialog').waitFor();assert.equal(await bar.count(),0);await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await zoom.evaluate(el=>el===document.activeElement),true);
   await page.goto(base+'/products/pianta-test-3');await page.getByRole('heading',{name:dataset[2].node.title,exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Aggiungi al carrello',exact:true}).isDisabled(),true);assert.equal(await page.getByTestId('sticky-add-to-cart').getByRole('button',{name:'Esaurito',exact:true}).isDisabled(),true);
   assert.equal(context.pages().length,1);const scrollWidth=await page.evaluate(()=>document.documentElement.scrollWidth);assert.ok(scrollWidth<=width+1);
   report.checks.push({name,status:'PASS'});report.measurements.push({width,height,formatBox,stickyBox,selectedVariantId:lines[0].variantId,quantity:2,unitPrice:'29.90 EUR',mockCheckoutCalls:state.checkoutCalls,toastWaitMs,retryCheckout:'same tab, selected variant, quantity 2'});console.log('PASS '+name);
  }catch(error){await page.screenshot({path:path.join(output,`failure-${width}x${height}.png`),animations:'disabled'});report.checks.push({name,status:'FAIL',error:error.message});console.error('FAIL '+name+': '+error.message);}finally{await context.close();}
 }
 assert.deepEqual(report.pageErrors,[]);
}finally{await browser.close();report.summary={passed:report.checks.filter(c=>c.status==='PASS').length,failed:report.checks.filter(c=>c.status==='FAIL').length};await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));if(report.summary.failed||report.pageErrors.length)process.exitCode=1;}
