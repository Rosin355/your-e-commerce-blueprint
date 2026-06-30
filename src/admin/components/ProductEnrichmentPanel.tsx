import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  RefreshCcw,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { useAuth } from "@/hooks/useAuth";
import { listShopifyProducts, downloadShopifyNativeCsv, publishReviewedDraft } from "../lib/aiWriterEngine";
import { loadDbCatalogProducts } from "../lib/dbCatalogSource";
import {
  downloadBatchCsvSnippet,
  downloadCsvSnippet,
  downloadMergedShopifyCsv,
  mergeDraftsIntoShopifyCsv,
  type MergeReport,
} from "../lib/productEnrichmentEngine";
import { useProductEnrichment, deriveShopifyStatus, type BatchProductResult } from "../hooks/useProductEnrichment";
import type { ShopifyAdminProduct } from "../types/aiWriter";
import type { EssentialProductInput } from "../types/productEnrichment";
import { AI_GENERATED_KEYS, ALL_METAFIELD_KEYS, MANUAL_KEYS, METAFIELD_LABELS } from "../types/productEnrichment";
import { MetafieldsReport } from "./MetafieldsReport";
import EnrichmentCatalogStatus from "./EnrichmentCatalogStatus";
import ResumeRunBanner from "./ResumeRunBanner";

// ── Constants ────────────────────────────────────────────────────────────────

const SEED_STYLES = [
  "Pratico e tecnico",
  "Caldo e narrativo",
  "Minimal e diretto",
  "Guida step-by-step",
];

const EMPTY_ESSENTIAL: EssentialProductInput = {
  handle: "",
  title: "",
  product_category: "",
  type: "",
  variant_sku: "",
  variant_price: "",
  image_src: "",
  nome_botanico: "",
  nome_comune: "",
  vendor: "",
  tags: "",
  cultivation_notes: "",
  seed_style: "Pratico e tecnico",
};

// ── Shared sub-components ────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums">{score}%</span>
    </div>
  );
}

function StatusBadge({ result }: { result: BatchProductResult }) {
  if (result.status === "generating")
    return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Generando...</Badge>;
  if (result.status === "publishing")
    return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Pubblicando...</Badge>;
  const sync = deriveShopifyStatus(result);
  if (sync === "error")
    return <Badge variant="destructive" className="gap-1" title={result.error ?? undefined}><AlertCircle className="h-3 w-3" />Errore sync</Badge>;
  if (sync === "partial")
    return <Badge className="gap-1 bg-amber-500 hover:bg-amber-600 text-white"><AlertCircle className="h-3 w-3" />Shopify parziale</Badge>;
  if (sync === "ok")
    return <Badge className="gap-1 bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-3 w-3" />Shopify OK</Badge>;
  if (result.draft)
    return <Badge variant="outline" className="gap-1 text-green-700 border-green-300"><CheckCircle2 className="h-3 w-3" />Bozza AI</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Da generare</Badge>;
}

function MetafieldsChip({
  report,
  open,
  onClick,
}: {
  report: NonNullable<BatchProductResult["metafieldsReport"]>;
  open: boolean;
  onClick: () => void;
}) {
  const failed = report.details.filter((d) => d.status === "failed").length;
  const skipped = report.details.filter((d) => d.status === "skipped").length;
  const sent = report.written;
  const className = failed > 0
    ? "h-7 border-destructive/50 bg-destructive/10 px-2 text-[11px] text-destructive hover:bg-destructive/15"
    : sent > 0
      ? "h-7 border-primary/40 bg-primary/10 px-2 text-[11px] text-primary hover:bg-primary/15"
      : "h-7 px-2 text-[11px]";

  const parts = [`${sent} inviati`];
  if (skipped > 0) parts.push(`${skipped} saltati`);
  if (failed > 0) parts.push(`${failed} errori`);

  return (
    <Button size="sm" variant="outline" className={className} onClick={onClick} title="Mostra dettaglio metafield">
      MF {parts.join(" · ")}{open ? " · aperto" : ""}
    </Button>
  );
}

