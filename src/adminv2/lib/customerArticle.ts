import type { EditorialSection, Heading } from '../../../supabase/functions/_shared/admin-ai-sections';
import { descriptionHeadings, isHeading, renderSections, suggestionHeading } from '../../../supabase/functions/_shared/admin-ai-sections';
import {
  analyzeFacts,
  countEditorialWords,
  factCoverage,
  normalize,
  unsupportedSection,
} from '../../../supabase/functions/_shared/admin-ai-evidence';
import {
  type EditorialKey,
  editorialKeys,
  type EditorialProposal,
} from '../../../supabase/functions/_shared/admin-draft-editorial';
import { isFieldEditable, validateValue } from '../../../supabase/functions/_shared/admin-v2-validation';
import type { ProductDraft } from '../../../supabase/functions/_shared/admin-operational-core';
import { reasonUnavailable, type SheetChange, type SheetContext, sheetDefinition, sheetValueError } from './draftSheet';
import { type EvidenceKey, evidenceLabels } from './sheetEvidence';

export const extraLabels = {
  shortDescription: 'Descrizione breve',
  ...evidenceLabels,
  curiosity: 'Curiosità botaniche',
  seoTitle: 'Titolo SEO',
  seoDescription: 'Meta description SEO',
  tags: 'Tag',
};
export type ArticleKey = Heading | keyof typeof extraLabels;
export interface ArticleRow {
  key: ArticleKey;
  text: string;
  factIndices: number[];
  origin: 'model' | 'derived' | 'manual';
}
export const rowLabel = (key: ArticleKey) => isHeading(key) ? key : extraLabels[key];
export const isSeo = (key: ArticleKey): key is EditorialKey => editorialKeys.some((k) => k === key);
export const isStructured = (key: ArticleKey): key is EvidenceKey =>
  Object.prototype.hasOwnProperty.call(evidenceLabels, key);
