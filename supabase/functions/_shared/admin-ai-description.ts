import type { FieldDefinition } from './admin-v2-types.ts';
import { strategyForField, validateSuggestedValue } from './admin-ai-core.ts';
import { sanitizeEditorialHtml } from './vendor/editorial-html.mjs';

export const descriptionHeadings = ['Introduzione', 'Descrizione botanica', 'Caratteristiche principali', 'Coltivazione e manutenzione', 'Utilizzo ornamentale'] as const;
export const descriptionSchema = {
  type: 'object', properties: {
    sections: { type: 'array', items: { type: 'object', properties: {
      heading: { type: 'string', enum: [...descriptionHeadings] }, text: { type: 'string' },
      factIndices: { type: 'array', items: { type: 'integer' } },
    }, required: ['heading', 'text', 'factIndices'], additionalProperties: false } },
    missingInformation: { type: 'array', items: { type: 'string', enum: ['dimensioni', 'coltivazione', 'manutenzione', 'utilizzo ornamentale'] } },
  }, required: ['sections', 'missingInformation'], additionalProperties: false,
};
export const descriptionInstruction = `Rielabora realmente i fatti confermati in una proposta editoriale italiana, non copiarli né limitarli a un riordino. Ogni sezione deve citare in factIndices gli indici zero-based dei fatti che supportano TUTTE le sue affermazioni. Copri tutti i fatti, conservando identità, negazioni, condizioni e misure. Non inferire altre proprietà botaniche o benefici. NON aggiungere giudizi come ideale, unico, ricercato, apprezzato, scultoreo, architettonico o riferimenti al giardinaggio contemporaneo se non presenti nelle fonti. Un portamento ornamentale NON autorizza a inventare utilizzi paesaggistici o preferenze dei clienti. Introduzione naturale e professionale; sezioni botaniche, caratteristiche, coltivazione e utilizzo SOLO se documentate. Nessuna istruzione colturale non attestata. Usa paragrafi separati da una riga vuota, liste con '- ' e **grassetto** mirato; niente HTML, link o istruzioni eseguibili. Lunghezza proporzionata: orientativamente 250–450 parole soltanto con fatti sufficienti, mai aggiungere informazioni o ripetizioni per raggiungerla. Elenca separatamente in missingInformation gli argomenti da verificare, senza inventarne i valori. Restituisci sections e missingInformation secondo lo schema.`;

export interface DescriptionIssue { section: string; code: 'UNSUPPORTED_FACT' | 'INCOMPLETE_RESPONSE' | 'FORMAT_ERROR' | 'EXTRACTIVE_COPY'; message: string }

