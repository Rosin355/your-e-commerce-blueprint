import { useState } from 'react';
import { Check, Info, Loader2, Lock, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/useToast';
import ValueDisplay from './ValueDisplay';
import FieldEditor from './FieldEditor';
import { AdminApiError, type AdminField, type FieldCommandAction } from '../lib/adminApi';
import { isEditorValueSupported, normalizeEditorValue, parseFaqValue } from '../lib/fieldValueCodecs';
import { ENTITY_LABEL, isLegacyAi, isManualField, LEGACY_AI_NOTICE, originLabel, reviewLabel } from '../lib/labels';

function displayValue(field: AdminField): unknown {
  if (typeof field.value === 'string' && ENTITY_LABEL[field.value]) return ENTITY_LABEL[field.value];
  return field.value;
}

function cloneValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

const SOURCE_LABEL: Record<AdminField['sourceState'], string> = {
  linked_snapshot: 'Snapshot sorgente collegato',
  unlinked_baseline: 'Baseline prodotto non collegata al campo',
  original_absent: 'Originale WordPress assente',
};

const BLOCK_REASON: Record<AdminField['capabilities']['updateBlockReason'], string> = {
  allowed: '',
  writes_disabled: 'Le modifiche sono disabilitate in questo ambiente.',
  role_forbidden: 'Il ruolo corrente non può modificare questo campo.',
  not_applicable: 'Il campo non si applica a questo tipo di prodotto.',
  definition_readonly: 'Il registro definisce questo campo come non modificabile.',
  canary_field_not_allowed: 'Il campo non è abilitato nella fase di collaudo.',
  current_value_missing: 'Il valore corrente non esiste ancora: la RPC non può crearlo.',
  current_value_locked: 'Il valore è bloccato e la RPC rifiuta il salvataggio.',
  legacy_review_not_required: 'Il valore non richiede una revisione legacy.',
  phase_2c: 'Funzione prevista per la Fase 2C.',
};

export interface FieldCardProps {
  field: AdminField;
  onCommand?: (input: { action: FieldCommandAction; fieldKey: string; value?: unknown; expectedVersion: number }) => Promise<{ ok: boolean; code?: string; result?: Record<string, unknown> }>;
  onConflict?: () => Promise<unknown> | unknown;
}

export default function FieldCard({ field, onCommand, onConflict }: FieldCardProps) {
  const legacyAi = isLegacyAi(field);
  const manual = isManualField(field);
  const editorSupported = isEditorValueSupported(field, field.value);
  const canUpdate = field.capabilities.canUpdate && editorSupported && !!onCommand && field.version !== null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<unknown>(() => cloneValue(field.value));
  const [busy, setBusy] = useState<null | FieldCommandAction>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [conflictVersion, setConflictVersion] = useState<number | null>(null);

  const startEdit = () => {
    const faq = field.key === 'faq' ? parseFaqValue(field.value) : null;
    setDraft(faq?.kind === 'supported' ? cloneValue(faq.items) : cloneValue(field.value));
    setValidationError(null);
    setConflictVersion(null);
    setEditing(true);
  };

  const run = async (action: FieldCommandAction, value?: unknown) => {
    if (!onCommand || field.version === null) return;
    setBusy(action);
    setValidationError(null);
    setConflictVersion(null);
    try {
      const res = await onCommand({ action, fieldKey: field.key, value, expectedVersion: field.version });
      toast(res?.code === 'NO_CHANGE'
        ? { title: 'Nessuna modifica', description: 'Il valore era già questo.' }
        : { title: 'Modifica salvata', description: `${field.label} aggiornato.` });
      setEditing(false);
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Non è stato possibile salvare. Riprova.';
      if (err instanceof AdminApiError && err.code === 'VERSION_CONFLICT') {
        const currentVersion = err.details?.currentVersion;
        setConflictVersion(typeof currentVersion === 'number' ? currentVersion : -1);
      } else if (err instanceof AdminApiError && err.code === 'VALIDATION_ERROR') {
        setValidationError(message);
      } else {
        toast({ title: 'Modifica non riuscita', description: message, variant: 'destructive' });
      }
    } finally {
      setBusy(null);
    }
  };

  const save = () => {
    const normalized = normalizeEditorValue(field, draft);
    if (normalized.ok === false) {
      setValidationError(normalized.message);
      return;
    }
    void run('update_field', normalized.value);
  };

  const reloadAfterConflict = async () => {
    setBusy('update_field');
    try {
      await onConflict?.();
      setEditing(false);
      setConflictVersion(null);
      toast({ title: 'Valore ricaricato', description: 'Confronta la nuova versione prima di modificare.' });
    } catch {
      toast({
        title: 'Ricaricamento non riuscito',
        description: 'La bozza non è stata sovrascritta. Riprova prima di salvare.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="rounded-lg border bg-card p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{field.label}</h3>
        <div className="flex flex-wrap gap-1.5">
          {legacyAi && <Badge variant="destructive">Da verificare</Badge>}
          {manual && <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" /> Manuale</Badge>}
          {field.locked && <Badge variant="outline">Bloccato</Badge>}
          {!legacyAi && !manual && field.reviewStatus && <Badge variant="outline">{reviewLabel(field.reviewStatus)}</Badge>}
        </div>
      </header>

      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <section className="rounded-md border p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valore corrente</h4>
          {editing ? <FieldEditor field={field} value={draft} onChange={setDraft} disabled={busy !== null} /> : <ValueDisplay value={displayValue(field)} label={field.label} />}
        </section>
        <section className="rounded-md border bg-muted/30 p-3">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Originale WordPress</h4>
          <p className="mb-2 text-xs text-muted-foreground">{SOURCE_LABEL[field.sourceState]}</p>
          {field.sourceState === 'original_absent'
            ? <p className="text-sm text-muted-foreground">Nessun originale disponibile.</p>
            : <ValueDisplay value={field.baselineValue} label={`${field.label} originale`} />}
        </section>
      </div>

      {validationError && <p role="alert" className="mb-3 text-xs text-destructive">{validationError}</p>}
      {conflictVersion !== null && (
        <Alert variant="destructive" className="mb-3">
          <AlertTitle>Versione modificata da un altro utente</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Nessuna sovrascrittura è stata eseguita. La bozza locale è ancora visibile; {conflictVersion >= 0 ? `il server è alla versione ${conflictVersion}.` : 'ricarica il dato aggiornato.'}</p>
            <Button size="sm" variant="outline" onClick={() => void reloadAfterConflict()} disabled={busy !== null}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Ricarica senza sovrascrivere
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {legacyAi && <p className="mb-3 rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">{LEGACY_AI_NOTICE} La pubblicazione di questo contenuto è bloccata.</p>}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li>Origine: {originLabel(field.origin)}</li>
        <li>Versione: {field.version ?? 'non presente'}</li>
        <li>Stato originale: {SOURCE_LABEL[field.sourceState]}</li>
        <li>Stato revisione: {reviewLabel(field.reviewStatus)}</li>
        <li className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{field.protectedOnReimport ? 'Protetto da re-import' : 'Non protetto da re-import'}</li>
        <li className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" />{field.capabilities.aiAllowed ? 'AI ammessa dal registro, solo proposta' : 'AI non ammessa'}</li>
      </ul>

      {field.helpText && <p className="mt-2 inline-flex items-start gap-1 text-xs text-muted-foreground"><Info className="mt-0.5 h-3 w-3 shrink-0" />{field.helpText}</p>}

      <div className="flex flex-wrap gap-2 pt-3">
        {editing ? (
          <>
            <Button size="sm" onClick={save} disabled={busy !== null || conflictVersion !== null}>{busy === 'update_field' && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Salva</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={busy !== null}>Annulla</Button>
          </>
        ) : canUpdate ? (
          <Button size="sm" variant="outline" onClick={startEdit}>Modifica</Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild><span tabIndex={0} className="inline-flex rounded-md"><Button size="sm" variant="outline" disabled>Modifica</Button></span></TooltipTrigger>
            <TooltipContent>{editorSupported ? BLOCK_REASON[field.capabilities.updateBlockReason] : 'Il valore legacy non è interpretabile senza perdita.'}</TooltipContent>
          </Tooltip>
        )}
        {legacyAi && field.capabilities.canConfirmLegacy && <Button size="sm" variant="outline" onClick={() => void run('confirm_legacy_value')} disabled={busy !== null}>{busy === 'confirm_legacy_value' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}Mantieni valore</Button>}
        {legacyAi && field.capabilities.canRejectLegacy && <Button size="sm" variant="outline" onClick={() => void run('reject_legacy_value')} disabled={busy !== null}>{busy === 'reject_legacy_value' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1 h-3.5 w-3.5" />}Rifiuta valore</Button>}
        {field.capabilities.aiAllowed && <Tooltip><TooltipTrigger asChild><span tabIndex={0} className="inline-flex rounded-md"><Button size="sm" variant="outline" disabled>Migliora con AI</Button></span></TooltipTrigger><TooltipContent>L’AI resta una proposta ed è prevista per la Fase 2C.</TooltipContent></Tooltip>}
      </div>
    </article>
  );
}
