// F6/F7 — Scheda campo: sola lettura per tutti, modifica manuale per Admin/Tech Admin in collaudo.
import { useState } from 'react';
import { Check, Info, Loader2, Lock, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/useToast';
import ValueDisplay from './ValueDisplay';
import { AdminApiError, type AdminField, type FieldCommandAction } from '../lib/adminApi';
import {
  ENTITY_LABEL,
  hasValue,
  isLegacyAi,
  isManualField,
  LEGACY_AI_NOTICE,
  originLabel,
  READ_ONLY_TOOLTIP,
  reviewLabel,
} from '../lib/labels';

/** Alcuni valori tecnici vanno tradotti prima di essere mostrati al cliente. */
function displayValue(field: AdminField): unknown {
  if (typeof field.value === 'string' && ENTITY_LABEL[field.value]) {
    return ENTITY_LABEL[field.value];
  }
  return field.value;
}

function DisabledActions({ actions }: { actions: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {actions.map((action) => (
        <Tooltip key={action}>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex rounded-md">
              <Button size="sm" variant="outline" disabled aria-disabled="true">
                {action}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{READ_ONLY_TOOLTIP}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

export interface FieldCardProps {
  field: AdminField;
  /** Vero solo per Admin/Tech Admin quando le modifiche sono attive e il campo è in allowlist. */
  canEdit?: boolean;
  onCommand?: (input: {
    action: FieldCommandAction;
    fieldKey: string;
    value?: unknown;
    expectedVersion: number;
  }) => Promise<{ ok: boolean; code?: string; result?: Record<string, unknown> }>;
}

export default function FieldCard({ field, canEdit = false, onCommand }: FieldCardProps) {
  const legacyAi = isLegacyAi(field);
  const manual = isManualField(field);
  const editable = canEdit && !!onCommand && field.version !== null && !field.locked;
  const isLongText = field.editorType === 'textarea' || field.dataType === 'text';

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<null | FieldCommandAction>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const baselineDiffers =
    hasValue(field.baselineValue) &&
    JSON.stringify(field.baselineValue) !== JSON.stringify(field.value);

  const startEdit = () => {
    setDraft(typeof field.value === 'string' ? field.value : field.value == null ? '' : String(field.value));
    setValidationError(null);
    setEditing(true);
  };

  const run = async (action: FieldCommandAction, value?: unknown) => {
    if (!onCommand || field.version === null) return;
    setBusy(action);
    setValidationError(null);
    try {
      const res = await onCommand({
        action,
        fieldKey: field.key,
        value,
        expectedVersion: field.version,
      });
      if (res?.code === 'NO_CHANGE') {
        toast({ title: 'Nessuna modifica', description: 'Il valore era già questo.' });
      } else {
        toast({ title: 'Modifica salvata', description: `${field.label} aggiornato.` });
      }
      setEditing(false);
    } catch (err) {
      const message =
        err instanceof AdminApiError ? err.message : 'Non è stato possibile salvare. Riprova.';
      if (err instanceof AdminApiError && err.code === 'VALIDATION_ERROR') {
        setValidationError(message);
      } else {
        toast({ title: 'Modifica non riuscita', description: message, variant: 'destructive' });
      }
    } finally {
      setBusy(null);
    }
  };

  const save = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setValidationError('Il campo non può restare vuoto.');
      return;
    }
    void run('update_field', trimmed);
  };

  return (
    <article className="rounded-lg border bg-card p-4">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{field.label}</h3>
        <div className="flex flex-wrap gap-1.5">
          {legacyAi && <Badge variant="destructive">Da verificare</Badge>}
          {manual && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" aria-hidden="true" /> Manuale
            </Badge>
          )}
          {!legacyAi && !manual && field.reviewStatus && (
            <Badge variant="outline">{reviewLabel(field.reviewStatus)}</Badge>
          )}
        </div>
      </header>

      {editing ? (
        <div className="mb-3 space-y-2">
          {isLongText ? (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              aria-label={`Modifica ${field.label}`}
            />
          ) : (
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={`Modifica ${field.label}`}
            />
          )}
          {validationError && (
            <p role="alert" className="text-xs text-destructive">{validationError}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={save} disabled={busy !== null}>
              {busy === 'update_field' ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Salvataggio…
                </>
              ) : (
                'Salva'
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
              disabled={busy !== null}
            >
              Annulla
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <ValueDisplay value={displayValue(field)} label={field.label} />
        </div>
      )}

      {legacyAi && (
        <p className="mb-3 rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {LEGACY_AI_NOTICE} La pubblicazione di questo contenuto è bloccata.
        </p>
      )}

      {baselineDiffers && (
        <details className="mb-3 rounded-md border bg-muted/40 p-2">
          <summary className="cursor-pointer text-xs font-medium">
            Valore iniziale importato dal sistema precedente
          </summary>
          <div className="pt-2">
            <ValueDisplay value={field.baselineValue} label={`${field.label} iniziale`} />
          </div>
        </details>
      )}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li>Origine: {originLabel(field.origin)}</li>
        <li>Stato: {reviewLabel(field.reviewStatus)}</li>
        <li className="inline-flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          {field.protectedOnReimport
            ? 'Protetto da nuove importazioni'
            : 'Aggiornabile da nuove importazioni'}
        </li>
        <li className="inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          {manual || !field.aiAllowed ? 'AI non disponibile' : 'AI consentita'}
        </li>
        <li>
          {field.publishBlocked
            ? 'Pubblicazione bloccata'
            : field.publishable
              ? 'Pubblicabile'
              : 'Non pubblicabile'}
        </li>
      </ul>

      {field.helpText && (
        <p className="mt-2 inline-flex items-start gap-1 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          {field.helpText}
        </p>
      )}

      {editable && !editing && (
        <div className="flex flex-wrap gap-2 pt-3">
          <Button size="sm" variant="outline" onClick={startEdit} disabled={busy !== null}>
            Modifica
          </Button>
          {legacyAi && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void run('confirm_legacy_value')}
                disabled={busy !== null}
              >
                {busy === 'confirm_legacy_value' ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                )}
                Mantieni valore
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void run('reject_legacy_value')}
                disabled={busy !== null}
              >
                {busy === 'reject_legacy_value' ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                )}
                Rifiuta valore
              </Button>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-flex rounded-md">
                <Button size="sm" variant="outline" disabled aria-disabled="true">
                  Migliora con AI
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>La generazione automatica non è ancora attiva.</TooltipContent>
          </Tooltip>
        </div>
      )}

      {!editable && legacyAi && (
        <DisabledActions actions={['Mantieni questo valore', 'Modifica', 'Migliora con AI', 'Scarta']} />
      )}
    </article>
  );
}
