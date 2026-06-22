import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCcw } from "lucide-react";
import { getEnrichmentCatalogStatus, type CatalogStatusTotals } from "../lib/aiWriterEngine";

interface Props {
  /** When true, auto-refreshes every 10s (e.g. while a run is active). */
  autoRefresh?: boolean;
}

function Metric({
  label,
  value,
  total,
  tone = "default",
}: {
  label: string;
  value: number;
  total: number;
  tone?: "default" | "primary" | "success";
}) {
  // Clamp to 100% — metrics share the exportable denominator so this is a safety net.
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const color =
    tone === "success"
      ? "bg-green-600"
      : tone === "primary"
        ? "bg-primary"
        : "bg-blue-500";
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value} / {total} · {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function EnrichmentCatalogStatus({ autoRefresh = false }: Props) {
  const [totals, setTotals] = useState<CatalogStatusTotals | null>(null);
  const [minFilled, setMinFilled] = useState<number>(8);
  const [keysCount, setKeysCount] = useState<number>(19);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getEnrichmentCatalogStatus();
      setTotals(r.totals);
      setMinFilled(r.minMetafieldsFilled);
      if (r.metafieldKeysCount) setKeysCount(r.metafieldKeysCount);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => load(), 10_000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  // Shared denominator for every progress bar: exportable parent products.
  const base = totals?.exportableParents ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Stato catalogo arricchimento</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={load}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCcw className="h-3 w-3" />
            )}
            Aggiorna
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="text-xs text-destructive">Errore: {error}</p>
        )}
        {!totals && !error && (
          <p className="text-xs text-muted-foreground">Caricamento…</p>
        )}
        {totals && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                <div className="text-muted-foreground">Prodotti parent nel Catalogo DB</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{totals.totalParents}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Esportabili Shopify (prezzo &gt; 0 + immagine): <strong>{totals.exportableParents}</strong>
                </div>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                <div className="text-muted-foreground">Pronti per import Shopify</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">
                  {totals.readyForImport}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  AI + SEO + ≥{minFilled} metafield + prezzo/immagine
                </div>
              </div>
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <Metric label="AI completata sugli esportabili" value={totals.aiEnrichedExportable} total={base} tone="primary" />
              <Metric label="SEO completata sugli esportabili" value={totals.seoCompleteExportable} total={base} />
              <Metric
                label={`Metafield ≥ ${minFilled}/${keysCount} sugli esportabili`}
                value={totals.metafieldsCompleteExportable}
                total={base}
                tone="success"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Stato calcolato direttamente dal database. Sopravvive al refresh: mostra sempre
              quanti prodotti del catalogo hanno già contenuti AI, SEO e metafield popolati.
              {lastRefresh && (
                <> Ultimo aggiornamento: {lastRefresh.toLocaleTimeString()}.</>
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
