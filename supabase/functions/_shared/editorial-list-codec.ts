/** Reversible wire adapters. Never trim, filter, sort, or guess a legacy format. */
export function decodeEditorialList(value: string, type: string): string[] {
  if (type === 'multi_line_text_field') {
    const items = value.split('\n');
    if (!value || items.some(x => !x || x !== x.trim() || Array.from(x).some(char => char.charCodeAt(0) < 32 && char !== '\t'))) throw Error('Lista multilinea ambigua: originale conservato.');
    // Structured legacy payloads must not become one literal storefront bullet.
    let parsed: unknown;
    try { parsed = JSON.parse(value); } catch { /* Plain lines are the intended format. */ }
    if (parsed !== null && typeof parsed === 'object') throw Error('Formato strutturato legacy non convertibile automaticamente.');
    return items;
  }
  if (!['json','list.single_line_text_field'].includes(type)) throw Error('Tipo elenco non compatibile.');
  const items: unknown = JSON.parse(value);
  if (!Array.isArray(items) || items.some(x => typeof x !== 'string')) throw Error('Lista di testi non verificabile.');
  return items;
}

export function encodeEditorialList(value: string, type: string): string {
  const items = decodeEditorialList(value, 'json');
  if (!items.length || items.length > 50 || items.some(x => !x.trim() || x.length > 1000)) throw Error('Elenco non valido.');
  if (type === 'multi_line_text_field') {
    if (items.some(x => /[\r\n]/.test(x))) throw Error('Una voce multilinea non può essere distinta da più voci.');
    const wire = items.join('\n');
    if (JSON.stringify(decodeEditorialList(wire,type)) !== JSON.stringify(items)) throw Error('Round-trip non esatto.');
    return wire;
  }
  if (type === 'list.single_line_text_field' && items.some(x => /[\r\n]/.test(x))) throw Error('Il tipo richiede voci su una sola riga.');
  if (!['json','list.single_line_text_field'].includes(type)) throw Error('Tipo elenco non compatibile.');
  return JSON.stringify(items);
}
