import { useState } from 'react';
import ConfirmedAiAssistant from '../components/ConfirmedAiAssistant';
import AiErrorNotice from '../components/AiErrorNotice';
import { isTechnicalProduct } from '../../../supabase/functions/_shared/admin-operational-core';
import ProductAssetEditor from '../components/ProductAssetEditor';
import CatalogActions from '../components/CatalogActions';
import ProductOperations from '../components/ProductOperations';
import { ADMIN_READ_ONLY_RELEASE, readOnlyField, READ_ONLY_RELEASE_NOTICE } from '../lib/readOnlyRelease';
// F6 — Scheda prodotto in sola lettura, organizzata per sezioni.
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { AdminField } from '../lib/adminApi';
import { isEditorValueSupported } from '../lib/fieldValueCodecs';
import FieldCard from '../components/FieldCard';
import {
  useAdminContext,
  useAcceptAiSuggestion,
  useAiSuggestions,
  useFieldCommand,
  useFieldSync,
  useGenerateAiSuggestion,
  useProductDetail,
  useRejectAiSuggestion,
} from '../hooks/useAdminData';
import { ENTITY_LABEL, formatDate, INVENTORY_NOTICE, siteState } from '../lib/labels';

const SHOPIFY_SYNC_LABEL: Record<string, string> = {
  synced: 'Sincronizzato',
  pending: 'In attesa',
  error: 'Errore',
  never: 'Mai sincronizzato',
};

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  return <ProductEditor key={productId} productId={productId} />;
}

