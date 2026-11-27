import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { articleVersion, type EditorialRevision } from '../../../supabase/functions/_shared/admin-ai-revision';
import EditorialText from './EditorialText';
import { isHeading, renderSections } from '../../../supabase/functions/_shared/admin-ai-sections';
import { suggestConfirmedField, suggestDraftEditorial } from '../lib/adminApi';
import { explainAiRequestError } from '../lib/explainAiError';
import { type ArticleRow, isSeo, rowLabel } from '../lib/customerArticle';

export default function ArticleRevisionPanel({ row, mode, facts, title, startingInstruction, onClose, onConfirm }: {
  row: ArticleRow;
  mode: 'manual' | 'ai';
  facts: string[];
  title: string;
  startingInstruction?: string;
  onClose: () => void;
  onConfirm: (next: ArticleRow) => void;
}) {
  const [text, setText] = useState(row.text);
  const [brief, setBrief] = useState(startingInstruction ?? '');
  const [proposal, setProposal] = useState<ArticleRow>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function revise() {
    if (row.key === 'curiosity' || row.key === 'faq') return;
    setBusy(true);
    setError('');
    setProposal(undefined);
    try {
      const target = row.key === 'shortDescription' ? 'short_description' : row.key;
      const revision: EditorialRevision = { target, current: row.text, instruction: brief.trim() || 'Rigenera' };
      const base = { article: true as const, revision, facts, requestKey: crypto.randomUUID() };
      let next: ArticleRow | undefined;
      if (isSeo(row.key)) {
        const response = await suggestDraftEditorial({ ...base, draftTitle: title });
        const v = response.editorial?.[row.key];
        if (response.promptVersion === articleVersion && v?.source === 'model') {
          next = { ...row, text: Array.isArray(v.value) ? v.value.join('\n') : v.value, origin: 'model' };
        }
      } else {
        const heading = isHeading(target) ? target : undefined;
        const response = await suggestConfirmedField({
          ...base,
          confirmed: true,
          fieldKey: heading ? 'description' : target,
          ...(heading ? { section: heading, productName: title } : {}),
        });
        if (response.promptVersion === articleVersion && !response.descriptionIssues?.length) {
          if (heading) {
            const s = response.sections?.length === 1 ? response.sections[0] : undefined;
            if (s?.heading === heading) {
              next = { key: heading, text: s.text, origin: 'model', factIndices: s.factIndices };
            }
          } else if (
            typeof response.value === 'string' ||
            Array.isArray(response.value) && response.value.every((x) => typeof x === 'string')
          ) {
            next = {
              ...row,
              text: Array.isArray(response.value) ? response.value.join('\n') : response.value,
              origin: 'model',
              factIndices: [...facts.keys()],
            };
          }
        }
      }
      if (!next?.text.trim()) {
        throw new Error('Il servizio non ha restituito una revisione V3 valida per questa sezione.');
      }
      setProposal(next);
    } catch (e) {
      setError(e instanceof Error && e.message.startsWith('Il servizio') ? e.message : explainAiRequestError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className='my-3 space-y-3 border-l-2 border-primary bg-muted/40 p-4'
      aria-label={'Modifica di ' + rowLabel(row.key)}
    >
      <h4 className='font-semibold'>{rowLabel(row.key)}</h4>
      {mode === 'manual'
        ? (
          <label className='block'>
            Testo della sezione
            <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
        )
        : (
          <>
            <label className='block'>
              Istruzione per l’AI<Textarea
                rows={2}
                maxLength={500}
                value={brief}
                disabled={busy}
                onChange={(e) => {
                  setBrief(e.target.value);
                  setProposal(undefined);
                }}
              />
            </label>
            <div className='flex flex-wrap gap-2'>
              {[
                'Accorcia',
                'Amplia',
                'Rendi più naturale',
                ...(isSeo(row.key) || row.key === 'Introduzione' || row.key === 'shortDescription'
                  ? ['Migliora SEO']
                  : []),
                'Rigenera',
              ].map((s) => (
                <Button
                  variant='outline'
                  size='sm'
                  key={s}
                  disabled={busy}
                  onClick={() => {
                    setBrief(s);
                    setProposal(undefined);
                  }}
                >
                  {s}
                </Button>
              ))}
            </div>
            <Button disabled={busy} onClick={revise}>
              {busy ? 'Preparazione della revisione…' : 'Prepara revisione'}
            </Button>
            {proposal && (
              <div className='grid gap-4 md:grid-cols-2'>
                <div>
                  <strong>Prima</strong>
                  <EditorialText
                    value={renderSections([{ heading: 'Introduzione', text: row.text || 'Sezione mancante' }], true)}
                  />
                </div>
                <div>
                  <strong>Dopo</strong>
                  <EditorialText value={renderSections([{ heading: 'Introduzione', text: proposal.text }], true)} />
                </div>
              </div>
            )}
          </>
        )}
      {error && <p role='alert'>{error} Il testo precedente è conservato.</p>}
      <div className='flex flex-wrap gap-2'>
        <Button variant='outline' onClick={onClose}>Annulla</Button>
        <Button
          disabled={busy || (mode === 'manual' ? !text.trim() : !proposal)}
          onClick={() => {
            const next = mode === 'manual' ? { ...row, text: text.trim(), origin: 'manual' as const } : proposal;
            if (next) onConfirm(next);
          }}
        >
          Conferma modifica
        </Button>
      </div>
    </section>
  );
}
