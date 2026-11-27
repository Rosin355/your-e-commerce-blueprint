import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import EditorialDiagnostics from './EditorialDiagnostics';
import { analyzeFacts, usableFacts } from '../../../supabase/functions/_shared/admin-ai-evidence';
import AiErrorNotice from './AiErrorNotice';
import FieldEditor from './FieldEditor';
import { suggestConfirmedField, type AdminField } from '../lib/adminApi';
import { explainAiRequestError } from '../lib/explainAiError';
import { confirmedFacts } from '../../../supabase/functions/_shared/admin-ai-facts';

interface Props {
  field: Pick<AdminField, 'key' | 'label' | 'editorType' | 'dataType' | 'validationRules' | 'required'>;
  onApply: (value: unknown) => void;
  onShortApply?: (value: string) => void;
  generate?: typeof suggestConfirmedField;
}

export default function ConfirmedAiAssistant({field, onApply, onShortApply, generate = suggestConfirmedField}: Props) {
  const [text, setText] = useState('');
  const [short, setShort] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [proposal, setProposal] = useState<Awaited<ReturnType<typeof suggestConfirmedField>>>();
  const [generation, setGeneration] = useState(0);
  const [manuallyEdited,setManuallyEdited]=useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const revision = useRef(0);
  const inFlight = useRef(false);
  useEffect(() => () => { revision.current++; }, []);

  function canReplace() {
    return !manuallyEdited || window.confirm('Sostituire il testo modificato in questa anteprima?');
  }
  function invalidate() {
    setManuallyEdited(false);
    revision.current++;
    setProposal(undefined);
    setShort('');
    setError('');
  }

  async function requestProposal() {
    if (inFlight.current || !canReplace()) return;
    let facts: string[];
    try {
      facts = confirmedFacts(text.split('\n').map(line => line.trim()).filter(Boolean), confirmed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Controlla le righe inserite e confermale.');
      return;
    }
    const current = revision.current;
    setError('');
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await generate({ fieldKey:field.key, facts, confirmed:true, requestKey:crypto.randomUUID() });
      if (revision.current === current) {
        setManuallyEdited(false);
        setProposal(result);
        setGeneration(value => value + 1);
        const usable = usableFacts(analyzeFacts(facts));
        if (onShortApply && usable.length > 1) setShort(usable.find(line => line.length <= 320 &&
          line !== String(result.value).replace(/<[^>]*>/g, '').trim()) ?? '');
      }
    } catch (cause) {
      if (revision.current === current) {
        setError(explainAiRequestError(cause));
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <section aria-label={`Assistenza AI ${field.label}`} className="mt-4 space-y-3 rounded border p-3">
    <h3 className="font-semibold">Aiutami a compilare con informazioni verificate</h3>
    <p className="text-sm">Inserisci da 1 a 12 righe di 12–500 caratteri. Una riga può contenere più frasi. Per esempio, se lo hai verificato: «La scheda riporta il nome Quercus robur». L’AI può riordinare le frasi confermate. Evita dati personali, prezzi, stock, SKU e certificazioni da dedurre.</p>
    <label className="block">Fatti verificati da dare all’AI
      <Textarea aria-label={`Informazioni fattuali ${field.label}`} maxLength={6011} value={text}
        onChange={e => { if (canReplace()) {invalidate(); setConfirmed(false); setText(e.target.value);} }} />
    </label>
    <label className="flex min-h-11 items-center gap-2">
      <input type="checkbox" checked={confirmed} onChange={e => { if (canReplace()) {invalidate(); setConfirmed(e.target.checked);} }} />
      Confermo che queste informazioni sono verificate e utilizzabili per il prodotto
    </label>
    <Button type="button" disabled={busy || !confirmed || (proposal !== undefined && !proposal.descriptionIssues?.length)} onClick={requestProposal}>
      {busy ? 'Preparazione proposta…' : proposal?.descriptionIssues?.length ? 'Riprova la descrizione' : 'Organizza le informazioni con AI'}
    </Button>
    {error && <AiErrorNotice>{error}</AiErrorNotice>}
    {proposal !== undefined && <div className="space-y-3">
      {onShortApply && <section className="space-y-2">
        <h4>Descrizione breve</h4>
        {short ? <>
          <p>Sintesi ricavata da una riga confermata, con selezione deterministica.</p>
          <Textarea aria-label="Proposta breve" value={short} maxLength={320} disabled={busy} onChange={e => {setManuallyEdited(true); setShort(e.target.value);}} />
          <Button variant="editorial" type="button" onClick={() => {
            if (window.confirm('Usare la sintesi nella descrizione breve? Sostituirà eventuali modifiche aperte in quel campo.')) onShortApply(short);
          }}>Applica alla descrizione breve</Button>
        </> : <p>Per proporre una sintesi distinta occorrono almeno due fatti e una riga entro 320 caratteri.</p>}
      </section>}
      <h4>{onShortApply ? 'Descrizione estesa da revisionare' : 'Proposta da revisionare'}</h4>
      <EditorialDiagnostics issues={proposal.descriptionIssues} coverage={proposal.coverage} missing={proposal.missingInformation}/>
      {proposal.source === 'model' && <p role="status" className="text-sm">Proposta editoriale generata con AI · da revisionare.</p>}
      {proposal.source === 'confirmed_facts' && <p role="status" className="text-sm">Il modello ha modificato o omesso alcune parole. L’anteprima iniziale è stata composta con le tue righe originali, nello stesso ordine.</p>}
      <FieldEditor key={generation} field={field} disabled={busy} value={proposal.value} onChange={value => {setManuallyEdited(true);setProposal({ ...proposal, value });}} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={()=>{if (canReplace()) invalidate();}}>Scarta proposta</Button>
        <Button variant="editorial" type="button" onClick={() => {
          if (window.confirm(onShortApply ? 'Sostituire il testo della descrizione estesa in modifica? Potrai verificarlo prima di salvarlo.' : 'Applicare la proposta alla compilazione locale? Il salvataggio richiede una conferma separata.')) {
            onApply(proposal.value);
            if (!onShortApply) invalidate();
          }
        }}>Applica alla compilazione</Button>
      </div>
    </div>}
  </section>;
}
