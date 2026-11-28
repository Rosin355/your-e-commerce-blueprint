// Esercita i bundle realmente prodotti e rilegge il CSV con il parser standard Python.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createMappedHandler} from '../legacy-redirects.mjs';

const registry='docs/seo/recupero-massivo/registro-redirect.csv';
const readRows="import csv,json,sys;print(json.dumps([[r['old_path'],r['new_url'],r['status'],r['qa_pdp']] for r in csv.DictReader(open(sys.argv[1]))]))";
const rows=JSON.parse(execFileSync('python3',['-c',readRows,registry],{maxBuffer:4_000_000}));
assert.equal(new Set(rows.map(r=>r[0])).size,rows.length);
const approved=new Map(rows.filter(r=>r[2]==='APPROVED').map(([path,url,,qa])=>{assert.equal(qa,'PASS');return [path,url];}));
const root=mkdtempSync(join(tmpdir(),'og-lotti-'));
const stages=['pilot','50','250','500','1000','full'];
let previous={}, roundtrips=0, excluded=0, last;
for (const stage of stages) {
  const dir=join(root,stage);
  execFileSync(process.execPath,['infra/seo/build-rollout.mjs',stage,dir]);
  const json=name=>JSON.parse(readFileSync(join(dir,name)));
  const map=json('mapping.json'),cfg=json('wrangler.json');
  assert.equal(cfg.name,'onlinegarden-301-redirects');
  assert.deepEqual(cfg.routes.map(r=>r.pattern),['onlinegarden.it/prodotto/*','www.onlinegarden.it/prodotto/*']);
  assert.equal(Object.keys(map).length,stage==='full'?approved.size:stage==='pilot'?1:Number(stage));
  for(const [path,url] of Object.entries(previous))assert.equal(map[path],url);
  const worker=(await import(pathToFileURL(resolve(dir,'worker.mjs')))).default;
  for(const [path,url] of Object.entries(map)) {
    assert.equal(approved.get(path),url);
    for(const host of ['onlinegarden.it','www.onlinegarden.it'])for(const scheme of ['http','https'])for(const method of ['GET','HEAD']){
      for(const [query,retained] of [['',''],['?attribute_dimensioni=vaso',''],['?utm_source=a&utm_source=b&attribute_dimensioni=s&utm_medium=x&utm_campaign=y&utm_term=z&utm_content=d+e','?utm_source=a&utm_source=b&utm_medium=x&utm_campaign=y&utm_term=z&utm_content=d+e']]){
        const req=new Request(scheme+'://'+host+path+query,{method});
        const res=await worker.fetch(req);
        assert.equal(res.status,301);assert.equal(res.headers.get('Location'),url+retained);
        assert.equal(res.headers.get('Cache-Control'),'no-store');assert.equal(res.body,null); roundtrips++;
      }
    }
  }
  // Un rollback al lotto precedente rimuove le sole aggiunte.
  if(last){
    const previousWorker=createMappedHandler(Object.entries(previous),()=>new Response(null,{status:404}));
    for(const path of Object.keys(map).filter(k=>!Object.hasOwn(previous,k))){
      assert.equal(previousWorker.fetch(new Request('https://onlinegarden.it'+path)).status,404);
    }
  }
  previous=map;last=worker;
}
assert.deepEqual(new Map(Object.entries(previous).sort()),new Map([...approved].sort()));
let original;
const pass=createMappedHandler(Object.entries(previous),req=>{assert.equal(req,original);return new Response(null,{status:404});});
function origin(url,init){
  original=new Request(url,init);
  assert.equal(pass.fetch(original).status,404);excluded++;
}
for(const [path,url,state] of rows){
  if(state!=='APPROVED')for(const host of ['onlinegarden.it','www.onlinegarden.it'])origin('https://'+host+path);
  else {
    origin(url);
    for(const q of ['?add-to-cart=1','?wc-ajax=checkout','?utm_source=t&variant=1','?attribute_pa_size=z','?other=1'])origin('https://onlinegarden.it'+path+q);
  }
}
const pilot='/prodotto/rose/rosa-jasmina-rampicante/';
for(const method of ['PUT','POST','DELETE','PATCH','OPTIONS'])origin('https://onlinegarden.it'+pilot,{method,headers:{'X-QA':'test'},...(method==='OPTIONS'?{}:{body:'test'})});
for(const path of ['/','/collections/all','/products','/auth','/account','/cart','/checkout','/prodotto/controllo-inesistente-301/',pilot.slice(0,-1),pilot+'altro/',pilot.replace('rose','ROSE')])origin('https://onlinegarden.it'+path);
for(const host of ['altro.invalid','onlinegarden.it:8443'])origin('https://'+host+pilot);
const target=approved.get(pilot);
assert.throws(()=>createMappedHandler([[pilot,target],[pilot,target]]));
for(const bad of ['https://altro.invalid/products/rosa',target+'?utm_source=x',target+'#frag','https://onlinegarden.it/checkout'])
  assert.throws(()=>createMappedHandler([[pilot,bad]]));
console.log(JSON.stringify({stage:stages,approved:approved.size,registry:rows.length,redirect_assertions:roundtrips,origin_assertions:excluded,pass:true}));
