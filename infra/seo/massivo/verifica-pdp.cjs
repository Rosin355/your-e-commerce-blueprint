// Uso: node verifica-pdp.cjs candidati.json ricevuta.jsonl [concorrenza]
// I candidati provengono dal catalogo Shopify Admin in sola lettura.
const fs = require('node:fs');
const { chromium } = require('playwright');
const [input, output, workers = '4', stageMap] = process.argv.slice(2);
const fromReceipt = input?.endsWith('.jsonl.gz');
let jobs = fromReceipt ? require('node:zlib').gunzipSync(fs.readFileSync(input)).toString().trim().split('\n').map(line => {
  const p=JSON.parse(line);
  return {id:p.gid,handle:new URL(p.url).pathname.slice('/products/'.length),title:p.title};
}) : JSON.parse(fs.readFileSync(input, 'utf8'));
if(stageMap) {
  const targets=new Set(Object.values(JSON.parse(fs.readFileSync(stageMap,'utf8'))));
  jobs=jobs.filter(p=>targets.has('https://onlinegarden.it/products/'+p.handle));
  if(jobs.length!==targets.size) throw Error('Destinazione del lotto assente nelle ricevute');
}
if (!Array.isArray(jobs) || !jobs.length || jobs.some(p => !p.id || !p.title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.handle)) ||
    new Set(jobs.map(p => p.id)).size !== jobs.length || !/^[1-4]$/.test(workers)) throw Error('Input PDP non valido');
const fd = fs.openSync(output, 'wx', 0o600);
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  let cursor = 0, passed = 0, finished = 0;
  async function scan() {
    const context = await browser.newContext();
    await context.route('**/*',route => {
      const req = route.request(), url = new URL(req.url());
      const graph = req.method() === 'POST' && url.pathname.endsWith('/graphql.json') && !/mutation/i.test(req.postData() || '');
      if ((!['GET','HEAD','OPTIONS'].includes(req.method()) && !graph) || ['image','media','font'].includes(req.resourceType()) ||
          /analytics|facebook\.com|doubleclick/.test(url.hostname)) return route.abort();
      return route.continue();
    });
    while (cursor < jobs.length) {
      const product = jobs[cursor++], url = 'https://onlinegarden.it/products/' + product.handle;
      const p = await context.newPage();
      const row = {gid:product.id,url,title:product.title,checked_utc:new Date().toISOString(),pass:false};
      try {
        const response = await p.goto(url,{waitUntil:'domcontentloaded',timeout:22000});
        row.http = response.status();
        row.hop = !!response.request().redirectedFrom();
        row.xrobots = response.headers()['x-robots-tag'] || '';
        if (row.http !== 200 || row.hop) throw Error('HTTP_OR_REDIRECT');
        await p.waitForFunction(() => Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
          .some(s=>/"Product"/.test(s.textContent)),undefined,{timeout:11000});
        Object.assign(row,await p.evaluate(() => {
          const graphs = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
            .flatMap(s => {const v=JSON.parse(s.textContent);return Array.isArray(v)?v:(v['@graph']||[v]);});
          const robots = Array.from(document.querySelectorAll('meta[name]'))
            .filter(e=>['robots','googlebot'].includes(e.name.toLowerCase())).map(e=>e.content);
          return {canonical:Array.from(document.querySelectorAll('link[rel="canonical"]'),e=>e.href),
            h1:Array.from(document.querySelectorAll('h1'),e=>e.textContent.trim()),
            product:graphs.filter(x=>x['@type']==='Product').map(x=>x.name),robots};
        }));
        row.final = p.url();
        row.pass = row.final === url && row.canonical.length === 1 && row.canonical[0] === url &&
          row.h1.length === 1 && row.h1[0] === product.title && row.product.length === 1 && row.product[0] === product.title &&
          !/\b(?:noindex|none)\b/i.test([row.xrobots,...row.robots].join(','));
      } catch(e) { row.error = e.name === 'TimeoutError' ? 'TIMEOUT' : 'HTTP_OR_PAGE_ERROR'; }
      finally { await p.close(); }
      fs.writeSync(fd,JSON.stringify(row)+'\n'); finished++; if(row.pass)passed++;
      if(finished%100===0)console.log(finished+'/'+jobs.length,passed+' PASS');
    }
    await context.close();
  }
  try { await Promise.all(Array.from({length:Number(workers)},scan)); }
  finally { await browser.close();fs.closeSync(fd); }
  console.log(finished+' ricevute, '+passed+' PASS');
  if(passed!==jobs.length)process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
