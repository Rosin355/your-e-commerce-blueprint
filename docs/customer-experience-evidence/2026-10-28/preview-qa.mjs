import fs from 'node:fs/promises';
import {chromium} from '/Users/romesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out='/private/tmp/online-garden-cx-phase7/docs/customer-experience-evidence/2026-10-28';
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={kind:'proposal-only',checks:[],errors:[]};
try {
 const context=await browser.newContext({viewport:{width:1100,height:1100},reducedMotion:'reduce'});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('file:///private/tmp/online-garden-cx-preview-check.html');
 const iframe=page.frameLocator('iframe');
 await iframe.locator('#og-cx-preview').waitFor();
 const frame=page.frames().find(f=>f!==page.mainFrame());
 for(const hostWidth of [1024,390,320]) {
  await page.setViewportSize({width:hostWidth,height:1100});
  for(const device of ['desktop','mobile'])for(const surface of ['home','catalog','pdp']) {
   await iframe.locator('#og-cx-page').selectOption(surface);
   await iframe.locator('#og-cx-device').selectOption(device);
   const result=await frame.evaluate(()=>{const r=document.getElementById('og-cx-preview');const s=r.querySelector('.og-surface');return {viewport:innerWidth,width:document.documentElement.scrollWidth,page:r.querySelector('[data-page]:not([hidden])').dataset.page,device:s.dataset.device,surfaceWidth:s.getBoundingClientRect().width,unresolvedImages:[...s.querySelectorAll('img')].filter(i=>!i.complete||i.naturalWidth===0).length,enabledPurchaseButtons:[...s.querySelectorAll('button')].filter(b=>/^(Aggiungi|Acquista)/.test(b.textContent.trim())&&!b.disabled).length}});
   if(result.width>result.viewport+1||result.page!==surface||result.device!==device||result.enabledPurchaseButtons)throw new Error(JSON.stringify(result));
   report.checks.push({hostWidth,surface,device,...result});
   if(hostWidth===1024) {
    const height=await iframe.locator('#og-cx-preview').evaluate(e=>e.scrollHeight);
    await page.setViewportSize({width:hostWidth,height:Math.ceil(height)+100});
    await iframe.locator('#og-cx-preview').screenshot({path:`${out}/proposta-${surface}-${device}.png`,animations:'disabled'});
   }
  }
 }
 await iframe.locator('#og-cx-page').selectOption('catalog');await iframe.locator('.og-filters').click();
 if(await iframe.locator('.og-filters').getAttribute('aria-expanded')!=='true')throw new Error('Filtri anteprima non espansi');
 await iframe.locator('.og-menu').click();if(await iframe.locator('.og-menu').getAttribute('aria-expanded')!=='true')throw new Error('Menu anteprima non espanso');
 await context.close();
}finally{await browser.close();await fs.writeFile(`${out}/preview-qa.json`,JSON.stringify(report,null,2));}
console.log(JSON.stringify({checks:report.checks.length,errors:report.errors}));
