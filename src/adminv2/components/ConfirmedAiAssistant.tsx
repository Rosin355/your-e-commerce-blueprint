import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AiErrorNotice from './AiErrorNotice';
import FieldEditor from './FieldEditor';
import { suggestConfirmedField, type AdminField } from '../lib/adminApi';
import { explainAiRequestError } from '../lib/explainAiError';
import { confirmedFacts } from '../../../supabase/functions/_shared/admin-ai-facts';

interface Props {
  field: Pick<AdminField, 'key' | 'label' | 'editorType' | 'dataType' | 'validationRules' | 'required'>;
  onApply: (value: unknown) => void;
  generate?: typeof suggestConfirmedField;
}

export default function ConfirmedAiAssistant({field, onApply, generate = suggestConfirmedField}: Props) {
  const [text, setText] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [proposal, setProposal] = useState<Awaited<ReturnType<typeof suggestConfirmedField>>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const revision = useRef(0);
  const inFlight = useRef(false);
  useEffect(() => () => { revision.current++; }, []);

  function invalidate() {
    revision.current++;
    setProposal(undefined);
    setError('');
  }

  async function requestProposal() {
    if (inFlight.current) return;
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
      if (revision.current === current) setProposal(result);
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
        onChange={e => { invalidate(); setConfirmed(false); setText(e.target.value); }} />
    </label>
    <label className="flex min-h-11 items-center gap-2">
      <input type="checkbox" checked={confirmed} onChange={e => { invalidate(); setConfirmed(e.target.checked); }} />
      Confermo che queste informazioni sono verificate e utilizzabili per il prodotto
    </label>
    <Button type="button" disabled={busy || !confirmed || proposal !== undefined} onClick={requestProposal}>
      {busy ? 'Preparazione proposta…' : 'Organizza le informazioni con AI'}
    </Button>
    {error && <AiErrorNotice>{error}</AiErrorNotice>}
    {proposal !== undefined && <div className="space-y-3">
      <h4>Proposta da revisionare</h4>
      {proposal.source === 'confirmed_facts' && <p role="status" className="text-sm">Il modello ha modificato o omesso alcune parole. L’anteprima iniziale è stata composta con le tue righe originali, nello stesso ordine.</p>}
      <FieldEditor field={field} value={proposal.value} onChange={value => setProposal({ ...proposal, value })} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={invalidate}>Scarta proposta</Button>
        <Button type="button" onClick={() => {
          if (window.confirm('Applicare la proposta alla compilazione locale? Il salvataggio richiede una conferma separata.')) {
            onApply(proposal.value);
            invalidate();
          }
        }}>Applica alla compilazione</Button>
      </div>
    </div>}
  </section>;
}
