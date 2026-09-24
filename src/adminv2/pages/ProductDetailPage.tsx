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
  useFieldCommand,
  useProductDetail,
} from '../hooks/useAdminData';
import { ENTITY_LABEL, formatDate, INVENTORY_NOTICE } from '../lib/labels';

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { data, isLoading, isError, error, refetch } = useProductDetail(productId);
  const { data: context } = useAdminContext();
  const command = useFieldCommand(productId);

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

  const { product, sections, history } = data;
  const titleField = sections
    .flatMap((s) => s.fields)
    .find((f) => f.key === 'title' || f.key === 'name');
  const title = (titleField?.value as string) ?? product.sku;

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
            {product.isActive ? 'Attivo' : 'Non attivo'}
          </Badge>
        </div>
        <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
          {context?.canWrite
            ? 'Le capability sono calcolate dal server per ciascun campo. Le modifiche restano interne e non vengono inviate a Shopify.'
            : (context?.readOnlyReason ?? 'Questa scheda è in sola lettura.')}
        </p>
      </header>

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
                      key={field.key}
                      field={field}
                      onCommand={command.mutateAsync}
                      onConflict={refetch}
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
