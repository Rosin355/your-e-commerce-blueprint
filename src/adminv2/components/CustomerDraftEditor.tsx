import { useEffect, useRef, useState } from 'react';
import { formatMoney } from '@/lib/storefront-money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ProductCuriosity,
  ProductDescription,
  ProductFaq,
  ProductHeading,
  ProductHighlights,
  ProductIntro,
} from '@/components/storefront/ProductEditorial';
import type { ProductDraft } from '../../../supabase/functions/_shared/admin-operational-core';
import { factsFromText } from '../../../supabase/functions/_shared/admin-ai-facts';
import { articleVersion } from '../../../supabase/functions/_shared/admin-ai-revision';
import { isHeading } from '../../../supabase/functions/_shared/admin-ai-sections';
import { analyzeFacts, unsupportedSection } from '../../../supabase/functions/_shared/admin-ai-evidence';
import type { DescriptionIssue } from '../../../supabase/functions/_shared/admin-ai-description';
import { suggestDraftEditorial } from '../lib/adminApi';
import { explainAiRequestError } from '../lib/explainAiError';
import {
  application,
  articleAssessment,
  type ArticleKey,
  type ArticleRow,
  articleRows,
  articleSections,
  categoryMatches,
  editorialSnapshot,
  extraLabels,
  faqPairs,
  historicalText,
  isSeo,
  isStructured,
  rowLabel,
  suggestionHeading,
  unavailable,
} from '../lib/customerArticle';
import type { SheetContext } from '../lib/draftSheet';
import ArticleRevisionPanel from './ArticleRevisionPanel';
import EditorialDiagnostics from './EditorialDiagnostics';

interface Proposal {
  rows: ArticleRow[];
  facts: string[];
  scope: string;
  baseline: string;
  missing: string[];
  issues: DescriptionIssue[];
  sectionAudit?: {received: number; accepted: number; rejected: number; derived: number};
  requestId: string;
}
interface Props {
  draft: ProductDraft;
  ctx: SheetContext;
  canAi: boolean;
  options: { id: string; title: string }[];
  active: boolean;
  locked: boolean;
  onTitle: (title: string) => void;
  onAdvanced: () => void;
  onApply: (changes: Partial<ProductDraft>, confirmedKeys: string[]) => void;
  onSave: () => void;
}
const buttonStyle =
  'min-h-10 px-2 text-sm font-medium text-primary-dark underline decoration-border underline-offset-4 hover:decoration-current disabled:text-muted-foreground disabled:no-underline';
