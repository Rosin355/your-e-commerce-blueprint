import { serializeValueForShopify } from '../../supabase/functions/_shared/admin-v2-field-policy';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitizeEditorialHtml } from '../../supabase/functions/_shared/vendor/editorial-html.mjs';
import { catalogAiAllowed, catalogAllowed } from '../../supabase/functions/_shared/admin-catalog-policy';
import { validateCommand, validateValue } from '../../supabase/functions/_shared/admin-v2-validation';
import { editorKind, normalizeEditorValue } from '../../src/adminv2/lib/fieldValueCodecs';
import type { FieldDefinition } from '../../supabase/functions/_shared/admin-v2-types';
const def=(key='description'):FieldDefinition=>({key,label:key,field_group:'main',editor_type:key==='description'?'richtext':'multiselect',data_type:key==='description'?'text':'json',editable:true,visible:true,manual_only:false,ai_allowed:true,publishable:true,required:false,protected_on_reimport:true,applies_to:'product',sort_order:1,help_text:null,validation_rules:{},review_policy:'manual_review'});
test('rich text safe structure round-trips while scripts, event handlers and dangerous href do not',()=>{
 const safe='<p>Test <strong>verificato</strong> e <em>corsivo</em>.</p><ul><li>Uno</li></ul><p><a href="https://example.test">Fonte</a></p>';
 assert.equal(sanitizeEditorialHtml(safe),safe);assert.equal(validateValue(def(),safe).ok,true);
 for(const bad of ['<script>alert(1)</script>','<p onclick="alert(1)">Test</p>','<a href="javascript:alert(1)">Test</a>','<a href="jav&#x61;script:alert(1)">Test</a>','<svg onload="alert(1)"></svg>']) {
  assert.notEqual(sanitizeEditorialHtml(bad),bad);assert.equal(validateValue(def(),bad).ok,false);
 }
});
for(const key of ['key_benefits','key_features','special_bullets'])test(key+' accepts ordered string lists only under exact field grant',()=>{
 const d=def(key);const ui={key,editorType:d.editor_type,dataType:d.data_type,validationRules:{},required:false};
 assert.equal(editorKind(ui),'string_list');assert.deepEqual(normalizeEditorValue(ui,['Secondo','Primo']),{ok:true,value:['Secondo','Primo']});
 assert.equal(validateCommand('update_field',d,undefined,['Secondo','Primo'],{expectedVersion:0}).ok,true);
 for(const v of [{raw:'json'},[1],[''],Array(51).fill('x')]) assert.equal(validateValue(d,v).ok,false);
 const auth={userId:'synthetic',roles:['editor'] as ['editor'],catalogGrant:{enabled:true,capabilities:['edit'],fieldKeys:[key]}};
 assert.equal(catalogAllowed(auth,'edit',key),true);assert.equal(catalogAllowed({...auth,catalogGrant:{...auth.catalogGrant,fieldKeys:[]}},'edit',key),false);
 assert.equal(catalogAiAllowed(auth,key),false);assert.equal(catalogAiAllowed({...auth,catalogGrant:{...auth.catalogGrant,capabilities:['edit','ai']}},key),true);
 assert.equal(catalogAiAllowed({...auth,roles:['publisher'] as unknown as ['editor']},key),false);
});
test('missing-value RPC migration preserves atomic implementation apart from finite allowlist',()=>{
 const old=readFileSync('supabase/migrations/20261006170000_admin_missing_field_creation.sql','utf8');const next=readFileSync('supabase/migrations/20261116161045_marco_editorial_missing_values.sql','utf8');
 assert.equal(next.split('v_months text[]')[1],old.split('v_months text[]')[1]);
 for(const key of ['key_benefits','key_features','special_bullets','description'])assert.ok(next.includes("'"+key+"'"));
 assert.equal(next,readFileSync('drizzle/migrations/0016_marco_editorial_missing_values.sql','utf8'));
});
test('AI and first-value writes recheck current grants and remote snapshot; no global flag changed',()=>{
 const source=readFileSync('supabase/functions/product-admin-ai/index.ts','utf8');
 assert.match(source,/loadCatalogGrant/);assert.match(source,/catalogAiAllowed\(auth, fieldKey\)/);assert.match(source,/created_by !== auth.userId/);
 const snapshot=readFileSync('supabase/functions/_shared/admin-catalog-approvals.ts','utf8');assert.match(snapshot,/action === "update_field" && !value/);assert.match(snapshot,/p.expectedShopifyHash === hash/);
});

test('sync di una descrizione preesistente non può aggirare il filtro HTML', () => {
  const d={...def(),shopify_mapping:{type:'core',field:'descriptionHtml'}};
  assert.equal(serializeValueForShopify(d,'<p>Testo sicuro</p>'),'<p>Testo sicuro</p>');
  assert.throws(()=>serializeValueForShopify(d,'<p onclick="alert(1)">Testo</p>'),/bloccato/);
});
