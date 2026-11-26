import { test, expect } from '@playwright/test';

test('AI sections remain proposals; retry replaces rendered content and clears excluded sections',async({page})=>{
 const mutations:string[]=[];let generations=0;
 await page.addInitScript(()=>{
  localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:'synthetic-token',refresh_token:'synthetic-refresh',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'synthetic-editor',aud:'authenticated'}}));
 });
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='127.0.0.1') return route.abort();
  if(url.pathname.startsWith('/rest/v1/'))return route.fulfill({json:[]});
  if(!url.pathname.startsWith('/functions/v1/'))return route.continue();
  const body=route.request().postDataJSON();
  const reply=(value:object)=>route.fulfill({json:{ok:true,...value}});
  switch(body.action){
   case 'get_admin_context':return reply({roles:['editor'],canWrite:true,canUseAi:true,ordinaryCatalog:true,supportsCatalogSourceAndProductType:true,supportsDistinctDescriptions:true,editableFieldKeys:['description'],canPublish:false});
   case 'catalog_categories':return reply({categories:[],canAuthorDraft:true,canSaveDraft:true,canSendDraft:false});
   case 'list_editorial_collections':return reply({collections:[]});
   case 'list_catalog_media':return reply({media:[]});
   case 'get_field_definitions':return reply({definitions:[{key:'description',label:'Descrizione',editor_type:'richtext',data_type:'text',visible:true,editable:true,ai_allowed:true,manual_only:false,validation_rules:{}}]});
   case 'suggest_confirmed_field':
    generations++;
    return reply({source:'model',value:generations===1?'<p>Arbusto con foglie <strong>verdi</strong>.</p><h2>Caratteristiche principali</h2><ul><li>Fogliame verde</li></ul>':'<p>Seconda proposta con fogliame <strong>verde</strong>.</p>',descriptionIssues:generations===1?[{section:'Coltivazione',code:'UNSUPPORTED_FACT',message:'Irrigazione esclusa: non confermata.'}]:[],missingInformation:[]});
   default:mutations.push(body.action);return route.abort();
  }
 });
 await page.goto('/admin/products/new');
 await page.getByLabel('Nome prodotto (obbligatorio)').fill('Arbusto sintetico');
 const panel=page.getByRole('region',{name:'Assistenza AI nuova scheda'});
 await panel.getByRole('textbox',{name:'Informazioni verificate'}).fill('Arbusto sempreverde con foglie verdi.');
 await panel.getByRole('checkbox',{name:/Confermo il nome/}).check();
 await panel.getByRole('button',{name:'Completa scheda con AI'}).click();
 await expect(panel.getByRole('alert')).toContainText('Irrigazione esclusa');
 await expect(panel.locator('.tiptap strong')).toHaveText('verdi');
 await expect(page.getByRole('textbox',{name:'Descrizione verificata',exact:true})).toHaveText('');
 await panel.getByRole('button',{name:'Riprova la descrizione'}).click();
 await expect(panel.locator('.tiptap')).toContainText('Seconda proposta');
 await expect(panel.getByRole('alert')).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});
 await panel.getByRole('group',{name:'Descrizione estesa',exact:true}).screenshot({path:'/tmp/browser/ai-editor/mobile_retry.png'});
 await panel.getByRole('button',{name:'Scarta anteprima'}).click();
 await expect(panel.getByRole('heading',{name:'Proposte AI per questo prodotto'})).toHaveCount(0);
 expect(mutations).toEqual([]);expect(generations).toBe(2);
});
