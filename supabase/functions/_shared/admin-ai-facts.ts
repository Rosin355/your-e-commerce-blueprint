/** Pack free prose into the existing bounded transport without truncating it. */
export function factsFromText(text: string, confirmed: boolean): string[] {
  const lines = text.trim().split(/\n+/u).map(s => s.trim()).filter(Boolean);
  if (lines.every(s => s.length >= 12 && s.length <= 500) && lines.length <= 12) return confirmedFacts(lines, confirmed);
  const rows: string[] = [];
  for (const line of lines) {
    for (const sentence of line.split(/(?<=[.!?;])\s+/u)) {
      if (sentence.length > 500) throw new Error('Dividi la frase di oltre 500 caratteri con un punto o un ritorno a capo.');
      const last = rows.length - 1;
      if (last >= 0 && rows[last].length + sentence.length + 1 <= 500) rows[last] += ' ' + sentence;
      else rows.push(sentence);
    }
  }
  return confirmedFacts(rows, confirmed);
}
export function confirmedFacts(raw: unknown, confirmed: unknown): string[] {
  if (confirmed !== true) throw new Error('Conferma le informazioni prima di chiedere una proposta.');
  if (!Array.isArray(raw) || !raw.length || raw.length > 12) {
    throw new Error('Inserisci da 1 a 12 righe di informazioni verificate.');
  }
  const facts = raw.map((line, i) => {
    if (typeof line !== 'string' || line.trim().length < 12 || line.length > 500) {
      throw new Error(`La riga ${i + 1} deve contenere da 12 a 500 caratteri. Puoi dividere un paragrafo lungo su più righe.`);
    }
    if (/[<>]|\S+@\S+|https?:\/\//i.test(line)) {
      throw new Error(`Rimuovi link, indirizzi email e markup dalla riga ${i + 1}.`);
    }
    return line.trim();
  });
  return [...new Set(facts)];
}