const plain = (s: string) => s.replace(/\*\*/g, '').replace(/^\s*-\s+/gm, '');
export default function CustomerDraftEditor(
  { draft, ctx, canAi, options, active, locked, onTitle, onAdvanced, onApply, onSave }: Props,
) {
  const [source, setSource] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [proposal, setProposal] = useState<Proposal>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState<{ key: ArticleKey; mode: 'manual' | 'ai'; instruction?: string }>();
  const [review, setReview] = useState(false);
  const [read, setRead] = useState(false);
  const [acceptReplace, setAcceptReplace] = useState(false);
  const [verified, setVerified] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [applied, setApplied] = useState('');
  const seq = useRef(0);
  const scope = JSON.stringify([
    ctx.title,
    ctx.definitions,
    ctx.editableKeys,
    ctx.canFillDraft,
    ctx.supportsType,
    canAi,
  ]);
  const baseline = editorialSnapshot(draft);
  const version = JSON.stringify([scope, baseline, active, locked]);
  useEffect(() => {
    seq.current++;
    setBusy(false);
    setEdit(undefined);
    setReview(false);
    setRead(false);
  }, [version]);
  const current = proposal?.scope === scope && (proposal.baseline === baseline || applied === baseline);
  const rows = proposal?.rows ?? [];
  const facts = proposal?.facts ?? [];
  const assessment = articleAssessment(rows, facts);
  const candidate = application(rows, ctx);
  const suggestions = categoryMatches(options, facts, draft.title);
  const sections = articleSections(rows);
  const paragraphs = sections.flatMap(
    (s) => [...(s.heading === 'Introduzione' ? [] : [s.heading]), ...plain(s.text).split(/\n+/)],
  );
  const intro = rows.find((r) => r.key === 'shortDescription');
  const unresolvedIssues = (proposal?.issues ?? []).filter((issue, index, all) =>
    issue.code !== 'INCOMPLETE_RESPONSE' && all.findIndex(i => i.section === issue.section &&
      i.code === issue.code && i.message === issue.message) === index);
  const recoveryHeadings = new Set(assessment.missing.map(f => suggestionHeading(f.text)));
  for (const key of ['Introduzione','Descrizione botanica','Coltivazione e manutenzione'] as const) {
    if (assessment.problems.includes(key + ' da recuperare.')) recoveryHeadings.add(key);
  }
  for (const issue of unresolvedIssues) if (isHeading(issue.section)) recoveryHeadings.add(issue.section);
  const blocked = !current || !ctx.canFillDraft || !canAi || locked || !!edit || !!assessment.missing.length ||
    !!assessment.problems.length || !!candidate.errors.length || !!unresolvedIssues.length;
  const overwritten = Object.entries(candidate.change).filter(([k, v]) => {
    const original = draft[k as keyof ProductDraft];
    return original?.toString() && JSON.stringify(original) !== JSON.stringify(v);
  }).map(([k]) => k === 'description' ? 'Descrizione estesa' : rowLabel(k as ArticleKey));
  for (const k of verified) {
    if (
      draft.botanical[k] !== undefined && JSON.stringify(draft.botanical[k]) !== JSON.stringify(candidate.botanical[k])
    ) overwritten.push(rowLabel(k as ArticleKey));
  }
  function discard() {
    if (proposal && !window.confirm('Scartare questa anteprima e ricominciare dalle fonti?')) return;
    seq.current++;
    setBusy(false);
    setProposal(undefined);
    setConfirmed(false);
    setApplied('');
    setReview(false);
    setEdit(undefined);
    setVerified([]);
    setCategories([]);
    setError('');
  }
  async function generate() {
    setError('');
    const ticket = ++seq.current;
    try {
      const inputs = factsFromText(historicalText(source), confirmed);
      if (!draft.title.trim() || draft.title.trim().length > 255) {
        throw new Error('Inserisci il nome del prodotto, entro 255 caratteri.');
      }
      setBusy(true);
      const requestId = crypto.randomUUID();
      const result = await suggestDraftEditorial({
        article: true,
        draftTitle: draft.title.trim(),
        facts: inputs,
        requestKey: requestId,
      });
      if (ticket !== seq.current) return;
      if (result.promptVersion !== articleVersion || !result.sections) {
        throw new Error('Il servizio non espone il contratto editoriale V3. L’editor avanzato è disponibile.');
      }
      setProposal({
        rows: articleRows(result.sections, inputs, result.editorial),
        facts: inputs,
        scope,
        baseline,
        requestId,
        missing: result.missingInformation ?? [],
        issues: result.descriptionIssues ?? [],
        sectionAudit: result.sectionAudit,
      });
    } catch (e) {
      if (ticket === seq.current) setError(e instanceof Error ? e.message : explainAiRequestError(e));
    } finally {
      if (ticket === seq.current) setBusy(false);
    }
  }
  function acceptRow(row: ArticleRow) {
    if (!proposal || !current || locked) return;
    if (!row.text.trim() || row.text.length > 10000 || /[<>]|https?:\/\/|\S+@\S+/i.test(row.text)) {
      setError('Usa testo semplice e controlla la lunghezza.');
      return;
    }
    if ((isHeading(row.key) || !isSeo(row.key)) && row.key !== 'faq') {
      const guard = unsupportedSection(
        row.text,
        analyzeFacts(facts).filter((f) => row.factIndices.includes(f.row) && !f.exclusion),
      );
      if (guard) {
        setError(guard);
        return;
      }
    }
    if (row.key === 'faq') {
      const pairs = faqPairs(row.text);
      const sources = analyzeFacts(facts).filter((f) => !f.exclusion && row.factIndices.includes(f.row));
      if (pairs.length !== row.text.split('\n').length || pairs.some((p) => unsupportedSection(p.answer, sources))) {
        setError('Verifica ogni domanda e risposta rispetto alle fonti.');
        return;
      }
    }
    let updated = [...rows.filter(r => r.key !== row.key), row];
    if (isHeading(row.key)) {
      const retained = updated.filter(r => isHeading(r.key) || r.origin !== 'derived' || isSeo(r.key));
      const derived = articleRows(articleSections(updated), facts).filter(r =>
        !isHeading(r.key) && r.origin === 'derived' && !retained.some(existing => existing.key === r.key));
      updated = [...retained, ...derived];
    }
    setProposal({
      ...proposal,
      baseline,
      rows: updated,
      issues: proposal.issues.filter((i) => i.section !== row.key),
    });
    setEdit(undefined);
    setError('');
    setRead(false);
    setReview(false);
    setApplied('');
    setVerified(verified.filter(k => k !== row.key && updated.find(r => r.key === k)?.text === rows.find(r => r.key === k)?.text));
  }
  function open(key: ArticleKey, mode: 'manual' | 'ai', instruction?: string) {
    setEdit({ key, mode, instruction });
    setError('');
    setReview(false);
    setRead(false);
  }
  function controls(row: ArticleRow) {
    const registry = row.key === 'shortDescription' ? 'short_description' : row.key;
    const ai = canAi && !unavailable(row.key, ctx) &&
      (isHeading(row.key) || isSeo(row.key) ||
        ctx.definitions.some((d) => d.key === registry && d.ai_allowed && !d.manual_only)) &&
      row.key !== 'curiosity' && row.key !== 'faq';
    return (
      <div className='mt-1 flex flex-wrap items-center gap-x-4'>
        <button
          type='button'
          className={buttonStyle}
          disabled={!current || locked}
          onClick={() => open(row.key, 'manual')}
        >
          Modifica
        </button>
        <button
          type='button'
          className={buttonStyle}
          disabled={!current || locked || !ai}
          onClick={() => open(row.key, 'ai')}
        >
          Modifica con AI
        </button>
        {!ai && (
          <small className='text-muted-foreground'>
            {unavailable(row.key, ctx) ?? 'Revisione AI diretta non abilitata per questo campo.'}
          </small>
        )}
      </div>
    );
  }
  function panel(row: ArticleRow) {
    return edit?.key === row.key && current
      ? (
        <ArticleRevisionPanel
          key={row.key + edit.mode}
          row={{...row, factIndices: [...new Set([...row.factIndices, ...assessment.missing.filter(
            f => suggestionHeading(f.text) === row.key).map(f => f.row)])]}}
          mode={edit.mode}
          title={draft.title}
          startingInstruction={edit.instruction}
          facts={facts}
          onClose={() => {
            setEdit(undefined);
            setError('');
          }}
          onConfirm={acceptRow}
        />
      )
      : null;
  }
  function block(row: ArticleRow) {
    return (
      <section key={row.key} aria-label={rowLabel(row.key)} className='border-t py-4'>
        <h3 className='font-heading text-lg font-semibold'>{rowLabel(row.key)}</h3>
        {row.key === 'faq'
          ? <ProductFaq items={faqPairs(row.text)} />
          : row.key === 'curiosity'
          ? <ProductCuriosity items={row.text.split('\n')} />
          : ['key_features', 'key_benefits', 'tags'].includes(row.key)
          ? <ProductHighlights items={row.text.split('\n')} />
          : <p className='mt-2 whitespace-pre-line leading-7'>{plain(row.text)}</p>}
        {controls(row)}
        {panel(row)}
      </section>
    );
  }
  function apply() {
    if (!proposal || blocked || !read || (overwritten.length > 0 && !acceptReplace)) return;
    const botanical = {
      ...draft.botanical,
      ...Object.fromEntries(Object.entries(candidate.botanical).filter(([k]) => verified.includes(k))),
    };
    const checked = categories.filter((id) => suggestions.some((s) => s.id === id));
    const changes = {
      ...candidate.change,
      botanical,
      ...(checked.length ? { collectionIds: [...new Set([...(draft.collectionIds ?? []), ...checked])] } : {}),
    };
    setApplied(editorialSnapshot({ ...draft, ...changes }));
    setReview(false);
    onApply(changes, verified);
  }
  const absent = (Object.keys(extraLabels) as (keyof typeof extraLabels)[]).filter((k) =>
    !rows.some((r) => r.key === k)
  );
  const recovering = edit && !rows.some((r) => r.key === edit.key)
    ? { key: edit.key, text: '', factIndices: [...facts.keys()], origin: 'model' as const }
    : undefined;
  if (!active) return null;
  return (
    <section aria-label='Anteprima cliente' className='space-y-5'>
      {!proposal && (
        <div className='space-y-4 rounded-lg border bg-card p-5 sm:p-7'>
          <label className='block font-medium'>
            Nome prodotto<Input
              value={draft.title}
              maxLength={255}
              disabled={busy || locked}
              onChange={(e) => onTitle(e.target.value)}
            />
          </label>
          <label className='block font-medium'>
            Informazioni sul prodotto<Textarea
              rows={4}
              value={source}
              disabled={busy || locked}
              placeholder='Incolla la descrizione, le note botaniche o il contenuto WooCommerce.'
              onChange={(e) => {
                setSource(e.target.value);
                setConfirmed(false);
              }}
            />
          </label>
          {source.trim().startsWith('{') && (
            <details>
              <summary>Testi riconosciuti nell’archivio WooCommerce / ACF</summary>
              <p className='whitespace-pre-line text-sm'>
                {(() => {
                  try {
                    return historicalText(source);
                  } catch (e) {
                    return e instanceof Error ? e.message : 'Controlla il JSON.';
                  }
                })()}
              </p>
            </details>
          )}
          <label className='flex min-h-11 items-center gap-3 text-sm'>
            <input
              type='checkbox'
              checked={confirmed}
              disabled={busy || locked}
              onChange={(e) => setConfirmed(e.target.checked)}
            />Ho verificato le informazioni di partenza per questo prodotto.
          </label>
          <div className='flex flex-wrap items-center gap-3'>
            <Button
              variant='editorial'
              disabled={busy || locked || !canAi || !!unavailable('Introduzione', ctx) || !ctx.canFillDraft ||
                !confirmed || !source.trim() || !draft.title.trim()}
              onClick={generate}
            >
              {busy ? 'Generazione in corso…' : 'Genera scheda completa con AI'}
            </Button>
            {busy && <Button variant='ghost' onClick={discard}>Annulla</Button>}
          </div>
          {(!canAi || unavailable('Introduzione', ctx)) && (
            <p className='text-sm'>
              L’assistenza richiede un grant per la descrizione. Per compilare a mano apri l’editor avanzato.
            </p>
          )}
        </div>
      )}
      {proposal && (
        <>
          <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-3'>
            <div>
              <p className='font-semibold'>
                {assessment.covered} / {assessment.covered + assessment.missing.length} fatti verificati coperti{' '}
                <span className='font-normal text-muted-foreground'>· {assessment.words} parole</span>
              </p>
              <p className='mt-1 text-sm text-muted-foreground'>
                {[
                  ...(assessment.coverage.some(f => f.duplicateOf !== undefined) ? [assessment.coverage.filter(f => f.duplicateOf !== undefined).length + ' duplicati nel conteggio'] : []),
                  assessment.coverage.filter((f) => f.status === 'contradictory').length + ' fatti in conflitto',
                  assessment.coverage.filter((f) => f.status === 'unverified').length + ' da verificare',
                  (assessment.problems.length + unresolvedIssues.length) + ' problemi di sezione',
                ].join(' · ')}
              </p>
            </div>
            <Button size='sm' variant='outline' disabled={locked} onClick={discard}>Rivedi le fonti</Button>
          </div>
          {!current && (
            <p role='alert'>La bozza o i permessi sono cambiati. Rivedi le fonti prima di applicare queste proposte.</p>
          )}
          <article
            className='og-storefront space-y-4 rounded-lg border bg-background p-5 sm:p-8'
            aria-label='Pagina prodotto in anteprima'
          >
            {draft.images.length > 0 && (
              <div className='flex flex-wrap gap-2'>
                {draft.images.map((im) => (
                  <img className='max-h-72 max-w-full object-contain' key={im.url} src={im.url} alt={im.alt} />
                ))}
              </div>
            )}
            <ProductHeading title={draft.title} />
            {draft.variants.map((variant, index) => {
              const option = variant.option === 'Formato unico' ? '' : variant.option.trim();
              const price = /^\d+(?:[.,]\d{1,2})?$/.test(variant.price) && /^[A-Z]{3}$/.test(draft.currency)
                ? formatMoney({ amount: variant.price.replace(',', '.'), currencyCode: draft.currency })
                : '';
              return (option || price) ? <p key={index}>{[option, price].filter(Boolean).join(' · ')}</p> : null;
            })}
            {draft.botanicalConfirmedKeys?.filter((k) => !isStructured(k as ArticleKey)).map((k) => (
              <p key={k}>{ctx.definitions.find((d) => d.key === k)?.label ?? k} · {String(draft.botanical[k])}</p>
            ))}
            {intro && (
              <section aria-label='Sintesi prodotto'>
                <ProductIntro intro={intro.text} paragraphs={paragraphs} />
                {controls(intro)}
                {panel(intro)}
              </section>
            )}
            <ProductDescription paragraphs={paragraphs}>
              {sections.map((s) => {
                const row = rows.find((r) => r.key === s.heading)!;
                return (
                  <section aria-label={s.heading} key={s.heading} className='py-2'>
                    {s.heading !== 'Introduzione' && (
                      <h3 className='font-heading text-lg font-semibold'>{s.heading}</h3>
                    )}
                    {plain(s.text).split(/\n+/).map((p, i) => <p className='mt-2 leading-7' key={i}>{p}</p>)}
                    {controls(row)}
                    {panel(row)}
                  </section>
                );
              })}
            </ProductDescription>
            {rows.filter((r) => !isHeading(r.key) && !isSeo(r.key) && r.key !== 'shortDescription').map(block)}
          </article>
          <p className='text-sm text-muted-foreground'>
            Anteprima editoriale della PDP. La galleria mostra le foto della bozza. Disponibilità, carrello, pagamenti e
            prodotti correlati richiedono il catalogo pubblico.
          </p>
          <details className='rounded-lg border p-4'>
            <summary className='cursor-pointer font-semibold'>Tag, SEO e categorie</summary>
            {rows.filter((r) => isSeo(r.key)).map(block)}
            {suggestions.length > 0
              ? (
                <fieldset>
                  <legend>Collezioni Shopify corrispondenti alla fonte</legend>
                  {suggestions.map((c) => (
                    <label className='flex gap-2 py-2' key={c.id}>
                      <input
                        type='checkbox'
                        checked={categories.includes(c.id)}
                        disabled={!current || locked}
                        onChange={(e) => {
                          setCategories(
                            e.target.checked ? [...categories, c.id] : categories.filter((id) => id !== c.id),
                          );
                          setRead(false);
                          setReview(false);
                          setProposal({ ...proposal, baseline });
                          setApplied('');
                        }}
                      />
                      {c.title}
                    </label>
                  ))}
                </fieldset>
              )
              : <p className='mt-3 text-sm'>Nessuna corrispondenza verificata fra le collezioni disponibili.</p>}
          </details>
          <EditorialDiagnostics coverage={assessment.coverage} issues={unresolvedIssues} missing={proposal.missing} />
          {(assessment.missing.length > 0 || assessment.problems.length > 0 || unresolvedIssues.length > 0) && (
            <section className='space-y-2 border-l-2 border-primary pl-4' aria-label='Recupero della descrizione'>
              <h3 className='font-semibold'>Alcune informazioni non sono ancora incluse nella descrizione.</h3>
              {[...recoveryHeadings].map(heading => {
                const missing = assessment.missing.filter(f => suggestionHeading(f.text) === heading && f.duplicateOf === undefined);
                const brief = 'Rielabora ' + heading + ' conservando il testo verificato. Integra gli atomi pertinenti delle righe: ' +
                  [...new Set(missing.map(f => f.row))].join(', ') + '.';
                return <details key={heading} className='rounded border p-2'>
                  <summary>{heading} · {missing.length ? missing.length + ' informazioni' : 'sezione da completare'}</summary>
                  <ul>{missing.map(f => <li key={f.row + f.text}>{f.text}</li>)}</ul>
                  <Button type='button' variant='outline' disabled={!current || locked}
                    onClick={() => open(heading, 'manual')}>Integra manualmente</Button>
                  <Button type='button' variant='outline' disabled={!current || locked || !canAi}
                    onClick={() => open(heading, 'ai', brief)}>Rivedi con AI</Button>
                </details>;
              })}
            </section>
          )}
          {recovering && panel(recovering)}
          {review && (
            <section aria-label='Revisione finale' className='space-y-3 rounded-lg border p-5'>
              <h2 className='text-xl font-semibold'>Revisione finale</h2>
              <details>
                <summary>Origine e versione della proposta</summary>
                <p>{articleVersion} · richiesta {proposal.requestId}</p>
                {proposal.sectionAudit && <p>Prima generazione · {proposal.sectionAudit.received} sezioni ricevute,
                  {' '}{proposal.sectionAudit.accepted} accettate, {proposal.sectionAudit.rejected} scartate,
                  {' '}{proposal.sectionAudit.derived} integrate dalle fonti.</p>}
                <ol className='list-decimal pl-5'>{facts.map((fact, i) => <li key={i}>{fact}</li>)}</ol>
              </details>
              {rows.map((r) => (
                <div key={r.key} className='border-b pb-2'>
                  <strong>{rowLabel(r.key)}</strong> · {r.origin === 'manual'
                    ? 'modificato manualmente'
                    : r.origin === 'model'
                    ? 'generato con AI'
                    : 'derivato dalle fonti'}
                  <p className='whitespace-pre-line'>{plain(r.text)}</p>
                  {unavailable(r.key, ctx) && <p>{unavailable(r.key, ctx)}</p>}
                  {isStructured(r.key) && !unavailable(r.key, ctx) && (
                    <label className='flex min-h-11 items-center gap-2'>
                      <input
                        type='checkbox'
                        checked={verified.includes(r.key)}
                        onChange={(e) => {
                          setVerified(e.target.checked ? [...verified, r.key] : verified.filter((k) => k !== r.key));
                          setRead(false);
                        }}
                      />Confermo fonte e valore di {rowLabel(r.key)} per la bozza.
                    </label>
                  )}
                </div>
              ))}
              <p>
                Collezioni da aggiungere ·{' '}
                {suggestions.filter((c) => categories.includes(c.id)).map((c) => c.title).join(', ') || 'Nessuna'}
              </p>
              <p>
                Fatti contraddittori ·{' '}
                {assessment.coverage.filter((f) => f.status === 'contradictory').map((f) => f.text).join(' / ') ||
                  'Nessuno'}
              </p>
              <p>
                Da verificare ·{' '}
                {assessment.coverage.filter((f) => f.status === 'unverified').map((f) => f.text).join(' / ') ||
                  'Nessuno'}
              </p>
              <p>
                Informazioni mancanti ·{' '}
                {[...absent.map(rowLabel), ...proposal.missing, ...assessment.missing.map((f) => f.text)].join(' / ') ||
                  'Nessuna'}
              </p>
              {absent.map((k) => {
                const derived = articleRows(sections, facts).find((r) => r.key === k);
                return derived && (
                  <Button variant='outline' key={k} onClick={() => acceptRow(derived)}>Recupera {rowLabel(k)}</Button>
                );
              })}
              <p>
                La sincronizzazione dei metafield richiede una verifica Shopify separata. I campi botanici si applicano
                solo se confermati individualmente. Cura e coltivazione si salvano nella descrizione estesa.
              </p>
              {overwritten.length > 0 && (
                <label className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    checked={acceptReplace}
                    onChange={(e) => setAcceptReplace(e.target.checked)}
                  />Autorizzo la sostituzione dei valori già in bozza per {overwritten.join(', ')}.
                </label>
              )}
              <label className='flex min-h-11 items-center gap-2'>
                <input type='checkbox' checked={read} onChange={(e) => setRead(e.target.checked)} />Ho revisionato i
                contenuti riportati sopra e i limiti di applicazione.
              </label>
            </section>
          )}
          {candidate.errors.map((e) => <p key={e} role='alert'>{e}</p>)}
          <div className='flex flex-wrap items-center gap-3 border-t pt-4'>
            {applied === baseline
              ? (
                <>
                  <strong>Contenuti applicati alla bozza interna</strong>
                  <Button variant='editorial' disabled={locked} onClick={onSave}>Salva bozza interna</Button>
                </>
              )
              : review
              ? (
                <>
                  <Button variant='outline' onClick={() => setReview(false)}>Annulla</Button>
                  <Button
                    variant='editorial'
                    disabled={blocked || !read || (overwritten.length > 0 && !acceptReplace)}
                    onClick={apply}
                  >
                    Approva scheda e applica alla bozza
                  </Button>
                </>
              )
              : (
                <Button
                  variant='editorial'
                  disabled={!current || locked || !!edit}
                  onClick={() => {
                    setReview(true);
                    setRead(false);
                    setAcceptReplace(false);
                  }}
                >
                  Rivedi scheda completa
                </Button>
              )}
          </div>
          {review && (blocked || draft.variants.some((v) => !v.price.trim())) && (
            <p role='status'>
              {blocked ? 'Per approvare occorre risolvere i blocchi editoriali. ' : ''}
              {draft.variants.some((v) => !v.price.trim())
                ? 'Per il salvataggio interno serve il prezzo verificato del formato. '
                : ''}
              <button className={buttonStyle} onClick={onAdvanced}>Apri dati tecnici</button>
            </p>
          )}
        </>
      )}
      {error && <p role='alert' className='border-l-2 border-destructive pl-3 text-sm'>{error}</p>}
    </section>
  );
}
