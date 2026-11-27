import {
  descriptionHeadings,
  type EditorialSection,
  type Heading,
} from '../../../supabase/functions/_shared/admin-ai-sections';

export interface SectionReview extends EditorialSection {
  status: 'proposed' | 'manual' | 'accepted' | 'rejected';
}
export function replaceSection(
  sections: SectionReview[],
  target: Heading,
  fresh?: EditorialSection,
): SectionReview[] {
  if (
    !fresh || fresh.heading !== target || !fresh.text.trim() ||
    sections.some((s) => s.heading === target && s.status === 'accepted')
  ) return sections;
  const next: SectionReview = { ...fresh, status: 'proposed' };
  return sections.filter((s) => s.heading !== target).concat(next).sort((a, b) =>
    descriptionHeadings.indexOf(a.heading) - descriptionHeadings.indexOf(b.heading)
  );
}
export const activeSections = (sections: SectionReview[]) =>
  sections.filter((s) => s.status !== 'rejected' && s.text.trim());
export const allSectionsReviewed = (sections: SectionReview[]) =>
  activeSections(sections).length > 0 &&
  sections.every((s) => s.status === 'accepted' || s.status === 'rejected');
