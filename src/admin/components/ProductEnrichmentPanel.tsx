import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { listShopifyProducts } from "../lib/aiWriterEngine";
import { downloadCsvSnippet } from "../lib/productEnrichmentEngine";
import { useProductEnrichment } from "../hooks/useProductEnrichment";
import type { ShopifyAdminProduct } from "../types/aiWriter";
import type { EssentialProductInput, ProductFieldCompleteness } from "../types/productEnrichment";
import { ALL_METAFIELD_KEYS, AI_GENERATED_KEYS, MANUAL_KEYS, METAFIELD_LABELS } from "../types/productEnrichment";

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

// ── Small reusable sub-components ────────────────────────────────────────────

function CompletenessBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Completezza catalogo</span>
        <span className="font-bold">{score}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function FieldStatusRow({
  label,
  present,
  isWeak,
  value,
}: {
  label: string;
  present: boolean;
  isWeak: boolean;
  value: string;
}) {
  const icon = !present ? (
    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
  ) : isWeak ? (
    <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
  ) : (
    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
  );

  return (
    <div className="flex items-start gap-2 py-1 text-xs">
      <span className="mt-0.5">{icon}</span>
      <span className="w-40 shrink-0 font-medium text-foreground">{label}</span>
      <span className="min-w-0 truncate text-muted-foreground">
        {present ? (isWeak ? `⚠ ${value}` : value) : "—"}
      </span>
    </div>
  );
}

