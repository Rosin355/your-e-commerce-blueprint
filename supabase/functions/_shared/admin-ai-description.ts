import { articleVersion } from './admin-ai-revision.ts';
import type { FieldDefinition } from './admin-v2-types.ts';
import { strategyForField, validateSuggestedValue } from './admin-ai-core.ts';
import { missingTopics, PROMPT_VERSION } from './admin-ai-editorial-contract.ts';
import {
  descriptionHeadings,
  type EditorialSection,
  type Heading,
  isHeading,
  renderSections,
} from './admin-ai-sections.ts';
import { analyzeFacts, factCoverage, normalize, unsupportedSection } from './admin-ai-evidence.ts';

export interface DescriptionIssue {
  section: string;
  code:
    | 'UNSUPPORTED_FACT'
    | 'INCOMPLETE_RESPONSE'
    | 'FORMAT_ERROR'
    | 'EXTRACTIVE_COPY';
  message: string;
}
export interface DescriptionRequest {
  productName?: string;
  section?: Heading;
  article?: boolean;
  revision?: import('./admin-ai-revision.ts').EditorialRevision;
  review?: boolean;
}

function copiedFromSource(text: string, facts: string[]) {
  const source = normalize(facts.join(' '));
  const proposal = normalize(text);
  if (source.includes(proposal)) return true;
  const words = proposal.split(/\s+/);
  if (words.length < 25) return false;
  // Adding a heading or a short lead to a pasted paragraph is still extractive.
  const spans = words.slice(0, -5).map((_, i) => words.slice(i, i + 6).join(' '));
  return spans.filter((span) => source.includes(span)).length > spans.length * 0.8;
}

export function validateEditorialDescription(
  def: FieldDefinition,
  facts: string[],
  raw: unknown,
  request: DescriptionRequest = {},
) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Proposta editoriale strutturata mancante.');
  }
  const data = raw as Record<string, unknown>;
  if (
    !Array.isArray(data.sections) || data.sections.length > descriptionHeadings.length ||
    !Array.isArray(data.missingInformation) ||
    data.missingInformation.some((v) => !(missingTopics as readonly unknown[]).includes(v))
  ) throw new Error('Formato delle sezioni o delle informazioni mancanti non valido.');
  if (request.section && (data.sections.length !== 1 || data.sections[0]?.heading !== request.section)) {
    throw new Error('La risposta non corrisponde alla singola sezione richiesta.');
  }
  const analysis = analyzeFacts(facts);
  const issues: DescriptionIssue[] = [];
  const sections: EditorialSection[] = [];
  const seen = new Set<Heading>();
  for (const item of data.sections) {
    const { heading, text, factIndices } = item ?? {};
    if (
      !isHeading(heading) || seen.has(heading) || typeof text !== 'string' || !text.trim() ||
      /[<>]|https?:\/\/|\S+@\S+/i.test(text) || !Array.isArray(factIndices) || !factIndices.length ||
      factIndices.some((i) => !Number.isInteger(i) || i < 0 || i >= facts.length)
    ) {
      issues.push({
        section: isHeading(heading) ? heading : 'Descrizione',
        code: 'FORMAT_ERROR',
        message: 'Formato non sicuro, titolo duplicato o fonti mancanti.',
      });
      continue;
    }
    seen.add(heading);
    const cited = analysis.filter((a) => factIndices.includes(a.row) && (!request.article || !a.exclusion));
    const unsupported = unsupportedSection(text, cited);
    if (unsupported) {
      issues.push({ section: heading, code: 'UNSUPPORTED_FACT', message: unsupported });
      continue;
    }
    if (copiedFromSource(text, facts)) {
      issues.push({
        section: heading,
        code: 'EXTRACTIVE_COPY',
        message: 'Testo copiato integralmente. Rielabora la sezione.',
      });
      continue;
    }
    sections.push({ heading, text: text.trim(), factIndices: [...new Set<number>(factIndices)] });
  }
  if (!sections.length && (!request.review || request.section)) {
    throw new Error('Nessuna sezione verificabile. ' + issues.map((i) => i.message).join(' '));
  }
  const coverage = factCoverage(analysis, sections);
  if (!request.section) {
    const omitted = coverage.filter((f) => f.status === 'uncovered');
    if (omitted.length) {
      issues.push({
        section: 'Descrizione',
        code: 'INCOMPLETE_RESPONSE',
        message: omitted.length + ' informazioni da recuperare. Consulta la copertura dei fatti.',
      });
    }
  }
  const strategy = strategyForField(def.key);
  const value = renderSections(sections, def.editor_type === 'richtext');
  if (!strategy || (sections.length && !validateSuggestedValue(def, strategy, value).ok)) {
    throw new Error('Proposta oltre i limiti o incompatibile con il campo.');
  }
  return {
    value,
    source: 'model' as const,
    sections,
    coverage,
    promptVersion: request.article ? articleVersion : PROMPT_VERSION,
    descriptionIssues: issues,
    missingInformation: [...new Set(data.missingInformation)] as string[],
  };
}
