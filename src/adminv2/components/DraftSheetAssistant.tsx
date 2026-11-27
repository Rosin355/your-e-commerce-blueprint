import { strategyForField } from '../../../supabase/functions/_shared/admin-ai-core';
import { analyzeFacts, usableFacts, factCoverage, type SourceFact } from '../../../supabase/functions/_shared/admin-ai-evidence';
import { renderSections, type Heading } from '../../../supabase/functions/_shared/admin-ai-sections';
import { activeSections, allSectionsReviewed, replaceSection, type SectionReview } from '../lib/descriptionReview';
import { AdminApiError } from '../lib/AdminApiError';
import DescriptionSections from './DescriptionSections';
import EditorialDiagnostics from './EditorialDiagnostics';
import type { DescriptionIssue } from '../../../supabase/functions/_shared/admin-ai-description';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { factsFromText } from '../../../supabase/functions/_shared/admin-ai-facts';
import type { ProductDraft } from '../../../supabase/functions/_shared/admin-operational-core';
import { suggestConfirmedField, suggestDraftEditorial } from '../lib/adminApi';
import { editorialKeys } from '../../../supabase/functions/_shared/admin-draft-editorial';
import { explainAiRequestError } from '../lib/explainAiError';
import { localSheet, manualDraftType, sheetDefinition, sheetKeys, sheetLabels, sheetValueError, type SheetContext,
  type SheetChange, type SheetKey, type SheetPreview } from '../lib/draftSheet';
import AiErrorNotice from './AiErrorNotice';
import RichTextEditor from './RichTextEditor';
import EditorialText from './EditorialText';
import ValueDisplay from './ValueDisplay';
import FieldEditor from './FieldEditor';
import { validateValue } from '../../../supabase/functions/_shared/admin-v2-validation';
import { mergeRegenerated, manualOnlySections, reviewLabels, reviewStatus, setReview, type ReviewMap } from '../lib/sheetReview';
import { evidenceLabels, evidenceReview, type EvidenceKey, type EvidenceReview } from '../lib/sheetEvidence';

const isTechnical = (e:unknown) => !(e instanceof AdminApiError) || !['INVALID_MODEL_PROPOSAL','INVALID_FIELD_VALUE','INVALID_CONFIRMED_FACTS'].includes(e.code);

interface Preview {
  contextKey: string;
  scopeKey: string;
  rows: SheetPreview;
  source?: 'model' | 'confirmed_facts' | 'source_review';
  descriptionError?: string;
  missingInformation?: string[];
  descriptionIssues?: DescriptionIssue[];
  descriptionRevision?: string;
  sections?: SectionReview[];
  evidence?: SourceFact[];
  editorialError?: boolean;
}
interface Props {
  draft: Pick<ProductDraft,SheetKey|'botanical'>;
  sourceRevision?: string;
  sources?: {text:string; origin:string}[];
  context: SheetContext;
  onApply: (change: SheetChange, extra?: Record<string,unknown>) => void;
}

