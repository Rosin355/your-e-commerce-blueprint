import { isTechnicalProduct } from '../../../supabase/functions/_shared/admin-operational-core';
import { SHOPIFY_STORE_PERMANENT_DOMAIN } from '@/lib/shopify';
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
  const { data, isLoading, isError, error, refetch } = useProductDetail(productId);
  const { data: context } = useAdminContext();
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
  const technical = isTechnicalProduct([product.sku], title, product.productId);
  const remoteId = shopifyLive.available && shopifyLive.mapped &&
    /^gid:\/\/shopify\/Product\/([1-9][0-9]*)$/.exec(shopifyLive.productId ?? '')?.[1];
  const nativeEditor = !ADMIN_READ_ONLY_RELEASE && !technical && context?.ordinaryCatalog &&
    (context.canUploadImages || context.canManagePrices) && remoteId &&
    /^[a-z0-9-]+\.myshopify\.com$/.test(SHOPIFY_STORE_PERMANENT_DOMAIN)
    ? `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/admin/products/${remoteId}` : null;

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
          <span>{product.sku}</span>
          <span aria-hidden="true">·</span>
          <span>{ENTITY_LABEL[product.entityType] ?? product.entityType}</span>
          {product.parentSku && (
            <>
              <span aria-hidden="true">·</span>
              <span>Appartiene a {product.parentSku}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
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

      {ADMIN_READ_ONLY_RELEASE ? <p>{siteState(shopifyLive)}</p> : <ProductOperations key={product.productId} productId={product.productId} live={shopifyLive} />}
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

      {!ADMIN_READ_ONLY_RELEASE && <CatalogActions key={product.productId} productId={product.productId} technical={technical} context={context} />}
      {nativeEditor && <section className="space-y-1 rounded-lg border p-4">
        <h2 className="font-semibold">Galleria e struttura dei formati</h2>
        <p className="text-sm">Per cambiare la galleria o aggiungere formati a un prodotto già collegato, apri la sua scheda Shopify. Serve un accesso staff Shopify abilitato. Le modifiche su un prodotto pubblicato possono essere subito visibili.</p>
        <a className="underline" href={nativeEditor} target="_blank" rel="noopener noreferrer">Apri il prodotto in Shopify</a>
      </section>}

      {!ADMIN_READ_ONLY_RELEASE && context?.canUseAi && aiSuggestions.isLoading && <p role="status">Recupero delle proposte salvate…</p>}
      {context?.canUseAi && aiSuggestions.isError && <p role="alert">Lettura delle proposte non riuscita. Puoi modificare la bozza manualmente.{' '}
        <button className="underline" onClick={() => void aiSuggestions.refetch()}>Rileggi le proposte salvate</button>
      </p>}
      <Accordion type="multiple" defaultValue={sections.slice(0, 2).map((s) => s.key)}>
        {sections.map((section) => (
          <AccordionItem key={section.key} value={section.key}>
            <AccordionTrigger className="text-base font-semibold">
              <span className="flex items-center gap-2">
                {section.label}
                <span className="text-xs font-normal text-muted-foreground">
                  {section.fields.length} campi
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {section.key === 'inventory' && (
                <p className="mb-3 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                  {INVENTORY_NOTICE}
                </p>
              )}
              {section.fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun dato in questa sezione.</p>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {section.fields.map((field) => (
                    <FieldCard
                      key={product.productId + field.key}
                      field={ADMIN_READ_ONLY_RELEASE ? readOnlyField(field) : field}
                      onCommand={command.mutateAsync}
                      onSync={fieldSync.mutateAsync}
                      syncEnabled={!ADMIN_READ_ONLY_RELEASE && context?.canSync === true && field.shopifySyncAllowed === true}
                      onConflict={async () => { await refetch(); if (context?.canUseAi && !ADMIN_READ_ONLY_RELEASE) await aiSuggestions.refetch(); }}
                      aiSuggestion={aiSuggestions.data?.find((item) => item.fieldKey === field.key)}
                      onGenerateAi={context?.canUseAi && aiSuggestions.isSuccess ? async input => { await generateAi.mutateAsync(input); } : undefined}
                      onRejectAi={async (suggestionId) => { await rejectAi.mutateAsync(suggestionId); }}
                      onAcceptAi={async (input) => { await acceptAi.mutateAsync(input); }}
                    />
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}

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
    </div>
  );
}
