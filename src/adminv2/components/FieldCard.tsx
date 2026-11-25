import type { suggestConfirmedField } from '../lib/adminApi';
import ConfirmedAiAssistant from './ConfirmedAiAssistant';
import { useState } from 'react';
import { Check, CloudUpload, Info, Loader2, Lock, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/useToast';
import ValueDisplay from './ValueDisplay';
import FieldEditor from './FieldEditor';
import AiSuggestionCard from './AiSuggestionCard';
import { AdminApiError, type AdminAiSuggestion, type AdminField, type FieldCommandAction } from '../lib/adminApi';
import { editorKind, isEditorValueSupported, normalizeEditorValue, parseFaqValue, toggleMonth } from '../lib/fieldValueCodecs';
import { isLegacyAi, isManualField, LEGACY_AI_NOTICE, originLabel, reviewLabel } from '../lib/labels';

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
  current_value_missing: 'Il valore non esiste ancora e non può essere creato in questa fase.',
  current_value_locked: 'Il valore è bloccato e non può essere modificato con il tuo ruolo.',
  legacy_review_not_required: 'Il valore non richiede una revisione legacy.',
  phase_2c: 'Funzione prevista per la Fase 2C.',
  ai_not_allowed: 'Il registro non consente proposte AI per questo campo.',
  manual_only: 'Questo campo è protetto e può essere modificato solo manualmente.',
  structural_field: 'I campi strutturali non possono essere modificati dall’AI.',
  unsupported_ai_strategy: 'Non esiste ancora una strategia AI sicura per questo campo.',
  empty_or_unsupported_value: 'Serve un valore corrente supportato da migliorare.',
};

const SYNC_STATE: Record<AdminField['syncState'], { label: string; variant: 'outline' | 'secondary' | 'destructive' }> = {
  INTERNAL_ONLY: { label: 'Bozza interna', variant: 'outline' },
  PENDING_SYNC: { label: 'Da sincronizzare', variant: 'secondary' },
  SYNCED: { label: 'Sincronizzato', variant: 'secondary' },
  SYNC_ERROR: { label: 'Errore sync', variant: 'destructive' },
};

export interface FieldCardProps {
  field: AdminField;
  prepared?: { value: unknown; version: number | null; hash?: string };
  advanced?: boolean;
  onWorkingValue?: (value:unknown, editing:boolean)=>void;
  onStage?: (value:unknown,version:number|null,hash?:string)=>void;
  onGenerateConfirmed?: typeof suggestConfirmedField;
  onCommand?: (input: { action: FieldCommandAction; fieldKey: string; value?: unknown; expectedShopifyHash?: string; expectedVersion: number }) => Promise<{ ok: boolean; code?: string; result?: Record<string, unknown> }>;
  onSync?: (input: { fieldKey: string; expectedVersion: number; expectedShopifyHash?: string; idempotencyKey?: string }) => Promise<{ ok: boolean; result?: Record<string, unknown> }>;
  syncEnabled?: boolean;
  onConflict?: () => Promise<unknown> | unknown;
  aiSuggestion?: AdminAiSuggestion;
  onGenerateAi?: (input: { fieldKey: string; baseVersion: number }) => Promise<void>;
  onRejectAi?: (suggestionId: string) => Promise<unknown>;
  onAcceptAi?: (input: { suggestionId: string; value: unknown; expectedVersion: number; idempotencyKey: string }) => Promise<unknown>;
}

