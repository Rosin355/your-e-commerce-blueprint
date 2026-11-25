import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { callAdminApi, callCatalogCommand } from '../lib/adminApi';
import AiErrorNotice from './AiErrorNotice';

const labels = {
  unpublish_catalog_product: 'Rimuovi dal sito',
  archive_catalog_product: 'Archivia prodotto',
  restore_catalog_product: 'Ripristina come bozza',
  delete_catalog_product: 'Elimina definitivamente',
} as const;
type Action = keyof typeof labels;
type Preview = {
  hash: string;
  plan: {
    title: string;
    status: string;
    channels: { id: string; name: string }[];
    variants: { id: string; sku: string }[];
  };
};
const impact: Record<Action, string> = {
  unpublish_catalog_product: 'Rimuove il prodotto dal solo canale Online Garden.',
  archive_catalog_product: 'Archivia il prodotto su Shopify e lo ritira dalla vendita su tutti i canali.',
  restore_catalog_product:
    'Riporta il prodotto archiviato in bozza Shopify. La pubblicazione sarà una scelta separata.',
  delete_catalog_product:
    'Elimina il prodotto e le sue varianti da Shopify. La cancellazione è irreversibile.',
};

export default function ProductLifecycle(
  { productId, allowed, status, visible }: {
    productId: string;
    allowed: string[];
    status?: string | null;
    visible?: boolean | null;
  },
) {
  const [review, setReview] = useState<{ action: Action; preview: Preview }>();
  const [typed, setTyped] = useState('');
  const [finished, setFinished] = useState('');
  const cache = useQueryClient();
  const read = useMutation({
    mutationFn: (action: Action) =>
      callAdminApi<Preview>({ action: 'preview_catalog_lifecycle', operation: action, productId }),
    onSuccess: (preview, action) => setReview({ action, preview }),
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!review) throw new Error('Riapri il riepilogo.');
      return callCatalogCommand({
        action: review.action,
        productId,
        planHash: review.preview.hash,
        ...(review.action === 'delete_catalog_product' ? { typedTitle: typed } : {}),
      }, { reviewed: true });
    },
    onSuccess: () => {
      setFinished('Operazione verificata su Shopify e nella vetrina.');
      setReview(undefined);
      void cache.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      void cache.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
  const options = (Object.keys(labels) as Action[]).filter((a) =>
    allowed.includes(a) && (
      a === 'delete_catalog_product' || a === 'restore_catalog_product'
        ? status === 'ARCHIVED'
        : a === 'unpublish_catalog_product'
        ? visible === true
        : status !== 'ARCHIVED'
    )
  );
  if (!options.length && !finished) return null;
  return (
    <section className='space-y-3 rounded-lg border p-4' aria-label='Gestione della vendita'>
      <h2 className='font-semibold'>Gestione della vendita</h2>
      {finished && <p role='status'>{finished}</p>}
      {!review && (
        <div className='flex flex-wrap gap-2'>
          {options.map((a) => (
            <Button
              key={a}
              type='button'
              variant={a === 'delete_catalog_product' ? 'destructive' : 'outline'}
              disabled={read.isPending}
              onClick={() => {
                setFinished('');
                setTyped('');
                save.reset();
                read.mutate(a);
              }}
            >
              {labels[a]}
            </Button>
          ))}
        </div>
      )}
      {review && (
        <div className='space-y-3'>
          <h3>{labels[review.action]} · {review.preview.plan.title}</h3>
          <p>{impact[review.action]}</p>
          <p>
            Varianti interessate: {review.preview.plan.variants.length}. Canali attivi:{' '}
            {review.preview.plan.channels.map((c) => c.name).join(', ') || 'nessuno'}.
          </p>
          {review.action === 'delete_catalog_product' && (
            <label>
              Digita il nome esatto del prodotto<Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete='off'
              />
            </label>
          )}
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              disabled={save.isPending}
              onClick={() => {
                setReview(undefined);
                save.reset();
              }}
            >
              Annulla
            </Button>
            <Button
              variant={review.action === 'delete_catalog_product' ? 'destructive' : 'shopify'}
              disabled={save.isPending || save.isError ||
                (review.action === 'delete_catalog_product' && typed !== review.preview.plan.title)}
              onClick={() => save.mutate()}
            >
              Conferma · {labels[review.action]}
            </Button>
          </div>
        </div>
      )}
      {(read.error || save.error) && <AiErrorNotice>{(read.error || save.error)?.message}</AiErrorNotice>}
    </section>
  );
}
