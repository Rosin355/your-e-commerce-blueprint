export function confirmedFacts(raw: unknown, confirmed: unknown): string[] {
  if (confirmed !== true || !Array.isArray(raw) || !raw.length || raw.length > 12 || raw.some(x => typeof x !== 'string' || x.trim().length < 12 || x.length > 500 || /[<>]|\S+@\S+|https?:\/\//i.test(x))) throw new Error('Fornisci da 1 a 12 informazioni fattuali (12–500 caratteri) e confermale. Non inserire dati personali, link o HTML. Puoi compilare manualmente.');
  return [...new Set(raw.map((x: string) => x.trim()))];
}
