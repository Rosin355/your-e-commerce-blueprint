// Production builds only. Synthetic API transport; never a Shopify performance SLA.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {makeProduct,mockStorefront} from './fixtures.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const output=process.env.UX_OUTPUT_DIR || '/tmp/online-garden-main-compare';await fs.mkdir(output,{recursive:true});
const builds={main:process.env.MAIN_BASE_URL || 'http://127.0.0.1:4176',source:process.env.SOURCE_BASE_URL || 'http://127.0.0.1:4178',integrated:process.env.UX_BASE_URL || 'http://127.0.0.1:4177'};
const report={synthetic:true,browser:browser.version(),transportDelayMs:20,repetitions:3,runs:[]};
try{
 for(const total of [1205,10000]){
  const products=Array.from({length:total},(_,i)=>{
   const p=makeProduct(i+1,{description:'Descrizione sintetica controllata, non botanica né commerciale. '.repeat(16)});
   p.node.images.edges=Array.from({length:5},(_,n)=>({node:{url:`https://images.example.test/${i}/${n}.jpg`,altText:'Fixture sintetica'}}));
   p.node.variants.edges=Array.from({length:10},(_,n)=>({node:{...p.node.variants.edges[0].node,id:`gid://shopify/ProductVariant/${i*10+n}`}}));
   return p;
  });
  for(let repetition=0;repetition<3;repetition++){
   const order=repetition%2 ? ['integrated','source','main'] : ['main','source','integrated'];
   for(const name of order){
    const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    const state={products,catalogPageDelay:20};await mockStorefront(context,state);
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const bodies=[];
    page.on('response',response=>{if(response.request().postData()?.includes('GetProductsPage'))bodies.push(response.body());});
    const start=performance.now();await page.goto(builds[name]+'/collections/all');
    await page.locator('article').first().waitFor({timeout:60000});
    const firstCardDomMs=performance.now()-start;
    const returned=name==='main' ? 1000 : total;
    await page.getByText(`9-di-${returned} prodotti`,{exact:true}).waitFor();
    const data=await Promise.all(bodies);assert.deepEqual(errors,[]);
    const run={build:name,total,returned,repetition,requests:state.requests.filter(r=>r.query.includes('GetProductsPage')).length,jsonBytes:data.reduce((n,b)=>n+b.length,0),gzipEstimateBytes:data.reduce((n,b)=>n+gzipSync(b).length,0),firstCardDomMs:Math.round(firstCardDomMs)};
    report.runs.push(run);console.log(JSON.stringify(run));await context.close();
   }
  }
 }
}finally{await browser.close();await fs.writeFile(output+'/compare-main.json',JSON.stringify(report,null,2));}
