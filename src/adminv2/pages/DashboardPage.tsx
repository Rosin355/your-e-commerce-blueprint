// F6 — Dashboard: indicatori semplici, nessun dato Shopify grezzo.
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Database, PackageSearch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAdminContext, useDashboardStats } from '../hooks/useAdminData';
import { formatDate } from '../lib/labels';

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboardStats();
  const { data: context } = useAdminContext();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Impossibile caricare i dati</AlertTitle>
        <AlertDescription>
          {(error as Error)?.message ?? 'Riprova tra qualche istante.'}{' '}
          <button className="underline" onClick={() => refetch()}>
            Riprova
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  const s = data.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Panoramica del catalogo Online Garden.
        </p>
      </div>

      <section aria-labelledby="catalogo" className="space-y-3">
        <h2 id="catalogo" className="text-sm font-semibold text-muted-foreground">
          Catalogo
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Prodotti totali" value={s.products.total} />
          <Metric label="Prodotti singoli" value={s.products.simple} />
          <Metric label="Prodotti con varianti" value={s.products.variable} />
          <Metric label="Varianti" value={s.products.variation} />
        </div>
      </section>

      <section aria-labelledby="qualita" className="space-y-3">
        <h2 id="qualita" className="text-sm font-semibold text-muted-foreground">
          Qualità dei dati
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Valori da verificare" value={s.values.toReview} hint="Contenuti importati dal sistema precedente" />
          <Metric label="Prodotti da classificare" value={s.quality.toClassify} />
          <Metric label="Prodotti incompleti" value={s.quality.incomplete} hint="Manca la descrizione" />
          <Metric label="Errori" value={s.quality.errors} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4" aria-hidden="true" /> Ultimi dati importati
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{s.lastBaseline ? 'Dati iniziali importati dal sistema precedente' : 'Nessuna importazione registrata'}</p>
            {s.lastBaseline && (
              <>
                <p className="text-muted-foreground">{s.lastBaseline.rows.toLocaleString('it-IT')} righe</p>
                <p className="text-muted-foreground">{formatDate(s.lastBaseline.createdAt)}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> Collegamento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Collegamento attivo</p>
            <p className="text-muted-foreground">
              Accesso in sola lettura{context?.roles?.length ? '' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <PackageSearch className="h-4 w-4" aria-hidden="true" /> Pubblicazione
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Funzioni di modifica non ancora abilitate.</p>
            <Link to="/admin/products" className="mt-2 inline-block text-primary underline">
              Vai al catalogo
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
