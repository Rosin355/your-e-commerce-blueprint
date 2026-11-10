import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { callAdminApi, callCatalogCommand, type AdminContext } from '../lib/adminApi';
type Price = { id: string; sku: string; price: string; compareAtPrice: string | null };
type Collection = { id: string; title: string; handle: string };
type Publication = { updatedAt: string; logistics: { id: string; class: string }[]; status: string; storefrontVisible: boolean; channel: string; soldOut: boolean };
export default function CatalogActions({ productId, context }: { productId: string; context: AdminContext | undefined }) {
  const [panel, setPanel] = useState<'prices' | 'categories' | 'publish' | null>(null);
  const [prices, setPrices] = useState<Price[]>();
  const [selected, setSelected] = useState<string[]>();
  const [soldOutConfirmed, setSoldOutConfirmed] = useState(false);
  const ordinary = context?.ordinaryCatalog === true;
  const priceQuery = useQuery({ queryKey: ['admin', 'prices', productId], enabled: ordinary && panel === 'prices', retry: false,
    queryFn: () => callAdminApi<{ updatedAt: string; variants: Price[] }>({ action: 'get_catalog_prices', productId }) });
  const categories = useQuery({ queryKey: ['admin', 'editorial', productId], enabled: ordinary && panel === 'categories', retry: false,
    queryFn: () => callAdminApi<{ updatedAt: string; selected: string[]; collections: Collection[] }>({ action: 'get_catalog_collections', productId }) });
  const publication = useQuery({ queryKey: ['admin', 'publication', productId], enabled: ordinary && panel === 'publish', retry: false,
    queryFn: () => callAdminApi<Publication>({ action: 'preview_catalog_publication', productId }) });
  const command = useMutation({ mutationFn: (body: Record<string, unknown>) => callCatalogCommand<{ result: { state: string; url?: string } }>({ ...body, productId }),
    onSuccess: () => { setPrices(undefined); setSelected(undefined); if (panel === 'prices') void priceQuery.refetch(); if (panel === 'categories') void categories.refetch(); if (panel === 'publish') void publication.refetch(); } });
  if (!ordinary) return null;
  const rows = prices ?? priceQuery.data?.variants ?? [];
  const chosen = selected ?? categories.data?.selected ?? [];
  const error = panel === 'prices' ? priceQuery.error : panel === 'categories' ? categories.error : publication.error;
  return <section className='space-y-3 rounded-lg border bg-card p-4'>
    <h2 className='font-semibold'>Operazioni catalogo</h2>
    <div className='flex flex-wrap gap-2'>
      {context?.canManagePrices && <Button variant='outline' onClick={() => { setPanel('prices'); command.reset(); }}>Prezzi e formati</Button>}
      {context?.operationalCapabilities?.categories && <Button variant='outline' onClick={() => { setPanel('categories'); command.reset(); }}>Categorie editoriali</Button>}
      {context?.canPublish && <Button variant='outline' onClick={() => { setPanel('publish'); command.reset(); }}>Verifica pubblicazione</Button>}
    </div>
    {error && <p role='alert'>{error.message}</p>}
    {panel === 'prices' && <div className='space-y-3'>
      <p>Prezzi Shopify correnti. Il comando aggiorna solo i prezzi delle varianti visualizzate; SKU e inventario restano protetti.</p>
      {priceQuery.isPending && <p role='status'>Lettura prezzi…</p>}
      {rows.map((v, index) => <div key={v.id} className='grid gap-2 rounded border p-3 sm:grid-cols-3'>
        <p className='break-all'>{v.sku}</p>
        <label>Prezzo (€)<Input inputMode='decimal' value={v.price} onChange={e => setPrices(rows.map((r, i) => i === index ? { ...r, price: e.target.value } : r))} /></label>
        <label>Prezzo di confronto (€)<Input inputMode='decimal' value={v.compareAtPrice ?? ''} onChange={e => setPrices(rows.map((r, i) => i === index ? { ...r, compareAtPrice: e.target.value || null } : r))} /></label>
      </div>)}
      <Button disabled={!prices || !priceQuery.data || command.isPending || !context?.canSync} onClick={() => command.mutate({ action: 'set_catalog_prices', expectedUpdatedAt: priceQuery.data!.updatedAt, prices: prices?.filter(v => { const before = priceQuery.data!.variants.find(r => r.id === v.id)!; return Number(v.price) !== Number(before.price) || v.compareAtPrice !== before.compareAtPrice; }) })}>Conferma e sincronizza prezzi</Button>
    </div>}
    {panel === 'categories' && <div className='space-y-2'>
      <p>Solo collezioni editoriali manuali verificate. Le altre associazioni esistenti vengono conservate; una bozza può restare senza categoria.</p>
      {categories.isPending && <p role='status'>Verifica categorie…</p>}
      {categories.data?.collections.map(c => <label key={c.id} className='flex min-h-11 items-center gap-2'>
        <Checkbox checked={chosen.includes(c.id)} onCheckedChange={checked => setSelected(checked ? [...chosen, c.id] : chosen.filter(id => id !== c.id))} />{c.title} <span className='text-xs'>({c.handle})</span>
      </label>)}
      <Button disabled={!selected || !categories.data || command.isPending || !context?.canSync} onClick={() => command.mutate({ action: 'set_catalog_collections', expectedUpdatedAt: categories.data!.updatedAt, collectionIds: chosen.filter(id => categories.data!.collections.some(c => c.id === id)) })}>Conferma associazioni editoriali</Button>
    </div>}
    {panel === 'publish' && <div className='space-y-3'>
      {publication.isPending && <p role='status'>Verifica dati, immagini, varianti e canale del sito…</p>}
      {publication.data && <>
        <p>Canale: {publication.data.channel}. Stato: {publication.data.status}. Visibilità Storefront: {publication.data.storefrontVisible ? 'verificata' : 'non ancora presente'}.</p>
        <p>Classe logistica effettiva: {[...new Set(publication.data.logistics.map(v => v.class))].join(', ')}. Confermando accetti la classificazione delle varianti verificata dal server.</p>
        {publication.data.soldOut && <label className='flex min-h-11 items-center gap-2'><Checkbox checked={soldOutConfirmed} onCheckedChange={checked => setSoldOutConfirmed(checked === true)} />Il prodotto non ha disponibilità: confermo di pubblicarlo come esaurito. Nessuna quantità viene aggiunta.</label>}
        <Button disabled={command.isPending || !context?.canSync || (publication.data.soldOut && !soldOutConfirmed)} onClick={() => {
          if (window.confirm('Pubblicare esplicitamente questo prodotto reale sul sito Online Garden?')) command.mutate({ action: 'publish_catalog_product', expectedUpdatedAt: publication.data!.updatedAt, logistics: publication.data!.logistics, allowSoldOut: soldOutConfirmed });
        }}>Pubblica sul sito</Button>
      </>}
    </div>}
    {command.isPending && <p role='status'>Operazione e verifica in corso…</p>}
    {command.isError && <p role='alert'>{command.error.message}</p>}
    {command.data && <p role='status'>Operazione verificata: {command.data.result.state === 'STOREFRONT_VERIFIED' ? 'prodotto leggibile sul sito' : 'dati confermati da Shopify'}.</p>}
  </section>;
}
