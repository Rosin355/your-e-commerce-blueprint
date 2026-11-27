import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { descriptionHeadings, type Heading } from '../../../supabase/functions/_shared/admin-ai-sections';
import { type SectionReview } from '../lib/descriptionReview';
const labels = {
  proposed: 'Proposta',
  manual: 'Modificata a mano',
  rejected: 'Rifiutata',
  accepted: 'Accettata',
};
export default function DescriptionSections({ sections, disabled, onChange, onRegenerate }: {
  sections: SectionReview[];
  disabled: boolean;
  onChange: (sections: SectionReview[]) => void;
  onRegenerate: (heading: Heading) => void;
}) {
  const [selected, setSelected] = useState<Heading>();
  const absent = descriptionHeadings.filter((h) => !sections.some((s) => s.heading === h));
  const target = selected && absent.includes(selected) ? selected : absent[0];
  function update(section: SectionReview, change: Partial<SectionReview>) {
    onChange(sections.map((s) => s.heading === section.heading ? { ...s, ...change } : s));
  }
  return (
    <div className='space-y-3'>
      {sections.map((s) => (
        <fieldset key={s.heading} disabled={disabled} className='space-y-2 rounded border p-3'>
          <legend className='px-1 font-medium'>{s.heading}</legend>
          <label className='block text-sm'>
            {labels[s.status]}
            <Textarea
              aria-label={'Testo · ' + s.heading}
              disabled={s.status === 'accepted' || s.status === 'rejected'}
              value={s.text}
              onChange={(e) =>
                update(s, { text: e.target.value, status: 'manual' })}
            />
          </label>
          <div className='flex flex-wrap gap-2'>
            {s.status === 'accepted'
              ? (
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => update(s, { status: 'manual' })}
                >
                  Sblocca sezione
                </Button>
              )
              : (
                <>
                  {s.status !== 'rejected' && (
                    <Button
                      type='button'
                      variant='outline'
                      disabled={!s.text.trim()}
                      onClick={() => update(s, { status: 'accepted' })}
                    >
                      Accetta sezione
                    </Button>
                  )}
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={() =>
                      update(s, { status: s.status === 'rejected' ? 'manual' : 'rejected' })}
                  >
                    {s.status === 'rejected' ? 'Ripristina sezione' : 'Rifiuta sezione'}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() =>
                      onRegenerate(s.heading)}
                  >
                    Rigenera {s.heading}
                  </Button>
                </>
              )}
          </div>
        </fieldset>
      ))}
      {target && (
        <div className='flex flex-wrap items-center gap-2'>
          <label>
            Sezione da recuperare{' '}
            <select
              disabled={disabled}
              value={target}
              onChange={(e) => setSelected(e.target.value as Heading)}
            >
              {absent.map((h) => <option key={h}>{h}</option>)}
            </select>
          </label>
          <Button type='button' disabled={disabled} variant='outline' onClick={() => onRegenerate(target)}>
            Genera sezione
          </Button>
        </div>
      )}
    </div>
  );
}