function DraftPreview({
  draft,
}: {
  draft: NonNullable<ReturnType<typeof useProductEnrichment>["draft"]>;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Bozza generata — {draft.input_title}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => downloadCsvSnippet(draft)}
          >
            <Download className="h-3.5 w-3.5" />
            Esporta CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
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
            className="prose prose-sm max-h-64 overflow-auto rounded-md border bg-muted/20 p-3 text-sm"
            dangerouslySetInnerHTML={{ __html: draft.body_html || "<em>Nessun contenuto generato</em>" }}
          />
        </div>

        <Separator />

        {/* Metafields table */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Metafield Shopify CSV — {ALL_METAFIELD_KEYS.length} campi
          </Label>
          <div className="rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80">
                <tr>
                  <th className="p-2 text-left font-semibold">Campo CSV</th>
                  <th className="p-2 text-left font-semibold">Chiave metafield</th>
                  <th className="p-2 text-left font-semibold">Origine</th>
                  <th className="p-2 text-left font-semibold">Valore generato</th>
                </tr>
              </thead>
              <tbody>
                {ALL_METAFIELD_KEYS.map((key) => {
                  const value = draft.metafields[key] ?? "";
                  const isAi = AI_GENERATED_KEYS.has(key);
                  const isManual = MANUAL_KEYS.has(key);
                  return (
                    <tr key={key} className="border-t">
                      <td className="p-2 font-mono text-[10px] text-muted-foreground">
                        {`product.metafields.custom.${key}`}
                      </td>
                      <td className="p-2">{METAFIELD_LABELS[key]}</td>
                      <td className="p-2">
                        {isAi ? (
                          <Badge variant="secondary" className="text-[9px]">AI</Badge>
                        ) : isManual ? (
                          <Badge variant="outline" className="text-[9px]">Manuale</Badge>
                        ) : null}
                      </td>
                      <td className="max-w-xs p-2">
                        {value ? (
                          <span className="line-clamp-2 text-foreground">{value}</span>
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
          <p className="text-[10px] text-muted-foreground">
            I campi <Badge variant="outline" className="text-[9px]">Manuale</Badge> (nomi, periodi stagionali) richiedono
            verifica da fonti botaniche attendibili. Usa <strong>Esporta CSV</strong> per copiare questi valori nel tuo
            foglio di importazione Shopify.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Mode A — Existing product enrichment ─────────────────────────────────────

function ModeAPanel() {
  const [statusFilter, setStatusFilter] = useState("active");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ShopifyAdminProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [seedStyle, setSeedStyle] = useState(SEED_STYLES[0]);

  const { selectedProduct, completeness, analyzing, draft, generating, analyzeProduct, enrichExisting } =
    useProductEnrichment();

  async function loadProducts() {
    setLoadingProducts(true);
    try {
      const res = await listShopifyProducts({ status: statusFilter, query, limit: 60, page: 1 });
      setProducts(res.products);
    } catch {
      toast.error("Errore caricamento prodotti Shopify");
    } finally {
      setLoadingProducts(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Step 1 — search & select */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seleziona prodotto da arricchire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="draft">Bozze</SelectItem>
                <SelectItem value="archived">Archiviati</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="w-60"
              placeholder="Cerca per titolo / handle"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadProducts()}
            />
            <Button onClick={loadProducts} disabled={loadingProducts} variant="outline" className="gap-2">
              {loadingProducts ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Carica
            </Button>
          </div>

          {products.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80">
                  <tr>
                    <th className="p-2 text-left">Titolo</th>
                    <th className="p-2 text-left">Handle</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left" />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-2 font-medium">{p.title}</td>
                      <td className="p-2 text-muted-foreground">{p.handle}</td>
                      <td className="p-2">
                        <Badge variant="secondary">{p.status}</Badge>
                      </td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant={selectedProduct?.id === p.id ? "default" : "outline"}
                          onClick={() => analyzeProduct(p.id)}
                          disabled={analyzing}
                        >
                          {analyzing && selectedProduct?.id !== p.id ? null : analyzing && selectedProduct?.id === p.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : null}
                          Analizza
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — completeness report */}
      {completeness && (
        <CompletenessReport completeness={completeness} />
      )}

      {/* Step 2b — generate */}
      {completeness && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            {!completeness.metafields_available && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
                L'API Shopify non ha restituito i metafield per questo prodotto. L'analisi mostra solo i campi core
                (titolo, descrizione, SEO). L'AI genererà comunque l'intero set dei 16 metafield.
              </div>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Stile di scrittura</Label>
                <Select value={seedStyle} onValueChange={setSeedStyle}>
                  <SelectTrigger className="w-52">
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
                onClick={() => enrichExisting(seedStyle)}
                disabled={generating}
                className="gap-2"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Genera arricchimento AI
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — draft preview */}
      {draft && <DraftPreview draft={draft} />}
    </div>
  );
}

function CompletenessReport({ completeness }: { completeness: ProductFieldCompleteness }) {
  const [expanded, setExpanded] = useState<"core" | "seo" | "metafield" | null>("metafield");

  const groups: Array<{ key: "core" | "seo" | "metafield"; label: string }> = [
    { key: "core", label: "Campi principali" },
    { key: "seo", label: "Campi SEO" },
    { key: "metafield", label: "Metafield Shopify CSV" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Analisi completezza — {completeness.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CompletenessBar score={completeness.completeness_score} />

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="gap-1 text-green-700 border-green-200 bg-green-50">
            <CheckCircle2 className="h-3 w-3" />
            {completeness.present_count} presenti
          </Badge>
          {completeness.weak_count > 0 && (
            <Badge variant="outline" className="gap-1 text-yellow-700 border-yellow-200 bg-yellow-50">
              <TriangleAlert className="h-3 w-3" />
              {completeness.weak_count} deboli
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 text-red-700 border-red-200 bg-red-50">
            <AlertCircle className="h-3 w-3" />
            {completeness.missing_count} mancanti
          </Badge>
        </div>

        {groups.map(({ key, label }) => {
          const fields = completeness.fields.filter((f) => f.category === key);
          const isOpen = expanded === key;
          return (
            <div key={key} className="rounded-md border">
              <button
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/40"
                onClick={() => setExpanded(isOpen ? null : key)}
                type="button"
              >
                <span>{label}</span>
                <span className="text-muted-foreground text-xs">
                  {fields.filter((f) => f.present).length}/{fields.length}
                </span>
              </button>
              {isOpen && (
                <div className="border-t px-3 py-2">
                  {fields.map((f) => (
                    <FieldStatusRow
                      key={f.key}
                      label={f.label}
                      present={f.present}
                      isWeak={f.is_weak}
                      value={f.value}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ── Mode B — Create from essentials ──────────────────────────────────────────

function ModeBPanel() {
  const [form, setForm] = useState<EssentialProductInput>({ ...EMPTY_ESSENTIAL });
  const { draft, generating, generateFromEssentials, reset } = useProductEnrichment();

  const set = <K extends keyof EssentialProductInput>(key: K, value: EssentialProductInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Auto-derive handle from title
  function handleTitleChange(value: string) {
    set("title", value);
    if (!form.handle || form.handle === slugify(form.title)) {
      set("handle", slugify(value));
    }
  }

  function slugify(s: string) {
    return s
      .toLowerCase()
      .replace(/[àáâ]/g, "a").replace(/[èéê]/g, "e").replace(/[ìíî]/g, "i")
      .replace(/[òóô]/g, "o").replace(/[ùúû]/g, "u")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleReset() {
    setForm({ ...EMPTY_ESSENTIAL });
    reset();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dati essenziali prodotto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Identity */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ep-title">Titolo *</Label>
              <Input
                id="ep-title"
                placeholder="es. Rosa Antica Climbing"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ep-handle">Handle (URL slug)</Label>
              <Input
                id="ep-handle"
                placeholder="rosa-antica-climbing"
                value={form.handle}
                onChange={(e) => set("handle", e.target.value)}
              />
            </div>
          </div>

          {/* Botanical names */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ep-botanico">Nome botanico</Label>
              <Input
                id="ep-botanico"
                placeholder="es. Rosa canina L."
                value={form.nome_botanico}
                onChange={(e) => set("nome_botanico", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ep-comune">Nome comune</Label>
              <Input
                id="ep-comune"
                placeholder="es. Rosa selvatica"
                value={form.nome_comune}
                onChange={(e) => set("nome_comune", e.target.value)}
              />
            </div>
          </div>

          {/* Classification */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="ep-category">Categoria prodotto</Label>
              <Input
                id="ep-category"
                placeholder="es. Rose"
                value={form.product_category}
                onChange={(e) => set("product_category", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ep-type">Tipo</Label>
              <Input
                id="ep-type"
                placeholder="es. Pianta da esterno"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ep-vendor">Fornitore</Label>
              <Input
                id="ep-vendor"
                placeholder="es. Online Garden"
                value={form.vendor}
                onChange={(e) => set("vendor", e.target.value)}
              />
            </div>
          </div>

          {/* Commerce */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="ep-sku">SKU variante</Label>
              <Input
                id="ep-sku"
                placeholder="es. ROSA-001"
                value={form.variant_sku}
                onChange={(e) => set("variant_sku", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ep-price">Prezzo (€)</Label>
              <Input
                id="ep-price"
                type="number"
                min={0}
                step={0.01}
                placeholder="24.90"
                value={form.variant_price}
                onChange={(e) => set("variant_price", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ep-tags">Tag (virgola)</Label>
              <Input
                id="ep-tags"
                placeholder="rosa, climbing, esterno"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
              />
            </div>
          </div>

          {/* Image */}
          <div className="space-y-1">
            <Label htmlFor="ep-image">URL immagine principale</Label>
            <Input
              id="ep-image"
              placeholder="https://..."
              value={form.image_src}
              onChange={(e) => set("image_src", e.target.value)}
            />
          </div>

          {/* Cultivation hints */}
          <div className="space-y-1">
            <Label htmlFor="ep-notes">Note coltivazione (facoltativo)</Label>
            <Textarea
              id="ep-notes"
              placeholder="Aggiungi informazioni utili all'AI: habitat naturale, periodo di fioritura, esigenze di luce, resistenza al freddo, ecc."
              value={form.cultivation_notes}
              onChange={(e) => set("cultivation_notes", e.target.value)}
              rows={3}
            />
            <p className="text-[10px] text-muted-foreground">
              Più dettagli fornisci, più precisi saranno i contenuti generati. Periodi stagionali e nome botanico
              non vengono inventati dall'AI — includili qui o compilali manualmente nella bozza.
            </p>
          </div>

          {/* Seed style */}
          <div className="space-y-1">
            <Label htmlFor="ep-style">Stile di scrittura</Label>
            <Select value={form.seed_style} onValueChange={(v) => set("seed_style", v)}>
              <SelectTrigger id="ep-style" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEED_STYLES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button
              onClick={() => generateFromEssentials(form)}
              disabled={generating || !form.title.trim()}
              className="gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Genera contenuti AI
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={generating}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {draft && <DraftPreview draft={draft} />}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ProductEnrichmentPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <strong>Arricchimento catalogo Shopify</strong> — Basato sullo schema del CSV di esportazione Shopify.
        L'AI genera i {ALL_METAFIELD_KEYS.length} metafield personalizzati del catalogo mantenendo il tono e la
        struttura degli altri prodotti.
      </div>

      <Tabs defaultValue="mode-a">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mode-a" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Arricchisci prodotto esistente
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
