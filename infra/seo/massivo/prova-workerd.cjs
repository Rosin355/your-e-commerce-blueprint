// Esegue l'artefatto di un lotto nel runtime locale di Workers con origine chiusa.
const {Miniflare}=require('miniflare');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const assert=require('node:assert/strict');
const dir=process.argv[2];
const read=name=>JSON.parse(readFileSync(join(dir,name)));
(async()=>{
  const cfg=read('wrangler.json'),map=read('mapping.json');
  const mf=new Miniflare({host:'127.0.0.1',cf:false,logRequests:false,workers:[{
    config:{name:cfg.name,compatibilityDate:cfg.compatibility_date,
    manifest:{mainModule:cfg.main,modules:{[cfg.main]:{type:'esm',contents:readFileSync(join(dir,cfg.main),'utf8')}}}},
    dev:{outboundService:{type:'fetcher',handler:()=>new Response(null,{status:404})}}
  }]});
  let calls=0;
  try {
    for(const [path,target] of Object.entries(map)){
      for(const [host,method] of [['onlinegarden.it','GET'],['www.onlinegarden.it','HEAD']]){
        const res=await mf.dispatchFetch('https://'+host+path+'?utm_source=qa&attribute_dimensioni=s',{method,redirect:'manual'});
        assert.equal(res.status,301);assert.equal(res.headers.get('Location'),target+'?utm_source=qa');
        assert.equal(res.headers.get('Cache-Control'),'no-store');calls++;
      }
    }
    for(const path of ['/prodotto/controllo-inesistente-301/','/checkout','/','/auth']){
      const res=await mf.dispatchFetch('https://onlinegarden.it'+path,{redirect:'manual'});assert.equal(res.status,404);calls++;
    }
    console.log(JSON.stringify({runtime:'workerd',stage:read('lotto.json').stage,requests:calls,pass:true}));
  }finally{await mf.dispose();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
