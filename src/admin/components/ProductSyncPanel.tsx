import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Database, Download, Loader2, Upload, Sparkles, DollarSign, RefreshCw, ImagePlus, AlertTriangle, ZoomIn, X, Image } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getAdminSession } from "../lib/adminAuth";
import {
  BATCH_SIZE,
  batchUpdatePrices,
  detectCsvHeaders,
  exportEnrichedCsv,
  fetchProductSyncDashboard,
  getAiEnrichCount,
  getStyleConflictCount,
  propagateVariantPrices,
  resetStyleConflicts,
  parseShopifyReadyCsv,
  runAiEnrichBatch,
  sendBatch,
  startProductSync,
  uploadSyncCsv,
  getImageCounts,
  runImageGenBatch,
} from "../lib/productSyncEngine";
import type { CsvHeaderDiagnostics, ImageCountResponse } from "../lib/productSyncEngine";
import type { ProductSyncCatalogDashboard, ProductSyncJob, SyncMode } from "../types/productSync";

const STALE_TIMEOUT_MS = 5 * 60 * 1000;

const SEED_STYLES = [
  { value: "pratico", label: "Pratico" },
  { value: "narrativo", label: "Narrativo" },
  { value: "minimal", label: "Minimal" },
  { value: "step-by-step", label: "Step-by-step" },
];

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
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  // AI Enrichment state
  const [aiRunning, setAiRunning] = useState(false);
  const [aiSeedStyle, setAiSeedStyle] = useState("pratico");
  const [aiCounts, setAiCounts] = useState<{ total: number; unenriched: number } | null>(null);
  const [aiProcessed, setAiProcessed] = useState(0);
  const [aiBatchIndex, setAiBatchIndex] = useState(0);
  const [aiTotalBatches, setAiTotalBatches] = useState(0);
  const [aiErrors, setAiErrors] = useState<string[]>([]);
  const aiAbortRef = useRef(false);
  const [exporting, setExporting] = useState(false);
  const [fixingPrices, setFixingPrices] = useState(false);
  const [styleConflictCount, setStyleConflictCount] = useState(0);
  const [csvDiagnostics, setCsvDiagnostics] = useState<CsvHeaderDiagnostics | null>(null);
  const [showStyleDialog, setShowStyleDialog] = useState(false);

  // Image generation state
  const [imageCounts, setImageCounts] = useState<ImageCountResponse | null>(null);
  const [imageGenRunning, setImageGenRunning] = useState(false);
  const [imageGenProcessed, setImageGenProcessed] = useState(0);
  const [imageGenErrors, setImageGenErrors] = useState<string[]>([]);
  const [showMissingSkus, setShowMissingSkus] = useState(false);
  const imageAbortRef = useRef(false);
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
    if (!job || job.status === "pending") return "Parsing CSV...";
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

  const canStart = Boolean(session?.email) && !running && Boolean(csvFile);
  const canResume = Boolean(session?.email) && !running && Boolean(csvFile) && Boolean(lastJobId) && job?.status === "processing";

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
      setCsvFile(file);
      // Run header diagnostics
      try {
        const csvText = await file.text();
        const diag = detectCsvHeaders(csvText);
        setCsvDiagnostics(diag);
      } catch { /* ignore diagnostics errors */ }
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

  const loadAiCounts = async () => {
    if (!session?.email) return;
    try {
      const counts = await getAiEnrichCount(session.email);
      setAiCounts(counts);
    } catch (error) {
      console.error("Errore conteggio AI:", error);
    }
  };

  useEffect(() => {
    if (!session?.email) return;
    loadCatalogDashboard(session.email);
    loadAiCounts();
  }, [session?.email]);

  // Elapsed time ticker
  useEffect(() => {
    if (!running || !startedAt) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [running, startedAt]);

  const runBatches = async (
    jobId: string,
    allRows: ReturnType<typeof parseShopifyReadyCsv>,
    startBatchIndex: number,
    fileName: string,
  ) => {
    const totalBatches = Math.ceil(allRows.length / BATCH_SIZE);
    let lastBatchTime = Date.now();

    for (let i = startBatchIndex; i < totalBatches; i++) {
      if (abortRef.current) {
        toast.info("Importazione annullata");
        break;
      }

      if (Date.now() - lastBatchTime > STALE_TIMEOUT_MS) {
        toast.error("Job bloccato: nessun progresso negli ultimi 5 minuti.");
        break;
      }

      const batchRows = allRows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

      const response = await sendBatch(
        jobId,
        batchRows,
        i,
        totalBatches,
        allRows.length,
        session!.email,
        fileName,
      );

      setJob(response.job);
      lastBatchTime = Date.now();

      if (response.done) {
        if (response.job.status === "completed") {
          toast.success("Importazione completata!");
        } else if (response.job.status === "failed") {
          toast.error("Importazione terminata con errori");
        }
        break;
      }
    }
  };

  const start = async (mode: SyncMode) => {
    if (!session?.email || !csvFile) {
      toast.error("Sessione admin non valida o CSV mancante");
      return;
    }

    setPendingMode(mode);
    setStartedAt(Date.now());
    setElapsed(0);
    setRunning(true);
    abortRef.current = false;

    try {
      const csvText = await csvFile.text();
      const allRows = parseShopifyReadyCsv(csvText);

      if (allRows.length === 0) {
        toast.error("Nessuna riga valida trovata nel CSV");
        setRunning(false);
        setPendingMode(null);
        setStartedAt(null);
        return;
      }

      toast.success(`CSV parsato: ${allRows.length} righe. Invio batch...`);

      const startResponse = await startProductSync(mode, session.email);
      const jobId = startResponse.job_id;
      setLastJobId(jobId);

      await runBatches(jobId, allRows, 0, csvFile.name);
      await loadCatalogDashboard(session.email);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore durante l'importazione");
    } finally {
      setRunning(false);
      setPendingMode(null);
      setStartedAt(null);
    }
  };

  const resume = async () => {
    if (!session?.email || !csvFile || !lastJobId || !job) {
      toast.error("CSV o job precedente mancante per riprendere");
      return;
    }

    const bp = (job.report_json as any)?.batchProgress;
    const resumeFrom = bp?.current ?? 0;

    setPendingMode(job.mode);
    setStartedAt(Date.now());
    setElapsed(0);
    setRunning(true);
    abortRef.current = false;

    try {
      const csvText = await csvFile.text();
      const allRows = parseShopifyReadyCsv(csvText);
      const totalBatches = Math.ceil(allRows.length / BATCH_SIZE);

      if (resumeFrom >= totalBatches) {
        toast.info("Tutti i batch sono già stati processati");
        setRunning(false);
        setPendingMode(null);
        setStartedAt(null);
        return;
      }

      toast.success(`Ripresa dal batch ${resumeFrom + 1}/${totalBatches}`);
      await runBatches(lastJobId, allRows, resumeFrom, csvFile.name);
      await loadCatalogDashboard(session.email);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore durante la ripresa");
    } finally {
      setRunning(false);
      setPendingMode(null);
      setStartedAt(null);
    }
  };

  // ── AI Enrichment ───────────────────────────────────────

  const startAiEnrichment = async () => {
    if (!session?.email) return;
    setAiRunning(true);
    setAiProcessed(0);
    setAiBatchIndex(0);
    setAiErrors([]);
    aiAbortRef.current = false;

    const BATCH_AI_SIZE = 5;
    const MAX_RETRIES = 3;

    try {
      let totalProcessed = 0;
      let remaining = aiCounts?.unenriched ?? 0;
      const totalBatches = Math.ceil(remaining / BATCH_AI_SIZE);
      setAiTotalBatches(totalBatches);
      let batchIdx = 0;
      let consecutiveFailures = 0;

      while (remaining > 0 && !aiAbortRef.current) {
        batchIdx++;
        setAiBatchIndex(batchIdx);

        let result: Awaited<ReturnType<typeof runAiEnrichBatch>> | null = null;
        let retryCount = 0;

        while (retryCount <= MAX_RETRIES) {
          try {
            result = await runAiEnrichBatch(session.email, BATCH_AI_SIZE, aiSeedStyle);
            break; // success
          } catch (err) {
            retryCount++;
            if (retryCount > MAX_RETRIES) {
              setAiErrors((prev) => [...prev, `Batch ${batchIdx}: ${err instanceof Error ? err.message : "Errore"} (max retry raggiunto)`]);
              break;
            }
            const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 30000);
            setAiErrors((prev) => [...prev, `Batch ${batchIdx}: retry ${retryCount}/${MAX_RETRIES} tra ${Math.round(delay / 1000)}s...`]);
            await new Promise((r) => setTimeout(r, delay));
          }
        }

        if (!result) {
          consecutiveFailures++;
          if (consecutiveFailures >= 3) break;
          continue;
        }

        consecutiveFailures = 0;
        totalProcessed += result.processed;
        remaining = result.remaining;
        setAiProcessed(totalProcessed);
        setAiCounts((prev) => prev ? { ...prev, unenriched: remaining } : null);

        if (result.errors.length > 0) {
          setAiErrors((prev) => [...prev, ...result.errors]);
          if (result.errors.some((e) => e.includes("Crediti"))) break;
          if (result.errors.some((e) => e.includes("Rate limit"))) {
            // Backoff on rate limit then continue
            setAiErrors((prev) => [...prev, "Rate limit: attesa 30s prima di riprendere..."]);
            await new Promise((r) => setTimeout(r, 30000));
            if (aiAbortRef.current) break;
            continue;
          }
        }

        if (result.processed === 0) break;
      }

      if (aiAbortRef.current) {
        toast.info("Arricchimento AI interrotto");
      } else {
        toast.success(`Arricchimento AI completato: ${totalProcessed} prodotti elaborati`);
      }

      await loadAiCounts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore AI enrichment");
    } finally {
      setAiRunning(false);
    }
  };

  const aiPercentage = useMemo(() => {
    if (!aiCounts || aiCounts.total === 0) return 0;
    const enriched = aiCounts.total - aiCounts.unenriched;
    return Math.max(0, Math.min(100, Math.round((enriched / aiCounts.total) * 100)));
  }, [aiCounts]);

  return (
    <div className="space-y-4">
      {/* ── Import CSV Card ──────────────────────────── */}
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
              {csvFile ? "Cambia CSV" : "Carica CSV"}
            </Button>
            <Button onClick={() => start("sync")} disabled={!canStart} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Importa CSV nel DB
            </Button>
            {canResume && (
              <Button variant="secondary" onClick={resume} disabled={running} className="gap-2">
                <Database className="h-4 w-4" />
                Riprendi da batch {((job?.report_json as any)?.batchProgress?.current ?? 0) + 1}
              </Button>
            )}
            {running && (
              <Button variant="destructive" size="sm" onClick={() => { abortRef.current = true; }}>
                Annulla
              </Button>
            )}
            {!csvFile && <span className="text-xs text-muted-foreground">← Carica prima un file CSV</span>}
          </div>

          {/* Price fix tools */}
          <div className="flex flex-wrap gap-2 items-center border-t pt-3">
            <span className="text-sm font-medium text-muted-foreground">Fix prezzi:</span>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={fixingPrices || !session?.email}
              onClick={async () => {
                if (!session?.email) return;
                setFixingPrices(true);
                try {
                  const result = await propagateVariantPrices(session.email);
                  toast.success(`${result.updated} prezzi parent aggiornati dalle varianti`);
                  await loadCatalogDashboard(session.email);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Errore");
                } finally {
                  setFixingPrices(false);
                }
              }}
            >
              {fixingPrices ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              Propaga prezzi varianti → parent
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={fixingPrices || !csvFile || !session?.email}
              onClick={async () => {
                if (!session?.email || !csvFile) return;
                setFixingPrices(true);
                try {
                  const csvText = await csvFile.text();
                  const allRows = parseShopifyReadyCsv(csvText);
                  const priceRows = allRows
                    .filter((r) => r.price || r.compareAtPrice)
                    .map((r) => ({ sku: r.sku, price: r.price, compareAtPrice: r.compareAtPrice }));
                  if (!priceRows.length) {
                    toast.error("Nessun prezzo trovato nel CSV");
                    return;
                  }
                  // Send in batches of 200
                  let totalUpdated = 0;
                  for (let i = 0; i < priceRows.length; i += 200) {
                    const batch = priceRows.slice(i, i + 200);
                    const result = await batchUpdatePrices(session.email, batch);
                    totalUpdated += result.updated;
                  }
                  toast.success(`${totalUpdated} prezzi aggiornati dal CSV`);
                  await loadCatalogDashboard(session.email);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Errore");
                } finally {
                  setFixingPrices(false);
                }
              }}
            >
              {fixingPrices ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              Aggiorna prezzi da CSV
            </Button>
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={fixingPrices || !csvFile || !session?.email}
                  onClick={async () => {
                    if (!session?.email || !csvFile) return;
                    setFixingPrices(true);
                    try {
                      const csvText = await csvFile.text();
                      const allRows = parseShopifyReadyCsv(csvText);
                      const priceRows = allRows
                        .filter((r) => r.price || r.compareAtPrice)
                        .map((r) => ({ sku: r.sku, price: r.price, compareAtPrice: r.compareAtPrice }));
                      if (!priceRows.length) {
                        toast.error("Nessun prezzo trovato nel CSV");
                        return;
                      }
                      let totalUpdated = 0;
                      for (let i = 0; i < priceRows.length; i += 200) {
                        const batch = priceRows.slice(i, i + 200);
                        const result = await batchUpdatePrices(session.email, batch);
                        totalUpdated += result.updated;
                      }
                      toast.success(`${totalUpdated} prezzi aggiornati dal CSV`);
                      await loadCatalogDashboard(session.email);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Errore");
                    } finally {
                      setFixingPrices(false);
                    }
                  }}
                >
                  {fixingPrices ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                  Aggiorna prezzi da CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={exporting || !session?.email}
                  onClick={async () => {
                    if (!session?.email) return;
                    setExporting(true);
                    try {
                      const blob = await exportEnrichedCsv(session.email);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `shopify-export-${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("CSV esportato con successo");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Errore export");
                    } finally {
                      setExporting(false);
                    }
                  }}
                >
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Esporta CSV Shopify
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={catalogLoading || !session?.email}
                  onClick={() => session?.email && loadCatalogDashboard(session.email)}
                  title="Ricarica dashboard"
                >
                  {catalogLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Header diagnostics */}
            {csvDiagnostics && (
              <div className="rounded-md border border-border bg-muted/30 p-2 text-xs space-y-1">
                <p className="font-medium">📋 Diagnostica header CSV ({csvDiagnostics.totalDataRows} righe dati)</p>
                <p>
                  Colonna prezzo:{" "}
                  {csvDiagnostics.priceColumn ? (
                    <span className="font-mono text-primary">{csvDiagnostics.priceColumn}</span>
                  ) : (
                    <span className="text-destructive font-semibold">⚠️ Non riconosciuta</span>
                  )}
                  {csvDiagnostics.priceColumn && (
                    <span className="text-muted-foreground ml-2">
                      ({csvDiagnostics.rowsWithPrice} righe con valore)
                    </span>
                  )}
                </p>
                <p>
                  Colonna prezzo scontato:{" "}
                  {csvDiagnostics.compareAtPriceColumn ? (
                    <span className="font-mono text-primary">{csvDiagnostics.compareAtPriceColumn}</span>
                  ) : (
                    <span className="text-muted-foreground">Non trovata</span>
                  )}
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-5">
              <div className="rounded-md border p-2">
                <p className="text-xs text-muted-foreground">Prodotti salvati</p>
                <p className="text-lg font-semibold">{catalogDashboard?.totalProducts ?? 0}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-xs text-muted-foreground">Senza prezzo</p>
                <p className="text-lg font-semibold text-destructive">
                  {catalogDashboard?.missingPriceCount ?? 0}
                </p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-xs text-muted-foreground">Senza immagini</p>
                <p className="text-lg font-semibold text-destructive">
                  {catalogDashboard?.missingImageCount ?? 0}
                </p>
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
                    <th className="p-2 text-left w-10">Img</th>
                    <th className="p-2 text-left">SKU</th>
                    <th className="p-2 text-left">Titolo</th>
                    <th className="p-2 text-left">Prezzo</th>
                    <th className="p-2 text-left">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {(catalogDashboard?.preview || []).map((row) => (
                    <tr key={`${row.sku}-${row.imported_at}`} className="border-t">
                      <td className="p-2">
                        {row.image_url ? (
                          <img
                            src={row.image_url}
                            alt={row.title || row.sku}
                            className="h-8 w-8 rounded object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground text-[10px]">—</div>
                        )}
                      </td>
                      <td className="p-2 font-mono">{row.sku}</td>
                      <td className="p-2">{row.title || "-"}</td>
                      <td className="p-2">{row.price !== null ? row.price.toFixed(2) : "-"}</td>
                      <td className="p-2">{row.inventory_quantity ?? "-"}</td>
                    </tr>
                  ))}
                  {!catalogDashboard?.preview?.length && (
                    <tr>
                      <td className="p-2 text-muted-foreground" colSpan={5}>
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

      {/* ── AI SEO Enrichment Card ──────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Genera testi SEO con AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Totale prodotti</p>
              <p className="text-xl font-semibold">{aiCounts?.total ?? "–"}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Da arricchire</p>
              <p className="text-xl font-semibold text-amber-600">
                {aiCounts ? aiCounts.unenriched : "–"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Già arricchiti</p>
              <p className="text-xl font-semibold text-green-600">
                {aiCounts ? aiCounts.total - aiCounts.unenriched : "–"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1">
              {SEED_STYLES.map((style) => (
                <Button
                  key={style.value}
                  variant={aiSeedStyle === style.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAiSeedStyle(style.value)}
                  disabled={aiRunning}
                >
                  {style.label}
                </Button>
              ))}
            </div>
            <Button
              onClick={async () => {
                if (!session?.email) return;
                try {
                  const conflicts = await getStyleConflictCount(session.email, aiSeedStyle);
                  if (conflicts > 0) {
                    setStyleConflictCount(conflicts);
                    setShowStyleDialog(true);
                  } else {
                    startAiEnrichment();
                  }
                } catch {
                  startAiEnrichment();
                }
              }}
              disabled={aiRunning || !session?.email || (aiCounts?.unenriched ?? 0) === 0}
              className="gap-2"
            >
              {aiRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {aiRunning ? `Elaborazione... (${aiProcessed})` : "Genera testi SEO"}
            </Button>
            {aiRunning && (
              <Button variant="destructive" size="sm" onClick={() => { aiAbortRef.current = true; }}>
                Annulla
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={loadAiCounts}
              disabled={aiRunning}
            >
              Aggiorna conteggi
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={aiRunning || exporting || (aiCounts ? (aiCounts.total - aiCounts.unenriched) === 0 : true)}
              onClick={async () => {
                if (!session?.email) return;
                setExporting(true);
                try {
                  const blob = await exportEnrichedCsv(session.email);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `shopify-seo-enriched-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("CSV esportato con successo");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Errore export");
                } finally {
                  setExporting(false);
                }
              }}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export CSV Shopify
            </Button>
          </div>

          {(aiRunning || aiProcessed > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-2">
                  {aiRunning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {aiRunning ? "Arricchimento in corso..." : "Arricchimento completato"}
                </span>
              <span className="text-muted-foreground">
                  {aiBatchIndex > 0 && `Batch ${aiBatchIndex}/${aiTotalBatches} · `}
                  {aiProcessed} elaborati · {aiPercentage}%
                </span>
              </div>
              <Progress value={aiPercentage} />
            </div>
          )}

          {aiErrors.length > 0 && (
            <div className="rounded-md border border-destructive/30 p-3 max-h-40 overflow-auto">
              <p className="text-sm font-medium text-destructive mb-1">Errori ({aiErrors.length})</p>
              <div className="space-y-1 text-xs font-mono">
                {aiErrors.map((err, i) => (
                  <p key={i} className="text-destructive">{err}</p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── AI Image Generation Card ──────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Immagini prodotto — AI + Segnalazione
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!session?.email}
              onClick={async () => {
                if (!session?.email) return;
                try {
                  const counts = await getImageCounts(session.email);
                  setImageCounts(counts);
                  toast.success(`${counts.missing_images} prodotti senza immagini trovati`);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Errore");
                }
              }}
            >
              Analizza immagini mancanti
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              disabled={imageGenRunning || !session?.email || !imageCounts || imageCounts.missing_images === 0}
              onClick={async () => {
                if (!session?.email || !imageCounts) return;
                setImageGenRunning(true);
                setImageGenProcessed(0);
                setImageGenErrors([]);
                imageAbortRef.current = false;

                let totalProcessed = 0;
                const allErrors: string[] = [];
                let remaining = imageCounts.missing_images;

                while (remaining > 0 && !imageAbortRef.current) {
                  try {
                    const result = await runImageGenBatch(session.email, 3);
                    totalProcessed += result.processed;
                    setImageGenProcessed(totalProcessed);
                    if (result.errors.length) {
                      allErrors.push(...result.errors);
                      setImageGenErrors([...allErrors]);
                      // Stop on rate limit / credits errors
                      if (result.errors.some(e => e.includes("Rate limit") || e.includes("Crediti"))) break;
                    }
                    remaining = result.remaining;
                    if (result.processed === 0) break;
                  } catch (err) {
                    allErrors.push(err instanceof Error ? err.message : "Errore");
                    setImageGenErrors([...allErrors]);
                    break;
                  }
                }

                toast.success(`${totalProcessed} immagini generate con AI`);
                // Refresh counts
                try {
                  const counts = await getImageCounts(session.email);
                  setImageCounts(counts);
                } catch {}
                setImageGenRunning(false);
              }}
            >
              {imageGenRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Genera immagini con AI
            </Button>
            {imageGenRunning && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { imageAbortRef.current = true; }}
              >
                Stop
              </Button>
            )}
          </div>

          {imageCounts && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Prodotti parent</p>
                <p className="text-xl font-semibold">{imageCounts.total_parents}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Con immagini</p>
                <p className="text-xl font-semibold text-primary">{imageCounts.with_images}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Senza immagini</p>
                <p className="text-xl font-semibold text-destructive">{imageCounts.missing_images}</p>
              </div>
            </div>
          )}

          {imageGenRunning && (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{imageGenProcessed} immagini generate...</span>
            </div>
          )}

          {imageCounts && imageCounts.missing_skus.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => setShowMissingSkus(!showMissingSkus)}
              >
                <AlertTriangle className="h-4 w-4" />
                {showMissingSkus ? "Nascondi" : "Mostra"} prodotti senza immagini ({imageCounts.missing_skus.length}{imageCounts.missing_images > 50 ? "+" : ""})
              </Button>
              {showMissingSkus && (
                <div className="max-h-48 overflow-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">SKU</th>
                        <th className="p-2 text-left">Titolo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {imageCounts.missing_skus.map((item) => (
                        <tr key={item.sku} className="border-t">
                          <td className="p-2 font-mono">{item.sku}</td>
                          <td className="p-2">{item.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {imageGenErrors.length > 0 && (
            <div className="rounded-md border border-destructive/30 p-3 max-h-40 overflow-auto">
              <p className="text-sm font-medium text-destructive mb-1">Errori ({imageGenErrors.length})</p>
              <div className="space-y-1 text-xs font-mono">
                {imageGenErrors.map((err, i) => (
                  <p key={i} className="text-destructive">{err}</p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Style Conflict Dialog ──────────────────── */}
      <AlertDialog open={showStyleDialog} onOpenChange={setShowStyleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stile diverso rilevato</AlertDialogTitle>
            <AlertDialogDescription>
              Ci sono <strong>{styleConflictCount}</strong> prodotti già arricchiti con uno stile diverso da "{aiSeedStyle}".
              Vuoi ri-elaborarli con il nuovo stile o elaborare solo quelli mancanti?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowStyleDialog(false);
                startAiEnrichment();
              }}
            >
              Solo mancanti
            </AlertDialogAction>
            <AlertDialogAction
              onClick={async () => {
                setShowStyleDialog(false);
                if (!session?.email) return;
                try {
                  const reset = await resetStyleConflicts(session.email, aiSeedStyle);
                  toast.success(`${reset} prodotti resettati, rielaborazione in corso...`);
                  await loadAiCounts();
                  startAiEnrichment();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Errore reset");
                }
              }}
            >
              Rielabora tutto ({styleConflictCount})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
