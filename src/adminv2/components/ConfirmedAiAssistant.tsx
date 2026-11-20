import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import FieldEditor from './FieldEditor';
import type { AdminField } from '../lib/adminApi';
import { suggestConfirmedField } from '../lib/adminApi';
import { confirmedFacts } from '../../../supabase/functions/_shared/admin-ai-facts';
export default function ConfirmedAiAssistant({ field, onApply, generate = suggestConfirmedField }: { field: Pick<AdminField,'key'|'label'|'editorType'|'dataType'|'validationRules'|'required'>; onApply: (value: unknown) => void; generate?: typeof suggestConfirmedField }) {
  const [text,setText]=useState(''); const [confirmed,setConfirmed]=useState(false); const [proposal,setProposal]=useState<unknown>(); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const revision=useRef(0); const request=useRef(crypto.randomUUID());
  useEffect(()=>()=>{revision.current++;},[]);
  const invalidate=()=>{revision.current++;request.current=crypto.randomUUID();setConfirmed(false);setProposal(undefined);setError('');};
  return <section aria-label={`Assistenza AI ${field.label}`} className="mt-4 space-y-3 rounded border p-3">
    <h3 className="font-semibold">Aiutami a compilare con informazioni verificate</h3>
    <p className="text-sm">Inserisci da 1 a 12 frasi verificate, una per riga, da 12 a 500 caratteri ciascuna. L’AI può solo organizzare queste frasi, senza aggiungere parole o fatti. Non inserire dati personali, prezzi, stock, SKU o certificazioni da dedurre. Senza dati sufficienti puoi compilare manualmente.</p>
    <label className="block">Fatti verificati da dare all’AI<Textarea aria-label={`Informazioni fattuali ${field.label}`} maxLength={6011} value={text} onChange={e=>{invalidate();setText(e.target.value);}} /></label>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={confirmed} onChange={e=>{revision.current++;request.current=crypto.randomUUID();setConfirmed(e.target.checked);setProposal(undefined);}} />Confermo che queste informazioni sono verificate e utilizzabili per il prodotto</label>
    <Button type="button" disabled={busy || !confirmed || proposal!==undefined} onClick={async()=>{
      const current=revision.current;setError('');setProposal(undefined);
      try { const facts=confirmedFacts(text.split('\n').map(x=>x.trim()).filter(Boolean),confirmed);setBusy(true);const result=await generate({fieldKey:field.key,facts,confirmed:true,requestKey:request.current});if(current===revision.current)setProposal(result.value); }
      catch { if(current===revision.current){setConfirmed(false);setError('Informazioni insufficienti, richiesta non autorizzata o provider non disponibile. Controlla i dati e riprova, oppure compila manualmente.');} }
      finally {setBusy(false);}
    }}>{busy?'Preparazione proposta…':'Organizza le informazioni con AI'}</Button>
    {error && <p role="alert">{error}</p>}
    {proposal!==undefined && <div className="space-y-3"><h4>Proposta da revisionare</h4><FieldEditor field={field} value={proposal} onChange={setProposal}/><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={()=>{revision.current++;request.current=crypto.randomUUID();setProposal(undefined);}}>Scarta proposta</Button><Button type="button" onClick={()=>{if(window.confirm('Applicare la proposta alla compilazione locale? Non verrà salvata o sincronizzata automaticamente.')) {onApply(proposal);request.current=crypto.randomUUID();setProposal(undefined);}}}>Applica alla compilazione</Button></div></div>}
  </section>;
}
