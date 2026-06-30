import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldCheck } from 'lucide-react';

/**
 * Verifica READ-ONLY degli handle delle collezioni Shopify.
 * Chiama esclusivamente l'action `check_collection_handles` del proxy:
 * non crea, non modifica, non assegna prodotti, non stampa token.
 */

const HANDLES_TO_CHECK: Array<{ handle: string; title: string; parent: string }> = [
  { handle: 'alberi-da-frutto', title: 'Alberi da frutto', parent: 'Piante da frutto' },
  { handle: 'rose-paesaggistiche', title: 'Rose paesaggistiche', parent: 'Rose' },
  { handle: 'rose-fiore-grande', title: 'Rose a fiore grande', parent: 'Rose' },
  { handle: 'bulbi', title: 'Bulbi', parent: 'Altre categorie' },
  { handle: 'arbusti', title: 'Arbusti', parent: 'Piante da esterno' },
  { handle: 'alberi', title: 'Alberi', parent: 'Piante da esterno' },
  { handle: 'erbacee-perenni-graminacee', title: 'Erbacee perenni e graminacee', parent: 'Piante da esterno' },
  { handle: 'piante-da-siepe', title: 'Piante da siepe', parent: 'Piante da esterno' },
  { handle: 'piante-grasse-succulente', title: 'Piante grasse e succulente', parent: 'Piante da esterno' },
  { handle: 'aromatiche', title: 'Aromatiche', parent: 'Piante da esterno' },
  { handle: 'rampicanti-arbusti-spalliera', title: 'Rampicanti / arbusti a spalliera', parent: 'Piante da esterno' },
  { handle: 'conifere', title: 'Conifere', parent: '(top-level)' },
];

interface CheckResult {
  handle: string;
  exists: boolean;
  id?: string;
  title?: string;
  error?: string;
}

interface Report {
  already_exists: string[];
  to_create: string[];
  failed: Array<{ handle: string; error: string }>;
}

export default function CollectionHandlesChecker() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheck = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setReport(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('shopify-admin-proxy', {
        body: {
          action: 'check_collection_handles',
          data: { handles: HANDLES_TO_CHECK.map((h) => h.handle) },
        },
      });
      if (invokeErr) throw new Error(invokeErr.message);
      if (data?.success === false) throw new Error(data?.error || 'Errore proxy');

      const list: CheckResult[] = data?.results || [];
      setResults(list);

      const rep: Report = { already_exists: [], to_create: [], failed: [] };
      for (const r of list) {
        if (r.error) rep.failed.push({ handle: r.handle, error: r.error });
        else if (r.exists) rep.already_exists.push(r.handle);
        else rep.to_create.push(r.handle);
      }
      setReport(rep);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const statusFor = (handle: string): { status: 'exists' | 'missing' | 'failed' | 'unknown'; detail?: string } => {
    const r = results?.find((x) => x.handle === handle);
    if (!r) return { status: 'unknown' };
    if (r.error) return { status: 'failed', detail: r.error };
    if (r.exists) return { status: 'exists', detail: r.id };
    return { status: 'missing' };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Verifica handle collezioni Shopify</CardTitle>
            <CardDescription>
              Read-only. Controlla quali handle esistono già su Shopify. Non crea, non modifica nulla.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runCheck} disabled={loading} size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? 'Verifica in corso…' : 'Verifica handle collezioni Shopify'}
        </Button>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {report && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase text-muted-foreground">already_exists</div>
              <div className="text-2xl font-semibold">{report.already_exists.length}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase text-muted-foreground">to_create</div>
              <div className="text-2xl font-semibold">{report.to_create.length}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase text-muted-foreground">failed</div>
              <div className="text-2xl font-semibold">{report.failed.length}</div>
            </div>
          </div>
        )}

        {results && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titolo</TableHead>
                  <TableHead>Handle</TableHead>
                  <TableHead>Stato Shopify</TableHead>
                  <TableHead>Azione prevista</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {HANDLES_TO_CHECK.map((h) => {
                  const s = statusFor(h.handle);
                  return (
                    <TableRow key={h.handle}>
                      <TableCell className="font-medium">
                        {h.title}
                        <div className="text-xs text-muted-foreground">{h.parent}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{h.handle}</TableCell>
                      <TableCell>
                        {s.status === 'exists' && <Badge variant="secondary">Esiste</Badge>}
                        {s.status === 'missing' && <Badge variant="outline">Non esiste</Badge>}
                        {s.status === 'failed' && <Badge variant="destructive">Errore</Badge>}
                        {s.status === 'unknown' && <Badge variant="outline">—</Badge>}
                        {s.status === 'failed' && s.detail && (
                          <div className="mt-1 text-xs text-destructive">{s.detail}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.status === 'exists' && <span className="text-muted-foreground">Nessuna (già presente)</span>}
                        {s.status === 'missing' && <span>Da creare (in dry-run)</span>}
                        {s.status === 'failed' && <span className="text-destructive">Da indagare</span>}
                        {s.status === 'unknown' && <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {report && (
          <details className="rounded-md border bg-muted/30 p-3">
            <summary className="cursor-pointer text-sm font-medium">Report JSON</summary>
            <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(report, null, 2)}</pre>
          </details>
        )}

        <p className="text-xs text-muted-foreground">
          Questo strumento è solo di verifica. La creazione reale delle collezioni richiede approvazione esplicita
          e l'esecuzione manuale dello script <code>scripts/create-shopify-collections.ts --execute</code>.
        </p>
      </CardContent>
    </Card>
  );
}
