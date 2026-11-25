import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { callAdminApi, callCatalogCommand, type AdminContext } from '../lib/adminApi';
type Price = { title?: string; id: string; sku: string; price: string; compareAtPrice: string | null };
type Collection = { id: string; title: string; handle: string };
type Publication = { title: string; description: string; images: number; categories: string[]; variants: {format:string; price:string; quantity:number}[]; channelPublished:boolean; availableForSale:boolean; updatedAt: string; logistics: { id: string; class: string }[]; status: string; storefrontVisible: boolean; channel: string; soldOut: boolean };
export default function CatalogActions({ productId, context, technical, showPublication }: { productId: string; showPublication: boolean; technical: boolean; context: AdminContext | undefined }) {
  const [panel, setPanel] = useState<'prices' | 'categories' | 'publish' | null>(null);
  const [prices, setPrices] = useState<{ updatedAt: string; rows: Price[] }>();
  const [selected, setSelected] = useState<{ updatedAt: string; ids: string[] }>();
  const [soldOutConfirmed, setSoldOutConfirmed] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ordinary = Boolean(user) && context?.ordinaryCatalog === true;
  const priceQuery = useQuery({ queryKey: ['admin', 'prices', productId, user?.id], enabled: ordinary && panel === 'prices', retry: false,
    queryFn: () => callAdminApi<{ updatedAt: string; variants: Price[] }>({ action: 'get_catalog_prices', productId }) });
  const categories = useQuery({ queryKey: ['admin', 'editorial', productId, user?.id], enabled: ordinary && panel === 'categories', retry: false,
    queryFn: () => callAdminApi<{ updatedAt: string; selected: string[]; collections: Collection[] }>({ action: 'get_catalog_collections', productId }) });
  const publication = useQuery({ queryKey: ['admin', 'publication', productId, user?.id], enabled: ordinary && !technical && panel === 'publish', retry: false,
    queryFn: () => callAdminApi<Publication>({ action: 'preview_catalog_publication', productId }) });
  const command = useMutation({ mutationFn: (body: Record<string, unknown>) => callCatalogCommand<{ result: { state: string; url?: string; availableForSale?: boolean } }>({ ...body, productId }),
    onSuccess: () => {
      setPrices(undefined);
      setSelected(undefined);
      if (panel === 'prices') void priceQuery.refetch();
      if (panel === 'categories') void categories.refetch();
      if (panel === 'publish') void publication.refetch();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId, user?.id] }),
  });
  if (!ordinary || !(context?.canManagePrices || context?.operationalCapabilities?.categories || (showPublication && context?.canPublish && context?.canSync && !technical))) return null;
  const rows = prices?.rows ?? priceQuery.data?.variants ?? [];
  const chosen = selected?.ids ?? categories.data?.selected ?? [];
  const normalizedPrices = prices?.rows.map(v => ({
    ...v, price: v.price.trim().replace(',', '.'), compareAtPrice: v.compareAtPrice?.trim().replace(',', '.') || null,
  }));
  const decimal = /^(0|[1-9]\d{0,7})(\.\d{1,2})?$/;
  const invalidPrice = normalizedPrices?.some(v => !decimal.test(v.price) || (v.compareAtPrice !== null &&
    (!decimal.test(v.compareAtPrice) || Number(v.compareAtPrice) <= Number(v.price))));
  const changedPrices = normalizedPrices?.filter(v => {
    const before = priceQuery.data?.variants.find(row => row.id === v.id);
    return before && (Number(v.price) !== Number(before.price) ||
      (v.compareAtPrice === null) !== (before.compareAtPrice === null) || Number(v.compareAtPrice) !== Number(before.compareAtPrice));
  });
  const priceConflict = Boolean(prices && prices.updatedAt !== priceQuery.data?.updatedAt);
  const categoryConflict = Boolean(selected && selected.updatedAt !== categories.data?.updatedAt);
  const error = panel === 'prices' ? priceQuery.error : panel === 'categories' ? categories.error : publication.error;
  return <details className='space-y-3 rounded-lg border bg-card p-4'>
    <summary className='cursor-pointer font-semibold'>Operazioni su Shopify</summary>
    <div className='flex flex-wrap gap-2'>
      {context?.canManagePrices && <Button variant='outline' onClick={() => { setPanel('prices'); command.reset(); }}>Prezzi e formati</Button>}
      {context?.operationalCapabilities?.categories && <Button variant='outline' onClick={() => { setPanel('categories'); command.reset(); }}>Categorie editoriali</Button>}
      {showPublication && !technical && context?.canSync && context?.canPublish && <Button variant='outline' onClick={() => { setPanel('publish'); setSoldOutConfirmed(false); command.reset(); }}>Verifica prima di pubblicare</Button>}
    </div>
    {technical && <p role='status'>Prodotto di collaudo · pubblicazione bloccata.</p>}
    {error && <p role='alert'>{error.message}</p>}
    {panel === 'prices' && <div className='space-y-3'>
      <p>Prezzi Shopify correnti. Il comando aggiorna solo i prezzi delle varianti visualizzate; SKU e inventario restano protetti.</p>
      {priceQuery.isPending && <p role='status'>Lettura prezzi…</p>}
      {rows.map((v, index) => <div key={v.id} className='grid gap-2 rounded border p-3 sm:grid-cols-3'>
        <p>{v.title || 'Formato '+(index+1)}</p>
        <label>Prezzo (€)<Input inputMode='decimal' value={v.price} onChange={e => setPrices({ updatedAt: prices?.updatedAt ?? priceQuery.data!.updatedAt, rows: rows.map((r, i) => i === index ? { ...r, price: e.target.value } : r) })} /></label>
        <label>Prezzo di confronto (€)<Input inputMode='decimal' value={v.compareAtPrice ?? ''} onChange={e => setPrices({ updatedAt: prices?.updatedAt ?? priceQuery.data!.updatedAt, rows: rows.map((r, i) => i === index ? { ...r, compareAtPrice: e.target.value || null } : r) })} /></label>
      </div>)}
      {priceConflict && <p role='alert'>I prezzi sono cambiati durante la modifica. <button className='underline' onClick={() => setPrices(undefined)}>Ricarica i valori attuali</button></p>}
      {invalidPrice && <p role='alert'>Inserisci il prezzo con al massimo due decimali. Il prezzo precedente, se indicato, deve superare quello di vendita.</p>}
      <Button variant="shopify" disabled={priceConflict || !changedPrices?.length || invalidPrice || !priceQuery.data || command.isPending || !context?.canSync} onClick={() => command.mutate({ action: 'set_catalog_prices', expectedUpdatedAt: prices!.updatedAt, prices: changedPrices })}>Conferma e sincronizza prezzi</Button>
    </div>}
    {panel === 'categories' && <div className='space-y-2'>
      <p>Solo collezioni editoriali manuali verificate. Le altre associazioni esistenti vengono conservate; una bozza può restare senza categoria.</p>
      {categories.isPending && <p role='status'>Verifica categorie…</p>}
      {categories.data?.collections.map(c => <label key={c.id} className='flex min-h-11 items-center gap-2'>
        <Checkbox checked={chosen.includes(c.id)} onCheckedChange={checked => setSelected({ updatedAt: selected?.updatedAt ?? categories.data!.updatedAt, ids: checked ? [...chosen, c.id] : chosen.filter(id => id !== c.id) })} />{c.title}
      </label>)}
      {categoryConflict && <p role='alert'>Le categorie sono cambiate durante la modifica. <button className='underline' onClick={() => setSelected(undefined)}>Ricarica la selezione attuale</button></p>}
      <Button variant="shopify" disabled={categoryConflict || !selected || !categories.data || command.isPending || !context?.canSync} onClick={() => command.mutate({ action: 'set_catalog_collections', expectedUpdatedAt: selected!.updatedAt, collectionIds: chosen.filter(id => categories.data!.collections.some(c => c.id === id)) })}>Conferma associazioni editoriali</Button>
    </div>}
    {!technical && panel === 'publish' && <div className='space-y-3'>
      {publication.isPending && <p role='status'>Verifica dati, immagini, varianti e canale del sito…</p>}
      {publication.data && <>
        <h3 className="font-semibold">{publication.data.title}</h3><p>{publication.data.description}</p>
        <p>Categorie · {publication.data.categories?.join(', ')}. Foto disponibili · {publication.data.images}</p>
        <ul>{publication.data.variants?.map(v => <li key={v.format}>{v.format} · {v.price} € · quantità {v.quantity}</li>)}</ul>
        <p>Pubblicazione sul canale · {publication.data.channelPublished ? 'confermata' : 'da eseguire'}. Acquistabilità in vetrina · {publication.data.availableForSale ? 'disponibile' : 'non verificata o esaurito'}.</p>
        <p>Canale: {publication.data.channel}. Stato: {publication.data.status}. Visibilità Storefront: {publication.data.storefrontVisible ? 'verificata' : 'non ancora presente'}.</p>
        <p>Classe logistica effettiva: {[...new Set(publication.data.logistics.map(v => v.class))].join(', ')}. Confermando accetti la classificazione delle varianti verificata dal server.</p>
        {publication.data.soldOut && <label className='flex min-h-11 items-center gap-2'><Checkbox checked={soldOutConfirmed} onCheckedChange={checked => setSoldOutConfirmed(checked === true)} />Il prodotto non ha disponibilità: confermo di pubblicarlo come esaurito. Nessuna quantità viene aggiunta.</label>}
        <Button variant="shopify" disabled={command.isPending || !context?.canSync || (publication.data.soldOut && !soldOutConfirmed)} onClick={() => {
          if (window.confirm('Pubblicare esplicitamente questo prodotto reale sul sito Online Garden?')) command.mutate({ action: 'publish_catalog_product', expectedUpdatedAt: publication.data!.updatedAt, logistics: publication.data!.logistics, allowSoldOut: soldOutConfirmed });
        }}>Pubblica su Shopify</Button>
      </>}
    </div>}
    {command.isPending && <p role='status'>Operazione e verifica in corso…</p>}
    {command.isError && <p role='alert'>{command.error.message}</p>}
    {command.data && <p role='status'>Operazione verificata: {command.data.result.state === 'STOREFRONT_VERIFIED' ? (command.data.result.availableForSale ? 'visibile nel catalogo e disponibile all’acquisto' : 'visibile nel catalogo e non acquistabile') : 'dati confermati da Shopify'}.</p>}
    {command.data?.result.state === 'STOREFRONT_VERIFIED' && command.data.result.url?.startsWith('https://onlinegarden.it/products/') && <a className="underline" target="_blank" rel="noopener noreferrer" href={command.data.result.url}>Apri e verifica la scheda su onlinegarden.it</a>}
  </details>;
}
