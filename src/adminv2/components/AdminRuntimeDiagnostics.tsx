import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { callAdminApi } from '../lib/adminApi';
import {
  adminDiagnosticStatus,
  parseAdminDiagnostics,
} from '../lib/adminDiagnostics';

export default function AdminRuntimeDiagnostics() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['admin', 'runtime-diagnostics', user?.id],
    queryFn: () => callAdminApi<unknown>({ action: 'get_admin_context' }),
    enabled: Boolean(user),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
  // A failed or pending refresh must never display a previously cached OFF value.
  const snapshot = query.isSuccess && !query.isFetching
    ? parseAdminDiagnostics(query.data)
    : null;
  const status = adminDiagnosticStatus(snapshot);
  const field = (value: boolean | undefined) =>
    value === undefined ? 'NON VERIFICATO' : String(value);

  return (
    <section aria-labelledby="admin-runtime-diagnostics">
      <Card>
        <CardHeader>
          <CardTitle id="admin-runtime-diagnostics">Diagnostica Admin V2</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p role="status" aria-live="polite" className="font-semibold">
            Stato Admin V2: {status}
          </p>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="font-medium">writesEnabled</dt>
              <dd>{field(snapshot?.writesEnabled)}</dd>
            </div>
            <div>
              <dt className="font-medium">writeMode</dt>
              <dd>{snapshot?.writeMode ?? 'NON VERIFICATO'}</dd>
            </div>
            <div>
              <dt className="font-medium">shopifySyncEnabled</dt>
              <dd>{field(snapshot?.shopifySyncEnabled)}</dd>
            </div>
          </dl>
          <p className="text-muted-foreground">
            READ-ONLY richiede writesEnabled=false e shopifySyncEnabled=false. writeMode descrive
            la modalità prevista per eventuali scritture, non disabilita da solo le operazioni.
          </p>
          <p className="text-muted-foreground">
            Ambiente: {window.location.origin}. Nessuna impostazione può essere modificata qui.
            {snapshot && query.dataUpdatedAt > 0 && (
              <> Ultima lettura: {new Date(query.dataUpdatedAt).toLocaleString('it-IT')}.</>
            )}
          </p>
          <Button type="button" variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
            Aggiorna stato
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
