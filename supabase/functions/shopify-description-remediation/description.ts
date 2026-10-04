const FORBIDDEN = [
  /<\s*\/?\s*(script|style|iframe|object|embed|form|svg|math)\b/i,
  /\son[a-z]+\s*=/i,
  /(?:href|src)\s*=\s*["']?\s*javascript:/i,
  /<\?(?:php|=)?|<%|%>/i,
];

/**
 * Normalizzazione tecnica conservativa dell'ORIGINAL approvato.
 * Non modifica parole o punteggiatura: converte solo newline e il tag BR
 * malformato osservato nello scale-out. Qualsiasi codice attivo o markup
 * non deterministico viene bloccato, non "riparato" euristicamente.
 */
export function normalizeApprovedOriginalDescription(value: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("APPROVED_DESCRIPTION_EMPTY");
  }
  if (
    value.includes(String.fromCharCode(0)) ||
    FORBIDDEN.some((pattern) => pattern.test(value))
  ) {
    throw new Error("APPROVED_DESCRIPTION_CORRUPTED");
  }
  const normalized = value
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/<\s*br\s*\/\s*>/gi, "<br>")
    .replace(/<\s*br\s*>/gi, "<br>")
    .trim();
  const withoutTags = normalized.replace(/<\/?[A-Za-z][^<>]*>/g, "");
  if (/[<>]/.test(withoutTags)) {
    throw new Error("APPROVED_DESCRIPTION_AMBIGUOUS_MARKUP");
  }
  return normalized;
}

export function canonicalDescription(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}