function ProductEditor({ productId }: {productId: string | undefined}) {
  const { data, isLoading, isError, error, refetch } = useProductDetail(productId);
  const { data: context } = useAdminContext();
  const [prepared, setPrepared] = useState<Record<string,{value: unknown; version: number | null; hash?: string; revision:number}>>({});
  const command = useFieldCommand(productId);
  const fieldSync = useFieldSync(productId);
  const aiSuggestions = useAiSuggestions(productId, context?.canUseAi === true);
  const generateAi = useGenerateAiSuggestion(productId);
  const rejectAi = useRejectAiSuggestion(productId);
  const acceptAi = useAcceptAiSuggestion(productId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Prodotto non disponibile</AlertTitle>
        <AlertDescription>
          {(error as Error)?.message}{' '}
          <button className="underline" onClick={() => refetch()}>Riprova</button>
        </AlertDescription>
      </Alert>
    );
  }

  const { product, sections, history, shopifyLive } = data;
  const titleField = sections
    .flatMap((s) => s.fields)
    .find((f) => f.key === 'title' || f.key === 'name');
  const title = (titleField?.value as string) ?? product.sku;
  const technical = isTechnicalProduct([product.sku], title, product.productId, sections.flatMap(s => s.fields).find(f => f.key === 'tags')?.value);
  const canManageAssets = !ADMIN_READ_ONLY_RELEASE && context?.ordinaryCatalog &&
    product.entityType !== 'variation' && shopifyLive.available && shopifyLive.mapped && shopifyLive.identityVerified;


  const allFields = sections.flatMap(section => section.fields);
  const groups = [
    { name: 'Contenuti del prodotto', keys: ['title', 'description', 'short_description'] },
    { name: 'Ricerca e navigazione', keys: ['seo_title', 'seo_description', 'tags'] },
    { name: 'Caratteristiche verificate', keys: ['nome_botanico', 'nome_comune', 'key_features', 'key_benefits', 'special_bullets', 'faq', 'periodo_di_fioritura', 'periodo_di_messa_a_dimora', 'periodo_di_raccolta', 'periodo_ottimale_di_potatura', 'difficolta_di_coltivazione'] },
  ].map(group => ({ ...group, fields: allFields.filter(f => group.keys.includes(f.key) &&
    context?.canWrite && !ADMIN_READ_ONLY_RELEASE && f.capabilities.canUpdate && f.version !== null &&
    isEditorValueSupported(f, f.capabilities.currentValueExists ? f.value : f.shopifyLiveValue ?? f.value)) }));
  const mainFields = new Set(groups.flatMap(group => group.fields));
  const long = allFields.find(f => f.key === 'description');
  const short = allFields.find(f => f.key === 'short_description');
  function prepareField(field: AdminField, value: unknown) {
    const id = product.productId + field.key;
    setPrepared(previous => ({ ...previous, [id]: {value, version: field.version, hash: field.shopifyBaselineHash, revision:(previous[id]?.revision ?? 0) + 1} }));
  }
  const renderField = (field: AdminField) => (
    <FieldCard
      key={product.productId + field.key + (prepared[product.productId + field.key]?.revision ?? 0)}
      prepared={prepared[product.productId + field.key]}
      advanced={!mainFields.has(field)}
      field={ADMIN_READ_ONLY_RELEASE ? readOnlyField(field) : field}
      onCommand={command.mutateAsync}
      onSync={fieldSync.mutateAsync}
      syncEnabled={!ADMIN_READ_ONLY_RELEASE && context?.canSync === true && (!context.ordinaryCatalog || shopifyLive.identityVerified === true) && field.shopifySyncAllowed === true}
      onConflict={async () => { await refetch(); if (context?.canUseAi && !ADMIN_READ_ONLY_RELEASE) await aiSuggestions.refetch(); }}
      aiSuggestion={aiSuggestions.data?.find((item) => item.fieldKey === field.key)}
      onGenerateAi={context?.canUseAi && aiSuggestions.isSuccess ? async input => { await generateAi.mutateAsync(input); } : undefined}
      onRejectAi={async (suggestionId) => { await rejectAi.mutateAsync(suggestionId); }}
      onAcceptAi={async (input) => { await acceptAi.mutateAsync(input); }}
    />
  );
  return (
    <div className="space-y-5">
      <Link
        to="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Torna ai prodotti
      </Link>


      <header className="space-y-2">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Aggiornato il {formatDate(product.updatedAt)}</span>
          <Badge variant={product.isActive ? 'secondary' : 'outline'}>
            {product.isActive ? 'Record interno presente' : 'Record interno disattivato'}
          </Badge>
        </div>
        <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
          {ADMIN_READ_ONLY_RELEASE ? READ_ONLY_RELEASE_NOTICE : context?.canWrite
            ? 'Il salvataggio aggiorna prima l’Admin. Shopify cambia soltanto dopo un’azione esplicita di sincronizzazione.'
            : (context?.readOnlyReason ?? 'Questa scheda è in sola lettura.')}
        </p>
      </header>

      <section aria-label="Percorso prodotto" className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Stato e prossima azione</h2>
        <p>{shopifyLive.mapped && shopifyLive.publicationStatus !== 'DRAFT'
          ? 'Modifica interna → Confronto Shopify → Aggiornamento verificato'
          : 'Bozza interna → Bozza Shopify → Verifica commerciale → Pubblicazione sul sito'}</p>
        {context?.ordinaryCatalog && shopifyLive.mapped && !shopifyLive.identityVerified && <p role="status" className="text-amber-900">Prima dell’invio verifica il collegamento fra SKU, varianti e ID Shopify.</p>}
        {technical && <p className="mt-2 rounded bg-amber-100 p-2 text-amber-950">Prodotto tecnico. La pubblicazione è bloccata.</p>}
      </section>
      {ADMIN_READ_ONLY_RELEASE ? <p>{siteState(shopifyLive)}</p> : <ProductOperations key={product.productId} productId={product.productId} live={shopifyLive} />}
      {!ADMIN_READ_ONLY_RELEASE && shopifyLive.mapped && shopifyLive.identityVerified && product.entityType !== 'variation' && <CatalogActions key={product.productId} productId={product.productId} technical={technical} showPublication={shopifyLive.publicationStatus==='DRAFT' || (shopifyLive.publicationStatus==='ACTIVE' && shopifyLive.siteVisible===false)} context={context} />}
      {canManageAssets && <>
        {context?.canManageGallery && <ProductAssetEditor key={product.productId+'-gallery'} productId={product.productId} kind="gallery"/>}
        {context?.canRenameFormats && <ProductAssetEditor key={product.productId+'-formats'} productId={product.productId} kind="formats"/>}
      </>}

      {!ADMIN_READ_ONLY_RELEASE && context?.canUseAi && aiSuggestions.isLoading && <p role="status">Recupero delle proposte salvate…</p>}
      {context?.canUseAi && aiSuggestions.isError && <AiErrorNotice>Lettura delle proposte non riuscita. Puoi modificare la bozza manualmente.{' '}
        <button className="underline" onClick={() => void aiSuggestions.refetch()}>Rileggi le proposte salvate</button>
      </AiErrorNotice>}
      {product.parentProductId && <Link className="underline" to={`/admin/products/${product.parentProductId}`}>Torna al prodotto padre {product.parentSku}</Link>}
      {context?.canUseAi && long && short && mainFields.has(long) && mainFields.has(short) && long.capabilities.canSuggestAi && short.capabilities.canSuggestAi &&
        <details className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">Prepara le due descrizioni con AI</summary>
          <ConfirmedAiAssistant key={product.productId + long.version + '/' + short.version} field={long}
            onApply={value => prepareField(long, value)} onShortApply={value => prepareField(short, value)} />
        </details>}
      {groups.filter(group => group.fields.length).map((group, index) => <details key={group.name} open={index === 0} className="rounded-lg border p-4">
        <summary className="cursor-pointer font-semibold">{group.name}</summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">{group.fields.map(renderField)}</div>
      </details>)}
      <details className="space-y-3 rounded-lg border p-4">
        <summary className="cursor-pointer font-semibold">Opzioni avanzate · Dati tecnici e permessi</summary>
        <div className="space-x-2 text-sm">{product.sku} · {ENTITY_LABEL[product.entityType] ?? product.entityType}</div>
      <details className="rounded-lg border bg-card p-4"><summary className="cursor-pointer">Avanzato · lettura Shopify</summary>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Valore Shopify live</h2>
          <Badge variant={shopifyLive.available ? 'secondary' : 'outline'}>
            {shopifyLive.available ? 'Connesso in sola lettura' : 'Non disponibile'}
          </Badge>
        </div>
        {shopifyLive.available ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-6">
            <div><dt className="text-xs text-muted-foreground">Handle</dt><dd>{shopifyLive.handle ?? '—'}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Stato prodotto Shopify</dt><dd>{shopifyLive.publicationStatus ?? '—'}</dd></div>
            <div><dt className="text-xs text-muted-foreground">ID Shopify</dt><dd className="break-all">{shopifyLive.productId ?? '—'}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Prezzo</dt><dd>{shopifyLive.price ?? '—'}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Prezzo barrato</dt><dd>{shopifyLive.compareAtPrice ?? '—'}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Stato sync corrente</dt><dd>{SHOPIFY_SYNC_LABEL[shopifyLive.syncStatus ?? 'never'] ?? shopifyLive.syncStatus}</dd></div>
          </dl>
        ) : <p className="text-sm text-muted-foreground">{shopifyLive.error}</p>}
      </details>

        {sections.map(section => {
          const fields = section.fields.filter(field => !mainFields.has(field));
          return fields.length > 0 && <details key={section.key}>
            <summary className="cursor-pointer">{section.label} · {fields.length} {fields.length === 1 ? 'campo' : 'campi'}</summary>
            {section.key === 'inventory' && <p>{INVENTORY_NOTICE}</p>}
            <div className="grid gap-3 lg:grid-cols-2">{fields.map(renderField)}</div>
          </details>;
        })}
        <Accordion type="multiple">
        <AccordionItem value="history">
          <AccordionTrigger className="text-base font-semibold">Cronologia modifiche</AccordionTrigger>
          <AccordionContent>
            {!history?.length ? (
              <p className="text-sm text-muted-foreground">Nessuna modifica registrata.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((h) => (
                  <li key={h.id} className="rounded-md border bg-card p-2 text-sm">
                    <span className="font-medium">{h.field_key}</span>{' '}
                    <span className="text-muted-foreground">
                      · {h.change_type} · {h.actor_label ?? 'Sistema'} · {formatDate(h.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      </details>
    </div>
  );
}