const questions: Partial<Record<Heading, string>> = {
  'Fioritura': 'Come si presenta la fioritura?',
  'Fogliame e caratteristiche distintive': 'Come si riconosce il fogliame?',
  'Coltivazione e manutenzione': 'Quali condizioni di coltivazione predilige?',
  'Portamento e sviluppo': 'Qual è il portamento della pianta?',
};
const clean = (s: string) => s.replace(/\*\*/g, '').replace(/^\s*-\s+/gm, '').trim();
const sentences = (s: string) => clean(s).split(/(?<=[.!?])\s+(?=[\p{Lu}])/u).filter(Boolean);
export { suggestionHeading } from '../../../supabase/functions/_shared/admin-ai-sections';
export function historicalText(input: string) {
  const plain = (s: string) =>
    s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<\/(?:p|div|li)>|<br\s*\/?>/gi, '\n').replace(
      /<[^>]+>/g,
      ' ',
    ).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
  if (!input.trim().startsWith('{')) return plain(input);
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(input);
  } catch {
    throw new Error('Il JSON WooCommerce è incompleto. Incolla il testo oppure un prodotto JSON valido.');
  }
  if (!data || Array.isArray(data) || typeof data !== 'object') {
    throw new Error('Incolla un singolo prodotto WooCommerce.');
  }
  const content: string[] = [];
  const read = (original: string, value: unknown) => {
    const name = original.toLowerCase().replace(/^meta:\s*/, '');
    const key = name === 'descrizione' ? 'description' : name === 'breve descrizione' ? 'short_description' : name;
    if (
      ![
        'description',
        'short_description',
        'post_content',
        'post_excerpt',
        'key_features',
        'key_benefits',
        'faq',
        'curiosita',
        'care_guide',
        'nome_botanico',
        'nome_comune',
        'plant_knowledge',
        'origins_habitat',
      ].includes(key)
    ) return;
    for (const part of Array.isArray(value) ? value : [value]) {
      if (key === 'faq' && part && typeof part.question === 'string' && typeof part.answer === 'string') {
        content.push('FAQ: ' + plain(part.question) + ' ' + plain(part.answer));
      } else if (typeof part === 'string' && part.trim()) {
        content.push(
          (key === 'key_benefits' ? 'Punto di forza: ' : key === 'curiosita' ? 'Curiosità: ' : '') + plain(part),
        );
      }
    }
  };
  for (const [k, v] of Object.entries(data)) read(k, v);
  if (data.acf && typeof data.acf === 'object') { for (const [k, v] of Object.entries(data.acf)) read(k, v); }
  if (Array.isArray(data.meta_data)) {
    for (const m of data.meta_data) if (m && typeof m.key === 'string') read(m.key, m.value);
  }
  if (!content.length) throw new Error('Il prodotto WooCommerce non contiene campi editoriali riconosciuti.');
  return [...new Set(content)].join('\n');
}
export function articleRows(
  sections: EditorialSection[],
  facts: string[],
  editorial: Partial<Record<EditorialKey, EditorialProposal>> = {},
) {
  const analysis = analyzeFacts(facts);
  const rows: ArticleRow[] = sections.map((s) => ({
    key: s.heading,
    text: s.text,
    factIndices: s.factIndices,
    origin: s.origin ?? 'model',
  }));
  function add(key: ArticleKey, text: string, indices: number[], origin: ArticleRow['origin'] = 'derived') {
    if (text.trim()) rows.push({ key, text, factIndices: [...new Set(indices)], origin });
  }
  const intro = sections.find((s) => s.heading === 'Introduzione');
  if (intro) {
    const trait = sections.find((s) => s.heading === 'Fogliame e caratteristiche distintive') ??
      sections.find((s) => s.heading === 'Fioritura');
    const first = sentences(intro.text)[0];
    const second = trait ? sentences(trait.text)[0] : sentences(intro.text)[1];
    const short = second && first !== second && (first + ' ' + second).length <= 320 ? first + ' ' + second : first;
    if (short && short.length <= 320 && /[.!?]$/.test(short)) {
      add('shortDescription', short, [...intro.factIndices, ...(trait?.factIndices ?? [])]);
    }
  }
  const usable = analysis.filter((f) => !f.exclusion);
  const distinct = sections.filter((s) =>
    ['Fogliame e caratteristiche distintive', 'Fioritura', 'Portamento e sviluppo', 'Caratteristiche principali']
      .includes(s.heading)
  );
  add('key_features', distinct.map((s) => sentences(s.text)[0]).join('\n'), distinct.flatMap((s) => s.factIndices));
  const benefits = usable.filter((f) => /^Punto di forza\s*:/i.test(f.text));
  const use = sections.find((s) => s.heading === 'Utilizzo ornamentale');
  const merit = use ??
    sections.find((s) =>
      sentences(s.text).some((line) => /apprezzat[oa] in orticoltura|interesse ornamentale/.test(line))
    );
  const documentedMerit = use
    ? clean(use.text)
    : merit
    ? sentences(merit.text).find((line) => /apprezzat[oa] in orticoltura|interesse ornamentale/.test(line))
    : undefined;
  add(
    'key_benefits',
    benefits.length
      ? benefits.map((f) => f.text.replace(/^Punto di forza\s*:\s*/i, '')).join('\n')
      : documentedMerit ?? '',
    benefits.length ? benefits.map((f) => f.row) : merit?.factIndices ?? [],
  );
  const pairs = usable.filter((f) => /^FAQ\s*:.*\?\s+\S/i.test(f.text));
  const answers = sections.filter((s) => questions[s.heading]);
  add(
    'faq',
    [
      ...pairs.map((f) => f.text.replace(/^FAQ\s*:\s*/i, '')),
      ...answers.map((s) => questions[s.heading] + ' ' + sentences(s.text).slice(0, 2).join(' ')),
    ].join('\n'),
    [...pairs.map((f) => f.row), ...answers.flatMap((s) => s.factIndices)],
  );
  const curiosity = distinct.find((s) => s.heading === 'Fogliame e caratteristiche distintive');
  const explicit = usable.filter((f) => /^curiosità\s*:/iu.test(f.text));
  if (explicit.length) {
    add(
      'curiosity',
      explicit.map((f) => f.text.replace(/^curiosità\s*:\s*/iu, '')).join('\n'),
      explicit.map((f) => f.row),
    );
  } else if (curiosity) {
    add(
      'curiosity',
      sentences(curiosity.text).filter((s) => /distint|riconosc|filament|peculiar/i.test(s)).slice(0, 1).join(''),
      curiosity.factIndices,
    );
  }
  for (const k of editorialKeys) {
    const row = editorial[k];
    if (row) {
      add(
        k,
        Array.isArray(row.value) ? row.value.join('\n') : row.value,
        [],
        row.source === 'model' ? 'model' : 'derived',
      );
    }
  }
  return rows;
}
export function articleSections(rows: ArticleRow[]) {
  return descriptionHeadings.flatMap((heading) =>
    rows.filter((r) => r.key === heading).map((r) => ({ heading, text: r.text, factIndices: r.factIndices }))
  );
}
export const faqPairs = (text: string) =>
  text.split('\n').flatMap((line) => {
    const pair = /^(.+?\?)\s+(.+)$/.exec(line.trim());
    return pair ? [{ question: pair[1], answer: pair[2] }] : [];
  });
