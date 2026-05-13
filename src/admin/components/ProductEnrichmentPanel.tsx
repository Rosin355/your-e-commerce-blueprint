import { useState } from "react";
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
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { listShopifyProducts } from "../lib/aiWriterEngine";
import { downloadBatchCsvSnippet, downloadCsvSnippet } from "../lib/productEnrichmentEngine";
import { useProductEnrichment, type BatchProductResult } from "../hooks/useProductEnrichment";
import type { ShopifyAdminProduct } from "../types/aiWriter";
import type { EssentialProductInput } from "../types/productEnrichment";
import { AI_GENERATED_KEYS, ALL_METAFIELD_KEYS, MANUAL_KEYS, METAFIELD_LABELS } from "../types/productEnrichment";

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
  if (result.status === "error")
    return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Errore</Badge>;
  if (result.publishedAt)
    return <Badge className="gap-1 bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-3 w-3" />Shopify ✓</Badge>;
  if (result.draft)
    return <Badge variant="outline" className="gap-1 text-green-700 border-green-300"><CheckCircle2 className="h-3 w-3" />Bozza AI</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">In attesa</Badge>;
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
        <div
          className="prose prose-sm max-h-48 overflow-auto rounded-md border bg-muted/20 p-3 text-sm"
          dangerouslySetInnerHTML={{ __html: draft.body_html || "<em>Nessun contenuto</em>" }}
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
  const [statusFilter, setStatusFilter] = useState("active");
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
    publishAll,
    resetBatch,
  } = useProductEnrichment();

  const isRunning = batchProgress !== null;
  const hasDrafts = batchResults.some((r) => r.draft);
  const draftsForDownload = batchResults.filter((r) => r.draft).map((r) => r.draft!);

  async function loadProducts() {
    setLoadingProducts(true);
    setLoadingCount(0);
    try {
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
    } catch {
      toast.error("Errore caricamento prodotti Shopify");
    } finally {
      setLoadingProducts(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Step 1 — load */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1 — Carica prodotti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="draft">Bozze</SelectItem>
                <SelectItem value="archived">Archiviati</SelectItem>
              </SelectContent>
            </Select>
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
              {products.length} prodotti caricati.{" "}
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
                onClick={() => publishAll(products, seedStyle, user?.email)}
                disabled={isRunning}
                variant="outline"
                className="gap-2"
              >
                {isRunning && batchProgress?.phase === "publish" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                Pubblica su Shopify (tutti)
              </Button>

              {hasDrafts && (
                <Button
                  onClick={() => downloadBatchCsvSnippet(draftsForDownload)}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Scarica CSV catalogo
                </Button>
              )}
            </div>

            {/* Progress bar */}
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
              </div>
            )}

            {/* Info about publish scope */}
            <p className="text-[10px] text-muted-foreground">
              <strong>Pubblica su Shopify</strong> aggiorna body HTML e SEO via API (titolo, descrizione, meta tag).
              I 16 metafield personalizzati vanno importati tramite il CSV scaricabile sopra.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results table */}
      {batchResults.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Risultati — {batchResults.length} prodotti
              </CardTitle>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">
                  {batchResults.filter((r) => r.draft).length} bozze
                </span>
                <span>•</span>
                <span className="text-blue-600 font-medium">
                  {batchResults.filter((r) => r.publishedAt).length} pubblicati
                </span>
                <span>•</span>
                <span className="text-red-600 font-medium">
                  {batchResults.filter((r) => r.error).length} errori
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {batchResults.map((result) => (
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
                      <p className="truncate text-sm font-medium">{result.title}</p>
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
                    <div className="shrink-0">
                      <StatusBadge result={result} />
                    </div>

                    {/* Per-item actions */}
                    <div className="flex shrink-0 gap-1.5">
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
                    </div>

                    {/* Error tooltip */}
                    {result.error && (
                      <span className="text-[11px] text-destructive truncate max-w-[120px]" title={result.error}>
                        {result.error}
                      </span>
                    )}
                  </div>

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
              <Button size="sm" variant="outline" className="gap-2" onClick={() => downloadCsvSnippet(draft)}>
                <Download className="h-3.5 w-3.5" />
                Esporta CSV
              </Button>
            </div>
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
