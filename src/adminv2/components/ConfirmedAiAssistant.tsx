import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import FieldEditor from './FieldEditor';
import { suggestConfirmedField, type AdminField } from '../lib/adminApi';
import { AdminApiError } from '../lib/AdminApiError';
import { confirmedFacts } from '../../../supabase/functions/_shared/admin-ai-facts';

interface Props {
  field: Pick<AdminField, 'key' | 'label' | 'editorType' | 'dataType' | 'validationRules' | 'required'>;
  onApply: (value: unknown) => void;
  generate?: typeof suggestConfirmedField;
}

function explainError(error: unknown) {
  if (!(error instanceof AdminApiError)) return 'Connessione al servizio AI interrotta. I fatti inseriti sono conservati.';
  switch (error.code) {
    case 'VALIDATION_ERROR': return 'La proposta o i fatti non superano la verifica del campo. Controlla le frasi confermate oppure compila a mano.';
    case 'FORBIDDEN': return 'Il tuo account non è autorizzato a usare l’AI su questo campo. Puoi continuare a mano.';
    case 'RATE_LIMITED': case 'AI_NOT_CONFIGURED': case 'AI_PROVIDER_ERROR': case 'AI_TIMEOUT':
    case 'MALFORMED_AI_OUTPUT': case 'AI_NOT_ALLOWED': case 'WRITES_DISABLED': case 'UNAUTHENTICATED':
      return error.message;
    default: return 'Impossibile completare la proposta. I fatti inseriti sono conservati.';
  }
}

export default function ConfirmedAiAssistant({field, onApply, generate = suggestConfirmedField}: Props) {
  const [text, setText] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [proposal, setProposal] = useState<unknown>();
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
    } catch {
      setError('Controlla i fatti inseriti. Servono da 1 a 12 frasi di 12–500 caratteri, senza link, email o HTML.');
      return;
    }
    const current = revision.current;
    setError('');
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await generate({ fieldKey:field.key, facts, confirmed:true, requestKey:crypto.randomUUID() });
      if (revision.current === current) setProposal(result.value);
    } catch (cause) {
      if (revision.current === current) setError(explainError(cause));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <section aria-label={`Assistenza AI ${field.label}`} className="mt-4 space-y-3 rounded border p-3">
    <h3 className="font-semibold">Aiutami a compilare con informazioni verificate</h3>
    <p className="text-sm">Scrivi una frase verificata per riga, da 12 a 500 caratteri. Puoi inserirne fino a 12. L’AI può riordinare le frasi confermate. Evita dati personali, prezzi, stock, SKU e certificazioni da dedurre.</p>
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
    {error && <p role="alert">{error}</p>}
    {proposal !== undefined && <div className="space-y-3">
      <h4>Proposta da revisionare</h4>
      <FieldEditor field={field} value={proposal} onChange={setProposal} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={invalidate}>Scarta proposta</Button>
        <Button type="button" onClick={() => {
          if (window.confirm('Applicare la proposta alla compilazione locale? Il salvataggio richiede una conferma separata.')) {
            onApply(proposal);
            invalidate();
          }
        }}>Applica alla compilazione</Button>
      </div>
    </div>}
  </section>;
}
