// F6 — Traduzioni e stati leggibili. Nessuna terminologia tecnica in UI.
import type { AdminField, ProductSummary } from './adminApi';

export const ENTITY_LABEL: Record<string, string> = {
  simple: 'Prodotto singolo',
  variable: 'Prodotto con varianti',
  variation: 'Variante',
};

export const ORIGIN_LABEL: Record<string, string> = {
  manual: 'Inserito manualmente',
  legacy_db_baseline: 'Importato dal sistema precedente',
  legacy_ai_unknown_approval: 'Generato con AI (sistema precedente)',
  ai: 'Generato con AI',
  import: 'Importato',
  shopify: 'Proveniente da Shopify',
};

export const REVIEW_LABEL: Record<string, string> = {
  approved: 'Confermato',
  review_required: 'Da verificare',
  legacy_unverified: 'Da verificare',
  rejected: 'Scartato',
};

export const LEGACY_AI_NOTICE =
  'Questo contenuto proviene dal sistema precedente e non è ancora stato confermato.';

export const READ_ONLY_TOOLTIP =
  'Le modifiche saranno abilitate dopo il completamento dei test di sicurezza.';

export const INVENTORY_NOTICE =
  'L’inventario sarà gestito tramite Shopify dall’Admin Online Garden in una fase successiva.';

export const MANUAL_FIELD_KEYS = [
  'nome_comune',
  'ibridatore',
  'colore_fiore',
  'colore_foglia',
  'curiosita',
];

export function originLabel(origin: string | null): string {
  if (!origin) return 'Origine non indicata';
  return ORIGIN_LABEL[origin] ?? 'Importato';
}

export function reviewLabel(status: string | null): string {
  if (!status) return 'Confermato';
  return REVIEW_LABEL[status] ?? 'Confermato';
}

export function isLegacyAi(field: AdminField): boolean {
  return field.reviewStatus === 'legacy_unverified';
}

export function isManualField(field: AdminField): boolean {
  return field.origin === 'manual' || field.manualOnly || MANUAL_FIELD_KEYS.includes(field.key);
}

export function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

/** Stati sintetici mostrati nella lista prodotti. */
export function productStates(p: ProductSummary): string[] {
  const states: string[] = [];
  if (p.contentStatus === 'completo') states.push('Completo');
  else states.push('Da completare');
  if (p.reviewPendingCount > 0) states.push('Da verificare');
  if (!p.categoryEffective) states.push('Da classificare');
  if (p.shopifyStatus === 'Errore') states.push('Errore');
  else if (p.shopifyStatus === 'Sincronizzato') states.push('Aggiornato');
  else if (p.shopifyStatus === 'In attesa') states.push('Sincronizzazione in attesa');
  else states.push('Sincronizzazione non verificata');
  return states;
}

export function stateTone(state: string): 'ok' | 'warn' | 'bad' | 'neutral' {
  if (state === 'Completo' || state === 'Aggiornato') return 'ok';
  if (state === 'Errore') return 'bad';
  if (state === 'Da verificare' || state === 'Da classificare' || state === 'Da completare') return 'warn';
  return 'neutral';
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value),
    );
  } catch {
    return '—';
  }
}

export function siteState(live: { available: boolean; publicationStatus?: string | null; siteAvailability?: boolean | null; siteVisible?: boolean | null }, operation?: string, mapped?: boolean) {
  if (live.available) {
    if (live.publicationStatus === 'DRAFT') return 'Bozza Shopify verificata · fuori vendita';
    if (live.publicationStatus === 'ARCHIVED') return 'Archiviato su Shopify · fuori vendita';
    if (live.siteVisible === false) return 'Non visibile sul canale del sito · fuori vendita';
    if (live.siteAvailability === true) return 'Pubblicato sul sito · disponibile per la vendita';
    if (live.siteAvailability === false) return 'Visibile sul sito · esaurito';
  }
  if (operation === 'LOCAL_DRAFT' && mapped === false) return 'Bozza interna non inviata · fuori vendita';
  return 'Visibilità e disponibilità sul sito da verificare';
}
