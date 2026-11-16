import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogAllowed, catalogAiAllowed, requireCatalog, EDITORIAL_AI_FIELDS, EDITORIAL_LIST_FIELDS } from '../../supabase/functions/_shared/admin-catalog-policy.ts';
import { authorizeConfirmedAi } from '../../supabase/functions/_shared/admin-ai-confirmed.ts';
import { serializeField } from '../../supabase/functions/product-admin-api/serializers.ts';
import type { AuthContext, FieldDefinition } from '../../supabase/functions/_shared/admin-v2-types.ts';
const originalFields=['title','description','optimized_description','short_description','seo_title','seo_description','faq'];
const fields=[...originalFields,...EDITORIAL_LIST_FIELDS];
const auth:AuthContext={userId:'synthetic',roles:['editor'],catalogGrant:{enabled:true,capabilities:['edit','sync','drafts','images','categories','prices','publish','ai'],fieldKeys:fields}};
const definition=(key:string):FieldDefinition=>({key,label:key,editor_type:EDITORIAL_LIST_FIELDS.some(k=>k===key)?'multiselect':'textarea',data_type:EDITORIAL_LIST_FIELDS.some(k=>k===key)?'json':'text',field_group:'main',visible:true,editable:true,manual_only:false,ai_allowed:true,publishable:true,required:false,protected_on_reimport:true,applies_to:'product',sort_order:1,help_text:null,validation_rules:{},review_policy:'manual_review',shopify_mapping:{type:'metafield',namespace:'custom',key}});
const context={roles:auth.roles,writesEnabled:true,writeMode:'full' as const,aiEnabled:true,aiFieldKeys:EDITORIAL_AI_FIELDS,syncAllowed:true,syncFieldKeys:fields.filter(key=>catalogAllowed(auth,'sync',key)),scopedFieldKeys:fields,scopedActions:['update_field','sync_field']};
for(const key of EDITORIAL_AI_FIELDS)test('AI editoriale consentita con grant completo: '+key,()=>{
 assert.equal(catalogAiAllowed(auth,key),true);authorizeConfirmedAi(auth,definition(key),'suggest_confirmed_field');
 assert.equal(serializeField(definition(key),undefined,'simple',context).capabilities.canSuggestAi,true);
 for(const change of [{enabled:false},{capabilities:['ai']},{capabilities:['edit']},{fieldKeys:[]}]){
  const denied={...auth,catalogGrant:{...auth.catalogGrant!,...change}};
  assert.equal(catalogAiAllowed(denied,key),false);assert.throws(()=>authorizeConfirmedAi(denied,definition(key),'suggest_confirmed_field'));
 }
 for(const change of [{ai_allowed:false},{manual_only:true},{editable:false},{visible:false}])assert.throws(()=>authorizeConfirmedAi(auth,{...definition(key),...change},'suggest_confirmed_field'));
});
for(const key of ['title','seo_title','seo_description','faq','price','sku','inventory','nome_botanico'])test('AI negata anche aggiungendo il campo al grant: '+key,()=>{
 const expanded={...auth,catalogGrant:{...auth.catalogGrant!,fieldKeys:[...fields,key]}};
 assert.equal(catalogAiAllowed(expanded,key),false);assert.throws(()=>authorizeConfirmedAi(expanded,definition(key),'suggest_confirmed_field'));
 const view=serializeField(definition(key),undefined,'simple',{...context,scopedFieldKeys:[...fields,key]});
 assert.equal(view.capabilities.canSuggestAi,false);assert.equal(view.capabilities.aiAllowed,false);
});
for(const key of EDITORIAL_LIST_FIELDS)test('aggiunta elenco conserva gate capability sync separato: '+key,()=>{
 assert.equal(catalogAllowed(auth,'edit',key),true);assert.equal(catalogAllowed(auth,'sync',key),true);
 assert.throws(()=>requireCatalog({...auth,catalogGrant:{...auth.catalogGrant!,capabilities:['edit','ai']}},'sync',key));
 const view=serializeField(definition(key),undefined,'simple',context);
 assert.equal(view.capabilities.canUpdate,true);assert.equal(view.shopifySyncAllowed,true);
});
test('permessi preesistenti e altri operatori non acquisiscono privilegi',()=>{
 const before=structuredClone(auth);
 for(const key of originalFields){assert.equal(catalogAllowed(auth,'edit',key),true);assert.equal(catalogAllowed(auth,'sync',key),true);}
 for(const capability of ['drafts','images','categories','prices','publish'])assert.equal(catalogAllowed(auth,capability),true);
 for(const other of [{...auth,catalogGrant:undefined},{...auth,roles:['publisher'] as ['publisher']},{...auth,catalogGrant:{...auth.catalogGrant!,capabilities:['edit','sync'],fieldKeys:originalFields}}]){
  for(const key of EDITORIAL_LIST_FIELDS){assert.equal(catalogAllowed(other,'edit',key),false);assert.equal(catalogAllowed(other,'sync',key),false);assert.equal(catalogAiAllowed(other,key),false);}
 }
 assert.deepEqual(auth,before);
});
test('sync UI precedente resta disponibile e gate globali non vengono scavalcati',()=>{
 assert.equal(serializeField(definition('description'),undefined,'simple',context).shopifySyncAllowed,true);
 assert.equal(serializeField(definition('description'),undefined,'simple',{...context,syncAllowed:false}).shopifySyncAllowed,false);
 assert.equal(serializeField(definition('description'),undefined,'simple',{...context,scopedActions:['update_field']}).shopifySyncAllowed,false);
});
test('prepare ed execution approval ricontrollano policy prima di DB/replay/dispatch',()=>{
 const source=readFileSync('supabase/functions/_shared/admin-catalog-approvals.ts','utf8');
 const prepare=source.slice(source.indexOf('export async function prepareCatalogApproval'));
 assert.ok(prepare.indexOf('demandCommand(auth, command)')<prepare.indexOf('db.from('));
 const execute=source.slice(source.indexOf('export async function withCatalogApproval'));
 assert.ok(execute.indexOf('demandCommand(auth, command)')<execute.indexOf('approval.state === "COMPLETE"'));
 assert.match(source,/requireCatalog\(/);
 const ai=readFileSync('supabase/functions/product-admin-ai/index.ts','utf8');
 assert.match(ai,/catalogAiAllowed\(auth, fieldKey\)/);assert.match(ai,/filter\(s => catalogAiAllowed\(auth, s.fieldKey\)\)/);
});
