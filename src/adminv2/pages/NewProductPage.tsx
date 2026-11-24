import DraftSummaryView from '../components/DraftSummaryView';
import { projectDraft } from '../../../supabase/functions/_shared/admin-draft-view';
import ConfirmedAiAssistant from '../components/ConfirmedAiAssistant';
import VariantEditor from '../components/VariantEditor';
import RichTextEditor from '../components/RichTextEditor';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import FieldEditor from '../components/FieldEditor';
import { toggleMonth } from '../lib/fieldValueCodecs';
import { changeFamilySku, draftErrors, generateFamilySku, initialDraft } from '../lib/newDraft';
import CatalogImages from '../components/CatalogImages';
import { callAdminApi, callCatalogCommand } from '../lib/adminApi';
import { OPERATION_LABELS, useCategoryCatalogue } from '../lib/operationalApi';
import { AdminApiError } from '../lib/AdminApiError';
import { canRecoverDraftAfterError } from '../lib/operationalUiPolicy';
import { useAdminContext } from '../hooks/useAdminData';
import {
  DRAFT_BOTANICAL_KEYS,
  type ProductDraft,
} from '../../../supabase/functions/_shared/admin-operational-core';
import type { FieldDefinition } from '../../../supabase/functions/_shared/admin-v2-types';
const steps = ['Dati prodotto', 'Anteprima e salvataggio'];
export default function NewProductPage() {
  const [draft, setDraft] = useState<ProductDraft>(initialDraft);
  const [descriptionRevision,setDescriptionRevision]=useState(0);
  const [uploading, setUploading] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [skuError, setSkuError] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [confirmed, setConfirmed] = useState(false);
  const [locked, setLocked] = useState(false);
  const catalogue = useCategoryCatalogue();
  const adminContext = useAdminContext();
  const ordinary = adminContext.data?.ordinaryCatalog === true;
  const editorial = useQuery({ queryKey: ['admin', 'editorial-collections'], enabled: ordinary, retry: false,
    queryFn: () => callAdminApi<{ collections: { id: string; title: string; handle: string }[] }>({ action: 'list_editorial_collections' }) });
  const categoryNames = new Map([
    ...(catalogue.data?.categories ?? []).map(c => [c.id, c.display_name] as const),
    ...(editorial.data?.collections ?? []).map(c => [c.id, c.title] as const),
  ]);
  const summary = projectDraft(draft, categoryNames);
  const matchesCategory = (name: string) => name.toLocaleLowerCase('it').includes(categorySearch.trim().toLocaleLowerCase('it'));
  const definitions = useQuery({
    queryKey: ['admin', 'draft-field-definitions'],
    queryFn: () =>
      callAdminApi<{ definitions: FieldDefinition[] }>({ action: 'get_field_definitions' }),
    retry: false,
  });
  const errors = showErrors ? draftErrors(draft, definitions.data?.definitions) : {};
  function reportConflict(error: unknown) {
    if (!(error instanceof AdminApiError) || error.code !== 'SKU_CONFLICT') return;
    setLocked(false);
    setConfirmed(false);
    setSkuError('Un codice è già in uso. Premi “Genera altri codici” e verifica di nuovo l’anteprima.');
    setStep(0);
    focusField('sku');
  }
  const preview = useMutation({
    onError: (error: Error) => reportConflict(error),
    mutationFn: () =>
      callAdminApi<{ warnings: string[]; shopifySkuVerified?: boolean }>({ action: 'preview_new_product', draft }),
  });
  const save = useMutation({
    onError: error => {
      if (error instanceof AdminApiError && error.code === 'CANCELLED') setLocked(false);
      reportConflict(error);
    },
    mutationFn: () =>
      callCatalogCommand<{ result: { productId: string; operationId: string; state: string } }>({
        action: 'save_new_product',
        draft,
        idempotencyKey: catalogue.data?.canaryRequestKey ?? key,
        confirm: confirmed,
      }),
  });
  const send = useMutation({
    mutationFn: (action: string) =>
      callCatalogCommand<{ result: { state: string } }>({
        action,
        operationId: save.data?.result.operationId,
        confirm: true,
      }),
  });
  const update = (change: Partial<ProductDraft> | ((previous: ProductDraft) => Partial<ProductDraft>)) => {
    setDraft(previous => ({ ...previous, ...(typeof change === 'function' ? change(previous) : change) }));
    preview.reset();
    if (!locked) save.reset();
    setConfirmed(false);
    setKey(crypto.randomUUID());
  };
  function focusField(id: string) {
    requestAnimationFrame(() => {
      const element = document.getElementById(id);
      for (let parent = element?.parentElement; parent; parent = parent.parentElement) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
      }
      element?.focus();
    });
  }
  function navigate(to: number) {
    if (to === 1 && !locked) {
      setShowErrors(true);
      const invalid = Object.keys(draftErrors(draft, definitions.data?.definitions))[0];
      if (invalid || skuError) { setStep(0); focusField(invalid || 'sku'); return; }
    }
    setStep(to);
  }
  function rename(value: string, replaceAll = false) {
    setSkuError('');
    update(previous => changeFamilySku(previous, value, replaceAll));
  }
  const field = (label: string, k: 'title' | 'sku' | 'currency' | 'vendor' | 'productType' | 'seoTitle' | 'seoDescription', area = false) => {
    const error = (k === 'sku' && skuError) || errors[k];
    const props = {
      id: k, value: draft[k] ?? '', required: k === 'title' || k === 'sku' || k === 'currency',
      'aria-invalid': Boolean(error), 'aria-describedby': error ? k + '-error' : undefined,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => k === 'sku' ? rename(e.target.value) : update({ [k]: e.target.value }),
    };
    return <label className="block space-y-1"><span>{label}</span>
      {area ? <Textarea {...props} /> : <Input {...props} />}
      {error && <span id={k + '-error'} className="text-sm text-destructive">{error}</span>}
    </label>;
  };
  if (catalogue.data && !catalogue.data.canAuthorDraft) return <p role='status'>Il tuo ruolo consente la consultazione, senza creazione di prodotti.</p>;
  return (
    <div className='max-w-4xl space-y-5'>
      <header>
        <Link to='/admin/products' className='text-sm underline'>Torna ai prodotti</Link>
        <h1 className='text-2xl font-semibold mt-2'>Nuovo prodotto</h1>
        <p>Compilazione manuale. Nessuna pubblicazione automatica.</p>
      </header>
      <nav aria-label='Passaggi creazione' className='flex flex-wrap gap-2'>
        {steps.map((label, i) => (
          <Button
            key={label}
            type='button'
            disabled={uploading}
            className='min-h-11'
            variant={step === i ? 'default' : 'outline'}
            aria-current={step === i ? 'step' : undefined}
            onClick={() => navigate(i)}
          >
            {i + 1}. {label}
          </Button>
        ))}
      </nav>
      <fieldset disabled={locked} className='space-y-4 rounded-xl border bg-card p-4 sm:p-6'>
        <legend className='px-2 font-semibold'>{steps[step]}</legend>
        <div hidden={step !== 0} className="space-y-5">
          {field('Nome prodotto (obbligatorio)', 'title')}
          <section aria-label="Descrizione del prodotto" className="space-y-2">
            <h2 className="font-semibold">Descrizione (obbligatoria)</h2>
            <RichTextEditor key={descriptionRevision} value={draft.description} onChange={description => update({ description })}
              simple label="Descrizione verificata" inputId="description" error={errors.description} disabled={locked} />
            {errors.description && <p id="description-error" className="text-sm text-destructive">{errors.description}</p>}
            {adminContext.data?.canUseAi && definitions.data?.definitions.filter(d => d.key === 'description' &&
              adminContext.data?.editableFieldKeys?.includes(d.key) && d.visible && d.editable && d.ai_allowed && !d.manual_only).map(d =>
              <details key={d.key}><summary className="cursor-pointer">Aiuto AI per la descrizione (facoltativo)</summary>
                <ConfirmedAiAssistant field={{key:d.key,label:d.label,editorType:d.editor_type,dataType:d.data_type,validationRules:d.validation_rules ?? {},required:d.required}}
                  onApply={value => { update({ description: value as string }); setDescriptionRevision(n => n + 1); }} />
              </details>)}
            {definitions.isError && <p role="alert">Impossibile leggere i campi disponibili per AI e botanica. Puoi compilare la descrizione a mano.</p>}
          </section>
          <VariantEditor currency={draft.currency} sku={draft.sku} variants={draft.variants} errors={errors} onChange={variants => {
            setSkuError(''); update({ variants });
          }} />
          <section id="categories" tabIndex={-1} aria-describedby={errors.categories ? "categories-error" : undefined} className="space-y-2" aria-label="Categoria">
            <h2 className="font-semibold">Categoria (facoltativa)</h2>
            {errors.categories && <p id="categories-error" role="alert">{errors.categories}</p>}
            <label className="block">Cerca categoria<Input type="search" value={categorySearch} onChange={e => setCategorySearch(e.target.value)} /></label>
            <p aria-live="polite">Selezionate · {summary.categories?.join(', ') || 'Nessuna categoria'}</p>
            {ordinary ? <>
              {editorial.isPending && <p role='status'>Verifica collezioni editoriali…</p>}
              {editorial.isError && <p role='alert'>{editorial.error.message}</p>}
              {editorial.data?.collections.filter(c => matchesCategory(c.title)).map(c => <label key={c.id} className='flex min-h-11 items-center gap-2'>
                <Checkbox checked={draft.collectionIds?.includes(c.id) ?? false} onCheckedChange={checked => update({ collectionIds: checked ? [...(draft.collectionIds ?? []), c.id] : (draft.collectionIds ?? []).filter(id => id !== c.id) })} />
                {c.title}
              </label>)}
            </> : <>
              {catalogue.isError && <p role='alert'>{catalogue.error.message}</p>}
              {catalogue.data?.categories.filter(c => matchesCategory(c.display_name) && c.is_active && c.maps.length > 0 && c.maps.every(m => m.map_status === 'verified')).map(c => <label key={c.id} className='flex min-h-11 items-center gap-2'>
                <Checkbox checked={draft.categoryIds.includes(c.id)} onCheckedChange={checked => update({ categoryIds: checked ? [...draft.categoryIds, c.id] : draft.categoryIds.filter(id => id !== c.id) })} />{c.display_name}
              </label>)}
            </>}
          </section>
          <CatalogImages errors={errors} onUploadingChange={setUploading} images={draft.images} onChange={images => update({ images })} ordinary={ordinary}
              enabled={adminContext.data?.canUploadImages === true} sku={draft.sku} requestKey={catalogue.data?.canaryRequestKey} />
          <details className="space-y-3"><summary className="cursor-pointer font-medium">Opzioni avanzate</summary>
            {field('Codice prodotto (SKU famiglia)', 'sku')}
            <Button type="button" variant="outline" onClick={() => rename(generateFamilySku(), true)}>Genera altri codici</Button>
            {field('Valuta (codice ISO)', 'currency')}
            {field('Fornitore', 'vendor')}
            {adminContext.data?.supportsCatalogSourceAndProductType && field('Tipo prodotto', 'productType')}
            <label className="block">Tag separati da virgole<Input id="tags" value={tagsInput} aria-invalid={Boolean(errors.tags)} aria-describedby={errors.tags ? 'tags-error' : undefined}
              onChange={e => { setTagsInput(e.target.value); update({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }); }} /></label>
            {errors.tags && <p id="tags-error" className="text-sm text-destructive">{errors.tags}</p>}
            <details><summary className='cursor-pointer font-medium'>SEO facoltativa</summary>
            {field('Titolo SEO', 'seoTitle')}
            {field('Descrizione SEO', 'seoDescription', true)}
            </details>
            <details><summary className='cursor-pointer font-medium'>Informazioni botaniche e FAQ facoltative</summary>
            <p className='my-2 text-sm'>Inserisci soltanto i dati e i periodi che hai verificato.</p>
            {definitions.isError && <p role='alert'>Registro campi non disponibile.</p>}
            {definitions.data?.definitions.filter((d) =>
              (DRAFT_BOTANICAL_KEYS as readonly string[]).includes(d.key) && d.visible &&
              d.editable && !d.manual_only
            ).map((d) => (
              <div key={d.key} id={d.key} tabIndex={-1} role="group" aria-label={d.label} aria-describedby={errors[d.key] ? d.key + "-error" : undefined}>
                <h3>{d.label}</h3>
                <FieldEditor
                  field={{
                    key: d.key,
                    label: d.label,
                    editorType: d.editor_type,
                    dataType: d.data_type,
                    validationRules: d.validation_rules,
                    required: d.required,
                  }}
                  value={draft.botanical[d.key]}
                  onChange={value => update(previous => ({ botanical: { ...previous.botanical, [d.key]: value } }))}
                  onMonthToggle={(month, checked) => update(previous => {
                    const botanical = { ...previous.botanical };
                    const months = toggleMonth(botanical[d.key], month, checked);
                    if (months.length) botanical[d.key] = months;
                    else delete botanical[d.key];
                    return { botanical };
                  })}
                />
                {errors[d.key] && <p id={d.key + "-error"} className="text-sm text-destructive">{errors[d.key]}</p>}
              </div>
            ))}
            </details>
          </details>
        </div>
        {step === 1 && (
          <>
            <h2 className='font-semibold'>Anteprima della bozza interna</h2>
            <p>Compilazione locale · fuori vendita</p>
            <DraftSummaryView draft={summary} />
            <Button type='button' disabled={preview.isPending} onClick={() => preview.mutate()}>
              Verifica anteprima
            </Button>
            {preview.isError && <p role='alert'>{preview.error.message}</p>}
            {preview.data && (
              <div role='status'>{preview.data.warnings.map((w) => <p key={w}>{w}</p>)}
                {preview.data.shopifySkuVerified !== true && <p>Il server non ha confermato la verifica dei codici su Shopify. Attendi l’aggiornamento prima di salvare.</p>}
              </div>
            )}
            <label className='flex min-h-11 items-center gap-2'>
              <Checkbox
                checked={confirmed}
                onCheckedChange={(value) => setConfirmed(value === true)}
              />Confermo i dati: salva soltanto una bozza interna.
            </label>
            <Button
              type='button'
              disabled={preview.data?.shopifySkuVerified !== true || !confirmed || !catalogue.data?.canSaveDraft ||
                save.isPending}
              onClick={() => {
                setLocked(true);
                save.mutate();
              }}
            >
              Salva bozza nell’Admin
            </Button>
            {!catalogue.data?.canSaveDraft && (
              <p>
                Salvataggio non ancora abilitato per questo ambiente o account. Puoi compilare e
                verificare l’anteprima.
              </p>
            )}
          </>
        )}
      </fieldset>
      <div className='flex justify-between gap-2'>
        <Button variant='outline' disabled={uploading || step === 0} onClick={() => navigate(0)}>
          Indietro
        </Button>
        <Button disabled={uploading || step === 1} onClick={() => navigate(1)}>Vai all’anteprima</Button>
      </div>
      {save.isError && (
        <div role='alert'>
          <p>{save.error.message}</p>
          {locked && <p>I dati restano bloccati per evitare una seconda richiesta diversa dopo un timeout.</p>}
          {locked && catalogue.data?.canSaveDraft && (
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              Recupera salvataggio con la stessa richiesta
            </Button>
          )}
        </div>
      )}
      {save.data && (
        <section className='rounded-lg border p-4 space-y-3' aria-live='polite'>
          <h2 className='font-semibold'>
            {OPERATION_LABELS[send.data?.result.state ?? save.data.result.state]}
          </h2>
          <Link className='underline' to={`/admin/products/${save.data.result.productId}`}>
            Apri scheda prodotto e storico
          </Link>
          <p>
            La bozza non è pubblicata. L’azione separata “Pubblica” nella scheda verifica dati, classe di spedizione e canale del sito.
          </p>
          <details>
            <summary className='cursor-pointer'>Operazioni Shopify separate</summary>
            {catalogue.data?.canSendDraft &&
              (ordinary || catalogue.data.approvedOperationId === save.data.result.operationId) && (
              <Button
                disabled={send.isPending || Boolean(send.data)}
                onClick={() => {
                  if (window.confirm('Creare soltanto una bozza Shopify, senza pubblicarla?')) {
                    send.mutate('create_shopify_draft');
                  }
                }}
              >
                Crea bozza Shopify
              </Button>
            )}
            {send.isError && (
              <>
                <p role='alert'>{send.error.message}</p>
                {catalogue.data?.canRecoverDraft && (ordinary || catalogue.data.approvedOperationId === save.data.result.operationId) && canRecoverDraftAfterError(
                  adminContext.data,
                  Boolean(save.data?.result.operationId),
                  send.isError,
                ) && (
                  <Button
                    disabled={send.isPending}
                    onClick={() => send.mutate('recover_shopify_draft')}
                  >
                    Recupera stato senza ricreare
                  </Button>
                )}
              </>
            )}
          </details>
        </section>
      )}
    </div>
  );
}