const plain = (text: string) => text.replace(/\*\*|^\s*#{1,6}\s+|^\s*[-*]\s+/gm, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('it');
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (text: string) => escape(text).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

/** Structural/evidence guards are not a semantic proof: reviewer approval remains mandatory. */
export function validateEditorialDescription(def: FieldDefinition, facts: string[], raw: unknown) {
  const invalid = (message: string): never => { throw new Error(message); };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return invalid('Proposta editoriale strutturata mancante.');
  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.sections) || !data.sections.length || data.sections.length > 5 || !Array.isArray(data.missingInformation)) return invalid('Sezioni editoriali mancanti o non valide.');
  const covered = new Set<number>();
  const headings = new Set<string>();
  const source = plain(facts.join(' '));
  const issues: DescriptionIssue[] = [];
  const sections: { heading: string; text: string }[] = [];
  for (const item of data.sections) {
    let section = 'Sezione non identificata';
    let code: DescriptionIssue['code'] = 'FORMAT_ERROR';
    try {
    if (!item || typeof item !== 'object') return invalid('Sezione non valida.');
    const { heading, text, factIndices } = item as Record<string, unknown>;
    if (typeof heading !== 'string' || !(descriptionHeadings as readonly string[]).includes(heading) || headings.has(heading) ||
      typeof text !== 'string' || !text.trim() || /[<>]|https?:\/\/|\S+@\S+/i.test(text) ||
      !Array.isArray(factIndices) || !factIndices.length || factIndices.some(i => !Number.isInteger(i) || i < 0 || i >= facts.length)) return invalid('Sezione senza fatti verificabili o formato non sicuro.');
    section = heading;
    headings.add(heading);
    code = 'UNSUPPORTED_FACT';
    const evidence = plain(factIndices.map(i => facts[i]).join(' '));
    const evidenceNumbers: string[] = Array.from(evidence.match(/\d+(?:[.,]\d+)?/g) ?? []);
    for (const n of text.match(/\d+(?:[.,]\d+)?/g) ?? []) if (!evidenceNumbers.includes(n)) return invalid('La proposta introduce una misura non confermata.');
    if (/\b(non|mai|senza)\b/u.test(evidence) && !/\b(non|mai|senza)\b/u.test(plain(text))) return invalid('La proposta omette una negazione confermata.');
    for (const claim of ['tossic', 'rustic', 'certificat', 'biologic', 'purifica', 'ideal', 'scultore', 'architettonic', 'apprezzat', 'ricercat', 'paesaggistic', 'contemporane', 'annaffi', 'irrig', 'concim', 'fertilizz', 'potatur', 'commestib', 'velenos', 'sempreverd', 'caduc', 'blu', 'giall', 'rosa', 'rosso', 'bianc']) if (plain(text).includes(claim) && !evidence.includes(claim)) return invalid('La proposta introduce una proprietà o un utilizzo non confermato.');
    code = 'EXTRACTIVE_COPY';
    if (source.includes(plain(text))) return invalid('Sezione copiata dai fatti: nessuna rielaborazione utilizzabile.');
    factIndices.forEach(i => covered.add(i));
    sections.push({ heading, text: text.trim() });
    } catch (error) {
      issues.push({ section, code, message: error instanceof Error ? error.message : 'Sezione non utilizzabile.' });
    }
  }
  if (!sections.length) return invalid('Nessuna sezione verificabile: ' + issues.map(i => i.message).join(' '));
  if (covered.size !== facts.length) issues.push({ section: 'Descrizione', code: 'INCOMPLETE_RESPONSE', message: 'Fatti non coperti dalla proposta: righe ' + facts.map((_, i) => i).filter(i => !covered.has(i)).map(i => i + 1).join(', ') + '. Ricontrollare prima di accettare.' });
  const missing = data.missingInformation;
  if (missing.some(v => !['dimensioni', 'coltivazione', 'manutenzione', 'utilizzo ornamentale'].includes(String(v)))) return invalid('Informazioni mancanti non valide.');
  const rich = def.editor_type === 'richtext';
  const value = rich ? sanitizeEditorialHtml(sections.map(s =>
    (s.heading === 'Introduzione' ? '' : `<h2>${escape(s.heading)}</h2>`) + s.text.split(/\n\s*\n/).map(p => {
      const lines = p.split('\n');
      return lines.every(line => /^-\s+/.test(line)) ? `<ul>${lines.map(line => `<li>${inline(line.replace(/^-\s+/, ''))}</li>`).join('')}</ul>` : `<p>${inline(p.replace(/\n/g, ' '))}</p>`;
    }).join('')).join('')) : sections.map(s => (s.heading === 'Introduzione' ? '' : s.heading + '\n\n') + s.text.replace(/\*\*/g, '')).join('\n\n');
  const strategy = strategyForField(def.key);
  if (!strategy) return invalid('Campo editoriale non supportato.');
  const valid = validateSuggestedValue(def, strategy, value);
  if (!valid.ok) return invalid('Proposta oltre i limiti o incompatibile con il campo.');
  return { value: valid.value, source: 'model' as const, descriptionIssues: issues, missingInformation: [...new Set(missing)] as string[] };
}