function DraftPreview({
  draft,
}: {
  draft: NonNullable<ReturnType<typeof useProductEnrichment>["draft"]>;
}) {
  return (
    <div className="space-y-4">
      {/* SEO */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">SEO Title</Label>
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{draft.seo_title || "—"}</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">SEO Description</Label>
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{draft.seo_description || "—"}</p>
        </div>
      </div>
      {/* Body HTML */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Descrizione prodotto (Body HTML)</Label>
        {/* AI-generated HTML is sanitized before preview; the publish flow still
            sends the intended body HTML to Shopify. */}
        <div
          className="prose prose-sm max-h-48 overflow-auto rounded-md border bg-muted/20 p-3 text-sm"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(draft.body_html) || "<em>Nessun contenuto</em>" }}
        />
      </div>
      <Separator />
      {/* Metafields */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          Metafield CSV Shopify — {ALL_METAFIELD_KEYS.length} campi
        </Label>
        <div className="rounded-md border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80">
              <tr>
                <th className="p-2 text-left">Metafield</th>
                <th className="p-2 text-left">Origine</th>
                <th className="p-2 text-left">Valore</th>
              </tr>
            </thead>
            <tbody>
              {ALL_METAFIELD_KEYS.map((key) => {
                const value = draft.metafields[key] ?? "";
                return (
                  <tr key={key} className="border-t">
                    <td className="p-2 font-medium">{METAFIELD_LABELS[key]}</td>
                    <td className="p-2">
                      {AI_GENERATED_KEYS.has(key) ? (
                        <Badge variant="secondary" className="text-[9px]">AI</Badge>
                      ) : MANUAL_KEYS.has(key) ? (
                        <Badge variant="outline" className="text-[9px]">Manuale</Badge>
                      ) : null}
                    </td>
                    <td className="max-w-xs p-2">
                      {value ? (
                        <span className="line-clamp-2">{value}</span>
                      ) : (
                        <span className="italic text-muted-foreground">Da compilare</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Mode A — Batch enrichment ────────────────────────────────────────────────

function ModeAPanel() {
  const { user } = useAuth();
  const [source, setSource] = useState<"db" | "shopify">("db");
  const [statusFilter, setStatusFilter] = useState("active,draft");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ShopifyAdminProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);
  const [seedStyle, setSeedStyle] = useState(SEED_STYLES[0]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const {
    batchResults,
    batchProgress,
    analyzeAll,
    generateAll,
    generateOne,
    publishAll,
    publishMetafieldsOnly,
    publishOne,
    cancelBatch,
    resetBatch,
    debugMetafields,
    setDebugMetafields,
    metafieldsRetries,
    setMetafieldsRetries,
    openRun,
    openRunItems,
    refreshOpenRun,
    closeOpenRun,
  } = useProductEnrichment();
  const [openReportFor, setOpenReportFor] = useState<number | null>(null);
  const [syncFilter, setSyncFilter] = useState<"all" | "todo" | "ok" | "issues">("all");
  const [closingRun, setClosingRun] = useState(false);

  // Carica eventuale run aperto al mount
  useEffect(() => {
    refreshOpenRun().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = batchProgress !== null;
  const hasDrafts = batchResults.some((r) => r.draft);
  const draftsForDownload = batchResults.filter((r) => r.draft).map((r) => r.draft!);
  const isDbSource = source === "db";
  const metafieldFailedItems = batchResults.filter((r) =>
    r.metafieldsReport?.details.some((d) => d.status === "failed"),
  );
  const firstMetafieldFailed = metafieldFailedItems[0];

  async function loadProducts() {
    setLoadingProducts(true);
    setLoadingCount(0);
    try {
      if (source === "db") {
        const list = await loadDbCatalogProducts({
          query,
          onProgress: (n) => setLoadingCount(n),
        });
        setProducts(list);
        resetBatch();
        if (list.length === 0) {
          toast.warning(
            "Nessun prodotto nel Catalogo DB. Importa prima un CSV nella tab Catalogo DB.",
          );
        } else {
          toast.success(`${list.length} prodotti caricati dal Catalogo DB`);
        }
      } else {
        const all: ShopifyAdminProduct[] = [];
        let pageInfo: string | undefined;
        do {
          const res = await listShopifyProducts({ status: statusFilter, query, limit: 250, pageInfo });
          all.push(...res.products);
          setLoadingCount(all.length);
          pageInfo = res.nextPageInfo || undefined;
        } while (pageInfo);
        setProducts(all);
        resetBatch();
        if (all.length === 0) {
          toast.warning("Nessun prodotto trovato su Shopify con questi filtri.");
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[Arricchimento] loadProducts error:", e);
      toast.error(`Errore caricamento prodotti: ${msg}`);
    } finally {
      setLoadingProducts(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stato catalogo — sopravvive al refresh */}
      <EnrichmentCatalogStatus autoRefresh={isRunning} />

      {/* Banner ripresa run aperto */}
      {openRun && (
        <ResumeRunBanner
          run={openRun}
          items={openRunItems}
          loadedProductSkus={new Set(products.map((p) => p.sku).filter((s): s is string => !!s))}
          closing={closingRun}
          onClose={async () => {
            setClosingRun(true);
            await closeOpenRun();
            setClosingRun(false);
          }}
          onResume={(pendingSkus) => {
            if (products.length === 0) {
              toast.info("Carica prima i prodotti dal Catalogo DB o da Shopify, poi torna qui.");
              return;
            }
            const set = new Set(pendingSkus);
            const filtered = products.filter((p) => p.sku && set.has(p.sku));
            if (filtered.length === 0) {
              toast.warning("Nessuno degli SKU pending è presente nella lista caricata.");
              return;
            }
            setProducts(filtered);
            analyzeAll(filtered);
            toast.success(`${filtered.length} SKU pending pronti per la rigenerazione.`);
          }}
        />
      )}

      {/* Step 1 — load */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1 — Carica prodotti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">

            <Select value={source} onValueChange={(v) => setSource(v as "db" | "shopify")}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="db">Catalogo DB (locale)</SelectItem>
                <SelectItem value="shopify">Shopify Admin</SelectItem>
              </SelectContent>
            </Select>
            {!isDbSource && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active,draft">Attivi + Bozze</SelectItem>
                  <SelectItem value="active">Solo Attivi</SelectItem>
                  <SelectItem value="draft">Solo Bozze</SelectItem>
                  <SelectItem value="any">Tutti</SelectItem>
                  <SelectItem value="archived">Archiviati</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Input
              className="w-56"
              placeholder="Cerca titolo / handle"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadProducts()}
            />
            <Button onClick={loadProducts} disabled={loadingProducts || isRunning} variant="outline" className="gap-2">
              {loadingProducts ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              {loadingProducts && loadingCount > 0 ? `Caricamento… (${loadingCount})` : "Carica"}
            </Button>
            {products.length > 0 && (
              <Button
                onClick={() => analyzeAll(products)}
                disabled={isRunning}
                variant="outline"
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Analizza tutti ({products.length})
              </Button>
            )}
          </div>
          {products.length > 0 && !batchResults.length && (
            <p className="text-xs text-muted-foreground">
              {products.length} prodotti caricati da{" "}
              <strong>{isDbSource ? "Catalogo DB" : "Shopify"}</strong>.{" "}
              Clicca <strong>Analizza tutti</strong> per vedere la completezza di ciascuno.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — batch actions */}
      {batchResults.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2 — Genera e pubblica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Info banner: clarify the two publish paths */}
            <div className="rounded-md border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 space-y-1">
              <p>
                <strong>Come arrivano i metafield in Shopify:</strong>
              </p>
              <p>
                ✅ <strong>"Pubblica su Shopify"</strong> e <strong>"Pubblica solo metafield"</strong> —
                usano l'Admin API (<code>metafieldsSet</code>): canale affidabile, scrive i{" "}
                <strong>{ALL_METAFIELD_KEYS.length} metafield <code>custom.*</code></strong>{" "}
                sui prodotti esistenti (sia <em>active</em> che <em>draft</em>), risolvendo l'ID per handle
                quindi <strong>sovrascrive sempre senza creare doppioni</strong>.
              </p>
              <p>
                🔒 <strong>Lo stato del prodotto (ACTIVE / DRAFT) non viene mai modificato</strong>:
                un draft resta draft, un attivo resta attivo. Per pubblicare un draft basta cambiarne
                lo stato direttamente da Shopify Admin.
              </p>
              <p>
                🧠 L'AI ora compila <strong>tutti i {ALL_METAFIELD_KEYS.length} campi</strong> incluso
                nome botanico, origini e periodi stagionali (best-effort): rivedi a mano i campi
                botanici e correggi se necessario.
              </p>
              <p>
                ⚠️ Il <strong>CSV "prodotti base"</strong> qui sotto importa SOLO titolo, descrizione,
                varianti, prezzi, immagini e SEO. <strong>NON include i metafield</strong> perché
                l'importer nativo di Shopify li scarta silenziosamente quando le definizioni non
                combaciano alla perfezione. Per i metafield usa sempre la via API.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Stile di scrittura</Label>
                <Select value={seedStyle} onValueChange={setSeedStyle} disabled={isRunning}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEED_STYLES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => generateAll(products, seedStyle)}
                disabled={isRunning}
                className="gap-2"
              >
                {isRunning && batchProgress?.phase === "generate" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Genera metafield AI (tutti)
              </Button>

              <Button
                onClick={() => publishAll(products, user?.email)}
                disabled={isRunning || isDbSource || !hasDrafts}
                variant="outline"
                className="gap-2"
                title={
                  isDbSource
                    ? "Disponibile solo con sorgente Shopify Admin"
                    : !hasDrafts
                      ? "Genera prima le bozze: pubblica solo contenuti già rivisti"
                      : "Pubblica testi + SEO + metafield via Admin API"
                }
              >
                {isRunning && batchProgress?.phase === "publish" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                Pubblica su Shopify (tutti)
              </Button>

              <Button
                onClick={() => publishMetafieldsOnly(products)}
                disabled={isRunning || isDbSource || !hasDrafts}
                variant="secondary"
                className="gap-2"
                title={
                  isDbSource
                    ? "Disponibile solo con sorgente Shopify Admin"
                    : !hasDrafts
                      ? "Genera prima le bozze AI"
                      : "Pubblica SOLO i 16 metafield custom.* (non tocca titolo/descrizione/SEO). Ideale per prodotti già importati via CSV."
                }
              >
                {isRunning && batchProgress?.phase === "publish" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                Pubblica solo metafield
              </Button>

              <ShopifyNativeCsvButton />
            </div>


            {/* Advanced merge section (collapsed) */}
            {hasDrafts && (
              <details className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
                <summary className="cursor-pointer select-none font-medium">
                  Avanzato: CSV solo arricchimento / merge con export Shopify esistente
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="text-muted-foreground">
                    Usa questi strumenti solo se vuoi unire le bozze AI con un export Shopify già scaricato
                    dal tuo store. Per un import diretto in Shopify usa invece il pulsante
                    <strong> "Scarica CSV prodotti base"</strong> sopra e poi pubblica i metafield via API.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => downloadBatchCsvSnippet(draftsForDownload)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Scarica CSV solo arricchimento (merge)
                    </Button>
                    <ShopifyMergeExport drafts={draftsForDownload} />
                  </div>
                </div>
              </details>
            )}


            {metafieldFailedItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">
                  Metafield Shopify falliti su {metafieldFailedItems.length} prodotto/i. Apri il dettaglio MF per vedere l'errore GraphQL esatto.
                </span>
                {firstMetafieldFailed && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-destructive/40 text-[11px] text-destructive hover:bg-destructive/10"
                    onClick={() => setOpenReportFor(firstMetafieldFailed.productId)}
                  >
                    Vai al primo prodotto fallito
                  </Button>
                )}
              </div>
            )}

            {/* Progress bar + stop */}
            {batchProgress && (
              <div className="space-y-1.5 rounded-md border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {batchProgress.phase === "generate" ? "Generazione AI" : "Pubblicazione Shopify"} —{" "}
                    {batchProgress.current}/{batchProgress.total}
                  </span>
                  <span className="text-muted-foreground truncate max-w-[200px]">
                    {batchProgress.currentTitle}
                  </span>
                </div>
                <Progress
                  value={Math.round((batchProgress.current / batchProgress.total) * 100)}
                  className="h-1.5"
                />
                <div className="flex justify-end pt-1">
                  <Button
                    onClick={cancelBatch}
                    size="sm"
                    variant="destructive"
                    className="h-7 gap-1 text-xs"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Interrompi
                  </Button>
                </div>
              </div>
            )}

            {/* Debug + retries toolbar */}
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-[11px]">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={debugMetafields}
                  onChange={(e) => setDebugMetafields(e.target.checked)}
                />
                <span>Debug metafield (cattura request/response)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span>Retry max:</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={metafieldsRetries}
                  onChange={(e) => setMetafieldsRetries(Number(e.target.value) || 0)}
                  className="h-6 w-14 rounded border bg-background px-1.5 text-xs"
                />
              </div>
              <span className="ml-auto text-muted-foreground">
                Configurazione namespace/key: vedi Settings → Metafields Shopify
              </span>
            </div>

            {/* Info about publish scope */}
            <p className="text-[10px] text-muted-foreground">
              <strong>Pubblica su Shopify</strong> invia a Shopify la bozza generata: aggiorna body HTML,
              SEO (titolo + meta description) e i <strong>{ALL_METAFIELD_KEYS.length} metafield personalizzati</strong>
              {" "}(namespace <code>custom</code>) direttamente via API con retry automatico sugli errori
              transitori (throttled/timeout/5xx). I campi vuoti vengono saltati. Il CSV resta disponibile per import bulk/backup.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results table */}
      {batchResults.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">
                Risultati — {batchResults.length} prodotti
              </CardTitle>
              {(() => {
                const okCount = batchResults.filter((r) => deriveShopifyStatus(r) === "ok").length;
                const partialCount = batchResults.filter((r) => deriveShopifyStatus(r) === "partial").length;
                const errorCount = batchResults.filter((r) => deriveShopifyStatus(r) === "error").length;
                const draftCount = batchResults.filter((r) => r.draft).length;
                const todoCount = batchResults.filter(
                  (r) => deriveShopifyStatus(r) === "none" && !r.draft,
                ).length;
                return (
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="text-green-700 font-medium" title="Sync API riuscita (skipped sui metafield non contano come errore)">
                      ✓ {okCount} Shopify OK
                    </span>
                    <span>•</span>
                    <span className="text-amber-700 font-medium" title="Prodotto aggiornato ma uno o più metafield falliti">
                      ⚠ {partialCount} parziali
                    </span>
                    <span>•</span>
                    <span className="text-red-700 font-medium">
                      ✗ {errorCount} errori
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 font-medium">
                      {draftCount} bozze AI
                    </span>
                    <span>•</span>
                    <span>{todoCount} da fare</span>
                  </div>
                );
              })()}
            </div>
            <Tabs value={syncFilter} onValueChange={(v) => setSyncFilter(v as typeof syncFilter)} className="mt-3">
              <TabsList className="h-8">
                <TabsTrigger value="all" className="h-7 text-xs">Tutti</TabsTrigger>
                <TabsTrigger value="todo" className="h-7 text-xs">Da syncare</TabsTrigger>
                <TabsTrigger value="ok" className="h-7 text-xs">Sync OK</TabsTrigger>
                <TabsTrigger value="issues" className="h-7 text-xs">Parziali / errori</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {batchResults
                .filter((result) => {
                  if (syncFilter === "all") return true;
                  const s = deriveShopifyStatus(result);
                  if (syncFilter === "ok") return s === "ok";
                  if (syncFilter === "issues") return s === "partial" || s === "error";
                  if (syncFilter === "todo") return s === "none";
                  return true;
                })
                .map((result) => (
                <div key={result.productId}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Expand toggle */}
                    <button
                      type="button"
                      className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      disabled={!result.draft}
                      onClick={() =>
                        setExpandedId(expandedId === result.productId ? null : result.productId)
                      }
                    >
                      {expandedId === result.productId ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    {/* Title + handle */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{result.title}</p>
                        {(() => {
                          const src = products.find((p) => p.id === result.productId);
                          if (!src?.status) return null;
                          const isDraft = src.status.toLowerCase() === "draft";
                          return (
                            <Badge
                              variant="outline"
                              className={`h-4 px-1 text-[9px] uppercase ${
                                isDraft
                                  ? "border-amber-300 bg-amber-50 text-amber-700"
                                  : "border-green-300 bg-green-50 text-green-700"
                              }`}
                            >
                              {src.status}
                            </Badge>
                          );
                        })()}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{result.handle}</p>
                    </div>

                    {/* Completeness */}
                    <div className="shrink-0">
                      {result.completeness ? (
                        <ScoreBar score={result.completeness.completeness_score} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="shrink-0 flex items-center gap-1">
                      <StatusBadge result={result} />
                      {result.restored && (
                        <Badge variant="outline" className="h-5 px-1.5 text-[9px]" title="Bozza ripristinata dal DB">
                          DB
                        </Badge>
                      )}
                    </div>

                    {/* Per-item actions */}
                    <div className="flex shrink-0 gap-1.5">
                      {(() => {
                        const product = products.find((p) => p.id === result.productId);
                        const busy = result.status === "generating" || result.status === "publishing";
                        return (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 px-2 text-[11px]"
                              disabled={!product || isRunning || busy}
                              onClick={() => product && generateOne(product, seedStyle)}
                              title={result.draft ? "Rigenera bozza AI" : "Genera bozza AI"}
                            >
                              {result.status === "generating" ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3" />
                              )}
                              {result.draft ? "Rigenera" : "Genera"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 px-2 text-[11px]"
                              disabled={!product || isRunning || busy || isDbSource || !result.draft}
                              onClick={() => product && publishOne(product)}
                              title={
                                isDbSource
                                  ? "Disponibile solo con sorgente Shopify Admin"
                                  : !result.draft
                                    ? "Genera prima una bozza"
                                    : "Pubblica su Shopify"
                              }
                            >
                              {result.status === "publishing" ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <UploadCloud className="h-3 w-3" />
                              )}
                              Pubblica
                            </Button>
                          </>
                        );
                      })()}
                      {result.draft && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 px-2 text-[11px]"
                          onClick={() => downloadCsvSnippet(result.draft!)}
                        >
                          <Download className="h-3 w-3" />
                          CSV
                        </Button>
                      )}
                      {result.metafieldsReport && (
                        <MetafieldsChip
                          report={result.metafieldsReport}
                          open={openReportFor === result.productId}
                          onClick={() =>
                            setOpenReportFor(
                              openReportFor === result.productId ? null : result.productId,
                            )
                          }
                        />
                      )}
                    </div>

                    {/* Error tooltip */}
                    {result.error && (
                      <span className="text-[11px] text-destructive truncate max-w-[120px]" title={result.error}>
                        {result.error}
                      </span>
                    )}
                  </div>

                  {/* Expanded metafields report */}
                  {openReportFor === result.productId && result.metafieldsReport && (
                    <div className="border-t bg-muted/30 px-6 py-4">
                      <MetafieldsReport report={result.metafieldsReport} />
                    </div>
                  )}

                  {/* Expanded draft preview */}
                  {expandedId === result.productId && result.draft && (
                    <div className="border-t bg-muted/20 px-6 py-4">
                      <DraftPreview draft={result.draft} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Mode B — Create from essentials ──────────────────────────────────────────

function ModeBPanel() {
  const [form, setForm] = useState<EssentialProductInput>({ ...EMPTY_ESSENTIAL });
  const { draft, generating, generateFromEssentials, reset } = useProductEnrichment();
  const [publishing, setPublishing] = useState(false);

  async function handlePublish() {
    if (!draft) return;
    setPublishing(true);
    try {
      const res = await publishReviewedDraft({
        productId: 0,
        handle: draft.input_handle || form.handle,
        sku: form.variant_sku,
        bodyHtml: draft.body_html,
        seoTitle: draft.seo_title,
        seoDescription: draft.seo_description,
        metafields: draft.metafields as Record<string, string>,
      });
      const mf = res.metafields;
      toast.success(
        `Pubblicato su Shopify (id ${res.id}, via ${res.resolved_by || "id"})${mf ? ` — ${mf.written} metafield ok` : ""}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/non trovato/i.test(msg)) {
        toast.error(
          "Prodotto non esistente su Shopify. Crea prima il prodotto base (tab 'Nuovo Prodotto AI' o importazione CSV) usando lo stesso handle/SKU.",
        );
      } else {
        toast.error(`Errore pubblicazione: ${msg}`);
      }
    } finally {
      setPublishing(false);
    }
  }

  const set = <K extends keyof EssentialProductInput>(key: K, value: EssentialProductInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function handleTitleChange(value: string) {
    set("title", value);
    if (!form.handle || form.handle === slugify(form.title)) set("handle", slugify(value));
  }

  function slugify(s: string) {
    return s
      .toLowerCase()
      .replace(/[àáâ]/g, "a").replace(/[èéê]/g, "e").replace(/[ìíî]/g, "i")
      .replace(/[òóô]/g, "o").replace(/[ùúû]/g, "u")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dati essenziali prodotto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ep-title">Titolo *</Label>
              <Input id="ep-title" placeholder="es. Rosa Antica Climbing" value={form.title} onChange={(e) => handleTitleChange(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ep-handle">Handle (slug URL)</Label>
              <Input id="ep-handle" placeholder="rosa-antica-climbing" value={form.handle} onChange={(e) => set("handle", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ep-botanico">Nome botanico</Label>
              <Input id="ep-botanico" placeholder="es. Rosa canina L." value={form.nome_botanico} onChange={(e) => set("nome_botanico", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ep-comune">Nome comune</Label>
              <Input id="ep-comune" placeholder="es. Rosa selvatica" value={form.nome_comune} onChange={(e) => set("nome_comune", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="ep-category">Categoria</Label>
              <Input id="ep-category" placeholder="es. Rose" value={form.product_category} onChange={(e) => set("product_category", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ep-type">Tipo</Label>
              <Input id="ep-type" placeholder="es. Pianta da esterno" value={form.type} onChange={(e) => set("type", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ep-vendor">Fornitore</Label>
              <Input id="ep-vendor" placeholder="es. Online Garden" value={form.vendor} onChange={(e) => set("vendor", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="ep-sku">SKU</Label>
              <Input id="ep-sku" placeholder="ROSA-001" value={form.variant_sku} onChange={(e) => set("variant_sku", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ep-price">Prezzo (€)</Label>
              <Input id="ep-price" type="number" min={0} step={0.01} placeholder="24.90" value={form.variant_price} onChange={(e) => set("variant_price", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ep-tags">Tag (virgola)</Label>
              <Input id="ep-tags" placeholder="rosa, climbing, esterno" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ep-notes">Note coltivazione (facoltativo — aiuta l'AI)</Label>
            <Textarea
              id="ep-notes"
              placeholder="Habitat naturale, periodo di fioritura, esigenze di luce, resistenza al freddo, ecc."
              value={form.cultivation_notes}
              onChange={(e) => set("cultivation_notes", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="ep-style">Stile di scrittura</Label>
            <Select value={form.seed_style} onValueChange={(v) => set("seed_style", v)}>
              <SelectTrigger id="ep-style" className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEED_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button onClick={() => generateFromEssentials(form)} disabled={generating || !form.title.trim()} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Genera contenuti AI
            </Button>
            <Button variant="outline" onClick={() => { setForm({ ...EMPTY_ESSENTIAL }); reset(); }} disabled={generating}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {draft && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Bozza — {draft.input_title}
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-2" onClick={() => downloadCsvSnippet(draft)}>
                  <Download className="h-3.5 w-3.5" />
                  Esporta CSV
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handlePublish}
                  disabled={publishing || (!draft.input_handle && !form.variant_sku)}
                  title="Pubblica testi + SEO + metafield su Shopify. Lo stato (active/draft) del prodotto NON viene modificato."
                >
                  {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                  Pubblica su Shopify
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              🔒 Lo stato del prodotto non viene modificato. Serve un prodotto esistente su Shopify con handle <code>{draft.input_handle || "—"}</code> o SKU <code>{form.variant_sku || "—"}</code>.
            </p>
          </CardHeader>
          <CardContent>
            <DraftPreview draft={draft} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

// ── Shopify native CSV download ──────────────────────────────────────────────

function ShopifyNativeCsvButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [onlyComplete, setOnlyComplete] = useState(true);
  const [lastResult, setLastResult] = useState<{ products: number | null; variants: number | null } | null>(null);

  async function handleDownload() {
    setLoading(true);
    try {
      const r = await downloadShopifyNativeCsv({ onlyComplete, status });
      setLastResult({ products: r.totalProducts, variants: r.totalVariants });
      toast.success(
        `CSV scaricato: ${r.totalProducts ?? "?"} prodotti, ${r.totalVariants ?? "?"} varianti.`,
      );
    } catch (err) {
      toast.error(`Errore export: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={handleDownload}
          disabled={loading}
          variant="default"
          className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800"
          title="Importa i prodotti base in Shopify. I metafield NON sono inclusi: vanno pubblicati via API col bottone 'Pubblica solo metafield'."
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Scarica CSV prodotti base (senza metafield)
        </Button>
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyComplete}
            onChange={(e) => setOnlyComplete(e.target.checked)}
          />
          Solo prodotti completi
        </label>
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span>Stato:</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value === "active" ? "active" : "draft")}
            className="h-6 rounded border bg-background px-1.5 text-xs"
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
          </select>
        </label>
      </div>
      <p className="text-[10px] text-muted-foreground">
        File pronto per <strong>Shopify Admin → Products → Import</strong>: titolo, descrizione,
        varianti raggruppate per Handle, immagini multiple e SEO. <strong>I 16 metafield
        <code> custom.*</code> NON sono inclusi</strong> (vai via API col bottone "Pubblica solo
        metafield" qui sopra — è l'unico modo affidabile).
      </p>
      {lastResult && (
        <p className="text-[10px] text-emerald-700">
          Ultimo export: {lastResult.products ?? "?"} prodotti · {lastResult.variants ?? "?"} righe variante.
        </p>
      )}
    </div>
  );
}

export default function ProductEnrichmentPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <strong>Arricchimento catalogo</strong> — Basato sullo schema CSV Shopify.
        Analizza la completezza di tutti i prodotti, genera i {ALL_METAFIELD_KEYS.length} metafield personalizzati
        con un click e pubblica body HTML + SEO direttamente su Shopify.
      </div>

      <Tabs defaultValue="mode-a">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mode-a" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Arricchisci catalogo esistente
          </TabsTrigger>
          <TabsTrigger value="mode-b" className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Crea da dati essenziali
          </TabsTrigger>
        </TabsList>
        <TabsContent value="mode-a" className="mt-4">
          <ModeAPanel />
        </TabsContent>
        <TabsContent value="mode-b" className="mt-4">
          <ModeBPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Shopify merge export sub-component ───────────────────────────────────────

import type { EnrichedProductDraft } from "../types/productEnrichment";

function ShopifyMergeExport({ drafts }: { drafts: EnrichedProductDraft[] }) {
  const [report, setReport] = useState<MergeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoading(true);
    setFileName(file.name);
    try {
      const text = await file.text();
      const r = mergeDraftsIntoShopifyCsv(text, drafts);
      setReport(r);
      if (r.matchedHandles === 0) {
        toast.warning("Nessun handle del CSV corrisponde alle bozze generate.");
      } else {
        toast.success(`Merge completato: ${r.matchedHandles}/${drafts.length} prodotti aggiornati.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Errore merge CSV: ${msg}`);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFile}
          disabled={loading}
        />
        <Button asChild variant="outline" className="gap-2" disabled={loading}>
          <span>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Export Shopify-compatible update CSV
          </span>
        </Button>
      </label>
      {fileName && (
        <span className="text-[10px] text-muted-foreground">Sorgente: {fileName}</span>
      )}
      {report && (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {report.productRows} prodotti · {report.matchedHandles} match
            {report.unmatchedDrafts.length > 0 && ` · ${report.unmatchedDrafts.length} non trovati`}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => downloadMergedShopifyCsv(report)}
          >
            <Download className="h-3 w-3" />
            Scarica CSV merged
          </Button>
        </div>
      )}
    </div>
  );
}
