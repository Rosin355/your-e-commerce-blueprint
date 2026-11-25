import { strict as assert } from 'node:assert';
import { resolveShopifyTarget, type ShopifyFieldTarget } from '../../supabase/functions/_shared/admin-v2-field-policy.ts';
import { performVerifiedShopifyFieldWrite, type ShopifyGraphQL } from '../../supabase/functions/_shared/admin-v2-shopify-field-sync.ts';
import { verifyFamilyMembers } from '../../supabase/functions/_shared/admin-catalog-identity.ts';
import { isTechnicalProduct } from '../../supabase/functions/_shared/admin-operational-core.ts';
import { projectDraft } from '../../supabase/functions/_shared/admin-draft-view.ts';

Deno.test('due testi persistenti e un solo target per ognuno, comprese le bozze storiche', () => {
  const map=(key:string,shopify_mapping:object) => resolveShopifyTarget({key,shopify_mapping,publishable:true} as never);
  const short={type:'metafield',namespace:'custom',key:'short_intro'};
  assert.equal(map('short_intro',short),null);
  assert.equal(map('optimized_description',{type:'core',field:'descriptionHtml'}),null);
  assert.equal(map('short_description',{}) ,null);
  assert.equal(map('description',{type:'core',field:'descriptionHtml'})?.kind,'product');
  assert.equal(map('short_description',short)?.kind,'metafield');
  const draft = {description:'Estesa',shortDescription:'Breve'};
  assert.equal(projectDraft(draft,new Map()).description,'Estesa');
  assert.equal(projectDraft(draft,new Map()).shortDescription,'Breve');
  assert.equal(projectDraft({description:'Storica'},new Map()).shortDescription,null);
});
Deno.test('la sintesi usa il digest approvato e rilegge lo stesso metafield accessibile', async () => {
  const id='gid://shopify/Product/123';
  const target:ShopifyFieldTarget={kind:'metafield',namespace:'custom',key:'short_intro',valueType:'multi_line_text_field'};
  let value='Prima', reads=0, writes=0;
  const graphql:ShopifyGraphQL=async <T>(q:string, vars?:Record<string,unknown>) => {
    if (q.includes('query AdminShortIntro')) {
      reads++;
      return {metafieldDefinitions:{nodes:[{namespace:'custom',key:'short_intro',type:{name:target.valueType},access:{storefront:'PUBLIC_READ'}}]},
        product:{id,metafield:{namespace:'custom',key:'short_intro',type:target.valueType,value,compareDigest:'hash'}}} as T;
    }
    assert.match(q,/metafieldsSet/); const fields=vars!.metafields as {compareDigest:string;key:string;value:string}[];
    assert.equal(fields.length,1); assert.equal(fields[0].compareDigest,'hash'); assert.equal(fields[0].key,'short_intro');
    writes++; value=fields[0].value; return {metafieldsSet:{userErrors:[]}} as T;
  };
  const input={productId:id,sku:'SKU',target,expected:'Dopo',previousVerifiedAt:null,previousVerifiedValue:null,hasExpectedRemote:true,expectedRemote:'Prima',graphql};
  assert.equal((await performVerifiedShopifyFieldWrite(input)).verifiedValue,'Dopo');
  assert.equal(reads,2); assert.equal(writes,1);
  await assert.rejects(performVerifiedShopifyFieldWrite({...input,expected:'Terzo'}));
  assert.equal(writes,1);
});
Deno.test('duplicati, ID divergenti, SKU mancanti e bozza PR73 rinominata',()=>{
  const one={sku:'A',product:{id:'P'}};
  verifyFamilyMembers(['A'],'P',[one]);
  for(const rows of [[],[one,one],[{...one,product:{id:'Q'}}]]) assert.throws(()=>verifyFamilyMembers(['A'],'P',rows));
  assert.equal(isTechnicalProduct(['OG-NP-1'],'Titolo rivisto','34627bea-a92c-40de-b34c-ad340c00f456'),true);
});
