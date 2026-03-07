import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RefreshCcw, Sparkles, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import {
  generateProductDraft,
  getShopifyProduct,
  listProductDrafts,
  listShopifyProducts,
  publishDraft,
} from "../lib/aiWriterEngine";
import { getAdminSession } from "../lib/adminAuth";
import type { AiWriterDraft, ShopifyAdminProduct } from "../types/aiWriter";

const DEFAULT_TAG = "woo-import";
const DEFAULT_STATUS = "active";
const DEFAULT_SEED_STYLE = "Pratico e tecnico";

const SEED_STYLES = [
  "Pratico e tecnico",
  "Caldo e narrativo",
  "Minimal e diretto",
  "Guida step-by-step",
];

function stringifyPretty(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

export default function AiWriterPanel() {
  const session = getAdminSession();
  const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS);
  const [tagFilter, setTagFilter] = useState(DEFAULT_TAG);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ShopifyAdminProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyAdminProduct | null>(null);
  const [drafts, setDrafts] = useState<AiWriterDraft[]>([]);
  const [seedStyle, setSeedStyle] = useState(DEFAULT_SEED_STYLE);
  const [workingAction, setWorkingAction] = useState<"generate" | "publish" | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) || drafts[0] || null,
    [drafts, selectedDraftId],
  );

  async function loadProducts() {
    setLoadingProducts(true);
    try {
      const response = await listShopifyProducts({
        status: statusFilter,
        tag: tagFilter,
        query,
        page: 1,
        limit: 50,
      });
      setProducts(response.products);
      if (!response.products.length) {
        setSelectedProduct(null);
      }
    } catch (error) {
      toast.error("Errore nel caricamento prodotti");
      console.error(error);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadProductData(productId: number) {
    try {
      const [productResponse, draftsResponse] = await Promise.all([
        getShopifyProduct(productId),
        listProductDrafts(productId),
      ]);
      setSelectedProduct(productResponse.product);
      setDrafts(draftsResponse.drafts);
      setSelectedDraftId(draftsResponse.drafts[0]?.id || null);
    } catch (error) {
      toast.error("Errore caricamento dettaglio prodotto");
      console.error(error);
    }
  }

  async function handleGenerateDraft() {
    if (!selectedProduct) return;
    setWorkingAction("generate");
    try {
      const response = await generateProductDraft({
        productId: selectedProduct.id,
        seedStyle,
        language: "it",
        adminEmail: session?.email,
      });
      toast.success("Bozza AI generata");
      await loadProductData(response.product.id);
    } catch (error) {
      toast.error("Errore durante la generazione bozza");
      console.error(error);
    } finally {
      setWorkingAction(null);
    }
  }

  async function handlePublishDraft() {
    if (!selectedDraft) return;
    setWorkingAction("publish");
    try {
      const response = await publishDraft(selectedDraft.id, session?.email);
      toast.success("Contenuti pubblicati su Shopify");
      await loadProductData(response.productId);
      await loadProducts();
    } catch (error) {
      toast.error("Errore durante la pubblicazione");
      console.error(error);
    } finally {
      setWorkingAction(null);
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AI Product Writer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="statusFilter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="statusFilter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">ACTIVE</SelectItem>
                  <SelectItem value="draft">DRAFT</SelectItem>
                  <SelectItem value="archived">ARCHIVED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagFilter">Tag</Label>
              <Input id="tagFilter" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="searchQuery">Ricerca (titolo/handle)</Label>
              <div className="flex gap-2">
                <Input
                  id="searchQuery"
                  placeholder="Cerca prodotto..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Button onClick={loadProducts} disabled={loadingProducts} className="gap-2">
                  {loadingProducts ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Aggiorna
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Prodotti Shopify</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingProducts ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Caricamento prodotti...
              </div>
            ) : products.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun prodotto trovato con i filtri correnti.</p>
            ) : (
              <div className="max-h-[420px] overflow-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="text-left p-2">Titolo</th>
                      <th className="text-left p-2">Handle</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Azione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-t">
                        <td className="p-2">{product.title}</td>
                        <td className="p-2 text-muted-foreground">{product.handle}</td>
                        <td className="p-2">
                          <Badge variant="secondary">{product.status}</Badge>
                        </td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            variant={selectedProduct?.id === product.id ? "default" : "outline"}
                            onClick={() => loadProductData(product.id)}
                          >
                            Seleziona
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

        <Card>
          <CardHeader>
            <CardTitle>Draft & Publish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedProduct ? (
              <p className="text-sm text-muted-foreground">Seleziona un prodotto per generare o rigenerare una bozza AI.</p>
            ) : (
              <>
                <div className="rounded-md border p-3">
                  <p className="font-medium">{selectedProduct.title}</p>
                  <p className="text-xs text-muted-foreground">{selectedProduct.handle}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="seedStyle">Seed style</Label>
                    <Select value={seedStyle} onValueChange={setSeedStyle}>
                      <SelectTrigger id="seedStyle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEED_STYLES.map((style) => (
                          <SelectItem key={style} value={style}>
                            {style}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleGenerateDraft} disabled={workingAction !== null} className="w-full gap-2">
                      {workingAction === "generate" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Genera / Rigenera bozza
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bozze disponibili</Label>
                  {drafts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessuna bozza presente.</p>
                  ) : (
                    <Select value={selectedDraft?.id} onValueChange={setSelectedDraftId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {drafts.map((draft) => (
                          <SelectItem key={draft.id} value={draft.id}>
                            {new Date(draft.created_at).toLocaleString()} • {draft.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Diff contenuto</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Textarea
                      readOnly
                      value={selectedProduct.body_html || ""}
                      className="min-h-[180px]"
                      placeholder="Descrizione attuale Shopify"
                    />
                    <Textarea
                      readOnly
                      value={selectedDraft ? stringifyPretty(selectedDraft.copy_json) : ""}
                      className="min-h-[180px]"
                      placeholder="Bozza AI (JSON)"
                    />
                  </div>
                </div>

                <Button
                  onClick={handlePublishDraft}
                  disabled={!selectedDraft || workingAction !== null}
                  className="gap-2"
                >
                  {workingAction === "publish" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4" />
                  )}
                  Approva e pubblica
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
