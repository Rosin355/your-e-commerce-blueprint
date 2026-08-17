// F6 — Lista prodotti: ricerca, filtri, paginazione a cursore. Sola lettura.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useDebounced, useProductList, type ProductFilters } from '../hooks/useAdminData';
import { ENTITY_LABEL, formatDate, productStates, stateTone } from '../lib/labels';

const TONE_CLASS: Record<string, string> = {
  ok: 'bg-primary/10 text-primary border-primary/20',
  warn: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100',
  bad: 'bg-destructive/10 text-destructive border-destructive/20',
  neutral: 'bg-muted text-muted-foreground',
};

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [sku, setSku] = useState('');
  const [gtin, setGtin] = useState('');
  const [entityType, setEntityType] = useState('all');
  const [category, setCategory] = useState('all');
  const [origin, setOrigin] = useState('all');
  const [completeness, setCompleteness] = useState('all');
  const [toClassify, setToClassify] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);

  const debouncedSearch = useDebounced(search);
  const debouncedSku = useDebounced(sku);
  const debouncedGtin = useDebounced(gtin);
  const cursor = cursorStack[cursorStack.length - 1];

  const filters = useMemo<ProductFilters>(
    () => ({
      search: debouncedSearch || undefined,
      sku: debouncedSku || undefined,
      gtin: debouncedGtin || undefined,
      entityType: entityType === 'all' ? undefined : entityType,
      reviewRequired: reviewRequired || undefined,
    }),
    [debouncedSearch, debouncedSku, debouncedGtin, entityType, reviewRequired],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useProductList(filters, cursor);

  const items = (data?.items ?? []).filter((p) => {
    if (toClassify && p.categoryEffective) return false;
    if (category !== 'all' && (p.categoryEffective ?? '') !== category) return false;
    if (completeness === 'complete' && p.contentStatus !== 'completo') return false;
    if (completeness === 'incomplete' && p.contentStatus === 'completo') return false;
    if (origin === 'shopify' && p.shopifyStatus === 'Mai sincronizzato') return false;
    if (origin === 'import' && p.shopifyStatus !== 'Mai sincronizzato') return false;
    return true;
  });

  const categoryOptions = [
    ...new Set((data?.items ?? []).map((p) => p.categoryEffective).filter(Boolean) as string[]),
  ].sort();

  const resetFilters = () => {
    setSearch('');
    setSku('');
    setGtin('');
    setEntityType('all');
    setCategory('all');
    setOrigin('all');
    setCompleteness('all');
    setToClassify(false);
    setReviewRequired(false);
    setCursorStack([null]);
  };

  const onFilterChange = (fn: () => void) => {
    fn();
    setCursorStack([null]);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Prodotti</h1>
        <p className="text-sm text-muted-foreground">Consultazione del catalogo. Nessuna modifica disponibile.</p>
      </div>

      <section aria-label="Filtri" className="space-y-4 rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ricerca">Cerca per nome</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="ricerca"
                value={search}
                onChange={(e) => onFilterChange(() => setSearch(e.target.value))}
                placeholder="Nome prodotto"
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku">Codice prodotto (SKU)</Label>
            <Input
              id="sku"
              value={sku}
              onChange={(e) => onFilterChange(() => setSku(e.target.value))}
              placeholder="Es. OG_393883"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ean">Codice a barre (EAN)</Label>
            <Input
              id="ean"
              value={gtin}
              onChange={(e) => onFilterChange(() => setGtin(e.target.value))}
              placeholder="Es. 800000000000"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={entityType} onValueChange={(v) => onFilterChange(() => setEntityType(v))}>
              <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="simple">Prodotto singolo</SelectItem>
                <SelectItem value="variable">Prodotto con varianti</SelectItem>
                <SelectItem value="variation">Variante</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="categoria">Categoria</Label>
            <Select value={category} onValueChange={(v) => onFilterChange(() => setCategory(v))}>
              <SelectTrigger id="categoria"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="origine">Origine</Label>
            <Select value={origin} onValueChange={(v) => onFilterChange(() => setOrigin(v))}>
              <SelectTrigger id="origine"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                <SelectItem value="import">Importato dal sistema precedente</SelectItem>
                <SelectItem value="shopify">Già presente su Shopify</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="completezza">Completezza</Label>
            <Select value={completeness} onValueChange={(v) => onFilterChange(() => setCompleteness(v))}>
              <SelectTrigger id="completezza"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="complete">Completi</SelectItem>
                <SelectItem value="incomplete">Da completare</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="da-classificare"
              checked={toClassify}
              onCheckedChange={(v) => onFilterChange(() => setToClassify(v === true))}
            />
            <Label htmlFor="da-classificare" className="font-normal">Da classificare</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="da-verificare"
              checked={reviewRequired}
              onCheckedChange={(v) => onFilterChange(() => setReviewRequired(v === true))}
            />
            <Label htmlFor="da-verificare" className="font-normal">Valori da verificare</Label>
          </div>
          <Button variant="ghost" size="sm" onClick={resetFilters}>Reimposta filtri</Button>
        </div>
      </section>

      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Impossibile caricare i prodotti</AlertTitle>
          <AlertDescription>
            {(error as Error)?.message}{' '}
            <button className="underline" onClick={() => refetch()}>Riprova</button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center">
          <p className="font-medium">Nessun prodotto trovato</p>
          <p className="text-sm text-muted-foreground">Prova a modificare la ricerca o i filtri.</p>
        </div>
      ) : (
        <ul className={cn('space-y-2', isFetching && 'opacity-70')}>
          {items.map((p) => (
            <li key={p.productId}>
              <Link
                to={`/admin/products/${p.productId}`}
                className="flex flex-col gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center"
              >
                {p.mainImage ? (
                  <img
                    src={p.mainImage}
                    alt={p.title ?? p.sku}
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-md border object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                    Nessuna foto
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.title ?? 'Senza nome'}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.sku} · {ENTITY_LABEL[p.entityType] ?? p.entityType}
                    {p.parentSku ? ` · Appartiene a ${p.parentSku}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Categoria: {p.categoryEffective ?? 'Da classificare'}
                    {p.entityType === 'variation' && p.categoryEffective ? ' (ereditata dal prodotto principale)' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                  {productStates(p).map((state) => (
                    <span
                      key={state}
                      className={cn('rounded-full border px-2 py-0.5 text-xs', TONE_CLASS[stateTone(state)])}
                    >
                      {state}
                    </span>
                  ))}
                  {p.reviewPendingCount > 0 && (
                    <Badge variant="outline">{p.reviewPendingCount} valori da verificare</Badge>
                  )}
                </div>
                <p className="shrink-0 text-xs text-muted-foreground sm:w-36 sm:text-right">
                  {formatDate(p.updatedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={cursorStack.length <= 1}
          onClick={() => setCursorStack((s) => s.slice(0, -1))}
        >
          Pagina precedente
        </Button>
        <p className="text-xs text-muted-foreground">Pagina {cursorStack.length}</p>
        <Button
          variant="outline"
          size="sm"
          disabled={!data?.nextCursor}
          onClick={() => setCursorStack((s) => [...s, data!.nextCursor])}
        >
          Pagina successiva
        </Button>
      </div>
    </div>
  );
}