export default function DraftSheetAssistant({ draft, context, onApply, sources, sourceRevision }: Props) {
  const [text, setText] = useState(() => sources?.map(f=>f.text).join('\n') ?? '');
  const [extra,setExtra] = useState<EvidenceReview>({});
  const [acceptedExtras,setAcceptedExtras] = useState<Partial<Record<EvidenceKey,boolean>>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inputError, setInputError] = useState('');
  const [result, setResult] = useState<Preview>();
  const [review, setReviewMap] = useState<ReviewMap>({});
  const [regenerating, setRegenerating] = useState<SheetKey>();
  const [regenError, setRegenError] = useState<{key:SheetKey;message:string;technical?:boolean}>();
  const [recovery,setRecovery] = useState<{scope:string;notes:string[]}>();
  const revision = useRef(0);
  const pending = useRef(false);
  // Ignore late responses when the product, selected categories or effective grants change.
  const contextKey = JSON.stringify([context, sourceRevision]);
  const scopeKey = JSON.stringify([context.definitions,context.editableKeys,context.canFillDraft,context.supportsType,sourceRevision,sources ? context.title : null]);
  const previousContext = useRef(contextKey);
  useEffect(() => {
    if (previousContext.current===contextKey) return;
    previousContext.current=contextKey;
    if (result?.scopeKey===scopeKey) {
      const notes = [
        ...(result.sections ?? []).filter(s=>s.status==='manual' || s.status==='accepted').map(s=>s.heading+' · '+s.text),
        ...sheetKeys.filter(k=>result.rows[k].source==='manual' && (k!=='description' || !result.sections)).map(k=>sheetLabels[k]+' · '+String(result.rows[k].value)),
        ...(Object.keys(extra) as EvidenceKey[]).filter(k=>extra[k]?.manual).map(k=>evidenceLabels[k]+' · '+JSON.stringify(extra[k]?.value)),
      ];
      if (notes.length) setRecovery({scope:scopeKey,notes});
    } else if (result) setRecovery(undefined);
    revision.current++;
    setConfirmed(false);
    setAcceptedExtras({});
    setResult(undefined);
    setReviewMap({});
    setInputError('');
    setExtra({});
  }, [contextKey,scopeKey,result,extra]);
  const preview = result?.contextKey === contextKey ? result : undefined;

  const sections = preview?.sections;
  const evidence = preview?.evidence;
  const coverage = useMemo(() => evidence ? factCoverage(evidence,sections ? activeSections(sections) : []) : [],[evidence,sections]);

  function confirmDiscard() {
    return !(preview?.sections?.some(s => s.status === 'manual' || s.status === 'accepted') ||
      Object.values(preview?.rows ?? {}).some(r => r.source === 'manual') || Object.values(review).includes('accepted') ||
      Object.values(extra).some(r => r?.manual)) || window.confirm('Scartare le modifiche e le approvazioni di questa anteprima? I campi già applicati alla bozza restano disponibili.');
  }
  function invalidate() {
    revision.current++;
    setInputError('');
    setResult(undefined);
    setReviewMap({});
    setRegenError(undefined);
    setAcceptedExtras({});
    setExtra({});
  }

  async function prepare() {
    if (pending.current) return;
    let facts: string[];
    try {
      if (!context.title.trim() || context.title.trim().length > 255) throw new Error('Inserisci un nome prodotto da 1 a 255 caratteri.');
      facts = factsFromText(text, confirmed);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : 'Controlla le informazioni inserite.');
      return;
    }
    const current = revision.current;
    // Keep the reviewer's other rows (and manual edits) during a description-only retry.
    const evidence = analyzeFacts(facts);
    const allowed = usableFacts(evidence);
    const next: Preview = { ...preview, contextKey, scopeKey, evidence, rows: { ...(preview?.rows ?? localSheet(context, allowed)) } };
    setInputError('');
    if (!next.rows.description.reason || preview?.descriptionError || preview?.descriptionIssues?.length) {
      pending.current = true;
      setBusy(true);
      try {
        const requestKey = crypto.randomUUID();
        const proposal = (sources || preview?.descriptionError || preview?.descriptionIssues?.length)
          ? await suggestConfirmedField({fieldKey: 'description', productName:context.title.trim(), confirmed: true, facts, requestKey})
          : await suggestDraftEditorial({draftTitle: context.title.trim(), facts, requestKey});
        if ('editorial' in proposal && proposal.editorial) {
          for (const key of editorialKeys) {
            const row = proposal.editorial[key];
            if (!row || !['model','deterministic'].includes(row.source) || sheetValueError(key, row.value, context)) continue;
            // The offline tag fallback also includes the categories selected in this form.
            if (row.source === 'deterministic' && key === 'tags') continue;
            next.rows[key] = row;
          }
        }
        if ('descriptionError' in proposal && proposal.descriptionError) {
          next.descriptionError = proposal.descriptionError.message;
          next.editorialError = proposal.descriptionError.code === 'INVALID_MODEL_PROPOSAL';
        } else {
          if (typeof proposal.value !== 'string') throw new Error('Formato descrizione non valido.');
          const reason = sheetValueError('description', proposal.value, context);
          if (reason && preview?.rows.description.value) throw new Error(reason);
          next.rows.description = reason ? { reason } : { value: proposal.value };
          next.sections = proposal.sections?.map(s=>({...s,status:'proposed'}));
          next.descriptionError = undefined; next.editorialError = false;
          next.source = proposal.source;
          next.missingInformation = proposal.missingInformation;
          next.descriptionIssues = proposal.descriptionIssues;
          next.descriptionRevision = requestKey;
        }
      } catch (error) {
        next.descriptionError = explainAiRequestError(error);
        next.editorialError = error instanceof AdminApiError && ['INVALID_MODEL_PROPOSAL','INVALID_FIELD_VALUE'].includes(error.code);
      } finally {
        pending.current = false;
        setBusy(false);
      }
    }
    if (current === revision.current) { if (!preview) setExtra(evidenceReview(allowed,context.definitions,context.editableKeys)); setResult(next); }
  }

  function withSections(current: Preview, sections: SectionReview[]): Preview {
    const value = renderSections(activeSections(sections), sheetDefinition('description',context)?.editor_type === 'richtext');
    return {...current, sections, rows:{...current.rows, description:{value,source:'manual'}}};
  }

  async function regenerateSection(heading:Heading) {
    if (!preview?.sections || pending.current || review.description === 'accepted') return;
    const prior = preview.sections.find(s => s.heading === heading);
    if (prior?.status === 'accepted' || (prior && prior.status !== 'proposed' && !window.confirm('Sostituire il testo della sezione «'+heading+'» solo se arriva una proposta valida?'))) return;
    const current = revision.current;
    pending.current=true; setBusy(true); setRegenError(undefined);
    try {
      const facts = factsFromText(text,confirmed);
      const response = await suggestConfirmedField({fieldKey:'description',productName:context.title.trim(),section:heading,confirmed:true,facts,requestKey:crypto.randomUUID()});
      if (current !== revision.current) return;
      const replacement = response.sections?.length === 1 && !response.descriptionIssues?.length ? response.sections[0] : undefined;
      const sections = replaceSection(preview.sections,heading,replacement);
      const next = withSections(preview,sections);
      const value = next.rows.description.value;
      if (sections === preview.sections || typeof value!=='string' || value.length > strategyForField('description')!.maxOutputChars || sheetValueError('description',value,context)) {
        setRegenError({key:'description',message: response.descriptionIssues?.[0]?.message ?? 'Sezione o lunghezza non valida. Il testo precedente è conservato.'}); return;
      }
      setResult({...next,descriptionError:undefined,descriptionIssues:preview.descriptionIssues?.filter(i=>i.section!==heading)});
      setReviewMap(setReview(review,'description',null));
    } catch (error) {
      if (current===revision.current) setRegenError({key:'description',message:explainAiRequestError(error)+' Testo precedente conservato.',technical:isTechnical(error)});
    } finally { pending.current=false;setBusy(false); }
  }

  /** Regenerates one field only; accepted fields and every other row are preserved. */
  async function regenerate(key: SheetKey) {
    if (!preview || pending.current || review[key] === 'accepted') return;
    let facts: string[];
    if (preview.rows[key].source === 'manual' && !window.confirm('Sostituire la modifica manuale solo se arriva una proposta valida?')) return;
    try { facts = factsFromText(text, confirmed); }
    catch (error) { setRegenError({key, message: error instanceof Error ? error.message : 'Controlla le informazioni inserite.'}); return; }
    const current = revision.current;
    pending.current = true; setBusy(true); setRegenerating(key); setRegenError(undefined);
    try {
      const requestKey = crypto.randomUUID();
      let metadata: Partial<Preview> = {};
      let fresh: SheetPreview[SheetKey] | undefined;
      if (key === 'description') {
        const proposal = await suggestConfirmedField({fieldKey: 'description', productName:context.title.trim(), confirmed: true, facts, requestKey});
        metadata = {descriptionError:undefined,descriptionIssues:proposal.descriptionIssues,sections:proposal.sections?.map(s=>({...s,status:'proposed'})),missingInformation:proposal.missingInformation,descriptionRevision:requestKey};
        if (typeof proposal.value === 'string' && !sheetValueError('description', proposal.value, context)) fresh = { value: proposal.value, source: 'model' };
      } else if (key === 'productType' || key === 'shortDescription') {
        fresh = localSheet(context, usableFacts(analyzeFacts(facts)))[key];
      } else {
        const proposal = await suggestDraftEditorial({draftTitle: context.title.trim(), facts, requestKey});
        const row = 'editorial' in proposal ? proposal.editorial?.[key as keyof NonNullable<typeof proposal.editorial>] : undefined;
        if (row && row.source === 'model' && !sheetValueError(key, row.value, context)) fresh = row;
      }
      if (current !== revision.current) return;
      const merged = mergeRegenerated(preview.rows, review, key, fresh);
      if (!merged.changed) setRegenError({key, message: 'L’AI non ha prodotto una proposta valida: il valore precedente è stato mantenuto.'});
      else { setResult({ ...preview, rows: merged.rows, ...metadata }); setReviewMap(merged.map); }
    } catch (error) {
      if (current===revision.current) setRegenError({key, technical:isTechnical(error), message: explainAiRequestError(error) + ' Il valore precedente è stato mantenuto.'});
    } finally { pending.current = false; setBusy(false); setRegenerating(undefined); }
  }

  function edit(key: SheetKey, value: string | string[], tagText?: string) {
    if (busy || review[key] === 'accepted') return;
    if (preview) setReviewMap(setReview(review, key, null));
    if (preview) setResult({ ...preview, rows: { ...preview.rows, [key]: { ...preview.rows[key], value, source: 'manual', tagText, reason: undefined } } });
  }

  function different(key: SheetKey) {
    const value = preview?.rows[key].value;
    return value !== undefined && JSON.stringify(draft[key]) !== JSON.stringify(value);
  }
  function applicable(key: SheetKey) {
    const value = preview?.rows[key].value;
    return !(key === 'description' && preview?.sections && !allSectionsReviewed(preview.sections)) && review[key] !== 'rejected' && !preview?.rows[key].excluded && value !== undefined && different(key) && !sheetValueError(key, value, context);
  }
  function extraValid(key: EvidenceKey) {
    const row=extra[key], def=context.definitions.find(d=>d.key===key);
    return !acceptedExtras[key] && row?.selected && def && validateValue(def,row.value).ok &&
      JSON.stringify(row.value)!==JSON.stringify(draft.botanical[key]);
  }
  const extraKeys = (Object.keys(extra) as EvidenceKey[]).filter(extraValid);
  function apply(keys: SheetKey[], extras: EvidenceKey[] = []) {
    if (!preview || busy) return;
    const eligible = keys.filter(applicable);
    if (!eligible.length && !extras.length) return;
    const overwrite = eligible.filter(key => Boolean(draft[key]?.length));
    const question = ['Applicare alla bozza i campi ' + [...eligible.map(k => sheetLabels[k]),...extras.map(k=>evidenceLabels[k])].join(', ') + '?',
      ...(overwrite.length ? ['Sostituirai i valori già inseriti in ' + overwrite.map(k => sheetLabels[k]).join(', ') + '.'] : []),
      ...extras.filter(k=>draft.botanical[k]!=null).map(k=>'Sostituirai il valore attuale di '+evidenceLabels[k]+'.'),
      'Il salvataggio richiede una conferma separata.'].join('\n');
    if (!window.confirm(question)) return;
    const change: SheetChange = {};
    for (const key of eligible) {
      const value = preview.rows[key].value;
      if (key === 'tags' && Array.isArray(value)) change.tags = value;
      else if (key !== 'tags' && typeof value === 'string') change[key] = value;
    }
    let accepted = review;
    for (const key of eligible) accepted = setReview(accepted, key, 'accepted');
    setReviewMap(accepted);
    if (extras.length) setAcceptedExtras({...acceptedExtras,...Object.fromEntries(extras.map(k=>[k,true]))});
    onApply(change,Object.fromEntries(extras.map(k=>[k,extra[k]!.value])));
  }

  return <section aria-label={sources?"Assistenza AI prodotto esistente":"Assistenza AI nuova scheda"} className="space-y-3 rounded-lg border bg-card p-4">
    <h2 className="font-semibold">Scheda da informazioni verificate</h2>
    {recovery?.scope === scopeKey && <details open><summary>Testo conservato prima del cambio di contesto</summary><p>Puoi copiare queste modifiche nella nuova anteprima.</p>{recovery.notes.map((note,i)=><p key={i} className="whitespace-pre-wrap">{note}</p>)}<Button type="button" variant="ghost" onClick={()=>setRecovery(undefined)}>Rimuovi copia</Button></details>}
    {sources && <details><summary>Informazioni già disponibili · da controllare</summary><ul>{sources.map(s=><li key={s.text}>{s.origin} · {s.text}</li>)}</ul></details>}
    <label htmlFor="draft-ai-facts" className="block">Informazioni verificate</label>
    <Textarea id="draft-ai-facts" aria-describedby="draft-ai-help" value={text}
        onChange={e => { if (confirmDiscard()) { invalidate(); setConfirmed(false); setText(e.target.value); } }} />
    <p id="draft-ai-help" className="text-sm">Incolla una descrizione libera con le informazioni verificate. Puoi usare più paragrafi. Prezzi, SKU e disponibilità restano nei campi commerciali. Per una domanda già documentata usa «FAQ: domanda? risposta».</p>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={confirmed}
      onChange={e => { if (confirmDiscard()) { invalidate(); setConfirmed(e.target.checked); } }} />Confermo il nome e le informazioni verificate per questo prodotto</label>
    <Button variant="editorial" type="button" disabled={busy || !confirmed || Boolean(preview && (preview.sections || review.description==='accepted' || (!preview.descriptionError && !preview.descriptionIssues?.length)))} onClick={()=>{ if (preview?.rows.description.source !== 'manual' || window.confirm('Sostituire la descrizione modificata solo se la nuova proposta è valida?')) void prepare(); }}>
      {busy ? 'Preparazione in corso…' : (!preview?.sections && (preview?.descriptionError || preview?.descriptionIssues?.length)) ? 'Riprova la descrizione' : sources ? 'Migliora scheda con AI' : 'Completa scheda con AI'}
    </Button>
    {inputError && <AiErrorNotice>{inputError}</AiErrorNotice>}
    {preview && <section aria-label="Proposte per la bozza" className="space-y-3">
      <h3 className="font-semibold">Proposte AI per questo prodotto</h3>
      <p className="text-sm">Nessuna proposta è approvata finché non premi «Accetta». Accettare aggiorna solo la bozza locale: salvataggio, invio a Shopify e pubblicazione restano passaggi separati.</p>
      {sheetKeys.map(key => {
        const row = preview.rows[key];
        const value = row.value;
        const validation = value === undefined ? undefined : sheetValueError(key, value, context);
        return <div key={key} role="group" aria-label={sheetLabels[key]} className="space-y-2 rounded border p-3">
          <h4 className="font-medium">{sheetLabels[key]}</h4>
          <p className="text-sm font-medium" data-review-status={reviewStatus(row, review, key)}>Stato · {reviewLabels[reviewStatus(row, review, key)]}</p>
          {regenError?.key === key && (regenError.technical ? <AiErrorNotice>{regenError.message}</AiErrorNotice> : <p role="status">{regenError.message}</p>)}
          {key !== 'description' && value !== undefined && row.source && <p className="text-sm">{{
            model: 'Selezione del modello su informazioni verificate',
            deterministic: key === 'productType' ? 'Corrispondenza con il registro dei tipi verificati' : 'Fallback deterministico da informazioni verificate',
            manual: 'Modifica manuale in anteprima',
          }[row.source]}</p>}
          {row.reason && <p className="text-sm">{row.reason}</p>}
          {key === 'description' && preview.descriptionError && (preview.editorialError ? <p role="status">Revisione editoriale · {preview.descriptionError}</p> : <AiErrorNotice>{preview.descriptionError}</AiErrorNotice>)}
          {key === 'description' && preview.sections && <>
            <DescriptionSections sections={preview.sections} disabled={busy || review.description==='accepted'}
              onChange={s=>{setResult(withSections(preview,s));setReviewMap(setReview(review,'description',null));}} onRegenerate={regenerateSection}/>
            {typeof value==='string' && <details><summary>Anteprima della descrizione</summary><EditorialText value={value}/></details>}
            <p className="text-sm">Accetta o rifiuta ogni sezione prima di applicare la descrizione alla bozza.</p>
          </>}
          {key === 'description' && !preview.sections && typeof value === 'string' && <>
            <p role="status">{row.source === 'manual' ? 'Descrizione rivista manualmente.' : 'Proposta editoriale generata con AI · fatti da ricontrollare prima di accettare.'}</p>
            {sheetDefinition(key, context)?.editor_type === 'richtext'
              ? <RichTextEditor key={preview.descriptionRevision} label="Proposta descrizione" disabled={busy} simple value={value} onChange={v => edit(key, v)} />
              : <Textarea disabled={busy} aria-label="Proposta descrizione" value={value} onChange={e => edit(key, e.target.value)} />}
          </>}
          {key === 'description' && <EditorialDiagnostics missing={preview.missingInformation}
            issues={preview.descriptionIssues?.filter(i => !preview.sections || i.code!=='INCOMPLETE_RESPONSE')}
            coverage={preview.sections || preview.descriptionError ? coverage : coverage.filter(f=>f.exclusion)}/>}

          {(key === 'shortDescription' || key === 'seoTitle' || key === 'seoDescription') && typeof value === 'string' &&
            <Textarea disabled={busy} aria-label={'Proposta ' + sheetLabels[key]} value={value} onChange={e => edit(key, e.target.value)} />}
          {key === 'tags' && Array.isArray(value) && <label className="block">Tag proposti, separati da virgole
            <Textarea disabled={busy} value={row.tagText ?? value.join(', ')} onChange={e =>
              edit('tags', e.target.value.split(',').map(v => v.trim()).filter(Boolean), e.target.value)} /></label>}
          {key === 'productType' && manualDraftType(context) && <div className="space-y-2">
            <label className="block">Tipo manuale per questa bozza
              <input className="block w-full rounded border p-2" maxLength={255} disabled={busy} value={typeof value === 'string' ? value : ''}
                onChange={e => edit(key, e.target.value)} /></label>
            <p className="text-sm">Proposte dal catalogo commerciale, da confermare per questo prodotto.</p>
            <div className="flex flex-wrap gap-2">{['Alberi','Arbusti'].map(label =>
              <Button key={label} disabled={busy} type="button" variant="outline" onClick={() => edit(key, label)}>{label}</Button>)}</div>
          </div>}
          {key === 'productType' && Boolean(row.options?.length) &&
            <label className="block">Tipo verificato<select disabled={busy} className="block w-full rounded border p-2" value={value ?? ''}
              onChange={e => edit(key, e.target.value)}><option value="">Scegli un tipo</option>
              {row.options!.map(v => <option key={v} value={v}>{v}</option>)}</select></label>}
          {validation && <p role="alert" className="text-destructive">{validation}</p>}
          {Boolean(draft[key]?.length) && <div className="text-sm"><strong>Valore attuale</strong>
            {key === 'description' ? <EditorialText value={draft.description} /> : <p>{key === 'tags' ? draft.tags.join(', ') : draft[key]}</p>}</div>}
          {!draft[key]?.length && <p className="text-sm">Valore attuale · vuoto</p>}
          {value !== undefined && !different(key) && <p className="text-sm">Presente nella bozza</p>}
          <div className="flex flex-wrap gap-2">
            {value !== undefined && different(key) && review[key] !== 'rejected' &&
              <Button disabled={busy || !applicable(key)} type="button" variant="editorial" onClick={() => apply([key])}>Accetta {sheetLabels[key]}</Button>}
            {value !== undefined && review[key] !== 'accepted' && <Button disabled={busy} type="button" variant="ghost"
              onClick={() => setReviewMap(setReview(review, key, review[key] === 'rejected' ? null : 'rejected'))}>
              {review[key] === 'rejected' ? 'Ripristina proposta' : 'Rifiuta proposta'}</Button>}
            {!(key==='description' && preview.sections) && <Button disabled={busy || review[key] === 'accepted'} type="button" variant="outline" onClick={() => regenerate(key)}>
              {regenerating === key ? 'Rigenerazione…' : (key === 'productType' || key === 'shortDescription') ? 'Ricalcola dai fatti' : 'Rigenera con AI'}</Button>}
            {review[key] === 'accepted' && <Button disabled={busy} type="button" variant="ghost" onClick={() => setReviewMap(setReview(review, key, null))}>Sblocca per modificare</Button>}
          </div>
        </div>;
      })}
      {(Object.keys(evidenceLabels) as EvidenceKey[]).map(key=>{
        const row=extra[key], def=context.definitions.find(d=>d.key===key);
        if (!row || !def) return <p key={key} className="text-sm">{evidenceLabels[key]} · informazioni confermate insufficienti o campo non abilitato.</p>;
        const valid=validateValue(def,row.value);
        return <div key={key} className="space-y-2 rounded border p-3"><fieldset className="space-y-2" disabled={busy || acceptedExtras[key]}><label><input type="checkbox" checked={row.selected}
          onChange={e=>setExtra({...extra,[key]:{...row,selected:e.target.checked}})}/> {evidenceLabels[key]}</label>
          <p>{row.manual?'Modifica manuale':'Selezione deterministica dai fatti confermati'}</p>
          <p>Valore attuale</p><ValueDisplay label={evidenceLabels[key]} value={draft.botanical[key]}/>
          <FieldEditor field={{key,label:def.label,editorType:def.editor_type,dataType:def.data_type,validationRules:def.validation_rules,required:def.required}}
            value={row.value} onChange={value=>setExtra({...extra,[key]:{...row,value,manual:true}})}/>
          {!valid.ok && <p role="status">{valid.message}</p>}
          <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={!extraValid(key)} onClick={()=>apply([],[key])}>Accetta {evidenceLabels[key]}</Button>
            <Button type="button" variant="outline" onClick={()=>{
              if (row.manual && !window.confirm('Sostituire la modifica manuale con i fatti confermati?')) return;
              const source=evidenceReview(usableFacts(preview.evidence ?? []),context.definitions,context.editableKeys)[key];
              if (source) setExtra({...extra,[key]:{...source,selected:row.selected}});
            }}>Ricalcola {evidenceLabels[key]}</Button></div>
          </fieldset>{acceptedExtras[key] && <Button type="button" variant="ghost" disabled={busy} onClick={()=>setAcceptedExtras({...acceptedExtras,[key]:false})}>Sblocca {evidenceLabels[key]}</Button>}
        </div>;
      })}
      <div className="space-y-1 rounded border border-dashed p-3 text-sm" aria-label="Campi non generati dall'AI">
        <p className="font-medium">Campi esclusi dall’AI</p>
        {manualOnlySections.map(item => <p key={item.label}>{item.label} · {item.reason}</p>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="editorial" type="button" disabled={busy || (!sheetKeys.some(applicable) && !extraKeys.length)} onClick={() => apply(sheetKeys,extraKeys)}>Accetta tutte le proposte valide non rifiutate</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={()=>{if (confirmDiscard()) invalidate();}}>Scarta anteprima</Button>
      </div>
    </section>}
  </section>;
}
