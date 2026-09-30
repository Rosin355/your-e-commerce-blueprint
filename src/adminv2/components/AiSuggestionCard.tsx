import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Pencil, RefreshCw, Sparkles, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AdminApiError, type AdminAiSuggestion, type AdminField } from '../lib/adminApi';
import { normalizeEditorValue } from '../lib/fieldValueCodecs';
import FieldEditor from './FieldEditor';
import ValueDisplay from './ValueDisplay';

interface AiSuggestionCardProps {
  field: AdminField;
  suggestion?: AdminAiSuggestion;
  onGenerate: (input: { fieldKey: string; baseVersion: number }) => Promise<AdminAiSuggestion>;
  onReject: (suggestionId: string) => Promise<unknown>;
  onAccept: (input: {
    suggestionId: string;
    value: unknown;
    expectedVersion: number;
    idempotencyKey: string;
  }) => Promise<unknown>;
  onRefresh: () => Promise<unknown> | unknown;
}

type AiBusy = 'generate' | 'reject' | 'accept' | null;

export default function AiSuggestionCard({
  field,
  suggestion,
  onGenerate,
  onReject,
  onAccept,
  onRefresh,
}: AiSuggestionCardProps) {
  const [busy, setBusy] = useState<AiBusy>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<unknown>(suggestion?.suggestedValue ?? null);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<'accepted' | 'rejected' | null>(null);
  const acceptKey = useRef<string | null>(null);

  useEffect(() => {
    setDraft(suggestion?.suggestedValue ?? null);
    setEditing(false);
    setError(null);
    acceptKey.current = null;
  }, [suggestion?.id, suggestion?.suggestedValue]);

  const generate = async () => {
    if (field.version === null) return;
    setBusy('generate');
    setError(null);
    setResolution(null);
    try {
      await onGenerate({ fieldKey: field.key, baseVersion: field.version });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Non è stato possibile creare la proposta.');
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    if (!suggestion) return;
    setBusy('reject');
    setError(null);
    try {
      await onReject(suggestion.id);
      setResolution('rejected');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Non è stato possibile rifiutare la proposta.');
    } finally {
      setBusy(null);
    }
  };

  const accept = async () => {
    if (!suggestion) return;
    const normalized = normalizeEditorValue(field, draft);
    if (normalized.ok === false) {
      setError(normalized.message);
      return;
    }
    acceptKey.current ??= crypto.randomUUID();
    setBusy('accept');
    setError(null);
    try {
      await onAccept({
        suggestionId: suggestion.id,
        value: normalized.value,
        expectedVersion: suggestion.baseVersion,
        idempotencyKey: acceptKey.current,
      });
      setResolution('accepted');
      setEditing(false);
    } catch (reason) {
      if (reason instanceof AdminApiError && reason.code === 'SUGGESTION_STALE') {
        await onRefresh();
      }
      setError(reason instanceof Error ? reason.message : 'Non è stato possibile accettare la proposta.');
    } finally {
      setBusy(null);
    }
  };

  if (!suggestion) {
    return (
      <div className="mt-3 space-y-2" aria-live="polite">
        <Button size="sm" variant="outline" onClick={() => void generate()} disabled={busy !== null}>
          {busy === 'generate' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
          {busy === 'generate' ? 'Sto preparando una proposta…' : 'Migliora con AI'}
        </Button>
        {resolution === 'accepted' && <p className="text-xs text-emerald-700">Proposta accettata e salvata nella cronologia.</p>}
        {resolution === 'rejected' && <p className="text-xs text-muted-foreground">Proposta rifiutata. Il prodotto non è stato modificato.</p>}
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  const isStale = suggestion.status === 'stale' || field.version !== suggestion.baseVersion;
  if (isStale) {
    return (
      <Alert variant="destructive" className="mt-3" aria-live="polite">
        <AlertTitle>Proposta AI non più aggiornata</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>Il prodotto è stato modificato dopo la creazione di questa proposta. Genera una nuova proposta.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void reject()} disabled={busy !== null}>
              {busy === 'reject' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1 h-3.5 w-3.5" />}Scarta
            </Button>
            <Button size="sm" onClick={() => void generate()} disabled={busy !== null}>
              {busy === 'generate' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}Genera nuova proposta
            </Button>
          </div>
          {error && <p role="alert" className="text-xs">{error}</p>}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3" aria-live="polite" aria-label={`Miglioramento AI per ${field.label}`}>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        <h4 className="text-sm font-semibold">Miglioramento AI</h4>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border bg-background p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attuale</p>
          <ValueDisplay value={field.value} label={`${field.label} attuale`} />
        </div>
        <div className="rounded-md border bg-background p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proposta</p>
          {editing
            ? <FieldEditor field={field} value={draft} onChange={setDraft} disabled={busy !== null} />
            : <ValueDisplay value={draft} label={`${field.label} proposta AI`} />}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Proposta separata dal prodotto · base versione {suggestion.baseVersion} · prompt {suggestion.promptVersion}
      </p>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditing((value) => !value)} disabled={busy !== null}>
          <Pencil className="mr-1 h-3.5 w-3.5" />{editing ? 'Chiudi modifica' : 'Modifica proposta'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void reject()} disabled={busy !== null}>
          {busy === 'reject' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1 h-3.5 w-3.5" />}Rifiuta
        </Button>
        <Button size="sm" onClick={() => void accept()} disabled={busy !== null}>
          {busy === 'accept' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}Accetta
        </Button>
      </div>
    </section>
  );
}
