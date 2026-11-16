// Development-only fixture entry. Not routed or included in the application build.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { TooltipProvider } from '../../src/components/ui/tooltip';
import FieldCard from '../../src/adminv2/components/FieldCard';
import FieldEditor from '../../src/adminv2/components/FieldEditor';
import VariantEditor from '../../src/adminv2/components/VariantEditor';
import { AdminApiError, type AdminField, type AdminAiSuggestion } from '../../src/adminv2/lib/adminApi';
const html='<p>Descrizione <strong>verificata</strong>.</p><ul><li>Informazione fornita</li></ul>';
function Harness() {
 const [value,setValue]=useState<string | null>(new URLSearchParams(location.search).has('missing') ? null : html); const [version,setVersion]=useState(new URLSearchParams(location.search).has('missing') ? 0 : 1); const [writes,setWrites]=useState(0); const [syncs,setSyncs]=useState(0); const [list,setList]=useState(['Primo','Secondo']); const [variants,setVariants]=useState([{sku:'TECH',option:'Formato unico',price:'',compareAtPrice:null}]); const [suggestion,setSuggestion]=useState<AdminAiSuggestion>(); const [conflict,setConflict]=useState(false);
 const field={key:'description',label:'Descrizione',editorType:'richtext',dataType:'text',validationRules:{},value,version,sourceState:'original_absent',sourceStateLabel:'Assente',baselineValue:null,shopifyLiveValue:html,shopifyBaselineHash:'synthetic-hash',shopifySyncSupported:true,publishable:true,syncState:'INTERNAL_ONLY',capabilities:{canUpdate:true,currentValueExists:version>0,canSuggestAi:true,aiAllowed:true},reviewStatus:'approved',formatHint:'Testo visuale'} as AdminField;
 return <TooltipProvider><main className="mx-auto max-w-5xl space-y-6 p-4"><h1>Fixture tecnica non pubblicata</h1><label><input type="checkbox" checked={conflict} onChange={e=>setConflict(e.target.checked)}/>Simula concorrenza</label><button onClick={()=>setVersion(v=>v+1)}>Simula aggiornamento esterno</button><FieldCard field={field} syncEnabled onCommand={async input=>{if(version===0 && input.expectedShopifyHash!=='synthetic-hash') throw new Error('Missing remote proof'); if(conflict || input.expectedVersion!==version) throw new AdminApiError('VERSION_CONFLICT','Conflitto sintetico',{currentVersion:version+1}); setValue(input.value as string);setVersion(v=>v+1);setWrites(n=>n+1);return {ok:true,result:{version:version+1}};}} onSync={async()=>{setSyncs(n=>n+1);return {ok:true};}} onConflict={()=>{setConflict(false);}} aiSuggestion={suggestion} onGenerateAi={async()=>{const s={id:'synthetic',fieldKey:'description',baseVersion:version,suggestedValue:'<p>Proposta sintetica da approvare.</p>',status:'pending',promptVersion:'mock@1'} as AdminAiSuggestion;setSuggestion(s);return s;}} onRejectAi={async()=>setSuggestion(undefined)} onAcceptAi={async input=>{setValue(input.value as string);setVersion(v=>v+1);setWrites(n=>n+1);setSuggestion(undefined);}}/>
 <output aria-label="Salvataggi">{writes}</output><output aria-label="Sincronizzazioni">{syncs}</output><pre className="whitespace-pre-wrap break-all" data-testid="stored">{value}</pre>
 <h2>Punti di forza</h2><FieldEditor field={{...field,key:'key_benefits',label:'Punti di forza',editorType:'multiselect',dataType:'json'}} value={list} onChange={v=>setList(v as string[])}/><output data-testid="list">{list.join('|')}</output>
 <VariantEditor sku="TECH" variants={variants} onChange={setVariants}/><output className="block break-all" data-testid="variants">{JSON.stringify(variants)}</output>
 </main></TooltipProvider>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
