import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import FieldEditor from '../components/FieldEditor';
import { callAdminApi } from '../lib/adminApi';
import { OPERATION_LABELS, useCategoryCatalogue } from '../lib/operationalApi';
import {
  DRAFT_BOTANICAL_KEYS,
  type ProductDraft,
} from '../../../supabase/functions/_shared/admin-operational-core';
import type { FieldDefinition } from '../../../supabase/functions/_shared/admin-v2-types';
const initial: ProductDraft = {
  title: '',
  sku: '',
  description: '',
  currency: 'EUR',
  vendor: '',
  tags: [],
  categoryIds: [],
  variants: [{ sku: '', price: '', compareAtPrice: null, option: 'Formato unico' }],
  images: [],
  seoTitle: '',
  seoDescription: '',
  botanical: {},
};
const steps = [
  'Informazioni',
  'Dati commerciali',
  'Categorie',
  'Immagini e formati',
  'Botanica e SEO',
  'Anteprima',
];
export default function NewProductPage() {
  const [draft, setDraft] = useState<ProductDraft>(initial);
  const [step, setStep] = useState(0);
  const [tagsInput, setTagsInput] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [confirmed, setConfirmed] = useState(false);
  const [locked, setLocked] = useState(false);
  const catalogue = useCategoryCatalogue();
  const definitions = useQuery({
    queryKey: ['admin', 'draft-field-definitions'],
    queryFn: () =>
      callAdminApi<{ definitions: FieldDefinition[] }>({ action: 'get_field_definitions' }),
    retry: false,
  });
  const preview = useMutation({
    mutationFn: () =>
      callAdminApi<{ warnings: string[] }>({ action: 'preview_new_product', draft }),
  });
  const save = useMutation({
    mutationFn: () =>
      callAdminApi<{ result: { productId: string; operationId: string; state: string } }>({
        action: 'save_new_product',
        draft,
        idempotencyKey: key,
        confirm: confirmed,
      }),
  });
  const send = useMutation({
    mutationFn: (action: string) =>
      callAdminApi<{ result: { state: string } }>({
        action,
        operationId: save.data?.result.operationId,
        confirm: true,
      }),
  });
  const update = (change: Partial<ProductDraft>) => {
    setDraft((d) => ({ ...d, ...change }));
    preview.reset();
    setConfirmed(false);
    setKey(crypto.randomUUID());
  };
  const field = (
    label: string,
    k: 'title' | 'sku' | 'description' | 'currency' | 'vendor' | 'seoTitle' | 'seoDescription',
    area = false,
  ) => (
    <label className='block space-y-1'>
      <span>{label}</span>
      {area
        ? <Textarea value={draft[k]} onChange={(e) => update({ [k]: e.target.value })} />
        : (
          <Input
            value={draft[k]}
            onChange={(e) => {
              const value = e.target.value;
              update(
                k === 'sku' && draft.variants.length === 1
                  ? { sku: value, variants: [{ ...draft.variants[0], sku: value }] }
                  : { [k]: value },
              );
            }}
          />
        )}
    </label>
  );
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
            className='min-h-11'
            variant={step === i ? 'default' : 'outline'}
            aria-current={step === i ? 'step' : undefined}
            onClick={() => setStep(i)}
          >
            {i + 1}. {label}
          </Button>
        ))}
      </nav>
      <fieldset disabled={locked} className='space-y-4 rounded-xl border bg-card p-4 sm:p-6'>
        <legend className='px-2 font-semibold'>{steps[step]}</legend>
        {step === 0 && (
          <>
            {field('Nome prodotto', 'title')}
            {field('SKU famiglia', 'sku')}
            {field('Descrizione verificata', 'description', true)}
            <p className='text-sm text-muted-foreground'>
              Inserisci soltanto informazioni note. I contenuti botanici non vengono completati
              automaticamente.
            </p>
          </>
        )}
        {step === 1 && (
          <>
            {field('Valuta base Shopify (da verificare prima dell’invio)', 'currency')}
            {field('Fornitore', 'vendor')}
            <label className='block'>
              Tag separati da virgole<Input
                value={tagsInput}
                onChange={(e) => { setTagsInput(e.target.value); update({ tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }); }}
              />
            </label>
            <p>
              Prezzi per ciascun formato nel passaggio “Immagini e formati”. Inventario e
              disponibilità saranno gestiti in Shopify secondo le autorizzazioni; non viene
              assegnata alcuna quantità predefinita.
            </p>
          </>
        )}
        {step === 2 && (
          <>
            {catalogue.isPending
              ? <p role='status'>Caricamento categorie…</p>
              : catalogue.isError
              ? <p role='alert'>{catalogue.error.message}</p>
              : (
                <>
                  <p>Selezione proposta: non modifica le collezioni di prodotti già esistenti.</p>
                  {catalogue.data.categories.filter((c) => c.is_active).map((c) => (
                    <label key={c.id} className='flex items-center min-h-11 gap-2'>
                      <Checkbox
                        checked={draft.categoryIds.includes(c.id)}
                        onCheckedChange={(checked) =>
                          update({
                            categoryIds: checked
                              ? [...draft.categoryIds, c.id]
                              : draft.categoryIds.filter((id) =>
                                id !== c.id
                              ),
                          })}
                      />
                      {c.display_name}
                    </label>
                  ))}
                  {!catalogue.data.categories.length && (
                    <p>Nessuna categoria disponibile. La bozza potrà restare da classificare.</p>
                  )}
                </>
              )}
          </>
        )}
        {step === 3 && (
          <>
            <h2 className='font-semibold'>Formati e prezzi</h2>
            {draft.variants.map((v, i) => (
              <div className='grid gap-3 rounded-lg border p-3 sm:grid-cols-2' key={i}>
                {(['sku', 'option', 'price', 'compareAtPrice'] as const).map((k) => (
                  <label key={k}>
                    {({
                      sku: 'SKU variante',
                      option: 'Formato',
                      price: 'Prezzo',
                      compareAtPrice: 'Prezzo di confronto (opzionale)',
                    })[k]}
                    <Input
                      value={v[k] ?? ''}
                      inputMode={k === 'price' || k === 'compareAtPrice' ? 'decimal' : undefined}
                      onChange={(e) =>
                        update({
                          variants: draft.variants.map((x, j) =>
                            i === j ? { ...x, [k]: e.target.value } : x
                          ),
                        })}
                    />
                  </label>
                ))}
                {draft.variants.length > 1 && (
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() =>
                      update({ variants: draft.variants.filter((_, j) => i !== j) })}
                  >
                    Rimuovi formato {i + 1}
                  </Button>
                )}
              </div>
            ))}
            <Button
              type='button'
              variant='outline'
              disabled={draft.variants.length >= 50}
              onClick={() =>
                update({
                  variants: [...draft.variants, {
                    sku: '',
                    option: '',
                    price: '',
                    compareAtPrice: null,
                  }],
                })}
            >
              Aggiungi formato
            </Button>
            <p className='text-sm'>
              Un formato: stesso SKU della famiglia. Più formati: SKU distinti fra famiglia e
              varianti. Una sola opzione “Formato” in questa prima versione.
            </p>
            <h2 className='font-semibold'>Immagini già caricate su Shopify</h2>
            {draft.images.map((image, i) => (
              <div key={i} className='space-y-2 rounded-lg border p-3'>
                <label>
                  URL immagine HTTPS<Input
                    value={image.url}
                    onChange={(e) =>
                      update({
                        images: draft.images.map((x, j) =>
                          i === j ? { ...x, url: e.target.value } : x
                        ),
                      })}
                  />
                </label>
                <label>
                  Testo alternativo<Input
                    value={image.alt}
                    onChange={(e) =>
                      update({
                        images: draft.images.map((x, j) =>
                          i === j ? { ...x, alt: e.target.value } : x
                        ),
                      })}
                  />
                </label>
                <Button
                  variant='outline'
                  type='button'
                  onClick={() =>
                    update({
                      images: draft.images.filter((_, j) =>
                        i !== j
                      ),
                    })}
                >
                  Rimuovi immagine {i + 1}
                </Button>
              </div>
            ))}
            <Button
              type='button'
              variant='outline'
              disabled={draft.images.length >= 20}
              onClick={() => update({ images: [...draft.images, { url: '', alt: '' }] })}
            >
              Aggiungi immagine
            </Button>
          </>
        )}
        {step === 4 && (
          <>
            {field('Titolo SEO', 'seoTitle')}
            {field('Descrizione SEO', 'seoDescription', true)}
            <h2 className='font-semibold'>Informazioni botaniche facoltative</h2>
            {definitions.isError && <p role='alert'>Registro campi non disponibile.</p>}
            {definitions.data?.definitions.filter((d) =>
              (DRAFT_BOTANICAL_KEYS as readonly string[]).includes(d.key) && d.visible &&
              d.editable && !d.manual_only
            ).map((d) => (
              <div key={d.key}>
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
                  onChange={(value) =>
                    update({ botanical: { ...draft.botanical, [d.key]: value } })}
                />
              </div>
            ))}
            <p className='text-sm'>
              L’AI rimane facoltativa nella scheda prodotto salvata: ogni proposta richiede
              accettazione umana. Completare prima l’invio della bozza oppure richiedere una
              revisione dell’operazione prima di modificare i contenuti salvati.
            </p>
          </>
        )}
        {step === 5 && (
          <>
            <h2 className='text-xl font-semibold'>{draft.title || 'Nome da compilare'}</h2>
            <p>SKU: {draft.sku || 'Da compilare'}</p>
            <p className='whitespace-pre-wrap break-words'>{draft.description}</p>
            <p>
              Categorie: {draft.categoryIds.map((id) =>
                catalogue.data?.categories.find((c) => c.id === id)?.display_name ??
                  'Non disponibile'
              ).join(', ') || 'Da classificare'}
            </p>
            {draft.variants.map((v, i) => (
              <p key={i}>{v.option}: {v.price || '—'} {draft.currency} · SKU {v.sku || '—'}</p>
            ))}
            <Button type='button' disabled={preview.isPending} onClick={() => preview.mutate()}>
              Verifica anteprima
            </Button>
            {preview.isError && <p role='alert'>{preview.error.message}</p>}
            {preview.data && (
              <div role='status'>{preview.data.warnings.map((w) => <p key={w}>{w}</p>)}</div>
            )}
            <label className='flex min-h-11 items-center gap-2'>
              <Checkbox
                checked={confirmed}
                onCheckedChange={(value) => setConfirmed(value === true)}
              />Confermo i dati: salva soltanto una bozza interna.
            </label>
            <Button
              type='button'
              disabled={!preview.data || !confirmed || !catalogue.data?.canSaveDraft ||
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
        <Button variant='outline' disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Indietro
        </Button>
        <Button disabled={step === 5} onClick={() => setStep((s) => s + 1)}>Continua</Button>
      </div>
      {save.isError && (
        <div role='alert'>
          <p>{save.error.message}</p>
          <p>I dati restano bloccati per evitare una seconda richiesta diversa dopo un timeout.</p>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            Recupera salvataggio con la stessa richiesta
          </Button>
        </div>
      )}
      {save.data && (
        <section className='rounded-lg border p-4 space-y-3' aria-live='polite'>
          <h2 className='font-semibold'>
            {OPERATION_LABELS[send.data?.result.state ?? save.data.result.state]}
          </h2>
          <Link className='underline' to={`/admin/products/${save.data.result.productId}`}>
            Apri scheda, proposte AI e storico
          </Link>
          <p>
            Pubblicazione non abilitata. Prezzi, inventario e canali richiedono la verifica
            operativa.
          </p>
          {catalogue.data?.canSendDraft && (
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
              <Button
                disabled={send.isPending}
                onClick={() => send.mutate('recover_shopify_draft')}
              >
                Recupera stato senza ricreare
              </Button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
