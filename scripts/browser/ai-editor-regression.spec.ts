import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { EditorialSection } from '../../supabase/functions/_shared/admin-ai-sections';

async function simulate(page:Page,generation:(body:Record<string,unknown>)=>object) {
 const mutations:string[]=[];
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
    return reply(generation(body));
   default:mutations.push(body.action);return route.abort();
  }
 });

 return mutations;
}

test('AI sections remain proposals; retry replaces rendered content and clears excluded sections',async({page})=>{
 let generations=0;
 const mutations=await simulate(page,()=>{generations++; return {source:'model',value:generations===1?'<p>Arbusto con foglie <strong>verdi</strong>.</p><h2>Caratteristiche principali</h2><ul><li>Fogliame verde</li></ul>':'<p>Seconda proposta con fogliame <strong>verde</strong>.</p>',descriptionIssues:generations===1?[{section:'Coltivazione',code:'UNSUPPORTED_FACT',message:'Irrigazione esclusa: non confermata.'}]:[],missingInformation:[]};});
 await page.goto('/admin/products/new');
 await page.getByLabel('Nome prodotto (obbligatorio)').fill('Arbusto sintetico');
 const panel=page.getByRole('region',{name:'Assistenza AI nuova scheda'});
 await panel.getByRole('textbox',{name:'Informazioni verificate'}).fill('Arbusto sempreverde con foglie verdi.');
 await panel.getByRole('checkbox',{name:/Confermo il nome/}).check();
 await panel.getByRole('button',{name:'Completa scheda con AI'}).click();
 await panel.getByText(/Verifica editoriale/).click();
 await expect(panel.getByText(/Irrigazione esclusa/)).toBeVisible();
 await expect(panel.getByRole('alert')).toHaveCount(0);
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

test('Yucca: modifica, approvazione, rifiuto e rigenerazione isolata con recovery',async({page})=>{
 const fixture = (name:string)=>readFileSync(new URL('../tests/fixtures/'+name,import.meta.url),'utf8');
 const source=fixture('yucca-filamentosa-uat-20261127.txt');
 const sections:EditorialSection[]=JSON.parse(fixture('yucca-filamentosa-proposta.json')).sections;
 const requests:Record<string,unknown>[]=[];
 const mutations=await simulate(page,body=>{
   requests.push(body);
   if (!body.section) return {source:'model',value:'<p>Anteprima</p>',sections,descriptionIssues:[],missingInformation:[]};
   if (requests.length===2) return {source:'model',value:'<p>Risposta incompatibile</p>',sections:[],descriptionIssues:[]};
   const flower=sections.find(s=>s.heading==='Fioritura')!;
   return {source:'model',value:'<p>Fioritura rivista</p>',sections:[{...flower,text:'A giugno e luglio compaiono i fiori penduli color crema.'}],descriptionIssues:[]};
 });
 await page.goto('/admin/products/new');
 await page.getByLabel('Nome prodotto (obbligatorio)').fill('Yucca filamentosa');
 const panel=page.getByRole('region',{name:'Assistenza AI nuova scheda'});
 await panel.getByLabel('Informazioni verificate',{exact:true}).fill(source);
 await panel.getByRole('checkbox',{name:/Confermo il nome/}).check();
 await panel.getByRole('button',{name:'Completa scheda con AI'}).click();
 const row=(name:string)=>panel.getByRole('group',{name,exact:true});
 const intro=row('Introduzione'),leaf=row('Fogliame e caratteristiche distintive'),flower=row('Fioritura');
 await intro.getByRole('button',{name:'Accetta sezione'}).click();
 await expect(intro.getByRole('textbox')).toBeDisabled();
 await leaf.getByRole('textbox').fill('Testo manuale sulle foglie.');
 await flower.getByRole('textbox').fill('Nota manuale sui fiori crema.');
 await flower.getByRole('button',{name:'Rigenera Fioritura'}).click(); // dialog dismissed: keep edit
 expect(requests.length).toBe(1);
 page.once('dialog',d=>d.accept());
 await flower.getByRole('button',{name:'Rigenera Fioritura'}).click();
 await expect(panel.getByText(/Sezione o lunghezza non valida/)).toBeVisible();
 await expect(flower.getByRole('textbox')).toHaveValue('Nota manuale sui fiori crema.');
 page.once('dialog',d=>d.accept());
 await flower.getByRole('button',{name:'Rigenera Fioritura'}).click();
 await expect(flower.getByRole('textbox')).toHaveValue(/A giugno e luglio/);
 await expect(leaf.getByRole('textbox')).toHaveValue('Testo manuale sulle foglie.');
 await expect(intro.getByRole('textbox')).toHaveValue(sections[0].text);
 await row('Descrizione botanica').getByRole('button',{name:'Rifiuta sezione'}).click();
 await expect(panel.getByRole('button',{name:'Accetta Descrizione estesa'})).toBeDisabled();
 await expect(page.getByRole('textbox',{name:'Descrizione verificata',exact:true})).toHaveText('');
 expect(requests.slice(1).every(r=>r.section==='Fioritura' && !('draftTitle' in r))).toBe(true);
 expect(mutations).toEqual([]);
});
