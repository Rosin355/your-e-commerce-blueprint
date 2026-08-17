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
import ValueDisplay from '../components/ValueDisplay';
import { useProductDetail, useSourceBaseline } from '../hooks/useAdminData';
import { ENTITY_LABEL, formatDate, INVENTORY_NOTICE, hasValue } from '../lib/labels';

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { data, isLoading, isError, error, refetch } = useProductDetail(productId);
  const { data: baselineData } = useSourceBaseline(productId);

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
  const baseline = (baselineData?.baseline?.normalized ?? {}) as Record<string, unknown>;

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
                    <FieldCard key={field.key} field={field} />
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}

        <AccordionItem value="baseline">
          <AccordionTrigger className="text-base font-semibold">
            Dati originali importati
          </AccordionTrigger>
          <AccordionContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Copia non modificabile dei dati provenienti dal sistema precedente.
            </p>
            {Object.keys(baseline).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun dato originale disponibile.</p>
            ) : (
              <dl className="grid gap-2 sm:grid-cols-2">
                {Object.entries(baseline)
                  .filter(([, v]) => hasValue(v))
                  .map(([key, value]) => (
                    <div key={key} className="rounded-md border bg-muted/30 p-2">
                      <dt className="text-xs font-medium text-muted-foreground">{key}</dt>
                      <dd className="mt-1"><ValueDisplay value={value} /></dd>
                    </div>
                  ))}
              </dl>
            )}
          </AccordionContent>
        </AccordionItem>

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
