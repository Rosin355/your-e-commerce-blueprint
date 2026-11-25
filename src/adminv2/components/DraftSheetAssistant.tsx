import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { confirmedFacts } from '../../../supabase/functions/_shared/admin-ai-facts';
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
import { evidenceLabels, evidenceReview, type EvidenceKey, type EvidenceReview } from '../lib/sheetEvidence';

interface Preview {
  contextKey: string;
  rows: SheetPreview;
  source?: 'model' | 'confirmed_facts';
  descriptionError?: string;
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
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inputError, setInputError] = useState('');
  const [result, setResult] = useState<Preview>();
  const revision = useRef(0);
  const pending = useRef(false);
  // Ignore late responses when the product, selected categories or effective grants change.
  const contextKey = JSON.stringify([context, sourceRevision]);
  useEffect(() => {
    revision.current++;
    setConfirmed(false);
    setResult(undefined);
    setInputError('');
  }, [contextKey]);
  const preview = result?.contextKey === contextKey ? result : undefined;

  function invalidate() {
    revision.current++;
    setInputError('');
    setResult(undefined);
  }

  async function prepare() {
    if (pending.current) return;
    let facts: string[];
    try {
      if (!context.title.trim() || context.title.trim().length > 255) throw new Error('Inserisci un nome prodotto da 1 a 255 caratteri.');
      facts = confirmedFacts(text.split('\n').map(v => v.trim()).filter(Boolean), confirmed);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : 'Controlla le informazioni inserite.');
      return;
    }
    const current = revision.current;
    // Keep the reviewer's other rows (and manual edits) during a description-only retry.
    const next: Preview = { contextKey, rows: { ...(preview?.rows ?? localSheet(context, facts)) } };
    setInputError('');
    if (!next.rows.description.reason || preview?.descriptionError) {
      pending.current = true;
      setBusy(true);
      try {
        const requestKey = crypto.randomUUID();
        const proposal = (sources || preview?.descriptionError)
          ? await suggestConfirmedField({fieldKey: 'description', confirmed: true, facts, requestKey})
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
          next.rows.description = {};
        } else {
          if (typeof proposal.value !== 'string') throw new Error('Formato descrizione non valido.');
          const reason = sheetValueError('description', proposal.value, context);
          next.rows.description = reason ? { reason } : { value: proposal.value };
          next.source = proposal.source;
        }
      } catch (error) {
        next.descriptionError = explainAiRequestError(error);
        next.rows.description = {};
      } finally {
        pending.current = false;
        setBusy(false);
      }
    }
    if (current === revision.current) { setExtra(evidenceReview(facts,context.definitions,context.editableKeys)); setResult(next); }
  }

  function edit(key: SheetKey, value: string | string[], tagText?: string) {
    if (preview) setResult({ ...preview, rows: { ...preview.rows, [key]: { ...preview.rows[key], value, source: 'manual', tagText, reason: undefined } } });
  }

  function different(key: SheetKey) {
    const value = preview?.rows[key].value;
    return value !== undefined && JSON.stringify(draft[key]) !== JSON.stringify(value);
  }
  function applicable(key: SheetKey) {
    const value = preview?.rows[key].value;
    return !preview?.rows[key].excluded && value !== undefined && different(key) && !sheetValueError(key, value, context);
  }
  function extraValid(key: EvidenceKey) {
    const row=extra[key], def=context.definitions.find(d=>d.key===key);
    return row?.selected && def && validateValue(def,row.value).ok &&
      JSON.stringify(row.value)!==JSON.stringify(draft.botanical[key]);
  }
  const extraKeys = (Object.keys(extra) as EvidenceKey[]).filter(extraValid);
  function apply(keys: SheetKey[], includeExtra=false) {
    if (!preview || busy) return;
    const eligible = keys.filter(applicable);
    const extras=includeExtra?extraKeys:[];
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
    onApply(change,Object.fromEntries(extras.map(k=>[k,extra[k]!.value])));
  }

  return <section aria-label={sources?"Assistenza AI prodotto esistente":"Assistenza AI nuova scheda"} className="space-y-3 rounded-lg border bg-card p-4">
    <h2 className="font-semibold">Scheda da informazioni verificate</h2>
    {sources && <details><summary>Informazioni già disponibili · da controllare</summary><ul>{sources.map(s=><li key={s.text}>{s.origin} · {s.text}</li>)}</ul></details>}
    <label htmlFor="draft-ai-facts" className="block">Informazioni verificate</label>
    <Textarea id="draft-ai-facts" aria-describedby="draft-ai-help" maxLength={6011} value={text}
        onChange={e => { invalidate(); setConfirmed(false); setText(e.target.value); }} />
    <p id="draft-ai-help" className="text-sm">Inserisci da 1 a 12 righe di 12–500 caratteri. Una riga può contenere più frasi. Per esempio, se verificato, «La scheda riporta il nome Quercus robur». Per indicare un vantaggio usa «Punto di forza: …». Per le domande usa «FAQ: domanda? risposta». Evita dati personali e commerciali.</p>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={confirmed}
      onChange={e => { invalidate(); setConfirmed(e.target.checked); }} />Confermo il nome e le informazioni verificate per questo prodotto</label>
    <Button variant="editorial" type="button" disabled={busy || !confirmed || Boolean(preview && !preview.descriptionError)} onClick={prepare}>
      {busy ? 'Preparazione in corso…' : preview?.descriptionError ? 'Riprova la descrizione' : sources ? 'Migliora scheda con AI' : 'Completa scheda con AI'}
    </Button>
    {inputError && <AiErrorNotice>{inputError}</AiErrorNotice>}
    {preview && <section aria-label="Proposte per la bozza" className="space-y-3">
      <h3 className="font-semibold">Proposte AI per questo prodotto</h3>
      <p className="text-sm">Ogni campo indica come è stata preparata la proposta. Puoi applicare i campi singolarmente.</p>
      {sheetKeys.map(key => {
        const row = preview.rows[key];
        const value = row.value;
        const validation = value === undefined ? undefined : sheetValueError(key, value, context);
        return <div key={key} role="group" aria-label={sheetLabels[key]} className="space-y-2 rounded border p-3">
          <h4 className="font-medium">{sheetLabels[key]}</h4>
          {key !== 'description' && value !== undefined && row.source && <p className="text-sm">{{
            model: 'Selezione del modello su informazioni verificate',
            deterministic: key === 'productType' ? 'Corrispondenza con il registro dei tipi verificati' : 'Fallback deterministico da informazioni verificate',
            manual: 'Modifica manuale in anteprima',
          }[row.source]}</p>}
          {row.reason && <p className="text-sm">{row.reason}</p>}
          {key === 'description' && preview.descriptionError && <AiErrorNotice>{preview.descriptionError}</AiErrorNotice>}
          {key === 'description' && typeof value === 'string' && <>
            <p role="status">{row.source === 'manual' ? 'Descrizione rivista manualmente.' : preview.source === 'confirmed_facts' ? 'Descrizione ricomposta con le righe originali confermate.' : preview.source === 'model' ? 'Descrizione organizzata dal modello e verificata.' : 'Descrizione proposta dal servizio. Questa versione non indica la fonte della proposta.'}</p>
            {sheetDefinition(key, context)?.editor_type === 'richtext'
              ? <RichTextEditor label="Proposta descrizione" disabled={busy} simple value={value} onChange={v => edit(key, v)} />
              : <Textarea disabled={busy} aria-label="Proposta descrizione" value={value} onChange={e => edit(key, e.target.value)} />}
          </>}
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
          {value !== undefined && different(key) && <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !applicable(key)} type="button" variant="editorial" onClick={() => apply([key])}>Applica {sheetLabels[key]}</Button>
            <Button disabled={busy} type="button" variant="ghost" onClick={() => setResult({ ...preview, rows: {
              ...preview.rows, [key]: { ...row, excluded: !row.excluded },
            } })}>{row.excluded ? 'Includi ' : 'Escludi '}{sheetLabels[key]}</Button>
            {row.excluded && <span className="self-center text-sm">Escluso dall’approvazione</span>}
          </div>}
        </div>;
      })}
      {(Object.keys(evidenceLabels) as EvidenceKey[]).map(key=>{
        const row=extra[key], def=context.definitions.find(d=>d.key===key);
        if (!row || !def) return <p key={key} className="text-sm">{evidenceLabels[key]} · informazioni confermate insufficienti o campo non abilitato.</p>;
        const valid=validateValue(def,row.value);
        return <div key={key} className="space-y-2 rounded border p-3"><label><input type="checkbox" checked={row.selected}
          onChange={e=>setExtra({...extra,[key]:{...row,selected:e.target.checked}})}/> {evidenceLabels[key]}</label>
          <p>{row.manual?'Modifica manuale':'Selezione deterministica dai fatti confermati'}</p>
          <p>Valore attuale</p><ValueDisplay label={evidenceLabels[key]} value={draft.botanical[key]}/>
          <FieldEditor field={{key,label:def.label,editorType:def.editor_type,dataType:def.data_type,validationRules:def.validation_rules,required:def.required}}
            value={row.value} onChange={value=>setExtra({...extra,[key]:{...row,value,manual:true}})}/>
          {!valid.ok && <AiErrorNotice>{valid.message}</AiErrorNotice>}
        </div>;
      })}
      <div className="flex flex-wrap gap-2">
        <Button variant="editorial" type="button" disabled={busy || (!sheetKeys.some(applicable) && !extraKeys.length)} onClick={() => apply(sheetKeys,true)}>Applica tutte le proposte disponibili</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={invalidate}>Scarta anteprima</Button>
      </div>
    </section>}
  </section>;
}