export function rowValue(row: ArticleRow) {
  if (row.key === 'faq') return faqPairs(row.text);
  if (['tags', 'key_features', 'key_benefits'].includes(row.key)) {
    return row.text.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  return row.text;
}
export function unavailable(key: ArticleKey, ctx: SheetContext) {
  if (key === 'curiosity') return 'La bozza interna non ha un campo Curiosità. La proposta resta solo in anteprima.';
  if (isStructured(key)) {
    const def = ctx.definitions.find((d) => d.key === key);
    if (!ctx.canFillDraft || !def || def.manual_only || !isFieldEditable(def).ok || !ctx.editableKeys.includes(key)) {
      return 'Mapping della bozza o permesso di modifica non disponibile.';
    }
    return;
  }
  return reasonUnavailable(isHeading(key) ? 'description' : key, ctx);
}
export function articleAssessment(rows: ArticleRow[], facts: string[]) {
  const analysis = analyzeFacts(facts);
  const sections = articleSections(rows);
  const coverage = factCoverage(analysis, sections);
  const covered = coverage.filter((f) => f.status === 'included' || f.status === 'equivalent').length;
  const missing = coverage.filter((f) => f.status === 'uncovered');
  const distinct = coverage.filter(f => !f.exclusion && f.duplicateOf === undefined);
  const problems = sections.flatMap((s) => {
    const reason = unsupportedSection(s.text, analysis.filter((f) => s.factIndices.includes(f.row)));
    return reason ? [s.heading + ' · ' + reason] : [];
  });
  if (!sections.some((s) => s.heading === 'Introduzione')) problems.push('Introduzione da recuperare.');
  const required: Heading[] = ['Descrizione botanica', 'Coltivazione e manutenzione'];
  for (const heading of required) {
    const supported = analysis.some(f => !f.exclusion && (heading === 'Descrizione botanica'
      ? /\b(?:specie|originari[oa]|provenienza|nome botanico|cultivar|famiglia)\b/iu.test(f.text)
      : suggestionHeading(f.text) === heading));
    if (supported && !sections.some(s => s.heading === heading)) problems.push(heading + ' da recuperare.');
  }
  return {
    coverage,
    covered,
    missing,
    distinctUsable: distinct.length,
    distinctCovered: distinct.filter(f => f.status === 'included' || f.status === 'equivalent').length,
    problems,
    words: sections.reduce((n, s) => n + countEditorialWords(s.text), 0),
  };
}
export function application(rows: ArticleRow[], ctx: SheetContext) {
  const change: SheetChange = {};
  const botanical: Record<string, unknown> = {};
  const errors: string[] = [];
  const sections = articleSections(rows);
  const description = renderSections(sections, sheetDefinition('description', ctx)?.editor_type === 'richtext');
  const reason = sheetValueError('description', description, ctx);
  if (reason) errors.push(reason);
  else change.description = description;
  for (const row of rows) {
    const k = row.key;
    if (isHeading(k) || k === 'curiosity' || unavailable(k, ctx)) continue;
    const value = rowValue(row);
    if (isStructured(k)) {
      const def = ctx.definitions.find((d) => d.key === k)!;
      if (
        k === 'faq' && faqPairs(row.text).length !== row.text.trim().split('\n').length || !validateValue(def, value).ok
      ) errors.push(rowLabel(k) + ' · valore non valido.');
      else botanical[k] = value;
    } else {
      const v = k === 'tags' ? row.text.split('\n').map((s) => s.trim()) : row.text;
      const error = sheetValueError(k, v, ctx);
      if (error) errors.push(rowLabel(k) + ' · ' + error);
      else if (k === 'tags') change.tags = v as string[];
      else change[k] = row.text;
    }
  }
  return { change, botanical, errors };
}
export function categoryMatches(options: { id: string; title: string }[], facts: string[], title: string) {
  const text = ' ' + normalize([
    title,
    ...analyzeFacts(facts).filter((f) => !f.exclusion).map((f) => f.text),
  ].join(' ')).replace(/[^\p{L}\d]+/gu, ' ') + ' ';
  return options.filter((o) => text.includes(' ' + normalize(o.title) + ' '));
}
export function editorialSnapshot(d: ProductDraft) {
  return JSON.stringify([
    d.title,
    d.description,
    d.shortDescription,
    d.seoTitle,
    d.seoDescription,
    d.tags,
    d.botanical,
    d.collectionIds,
  ]);
}
