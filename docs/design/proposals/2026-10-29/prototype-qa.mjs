import fs from 'node:fs/promises';
import {chromium} from '/Users/romesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out='/private/tmp/online-garden-customer-experience-implementation/docs/design/proposals/2026-10-29';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={scope:'visual prototype only; no React implementation',checks:[],pageErrors:[],networkRequests:[]};
try{
 const context=await browser.newContext({viewport:{width:1440,height:1200},reducedMotion:'reduce'});
 const page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push(e.message));
 page.on('request',r=>{if(/^https?:/.test(r.url()))report.networkRequests.push(r.url());});
 await page.goto('file:///private/tmp/online-garden-v8-preview-check.html');
 await page.addStyleTag({content:'body{padding:0!important}iframe{width:100%;height:100vh;margin:0}'});
 const iframe=page.frameLocator('iframe');await iframe.locator('#og-v8').waitFor();const frame=page.frames().find(f=>f!==page.mainFrame());
 for(const device of ['desktop','mobile'])for(const name of ['home','catalog','pdp']){
  const width=device==='desktop'?1440:390;
  await page.setViewportSize({width,height:1200});
  await iframe.locator('#og-v8-device').selectOption(device);await iframe.locator('#og-v8-page').selectOption(name);await iframe.locator('#og-v8-view').selectOption('proposal');
  await frame.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.og-design img')].map(i=>i.decode().catch(()=>{})));});
  const h=await iframe.locator('.og-design').evaluate(e=>e.scrollHeight);
  await page.setViewportSize({width,height:Math.max(1200,Math.ceil(h)+250)});
  const box=await iframe.locator('.og-design').boundingBox();
  if(Math.round(box.width)!==width)throw new Error('Canvas width: '+JSON.stringify(box));
  await iframe.locator('.og-design').screenshot({path:`${out}/proposta-${name}-${device}.png`,animations:'disabled'});
  await page.screenshot({path:`${out}/confronto-proposta-${name}-${device}.png`,clip:{x:box.x,y:box.y,width:box.width,height:900},animations:'disabled'});
  report.checks.push({name:'capture',page:name,device,viewportWidth:width,comparisonHeight:900,fullHeight:h});
 }
 for(const width of [320,375,390,430,768,1440])for(const name of ['home','catalog','pdp']){
  await page.setViewportSize({width,height:1200});await iframe.locator('#og-v8-page').selectOption(name);await iframe.locator('#og-v8-device').selectOption(width<768?'mobile':'desktop');
  const metrics=await frame.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,designWidth:document.querySelector('.og-design').getBoundingClientRect().width,enabledPurchase:[...document.querySelectorAll('.og-design button')].filter(b=>/^(Aggiungi|Acquista)/.test(b.textContent.trim())&&!b.disabled).length,pointerTargets:[...document.querySelectorAll('.og-design .og-icon,.og-design .og-quantity button,.og-design .og-options label')].map(e=>{const b=e.getBoundingClientRect();return {width:b.width,height:b.height};}).filter(b=>b.width>0&&b.height>0)}));
  if(metrics.scrollWidth>metrics.viewport+1||metrics.enabledPurchase||metrics.pointerTargets.some(t=>t.width<43.9||t.height<43.9))throw new Error(JSON.stringify({width,name,...metrics}));
  report.checks.push({name:'responsive',page:name,width,...metrics});
 }
 await page.setViewportSize({width:390,height:1200});await iframe.locator('#og-v8-page').selectOption('pdp');await iframe.locator('#og-v8-device').selectOption('mobile');
 await iframe.getByRole('radio',{name:'Formato B',exact:true}).check();if(await iframe.locator('#og-selected-format').textContent()!=='Formato B')throw new Error('Riepilogo variante non aggiornato');
 await iframe.getByRole('button',{name:'Aumenta quantità dimostrativa',exact:true}).click();if(await iframe.locator('#og-demo-quantity').textContent()!=='2')throw new Error('Quantità non aggiornata');
 await iframe.getByRole('button',{name:'Riduci quantità dimostrativa',exact:true}).click();
 await iframe.getByRole('radio',{name:'Formato A',exact:true}).check();await iframe.getByRole('radio',{name:'Formato A',exact:true}).focus();await page.keyboard.press('ArrowRight');if(!await iframe.getByRole('radio',{name:'Formato B',exact:true}).isChecked())throw new Error('Radio tastiera');
 report.checks.push({name:'local-interaction',variantSummary:true,quantityMinimum:true,radioKeyboard:true});
 await iframe.locator('#og-v8-page').selectOption('catalog');await iframe.getByRole('button',{name:'Disponibilità',exact:true}).click();if(await iframe.locator('[data-filter=availability]').getAttribute('aria-expanded')!=='true')throw new Error('Pill filter');await iframe.getByRole('button',{name:'Chiudi filtro',exact:true}).click();
 await iframe.getByRole('button',{name:'Apri categorie',exact:true}).click();if(await iframe.locator('.og-menu').getAttribute('aria-expanded')!=='true')throw new Error('Menu');
 report.checks.push({name:'local-interaction',pillDisclosure:true,mobileMenu:true});
 const hasComparisons=await frame.evaluate(()=>Object.keys(JSON.parse(document.getElementById('og-v8-images').textContent)).some(k=>k.startsWith('after_')));
 if(hasComparisons){for(const device of ['desktop','mobile'])for(const name of ['home','catalog','pdp']){await iframe.locator('#og-v8-device').selectOption(device);await iframe.locator('#og-v8-page').selectOption(name);await iframe.locator('#og-v8-view').selectOption('comparison');const images=await iframe.locator('.og-compare img').evaluateAll(async es=>{await Promise.all(es.map(i=>i.decode()));return es.map(i=>({width:i.naturalWidth,height:i.naturalHeight}));});if(images.some(i=>!i.width))throw new Error('Comparison image');report.checks.push({name:'comparison',page:name,device,images});}}
 await context.close();
}finally{await browser.close();await fs.writeFile(`${out}/prototype-qa.json`,JSON.stringify(report,null,2));}
const allowedRendererAssets=['https://unpkg.com/@floating-ui/core@1.7.3/dist/floating-ui.core.umd.min.js','https://unpkg.com/@floating-ui/dom@1.7.4/dist/floating-ui.dom.umd.min.js','https://unpkg.com/lucide@1.17.0/dist/umd/lucide.js'];
report.staticAssetsFromPreviewRenderer=report.networkRequests.filter(url=>allowedRendererAssets.includes(url));
report.unexpectedNetworkRequests=report.networkRequests.filter(url=>!allowedRendererAssets.includes(url));
await fs.writeFile(`${out}/prototype-qa.json`,JSON.stringify(report,null,2));
if(report.pageErrors.length||report.unexpectedNetworkRequests.length)throw new Error(JSON.stringify(report));
console.log(JSON.stringify({checks:report.checks.length,pageErrors:report.pageErrors,unexpectedNetworkRequests:report.unexpectedNetworkRequests,rendererStaticAssets:report.staticAssetsFromPreviewRenderer.length}));
