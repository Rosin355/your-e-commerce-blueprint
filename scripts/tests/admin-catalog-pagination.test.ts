import test from "node:test";
import assert from "node:assert/strict";
import { listProducts } from "../../supabase/functions/_shared/admin-v2-queries.ts";
import { matchesProductFilters } from "../../supabase/functions/_shared/admin-v2-list-filters.ts";

function fixture(count: number, extraFields = 0) {
  const products = Array.from({length: count}, (_, i) => ({id: String(i), sku: String(i).padStart(5,"0"), entity_type:"simple", parent_product_id:null}));
  const values = products.flatMap((p,i) => [
    {id:p.sku+"-a",product_id:p.id,field_key:"title",value_text:i<60?"Altro":"Rosa"},
    {id:p.sku+"-b",product_id:p.id,field_key:"description",value_text:"Descrizione"},
    {id:p.sku+"-c",product_id:p.id,field_key:"category_effective",value_text:i<60?"Arbusti":"Rose"},
    ...Array.from({length:extraFields},(_,n)=>({id:p.sku+"-x"+n,product_id:p.id,field_key:"extra"+n,value_text:"test"})),
    {id:p.sku+"-z",product_id:p.id,field_key:"review",value_text:"",review_status:"review_required"},
  ]);
  const counters={ranges:0};
  const db={from(table:string) {
    let data=table==="products"?products:values, max=Infinity, start=0, end=Infinity;
    const chain:any={
      select:()=>chain, order:(key:string)=>{data=[...data].sort((a:any,b:any)=>String(a[key]).localeCompare(String(b[key])));return chain;},
      limit:(n:number)=>{max=n;return chain;}, gt:(k:string,v:string)=>{data=data.filter((r:any)=>r[k]>v);return chain;},
      eq:(k:string,v:string)=>{data=data.filter((r:any)=>r[k]===v);return chain;},
      ilike:(_k:string,_v:string)=>chain,
      in:(k:string,ids:string[])=>{data=data.filter((r:any)=>ids.includes(r[k]));return chain;},
      range:(a:number,b:number)=>{counters.ranges++;start=a;end=b+1;return chain;},
      then:(resolve:any)=>Promise.resolve({data:data.slice(start,Math.min(end,start+max)),error:null}).then(resolve),
    }; return chain;
  }};
  return {db,counters};
}
test("category/search filters find products after the first 50, before page boundary",async()=>{
  const {db}=fixture(92);
  const first=await listProducts(db as never,{category:"Rose",search:"Rosa",pageSize:25});
  assert.equal(first.productRows.length,25);
  assert.equal(first.productRows[0].sku,"00060");
  assert.equal(first.nextCursor,"00084");
  const last=await listProducts(db as never,{category:"Rose",search:"Rosa",pageSize:25,cursor:first.nextCursor});
  assert.equal(last.productRows.length,7);
  assert.equal(last.productRows[0].sku,"00085");
  assert.equal(last.nextCursor,null);
});
test("field pages over 500 retain review flags and return only selected product values",async()=>{
  const {db,counters}=fixture(51,12);
  const page=await listProducts(db as never,{reviewRequired:true,pageSize:25});
  assert.ok(counters.ranges>=2);
  assert.equal(page.productRows.length,25);
  assert.equal(new Set(page.currentValues.map(v=>v.product_id)).size,25);
  assert.ok(page.currentValues.some(v=>v.field_key==="review"));
});
test("broad title search is not silently capped to 500 candidate IDs",async()=>{
  const {db}=fixture(1100);
  const page=await listProducts(db as never,{search:"Rosa",cursor:"01000",pageSize:25});
  assert.equal(page.productRows[0].sku,"01001");
  assert.equal(page.productRows.length,25);
});
test("filters combine; effective category wins over raw; sync is not product origin",()=>{
  const values:any[]=[{field_key:"category_effective",value_text:"Rose"},{field_key:"product_category_raw",value_text:"Arbusti"},
    {field_key:"title",value_text:"Rosa"},{field_key:"description",value_text:"Test"},
    {field_key:"shopify_sync_status",value_text:"pending"},{field_key:"review",review_status:"review_required",publish_blocked:true}];
  assert.equal(matchesProductFilters({sku:"OG_1"},values,{category:"arbusti"}),false);
  assert.equal(matchesProductFilters({sku:"OG_1"},values,{category:"rose",completeness:"complete",origin:"shopify",reviewRequired:true,publishBlocked:true}),true);
  assert.equal(matchesProductFilters({sku:"OG_1"},values,{origin:"import"}),false);
  assert.equal(matchesProductFilters({sku:"OG_1"},values,{needsClassification:true}),false);
  assert.equal(matchesProductFilters({sku:"OG_1"},[],{needsClassification:true,completeness:"incomplete"}),true);
});
