import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {products, mockStorefront} from './fixtures.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL=process.env.UX_BASE_URL || 'http://127.0.0.1:8098';
const output=process.env.UX_OUTPUT_DIR || 'docs/customer-experience-implementation-evidence/2026-10-29/accessibility';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={syntheticData:true,checks:[],measurements:[],errors:[]};
async function check(name,run){try{await run();report.checks.push({name,status:'PASS'});console.log('PASS '+name);}catch(e){report.checks.push({name,status:'FAIL',error:e.message});console.error('FAIL '+name+': '+e.message);}}
const dataset=structuredClone(products);
for(const {node} of dataset) node.priceRange.maxVariantPrice={...node.priceRange.minVariantPrice};
const first=dataset[0].node;
first.variants.edges.push({node:{...structuredClone(first.variants.edges[0].node),id:'gid://shopify/ProductVariant/1001',title:'Vaso 20 cm',price:{amount:'29.90',currencyCode:'EUR'},selectedOptions:[{name:'Formato',value:'Vaso 20 cm'}]}});
first.options[0].values.push('Vaso 20 cm');first.priceRange.maxVariantPrice.amount='29.90';
// Multiple formats at the SAME price must not be represented as a price interval.
const equal=dataset[3].node;
equal.variants.edges.push({node:{...structuredClone(equal.variants.edges[0].node),id:'gid://shopify/ProductVariant/1004',title:'Vaso 20 cm',selectedOptions:[{name:'Formato',value:'Vaso 20 cm'}]}});
equal.options[0].values.push('Vaso 20 cm');
dataset[2].node.variants.edges[0].node.availableForSale=false;
async function setup(width=390,extra={}){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 const state={products:dataset,...extra};await mockStorefront(context,state);
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.errors.push(e.message));
 return {page,context,state};
}
async function visit(page,route='/products/pianta-test-1'){await page.goto(baseURL+route);await page.locator('h1').waitFor();}
try{
 for(const width of [320,375,390,430,768,1440]) await check(`Variant keyboard state, 44px targets, gallery geometry and zoom ${width}`,async()=>{
  const {page,context}=await setup(width);let releaseImage;
  const imageGate=new Promise(resolve=>{releaseImage=resolve;});
  await context.route('**/src/assets/categories/rose.jpg',async route=>{await imageGate;await route.continue();});
  try{
   await page.goto(baseURL+'/products/pianta-test-1',{waitUntil:'domcontentloaded'});
   const gallery=page.getByRole('button',{name:'Ingrandisci immagine',exact:true});await gallery.waitFor();
   if(width<1280) for(const control of [page.getByRole('button',{name:'Apri menu',exact:true}),page.getByRole('button',{name:'Apri ricerca',exact:true}),page.getByRole('link',{name:'Area account',exact:true}),page.getByRole('button',{name:'Carrello, 0 articoli',exact:true}).filter({visible:true}),page.getByRole('button',{name:'Apri ricerca prodotti',exact:true})]) {const target=await control.boundingBox();assert.ok(target.width>=44 && target.height>=44,JSON.stringify(target));}
   const before=await gallery.boundingBox();releaseImage();
   await gallery.locator('img').evaluate(img=>img.decode());const after=await gallery.boundingBox();assert.deepEqual(after,before);
   const format=page.getByRole('button',{name:'Vaso 20 cm',exact:true});
   const box=await format.boundingBox();assert.ok(box.width>=44 && box.height>=44);
   await format.focus();await page.keyboard.press('Space');assert.equal(await format.getAttribute('aria-pressed'),'true');
   assert.equal(await page.getByRole('button',{name:'Vaso 14 cm',exact:true}).getAttribute('aria-pressed'),'false');
   const focus=await format.evaluate(el=>({visible:el.matches(':focus-visible'),outline:getComputedStyle(el).outlineWidth}));assert.equal(focus.visible,true);assert.ok(parseFloat(focus.outline)>=2);
   await page.getByRole('status').filter({hasText:'Vaso 20 cm, 29,90'}).waitFor();
   await page.getByRole('button',{name:'Aumenta quantita',exact:true}).click();
   if(width<768){
    const bar=page.getByTestId('sticky-add-to-cart');await bar.getByText('Vaso 20 cm',{exact:true}).waitFor();await bar.getByRole('button',{name:'Aggiungi (2)',exact:true}).click();
    const lines=await page.evaluate(async()=>{const {useCartStore}=await import('/src/stores/cartStore.ts');return useCartStore.getState().items;});assert.equal(lines[0].quantity,2);assert.equal(lines[0].variantId,'gid://shopify/ProductVariant/1001');assert.equal(lines[0].price.amount,'29.90');
   }
   await gallery.click();await page.getByRole('dialog').waitFor();await page.getByRole('dialog').evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished.catch(()=>{}))));const close=await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).boundingBox();assert.ok(close.width>=44 && close.height>=44);assert.equal(await page.getByTestId('sticky-add-to-cart').count(),0);await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await gallery.evaluate(el=>document.activeElement===el),true);
   const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(geometry.scroll<=width+1);
   report.measurements.push({width,galleryBefore:before,galleryAfter:after,variantTarget:box,focus});
  } finally{releaseImage();await context.close();}
 });
 await check('Real range, fixed price and equal-priced multiple formats on catalogue cards',async()=>{
  const {page,context}=await setup();try{
   await visit(page,'/collections/all');await page.locator('article').nth(3).waitFor();
   assert.match(await page.locator('article').nth(0).innerText(),/Da 19,90/);
   assert.doesNotMatch(await page.locator('article').nth(1).innerText(),/Da /);
   assert.doesNotMatch(await page.locator('article').nth(3).innerText(),/Da /);
   assert.equal(await page.locator('select option[value="best"]').count(),0);
   await visit(page,'/products/pianta-test-3');assert.equal(await page.getByRole('button',{name:'Aggiungi al carrello',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Esaurito',exact:true}).isDisabled(),true);
  }finally{await context.close();}
 });
 await check('Checkout error AA contrast on actual background, persistent alert and preserved cart',async()=>{
  const {page,context,state}=await setup(390,{checkoutError:true});try{
   await visit(page);await page.getByRole('button',{name:'Aggiungi al carrello',exact:true}).click();await page.getByRole('button',{name:'Carrello, 1 articoli',exact:true}).filter({visible:true}).click();
   await page.getByRole('button',{name:'Procedi al Checkout',exact:true}).click();const alert=page.getByRole('alert').filter({hasText:'Il carrello è stato conservato'});await alert.waitFor();
   const colors=await alert.evaluate(el=>{
    const color=getComputedStyle(el).color;let bg='';for(let p=el;p;p=p.parentElement){const c=getComputedStyle(p).backgroundColor;if(c!=='rgba(0, 0, 0, 0)'&&c!=='transparent'){bg=c;break;}}return {color,bg};
   });
   const lum=color=>{const channels=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;};
   const a=lum(colors.color),b=lum(colors.bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=4.5,JSON.stringify({colors,ratio}));
   assert.equal(state.checkoutCalls,1);const lines=await page.evaluate(async()=>{const {useCartStore}=await import('/src/stores/cartStore.ts');return useCartStore.getState().items;});assert.equal(lines[0].quantity,1);
   report.measurements.push({checkoutErrorContrast:ratio,...colors});await page.screenshot({path:path.join(output,'checkout-error-390.png'),animations:'disabled'});
  }finally{await context.close();}
 });
 await check('Desktop category disclosure announces current panel and closes with Escape',async()=>{
  const {page,context}=await setup(1440);try{await visit(page,'/');const menu=page.getByRole('navigation',{name:'Categorie principali'}).getByRole('button',{name:'Piante da esterno',exact:true});await menu.focus();assert.equal(await menu.getAttribute('aria-expanded'),'true');await page.getByRole('region',{name:'Piante da esterno',exact:true}).waitFor();await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');assert.equal(await page.getByRole('region',{name:'Piante da esterno',exact:true}).count(),0);}finally{await context.close();}
 });
 await check('No unhandled JavaScript exceptions',async()=>assert.deepEqual(report.errors,[]));
}finally{await browser.close();report.summary={passed:report.checks.filter(c=>c.status==='PASS').length,failed:report.checks.filter(c=>c.status==='FAIL').length};await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));if(report.summary.failed)process.exitCode=1;}