export default function FieldCard({ field, prepared, advanced, onStage, onWorkingValue, onGenerateConfirmed, onCommand, onSync, syncEnabled = false, onConflict, aiSuggestion, onGenerateAi, onRejectAi, onAcceptAi }: FieldCardProps) {
  const [comparison, setComparison] = useState<{ version: number; hash: string; previous: unknown; next: unknown } | null>(null);
  const name = ({ short_description: 'Descrizione breve', description: 'Descrizione estesa' } as Record<string,string>)[field.key] ?? field.label;
  const legacyAi = isLegacyAi(field);
  const manual = isManualField(field);
  const initialValue = !field.capabilities.currentValueExists && field.shopifyLiveValue != null ? field.shopifyLiveValue : field.value;
  const editorSupported = isEditorValueSupported(field, initialValue);
  const canImprove = field.capabilities.canSuggestAi && field.value != null && field.value !== '' &&
    !(Array.isArray(field.value) && !field.value.length) && field.version !== null && field.version > 0;
  const canUpdate = field.capabilities.canUpdate && editorSupported && !!onCommand && field.version !== null;
  const [editing, setEditing] = useState(Boolean(prepared && canUpdate));
  const [editVersion, setEditVersion] = useState<number | null>(prepared?.version ?? field.version);
  const [editHash, setEditHash] = useState(prepared?.hash ?? field.shopifyBaselineHash);
  const [editMissing, setEditMissing] = useState(!field.capabilities.currentValueExists);
  const [draft, setDraft] = useState<unknown>(() => cloneValue(prepared?.value ?? initialValue));
  const [busy, setBusy] = useState<null | FieldCommandAction | 'sync_field'>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [conflictVersion, setConflictVersion] = useState<number | null>(null);

  const startEdit = () => {
    setEditVersion(field.version);
    setEditHash(field.shopifyBaselineHash);
    setEditMissing(!field.capabilities.currentValueExists);
    const faq = field.key === 'faq' ? parseFaqValue(initialValue) : null;
    setDraft(faq?.kind === 'supported' ? cloneValue(faq.items) : cloneValue(initialValue));
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
      onWorkingValue?.(undefined,false);
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

  const dirty = JSON.stringify(draft ?? null) !== JSON.stringify(cloneValue(field.key === 'faq' && parseFaqValue(initialValue).kind === 'supported' ? (parseFaqValue(initialValue) as { items: unknown }).items : initialValue) ?? null);
  const seasonalDraftEmpty = editorKind(field) === 'month_multiselect' &&
    Array.isArray(draft) && draft.length === 0;
  const visibleValidationError = seasonalDraftEmpty ? 'Seleziona almeno un mese.' : validationError;
  const errorId = `field-error-${field.key}`;

  const save = async () => {
    const normalized = normalizeEditorValue(field, draft);
    if (normalized.ok === false) {
      setValidationError(normalized.message);
      return;
    }
    if (!onCommand || editVersion === null) return;
    setBusy('update_field');
    setValidationError(null);
    try {
      const saved = await onCommand({
        action: 'update_field',
        fieldKey: field.key,
        value: normalized.value,
        expectedVersion: editVersion,
        expectedShopifyHash: editMissing ? editHash : undefined,
      });
      toast(saved.code === 'NO_CHANGE'
        ? { title: 'Nessuna modifica', description: 'Il valore era già questo.' }
        : { title: 'Salvato nell’Admin', description: `${field.label} aggiornato nella bozza interna.` });
      onWorkingValue?.(undefined,false);
      setEditing(false);
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Operazione non completata. Riprova.';
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

  const syncCurrentValue = async () => {
    if (!onSync || !comparison || comparison.version !== field.version || comparison.hash !== field.shopifyBaselineHash) return;
    if (!window.confirm('Aggiornare questo campo sul sito con la bozza salvata?')) return;
    setBusy('sync_field');
    try {
      await onSync({ fieldKey: field.key, expectedVersion: field.version, expectedShopifyHash: field.shopifyBaselineHash });
      setComparison(null);
      toast({ title: 'Aggiornato su Shopify', description: `${field.label} verificato su Shopify.` });
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Sincronizzazione non completata.';
      toast({ title: 'Sincronizzazione non riuscita', description: message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const reloadAfterConflict = async () => {
    setBusy('update_field');
    try {
      await onConflict?.();
      onWorkingValue?.(undefined,false);
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
    <article className="og-field-card-container min-w-0 rounded-lg border bg-card p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="text-sm font-semibold">{name}</h3>{canUpdate && <p className="text-xs">{editing ? 'In modifica' : 'Puoi modificare qui'}</p>}</div>
        {!editing && canUpdate && <Button size="sm" variant="editorial" onClick={startEdit}>{!field.capabilities.currentValueExists && field.shopifyLiveValue != null ? `Modifica ${name} dal sito` : `Modifica ${name}`}</Button>}
        <div className="flex flex-wrap gap-1.5">
          {legacyAi && <Badge variant="destructive">Da verificare</Badge>}
          {manual && <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" /> Manuale</Badge>}
          {field.locked && <Badge variant="outline">Bloccato</Badge>}
          {field.publishable && <Badge variant={SYNC_STATE[field.syncState].variant}>{SYNC_STATE[field.syncState].label}</Badge>}
          {!legacyAi && !manual && field.reviewStatus && <Badge variant="outline">{reviewLabel(field.reviewStatus)}</Badge>}
        </div>
      </header>

      <div className="mb-3 space-y-3">
        <section className="min-w-0 rounded-md border p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{!field.capabilities.currentValueExists && field.shopifyLiveValue != null ? 'Valore letto da Shopify' : 'Valore editoriale interno'}</h4>
          {editing ? (
            <div aria-describedby={visibleValidationError ? errorId : undefined}>
              <FieldEditor field={field} value={draft} onChange={value=>{setDraft(value);onWorkingValue?.(value,true);}} onMonthToggle={(month, checked) => setDraft((previous: unknown) => toggleMonth(previous, month, checked))} disabled={busy !== null} />
            </div>
          ) : initialValue == null ? (
            <p className="text-sm text-muted-foreground">Dato assente nei campi editoriali. Per le nuove bozze consulta il riepilogo della creazione.</p>
          ) : <ValueDisplay richText={editorKind(field) === 'richtext'} value={initialValue} label={field.label} />}
        </section>
        <details className="space-y-3"><summary className="cursor-pointer text-sm underline">Avanzato · Dettagli e confronto</summary>
          <section className="min-w-0 rounded-md border bg-muted/30 p-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Originale WordPress</h4>
            <p className="mb-2 text-xs text-muted-foreground">{SOURCE_LABEL[field.sourceState]}</p>
            {field.sourceState === 'original_absent'
              ? <p className="text-sm text-muted-foreground">Nessun originale disponibile.</p>
              : <ValueDisplay richText={editorKind(field) === 'richtext'} value={field.baselineValue} label={`${field.label} originale`} />}
          </section>
          {field.shopifySyncSupported && (
            <section className="min-w-0 rounded-md border bg-blue-50/40 p-3 dark:bg-blue-950/20">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valore Shopify live</h4>
              <ValueDisplay richText={editorKind(field) === 'richtext'} value={field.shopifyLiveValue} label={`${field.label} Shopify`} />
            </section>
          )}
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <li>Origine: {originLabel(field.origin)}</li>
            <li>{field.version ? `Versione: ${field.version}` : 'Valore non ancora inserito'}</li>
            <li>Stato originale: {SOURCE_LABEL[field.sourceState]}</li>
            <li>Stato revisione: {reviewLabel(field.reviewStatus)}</li>
            <li className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{field.protectedOnReimport ? 'Protetto da re-import' : 'Non protetto da re-import'}</li>
            <li className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" />{field.capabilities.aiAllowed ? 'AI ammessa dal registro, solo proposta' : 'AI non ammessa'}</li>
            <li>Destinazione: {field.storefrontPlacement}</li>
            <li>{field.shopifySyncSupported ? 'Sincronizzazione Shopify disponibile' : 'Non sincronizzato su Shopify'}</li>
            <li>Formato: {field.formatHint}</li>
          </ul>
        </details>
      </div>

      {visibleValidationError && <p id={errorId} role="alert" className="mb-3 text-xs text-destructive">{visibleValidationError}</p>}
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
      {field.syncState === 'SYNC_ERROR' && (
        <Alert variant="destructive" className="mb-3">
          <AlertTitle>Ultima sincronizzazione non riuscita</AlertTitle>
          <AlertDescription>{field.syncErrorMessage ?? 'Ricarica i valori Shopify e riprova.'}</AlertDescription>
        </Alert>
      )}



      {field.helpText && <p className="mt-2 inline-flex items-start gap-1 text-xs text-muted-foreground"><Info className="mt-0.5 h-3 w-3 shrink-0" />{field.helpText}</p>}

      <div className="flex flex-wrap gap-2 pt-3">
        {editing ? (
          <>
            {onStage && <Button size="sm" variant="editorial" disabled={busy!==null || !dirty || seasonalDraftEmpty}
              onClick={()=>{const value=normalizeEditorValue(field,draft);if(value.ok===false){setValidationError(value.message);return;}onStage(value.value,editVersion,editHash);}}>Aggiungi alla revisione</Button>}
            <Button size="sm" variant="editorial" onClick={() => void save()} disabled={busy !== null || conflictVersion !== null || !dirty || seasonalDraftEmpty} title={!dirty ? 'Nessuna modifica da salvare' : undefined}>{busy === 'update_field' && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Salva modifiche</Button>
            <Button size="sm" variant="outline" onClick={() => {onWorkingValue?.(undefined,false);setEditing(false);}} disabled={busy !== null}>Annulla</Button>
          </>
        ) : !canUpdate ? (
          <Tooltip>
            <TooltipTrigger asChild><span tabIndex={0} className="inline-flex rounded-md"><Button size="sm" variant="outline" disabled>Modifica</Button></span></TooltipTrigger>
            <TooltipContent>{editorSupported ? BLOCK_REASON[field.capabilities.updateBlockReason] : 'Il valore legacy non è interpretabile senza perdita.'}</TooltipContent>
          </Tooltip>
        ) : null}
        {!editing && field.shopifySyncSupported && syncEnabled &&
          field.capabilities.currentValueExists && field.version !== null && field.version > 0 && (
          <div className="space-y-2">
            {!comparison && <Button size="sm" variant="outline" disabled={busy !== null || legacyAi || field.publishBlocked || !field.shopifyBaselineHash}
              onClick={() => setComparison({version: field.version!, hash: field.shopifyBaselineHash!, previous: field.shopifyLiveValue, next: field.value})}>
              Confronta {name} con Shopify
            </Button>}
            {comparison && <section className="space-y-2 rounded border p-3" aria-label={`Confronto ${name}`}>
              <h4 className="font-medium">{name} su Shopify</h4><ValueDisplay value={comparison.previous} label="Valore Shopify" />
              <h4 className="font-medium">Modifica salvata</h4><ValueDisplay value={comparison.next} label="Valore da inviare" />
              {(comparison.version !== field.version || comparison.hash !== field.shopifyBaselineHash) && <p role="alert">Il campo è cambiato. Chiudi e riapri il confronto.</p>}
              <Button size="sm" variant="shopify" onClick={() => void syncCurrentValue()}
                disabled={busy !== null || legacyAi || field.publishBlocked || comparison.version !== field.version || comparison.hash !== field.shopifyBaselineHash}>
                <CloudUpload aria-hidden="true" className="mr-1 h-4 w-4" />{busy === 'sync_field' ? 'Verifica in corso…' : 'Invia aggiornamenti a Shopify'}
              </Button>
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => setComparison(null)}>Chiudi confronto</Button>
            </section>}
          </div>
        )}
        {advanced && !canUpdate && <p className="text-sm text-muted-foreground">Non disponibile per il tuo ruolo o per lo stato di questo campo.</p>}
        {field.shopifySyncBlockReason && (advanced || !/ruolo|permess|autorizzat/i.test(field.shopifySyncBlockReason)) && <p role="status" className="text-sm text-muted-foreground">{field.shopifySyncBlockReason}</p>}
        {legacyAi && field.capabilities.canConfirmLegacy && <Button size="sm" variant="outline" onClick={() => void run('confirm_legacy_value')} disabled={busy !== null}>{busy === 'confirm_legacy_value' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}Mantieni valore</Button>}
        {legacyAi && field.capabilities.canRejectLegacy && <Button size="sm" variant="outline" onClick={() => void run('reject_legacy_value')} disabled={busy !== null}>{busy === 'reject_legacy_value' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1 h-3.5 w-3.5" />}Rifiuta valore</Button>}
      </div>
      {!editing && !aiSuggestion && canUpdate && field.capabilities.canSuggestAi && (field.value == null || field.value === '' || (Array.isArray(field.value) && field.value.length === 0)) && <ConfirmedAiAssistant field={field} generate={onGenerateConfirmed} onApply={value=>{startEdit();setDraft(value);}} />}
      {!editing && (canImprove || aiSuggestion) && onGenerateAi && onRejectAi && onAcceptAi && onConflict && (
        <AiSuggestionCard
          field={field}
          canImprove={canImprove}
          suggestion={aiSuggestion}
          onGenerate={onGenerateAi}
          onReject={onRejectAi}
          onAccept={onAcceptAi}
          onRefresh={onConflict}
        />
      )}
    </article>
  );
}
