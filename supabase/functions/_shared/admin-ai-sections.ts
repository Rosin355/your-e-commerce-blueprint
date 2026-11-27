import { sanitizeEditorialHtml } from './vendor/editorial-html.mjs';

export const descriptionHeadings = [
  'Introduzione',
  'Descrizione botanica',
  'Fogliame e caratteristiche distintive',
  'Fioritura',
  'Portamento e sviluppo',
  'Coltivazione e manutenzione',
  'Utilizzo ornamentale',
  'Caratteristiche principali',
] as const;
export type Heading = typeof descriptionHeadings[number];
export const isHeading = (name: unknown): name is Heading =>
  typeof name === 'string' && (descriptionHeadings as readonly string[]).includes(name);
export interface EditorialSection {
  heading: Heading;
  text: string;
  factIndices: number[];
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (text: string) => escape(text).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

export function renderSections(sections: Pick<EditorialSection, 'heading' | 'text'>[], rich: boolean) {
  if (!rich) {
    return sections.map((s) =>
      (s.heading === 'Introduzione' ? '' : s.heading + '\n\n') + s.text.replace(/\*\*/g, '')
    ).join('\n\n');
  }
  return sanitizeEditorialHtml(
    sections.map((s) => {
      const title = s.heading === 'Introduzione' ? '' : '<h2>' + escape(s.heading) + '</h2>';
      return title + s.text.trim().split(/\n\s*\n/).map((paragraph) => {
        const lines = paragraph.split('\n');
        if (lines.every((line) => /^-\s+/.test(line))) {
          return '<ul>' + lines.map((line) => '<li>' + inline(line.replace(/^-\s+/, '')) + '</li>').join('') +
            '</ul>';
        }
        return '<p>' + inline(lines.join(' ')) + '</p>';
      }).join('');
    }).join(''),
  );
}
