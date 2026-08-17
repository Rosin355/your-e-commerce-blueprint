// F6 — Scheda campo in sola lettura: origine, stato, protezioni, baseline.
import { Info, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ValueDisplay from './ValueDisplay';
import type { AdminField } from '../lib/adminApi';
import {
  hasValue,
  isLegacyAi,
  isManualField,
  LEGACY_AI_NOTICE,
  originLabel,
  READ_ONLY_TOOLTIP,
  reviewLabel,
} from '../lib/labels';

const FUTURE_ACTIONS = ['Mantieni questo valore', 'Modifica', 'Migliora con AI', 'Scarta'];

function DisabledActions() {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {FUTURE_ACTIONS.map((action) => (
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

export default function FieldCard({ field }: { field: AdminField }) {
  const legacyAi = isLegacyAi(field);
  const manual = isManualField(field);
  const baselineDiffers =
    hasValue(field.baselineValue) &&
    JSON.stringify(field.baselineValue) !== JSON.stringify(field.value);

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

      <div className="mb-3">
        <ValueDisplay value={field.value} label={field.label} />
      </div>

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

      {legacyAi && <DisabledActions />}
    </article>
  );
}
