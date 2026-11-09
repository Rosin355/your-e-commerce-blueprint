import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CATEGORIES } from '@/config/categories';
import { callAdminApi } from '../lib/adminApi';
import { useCategoryCatalogue } from '../lib/operationalApi';
const menuHandles = new Set(CATEGORIES.flatMap((c) => [c.handle, ...c.links.map((l) => l.handle)]));
export default function CategoriesPage() {
  const query = useCategoryCatalogue();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [productId, setProductId] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const preview = useMutation({
    mutationFn: () =>
      callAdminApi<
        {
          diff: { add: string[]; remove: string[]; keep: string[] };
          reason: string;
          expectedHash?: string;
          executable: boolean;
          shopifyDiff?: { add: number; remove: number };
        }
      >({ action: 'preview_categories', productId, categoryIds: selected }),
  });
  const apply = useMutation({
    mutationFn: () =>
      callAdminApi<{ reason: string }>({
        action: 'apply_categories',
        productId,
        categoryIds: selected,
        expectedHash: preview.data?.expectedHash,
        idempotencyKey: crypto.randomUUID(),
        confirm: true,
      }),
    onSuccess: () => query.refetch(),
  });
  if (query.isPending) return <p role='status'>Caricamento categorie…</p>;
  if (query.isError) {
    return (
      <div role='alert'>
        <h1>Categorie non disponibili</h1>
        <p>{query.error.message}</p>
        <Button onClick={() => query.refetch()}>Riprova</Button>
      </div>
    );
  }
  const data = query.data;
  const label = (id: string) =>
    data.categories.find((c) => c.id === id)?.display_name ?? 'Categoria non disponibile';
  const products = data.products.filter((p) =>
    filter === 'none'
      ? p.categoryIds.length === 0
      : filter === 'multiple'
      ? p.categoryIds.length > 1
      : filter === 'all' || p.categoryIds.includes(filter)
  );
  return (
    <div className='space-y-6'>
      <header>
        <h1 className='text-2xl font-semibold'>Categorie</h1>
        <p className='text-sm text-muted-foreground'>
          Categorie interne, collezioni Shopify e menu del sito sono distinti.
        </p>
      </header>
      <p className='rounded-lg border p-4 text-sm'>{data.notice}</p>
      <p className='text-sm'>
        82 casi storici da verificare: riconciliazione non conclusa. Non sono il conteggio dei
        prodotti senza categoria mostrati qui.
      </p>
      {data.missingCanonicalHandles.length > 0 && (
        <p role='status'>
          {data.missingCanonicalHandles.length}{' '}
          collezioni canoniche senza mapping interno disponibile.
        </p>
      )}
      <label className='block'>
        Cerca categoria<Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Nome o handle'
        />
      </label>
      <div className='grid gap-3 md:grid-cols-2'>
        {data.categories.filter((c) =>
          (c.display_name + ' ' + c.maps.map((m) => m.shopify_handle).join(' ')).toLowerCase()
            .includes(search.toLowerCase())
        ).map((c) => (
          <article key={c.id} className='rounded-lg border bg-card p-4 space-y-2'>
            <h2 className='font-semibold'>{c.display_name}</h2>
            <p className='text-sm'>
              {c.parent_id ? `Sottocategoria di ${label(c.parent_id)}` : 'Categoria principale'} ·
              {' '}
              {c.is_active ? 'Attiva' : 'Non attiva'}
            </p>
            {!c.maps.length && <p className='text-sm'>Associazione non approvata: decisione commerciale richiesta. Nessuna modifica applicata.</p>}
            {c.maps.map((m) => (
              <p className='text-sm break-words' key={m.shopify_handle}>
                {m.shopify_handle} ·{' '}
                {m.map_status === 'verified' ? 'Mapping verificato' : 'Mapping da verificare'} ·
                {' '}
                {menuHandles.has(m.shopify_handle) ? 'Presente nel menu' : 'Non presente nel menu'}
              </p>
            ))}
            <Button
              variant='outline'
              className='min-h-11'
              onClick={() => setFilter(c.id)}
            >
              {c.productCount} prodotti interni associati
            </Button>
            {c.productCount === 0 && (
              <p className='text-sm text-muted-foreground'>
                Nessuna assegnazione interna approvata. La disponibilità Shopify può essere diversa.
              </p>
            )}
          </article>
        ))}
      </div>
      {data.categories.length === 0 && (
        <p role='status'>Nessuna categoria canonica disponibile nel catalogo interno.</p>
      )}
      <section className='space-y-3'>
        <h2 className='text-lg font-semibold'>Prodotti e assegnazioni</h2>
        <label className='block'>
          Mostra<select
            aria-label='Mostra'
            className='block min-h-11 w-full rounded border bg-background p-2'
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value='all'>Tutti</option>
            <option value='none'>Senza categoria canonica interna</option>
            <option value='multiple'>Con più categorie canoniche interne</option>
            {data.categories.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
          </select>
        </label>
        <p>{products.length} prodotti interni</p>
        <div className='max-h-96 overflow-y-auto rounded-lg border'>
          {products.map((p) => (
            <div
              key={p.id}
              className='flex flex-wrap items-center justify-between gap-2 border-b p-3'
            >
              <Link className='underline break-all' to={`/admin/products/${p.id}`}>{p.sku}</Link>
              {data.canManageCategories && <Button
                variant='outline'
                className='min-h-11'
                onClick={() => {
                  setProductId(p.id);
                  setSelected(p.categoryIds);
                  preview.reset();
                  apply.reset();
                }}
              >
                Proponi categorie
              </Button>}
            </div>
          ))}
        </div>
        {products.length === 0 && <p>Nessun prodotto per questo filtro.</p>}
      </section>
      {productId && (
        <section className='space-y-3 rounded-lg border p-4'>
          <h2 className='font-semibold'>
            Proposta per {data.products.find((p) => p.id === productId)?.sku}
          </h2>
          <p>
            La verifica è in sola lettura. L’applicazione richiede autorizzazione, abilitazione
            operativa e conferma esplicita.
          </p>
          <div className='grid gap-2 sm:grid-cols-2'>
            {data.categories.filter((c) => c.is_active).map((c) => (
              <label key={c.id} className='flex min-h-11 items-center gap-2'>
                <Checkbox
                  checked={selected.includes(c.id)}
                  disabled={!c.maps.length || c.maps.some((m) =>
                    m.map_status !== 'verified'
                  )}
                  onCheckedChange={(checked) => {
                    setSelected(
                      checked ? [...selected, c.id] : selected.filter((id) => id !== c.id),
                    );
                    preview.reset();
                  }}
                />
                {c.display_name}
              </label>
            ))}
          </div>
          <Button disabled={preview.isPending} onClick={() => preview.mutate()}>
            Verifica proposta
          </Button>
          {preview.isError && <p role='alert'>{preview.error.message}</p>}
          {preview.data && (
            <div role='status'>
              <p>Da aggiungere: {preview.data.diff.add.map(label).join(', ') || 'nessuna'}</p>
              <p>Da rimuovere: {preview.data.diff.remove.map(label).join(', ') || 'nessuna'}</p>
              <p>{preview.data.reason}</p>
              {preview.data.shopifyDiff && (
                <p>
                  Shopify: {preview.data.shopifyDiff.add} associazioni da aggiungere,{' '}
                  {preview.data.shopifyDiff.remove} da rimuovere.
                </p>
              )}
              {preview.data.executable && (
                <Button
                  disabled={apply.isPending || apply.isError || apply.isSuccess}
                  onClick={() => {
                    if (
                      window.confirm('Confermi queste modifiche alle associazioni Shopify?')
                    ) apply.mutate();
                  }}
                >
                  Conferma assegnazione
                </Button>
              )}
              {apply.isError && <p role='alert'>{apply.error.message}</p>}
              {apply.data && <p>{apply.data.reason}</p>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
