/**
 * Logica di merge non distruttiva per l'import CSV del catalogo (Fase 0).
 *
 * Principio unico: **"assenza del dato nel file sorgente" non significa
 * "l'utente vuole cancellare il dato esistente"**.
 *
 * Modulo puro: nessun accesso a rete, DB o runtime specifico — così è
 * importabile sia dalle Edge Function Deno sia dai test Node.
 */

/** Chiavi metafield compilate a mano dal cliente: un import non le tocca MAI. */
export const PROTECTED_METAFIELD_KEYS: readonly string[] = [
  "ibridatore",
  "colore_fiore",
  "colore_foglia",
  "curiosita",
  "nome_comune",
];

/**
 * Colonne che l'import può aggiornare, ma solo quando la sorgente porta un
 * valore reale. Se la sorgente è vuota/assente si conserva il valore esistente.
 */
export const SOURCE_CONTROLLED_COLUMNS: readonly string[] = [
  "title",
  "description",
  "short_description",
  "handle",
  "vendor",
  "product_type",
  "parent_sku",
  "price",
  "compare_at_price",
  "barcode",
  "weight_grams",
  "inventory_quantity",
  "tags",
  "product_category",
  "product_category_id",
  "image_urls",
];

/**
 * Un valore sorgente è "reale" solo se porta informazione.
 * Stringa vuota, array vuoto, oggetto vuoto, null e undefined NON lo sono:
 * sono assenza di dato, non richiesta di cancellazione.
 */
export function hasSourceValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

/**
 * Fonde i metafield preservando sempre quelli già presenti nel DB.
 * - parte dai valori esistenti;
 * - sovrascrive solo con chiavi sorgente che portano un valore reale;
 * - non tocca mai le chiavi protette (compilate a mano dal cliente);
 * - non rimuove mai una chiave esistente.
 */
export function mergeMetafields(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(existing ?? {}) };
  if (!incoming || typeof incoming !== "object") return merged;

  for (const [key, value] of Object.entries(incoming)) {
    if (PROTECTED_METAFIELD_KEYS.includes(key)) continue;
    if (!hasSourceValue(value)) continue;
    merged[key] = value;
  }
  return merged;
}

export type FieldAction = "CREATE" | "UPDATE" | "KEEP" | "PROTECTED" | "SKIP EMPTY";

export interface FieldPlan {
  sku: string;
  field: string;
  dbValue: unknown;
  sourceValue: unknown;
  action: FieldAction;
}

/**
 * Costruisce la riga finale da scrivere + il piano leggibile delle azioni.
 *
 * `sourceRow` contiene solo le colonne mappate dal CSV; `existingRow` è la riga
 * attualmente in DB (null se lo SKU è nuovo). Il risultato è omogeneo — stesse
 * colonne per ogni riga — così resta compatibile con un singolo upsert batch.
 */
export function buildCatalogRowPatch(
  sourceRow: Record<string, unknown>,
  existingRow: Record<string, unknown> | null,
): { payload: Record<string, unknown>; plan: FieldPlan[] } {
  const sku = String(sourceRow.sku ?? "").trim();
  const isNew = !existingRow;
  const payload: Record<string, unknown> = { sku };
  const plan: FieldPlan[] = [];

  for (const column of SOURCE_CONTROLLED_COLUMNS) {
    const sourceValue = sourceRow[column];
    const dbValue = existingRow ? existingRow[column] : undefined;

    if (hasSourceValue(sourceValue)) {
      payload[column] = sourceValue;
      plan.push({
        sku,
        field: column,
        dbValue,
        sourceValue,
        action: isNew ? "CREATE" : "UPDATE",
      });
    } else {
      // Nessun valore reale nella sorgente: si conserva quello in DB.
      payload[column] = isNew ? null : dbValue ?? null;
      plan.push({
        sku,
        field: column,
        dbValue,
        sourceValue,
        action: isNew ? "CREATE" : hasSourceValue(dbValue) ? "KEEP" : "SKIP EMPTY",
      });
    }
  }

  // metafields: merge, mai sostituzione in blocco.
  const existingMf = (existingRow?.metafields ?? null) as Record<string, unknown> | null;
  const incomingMf = (sourceRow.metafields ?? null) as Record<string, unknown> | null;
  const mergedMf = mergeMetafields(existingMf, incomingMf);
  payload.metafields = mergedMf;

  const protectedHits = PROTECTED_METAFIELD_KEYS.filter((k) => hasSourceValue(existingMf?.[k]));
  plan.push({
    sku,
    field: "metafields",
    dbValue: existingMf,
    sourceValue: incomingMf,
    action: isNew
      ? "CREATE"
      : protectedHits.length > 0
        ? "PROTECTED"
        : hasSourceValue(incomingMf)
          ? "UPDATE"
          : "KEEP",
  });

  return { payload, plan };
}
