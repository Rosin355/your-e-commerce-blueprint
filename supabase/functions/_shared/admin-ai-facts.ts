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
