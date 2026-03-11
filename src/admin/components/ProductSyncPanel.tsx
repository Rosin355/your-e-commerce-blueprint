import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Database, Loader2, Upload } from "lucide-react";
import { getAdminSession } from "../lib/adminAuth";
import { fetchProductSyncDashboard, pollJobStatus, processProductSync, startProductSync, uploadSyncCsv } from "../lib/productSyncEngine";
import type { ProductSyncCatalogDashboard, ProductSyncJob, SyncMode } from "../types/productSync";

const POLL_INTERVAL_MS = 2500;

function statusVariant(status?: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "processing") return "secondary";
  return "outline";
}

function modeLabel(mode: SyncMode): string {
  if (mode === "integrity") return "Verifica Integrità (CSV)";
  return "Import CSV → Database";
}

export default function ProductSyncPanel() {
  const session = getAdminSession();
  const [job, setJob] = useState<ProductSyncJob | null>(null);
  const [running, setRunning] = useState(false);
  const [pendingMode, setPendingMode] = useState<SyncMode | null>(null);
  const [catalogDashboard, setCatalogDashboard] = useState<ProductSyncCatalogDashboard | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [csvUploaded, setCsvUploaded] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tickInFlight = useRef(false);

  const percentage = useMemo(() => {
    if (!job) return 0;
    if (job.total_products <= 0) return 0;
    const processed = job.updated_products + job.unchanged_products + job.failed_products;
    return Math.max(0, Math.min(100, Math.round((processed / job.total_products) * 100)));
  }, [job]);

  const batchProgress = useMemo(() => {
    const bp = (job?.report_json as any)?.batchProgress;
    if (!bp) return null;
    return { current: bp.current as number, total: bp.total as number };
  }, [job]);

  const phaseLabel = useMemo(() => {
    if (!running && !pendingMode) return null;
    if (!job || job.status === "pending") return "Avvio...";
    if (job.total_products === 0 && job.status === "processing") return "Download e parsing CSV...";
    if (job.status === "processing") return `Scrittura batch nel DB...`;
    if (job.status === "completed") return "Completato ✓";
    if (job.status === "failed") return "Errore ✗";
    return "In attesa...";
  }, [job, running, pendingMode]);

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const canStart = Boolean(session?.email) && !running && csvUploaded;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.email) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Seleziona un file .csv");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File troppo grande (max 50MB)");
      return;
    }
    setUploading(true);
    try {
      await uploadSyncCsv(file, session.email);
      setCsvUploaded(true);
      toast.success(`CSV "${file.name}" caricato con successo`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const loadCatalogDashboard = async (adminEmail: string) => {
    setCatalogLoading(true);
    try {
      const dashboard = await fetchProductSyncDashboard(adminEmail, 20);
      setCatalogDashboard(dashboard);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore caricamento catalogo CSV");
    } finally {
      setCatalogLoading(false);
    }
  };

  const runTick = async (jobId: string, adminEmail: string) => {
    if (tickInFlight.current) return;
    tickInFlight.current = true;

    try {
      // Use lightweight GET polling instead of POST
      const response = await pollJobStatus(jobId, adminEmail);
      setJob(response.job);

      if (response.done || response.job.status === "completed" || response.job.status === "failed") {
        setRunning(false);
        setPendingMode(null);
        setStartedAt(null);
        await loadCatalogDashboard(adminEmail);
        if (response.job.status === "completed") {
          toast.success("Job completato");
        } else if (response.job.status === "failed") {
          toast.error("Job terminato con errori");
        }
      }
    } catch (error) {
      setRunning(false);
      setPendingMode(null);
      setStartedAt(null);
      toast.error(error instanceof Error ? error.message : "Errore durante il polling job");
    } finally {
      tickInFlight.current = false;
    }
  };

  useEffect(() => {
    if (!session?.email) return;
    loadCatalogDashboard(session.email);
  }, [session?.email]);

  // Elapsed time ticker
  useEffect(() => {
    if (!running || !startedAt) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [running, startedAt]);

  useEffect(() => {
    if (!running || !job?.id || !session?.email) return;

    const interval = setInterval(() => {
      runTick(job.id, session.email);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [running, job?.id, session?.email]);

  const start = async (mode: SyncMode) => {
    if (!session?.email) {
      toast.error("Sessione admin non valida");
      return;
    }

    setPendingMode(mode);
    setStartedAt(Date.now());
    setElapsed(0);
    try {
      const startResponse = await startProductSync(mode, session.email);
      setRunning(true);
      toast.success(`Job avviato: ${modeLabel(mode)}`);

      await runTick(startResponse.job_id, session.email);
    } catch (error) {
      setPendingMode(null);
      setStartedAt(null);
      toast.error(error instanceof Error ? error.message : "Errore avvio job");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Importazione Catalogo Woo CSV nel Database</span>
          {job && (
            <Badge variant={statusVariant(job.status)}>
              {job.status.toUpperCase()} {job.mode ? `• ${modeLabel(job.mode)}` : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || running}
            className="gap-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {csvUploaded ? "Cambia CSV" : "Carica CSV"}
          </Button>
          <Button onClick={() => start("sync")} disabled={!canStart} className="gap-2">
            {pendingMode === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Importa CSV nel DB
          </Button>
          {!csvUploaded && <span className="text-xs text-muted-foreground">← Carica prima un file CSV</span>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Totali</p>
            <p className="text-xl font-semibold">{job?.total_products ?? 0}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Aggiornati</p>
            <p className="text-xl font-semibold">{job?.updated_products ?? 0}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Invariati</p>
            <p className="text-xl font-semibold">{job?.unchanged_products ?? 0}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Errori</p>
            <p className="text-xl font-semibold">{job?.failed_products ?? 0}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Completamento</p>
            <p className="text-xl font-semibold">{percentage}%</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            {phaseLabel && (
              <span className="font-medium flex items-center gap-2">
                {running && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {phaseLabel}
              </span>
            )}
            <span className="text-muted-foreground ml-auto">
              {batchProgress && `Batch ${batchProgress.current}/${batchProgress.total} · `}
              {startedAt && `Tempo: ${formatElapsed(elapsed)} · `}
              {percentage}%
            </span>
          </div>
          <Progress value={percentage} />
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Catalogo CSV salvato nel DB</p>
            <Button
              variant="outline"
              size="sm"
              disabled={catalogLoading || !session?.email}
              onClick={() => session?.email && loadCatalogDashboard(session.email)}
            >
              {catalogLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aggiorna"}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">Prodotti salvati</p>
              <p className="text-lg font-semibold">{catalogDashboard?.totalProducts ?? 0}</p>
            </div>
            <div className="rounded-md border p-2 sm:col-span-2">
              <p className="text-xs text-muted-foreground">Ultimo import</p>
              <p className="text-sm font-medium">
                {catalogDashboard?.lastImportAt ? new Date(catalogDashboard.lastImportAt).toLocaleString() : "N/D"}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Sorgenti: {catalogDashboard?.sourceFiles?.length ? catalogDashboard.sourceFiles.join(", ") : "Nessun file registrato"}
          </p>

          <div className="max-h-64 overflow-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left">SKU</th>
                  <th className="p-2 text-left">Titolo</th>
                  <th className="p-2 text-left">Prezzo</th>
                  <th className="p-2 text-left">Stock</th>
                </tr>
              </thead>
              <tbody>
                {(catalogDashboard?.preview || []).map((row) => (
                  <tr key={`${row.sku}-${row.imported_at}`} className="border-t">
                    <td className="p-2 font-mono">{row.sku}</td>
                    <td className="p-2">{row.title || "-"}</td>
                    <td className="p-2">{row.price !== null ? row.price.toFixed(2) : "-"}</td>
                    <td className="p-2">{row.inventory_quantity ?? "-"}</td>
                  </tr>
                ))}
                {!catalogDashboard?.preview?.length && (
                  <tr>
                    <td className="p-2 text-muted-foreground" colSpan={4}>
                      Nessun prodotto CSV salvato nel DB.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">Log realtime</p>
          <div className="max-h-64 overflow-auto space-y-1 text-xs font-mono">
            {(job?.report_json?.logs || []).slice().reverse().map((log, index) => (
              <div key={`${log.timestamp}-${index}`} className="border-b pb-1">
                <span className="text-muted-foreground">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{" "}
                <span className={log.level === "error" ? "text-destructive" : log.level === "warn" ? "text-yellow-600" : "text-foreground"}>
                  {log.level.toUpperCase()}
                </span>{" "}
                <span>{log.message}</span>
              </div>
            ))}
            {!job?.report_json?.logs?.length && <p className="text-muted-foreground">Nessun log disponibile.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
