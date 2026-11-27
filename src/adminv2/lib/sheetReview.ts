import type { SheetKey, SheetPreview, SheetRow } from './draftSheet';

/** Review state of one proposal. AI output is never "accepted" until a person accepts it. */
export type ReviewStatus = 'proposed' | 'manual' | 'accepted' | 'rejected' | 'missing';
export type ReviewMap = Partial<Record<SheetKey, ReviewStatus>>;

export const reviewLabels: Record<ReviewStatus, string> = {
  proposed: 'Proposta AI · da revisionare',
  manual: 'Modificato a mano · da accettare',
  accepted: 'Accettato · bloccato contro la rigenerazione',
  rejected: 'Rifiutato · non verrà applicato',
  missing: 'Valore mancante o non verificato',
};

export function reviewStatus(row: SheetRow | undefined, map: ReviewMap, key: SheetKey): ReviewStatus {
  const explicit = map[key];
  if (explicit === 'accepted' || explicit === 'rejected') return explicit;
  if (!row || row.value === undefined || row.reason) return 'missing';
  return row.source === 'manual' ? 'manual' : 'proposed';
}

/**
 * Regenerating one field replaces only that row. Accepted rows are never overwritten,
 * and an invalid fresh proposal leaves the previous row untouched.
 */
export function mergeRegenerated(rows: SheetPreview, map: ReviewMap, key: SheetKey, fresh: SheetRow | undefined) {
  if (map[key] === 'accepted') return { rows, map, changed: false };
  if (!fresh || fresh.value === undefined || fresh.reason) return { rows, map, changed: false };
  const nextMap = { ...map };
  delete nextMap[key];
  return { rows: { ...rows, [key]: { ...fresh, excluded: false } }, map: nextMap, changed: true };
}

export function setReview(map: ReviewMap, key: SheetKey, status: 'accepted' | 'rejected' | null): ReviewMap {
  const next = { ...map };
  if (status) next[key] = status; else delete next[key];
  return next;
}

/** Only accepted rows can be applied to the local draft. */
export function acceptedKeys(rows: SheetPreview, map: ReviewMap, keys: readonly SheetKey[]) {
  return keys.filter(key => map[key] === 'accepted' && rows[key]?.value !== undefined && !rows[key]?.reason);
}

/** Fields shown in the editor that AI must never fill; they stay manual with per-field source confirmation. */
export const manualOnlySections = [
  { label: 'Periodi botanici (fioritura, messa a dimora, raccolta, potatura)', reason: 'Solo selezione manuale con conferma della fonte: l’AI non propone mesi.' },
  { label: 'Dimensioni, resistenza al freddo, esposizione', reason: 'Solo da fatti confermati inseriti a mano nelle informazioni botaniche.' },
  { label: 'SKU, prezzi, varianti, inventario', reason: 'Mai generati dall’AI; restano nei campi commerciali della bozza.' },
] as const;
