import { useRef, useState } from "react";
import { toast } from "sonner";
import type { ShopifyAdminProduct } from "../types/aiWriter";
import type {
  EnrichedProductDraft,
  EssentialProductInput,
  ProductFieldCompleteness,
} from "../types/productEnrichment";
import {
  evaluateCompletenessWithDraft,
  evaluateProductCompleteness,
  generateEnrichedDraft,
  rebuildDraftFromDbRow,
} from "../lib/productEnrichmentEngine";
import {
  finishEnrichmentRun,
  getEnrichedDraftsBySkus,
  getOpenEnrichmentRun,
  getShopifyProduct,
  publishReviewedDraft,
  saveEnrichedDraftToDb,
  startEnrichmentRun,
  updateEnrichmentItem,
  type EnrichmentRunItemRow,
  type EnrichmentRunRow,
  type MetafieldsReport,
} from "../lib/aiWriterEngine";

// ── Batch result record ─────────────────────────────────────────────────────

export type BatchItemStatus = "pending" | "analyzing" | "generating" | "publishing" | "done" | "error";

export interface BatchProductResult {
  productId: number;
  sku?: string;
  handle: string;
  title: string;
  completeness: ProductFieldCompleteness | null;
  draft: EnrichedProductDraft | null;
  publishedAt: string | null;
  savedAt?: string | null;
  restored?: boolean;
  status: BatchItemStatus;
  error: string | null;
  metafieldsReport?: MetafieldsReport;

}

export interface BatchProgress {
  current: number;
  total: number;
  phase: "generate" | "publish";
  currentTitle: string;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── Hook ────────────────────────────────────────────────────────────────────

export function useProductEnrichment() {
  // ── Single-product state (Mode A single / Mode B) ─────────────────────
  const [selectedProduct, setSelectedProduct] = useState<ShopifyAdminProduct | null>(null);
  const [completeness, setCompleteness] = useState<ProductFieldCompleteness | null>(null);
  const [draft, setDraft] = useState<EnrichedProductDraft | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);

  // ── Batch state (Mode A batch) ────────────────────────────────────────
  const [batchResults, setBatchResults] = useState<BatchProductResult[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [debugMetafields, setDebugMetafields] = useState(false);
  const [metafieldsRetries, setMetafieldsRetries] = useState<number>(3);
  const cancelRef = useRef(false);
  const activeRunIdRef = useRef<string | null>(null);

  // ── Persisted run (survives refresh) ──────────────────────────────────
  const [openRun, setOpenRun] = useState<EnrichmentRunRow | null>(null);
  const [openRunItems, setOpenRunItems] = useState<EnrichmentRunItemRow[]>([]);
  const [loadingOpenRun, setLoadingOpenRun] = useState(false);

  async function refreshOpenRun() {
    setLoadingOpenRun(true);
    try {
      const { run, items } = await getOpenEnrichmentRun();
      setOpenRun(run);
      setOpenRunItems(items);
    } catch (e) {
      console.error("[enrichment] refreshOpenRun failed:", e);
    } finally {
      setLoadingOpenRun(false);
    }
  }

  async function closeOpenRun() {
    if (!openRun) return;
    try {
      await finishEnrichmentRun({ runId: openRun.id, status: "aborted" });
    } catch (e) {
      console.error("[enrichment] closeOpenRun failed:", e);
    }
    setOpenRun(null);
    setOpenRunItems([]);
  }

  function cancelBatch() {
    cancelRef.current = true;
  }

  // Helper: mutate one item inside batchResults by productId
  function updateBatchItem(
    productId: number,
    patch: Partial<BatchProductResult>,
    currentBatch: BatchProductResult[],
  ): BatchProductResult[] {
    return currentBatch.map((r) => (r.productId === productId ? { ...r, ...patch } : r));
  }

  /** Fire-and-forget persist of an item update; never blocks the UI loop. */
  function persistItem(sku: string | undefined, patch: {
    status: "pending" | "done" | "error";
    error?: string | null;
    metafieldsReport?: MetafieldsReport | null;
  }) {
    const runId = activeRunIdRef.current;
    if (!runId || !sku) return;
    updateEnrichmentItem({ runId, sku, ...patch }).catch((e) =>
      console.error("[enrichment] persistItem failed:", e),
    );
  }

  // ── Mode A — single product ──────────────────────────────────────────

  async function analyzeProduct(productId: number) {
    setAnalyzing(true);
    setCompleteness(null);
    setDraft(null);
    try {
      const { product } = await getShopifyProduct(productId);
      setSelectedProduct(product);
      setCompleteness(evaluateProductCompleteness(product));
    } catch (e) {
      toast.error("Errore durante l'analisi del prodotto");
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  }

  async function enrichExisting(seedStyle: string) {
    if (!selectedProduct) return;
    setGenerating(true);
    setDraft(null);
    try {
      const input: EssentialProductInput = {
        handle: selectedProduct.handle,
        title: selectedProduct.title,
        product_category: "",
        type: "",
        tags: selectedProduct.tags ?? "",
        seed_style: seedStyle,
      };
      const result = await generateEnrichedDraft(input);
      setDraft(result);
      toast.success("Bozza di arricchimento generata");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore generazione";
      toast.error(msg);
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  // ── Mode B — create from essentials ─────────────────────────────────

  async function generateFromEssentials(input: EssentialProductInput) {
    if (!input.title.trim()) {
      toast.error("Titolo obbligatorio");
      return;
    }
    setGenerating(true);
    setDraft(null);
    try {
      const result = await generateEnrichedDraft(input);
      setDraft(result);
      toast.success("Bozza prodotto generata con successo");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore generazione";
      toast.error(msg);
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  // ── Mode A — batch operations ────────────────────────────────────────

  /** Instant: evaluates completeness for all loaded products, then rehydrates existing drafts from DB. */
  async function analyzeAll(products: ShopifyAdminProduct[]) {
    const initial: BatchProductResult[] = products.map((p) => ({
      productId: p.id,
      sku: p.sku,
      handle: p.handle,
      title: p.title,
      completeness: evaluateProductCompleteness(p),
      draft: null,
      publishedAt: null,
      savedAt: null,
      restored: false,
      status: "pending" as BatchItemStatus,
      error: null,
    }));
    setBatchResults(initial);
    toast.success(`${initial.length} prodotti analizzati`);

    // Rehydrate previously generated drafts from DB
    const skus = products.map((p) => p.sku).filter((s): s is string => !!s);
    if (skus.length === 0) return;
    try {
      const { drafts } = await getEnrichedDraftsBySkus(skus);
      if (!drafts || drafts.length === 0) return;
      const bySku = new Map(drafts.map((d) => [d.sku, d]));
      const merged = initial.map((r) => {
        if (!r.sku) return r;
        const row = bySku.get(r.sku);
        if (!row) return r;
        const product = products.find((p) => p.id === r.productId);
        const draft = rebuildDraftFromDbRow(row);
        if (!draft) return r;
        const completeness = product
          ? evaluateCompletenessWithDraft(product, draft)
          : r.completeness;
        return {
          ...r,
          draft,
          completeness,
          savedAt: row.ai_enriched_at,
          restored: true,
          status: "done" as BatchItemStatus,
        };
      });
      setBatchResults(merged);
      const restored = merged.filter((r) => r.restored).length;
      if (restored > 0) {
        toast.success(`${restored} bozze pre-esistenti ripristinate dal DB`);
      }
    } catch (e) {
      console.error("[enrichment] rehydrate from DB failed:", e);
    }
  }

  /** Generates enriched metafield drafts for all products — one AI call each */
  async function generateAll(products: ShopifyAdminProduct[], seedStyle: string) {
    cancelRef.current = false;
    let current: BatchProductResult[] = batchResults.length
      ? [...batchResults]
      : products.map((p) => ({
          productId: p.id,
          sku: p.sku,
          handle: p.handle,
          title: p.title,
          completeness: evaluateProductCompleteness(p),
          draft: null,
          publishedAt: null,
          savedAt: null,
          status: "pending" as BatchItemStatus,
          error: null,
        }));

    // Reset error state before run
    current = current.map((r) => ({ ...r, error: null }));
    setBatchResults(current);

    // Persistent run — survives refresh
    let runId: string | null = null;
    try {
      const startRes = await startEnrichmentRun({
        mode: "generate",
        items: products.map((p) => ({ sku: p.sku || `pid:${p.id}`, handle: p.handle, title: p.title })),
        notes: { seedStyle, source: "batch", debug: debugMetafields, retries: metafieldsRetries },
      });
      runId = startRes.runId;
      activeRunIdRef.current = runId;
    } catch (e) {
      console.error("[enrichment] startEnrichmentRun failed:", e);
    }

    let successCount = 0;
    let processed = 0;

    for (let i = 0; i < products.length; i++) {
      if (cancelRef.current) {
        toast.warning(`Generazione interrotta — ${successCount}/${products.length} salvati nel DB`);
        break;
      }
      const p = products[i];
      setBatchProgress({ current: i + 1, total: products.length, phase: "generate", currentTitle: p.title });
      current = updateBatchItem(p.id, { status: "generating" }, current);
      setBatchResults([...current]);

      try {
        const input: EssentialProductInput = {
          handle: p.handle,
          title: p.title,
          product_category: "",
          type: "",
          tags: p.tags ?? "",
          seed_style: seedStyle,
        };
        const d = await generateEnrichedDraft(input);
        const newCompleteness = evaluateCompletenessWithDraft(p, d);

        // Persist immediately to DB so we don't lose it on refresh / cancel
        let savedAt: string | null = null;
        if (p.sku) {
          try {
            await saveEnrichedDraftToDb({ sku: p.sku, draft: d, seedStyle });
            savedAt = new Date().toISOString();
          } catch (saveErr) {
            console.error("[enrichment] save to DB failed for sku", p.sku, saveErr);
          }
        }

        current = updateBatchItem(
          p.id,
          { draft: d, completeness: newCompleteness, savedAt, status: "done", error: null },
          current,
        );
        successCount++;
        persistItem(p.sku, { status: "done" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Errore generazione";
        current = updateBatchItem(p.id, { status: "error", error: msg }, current);
        persistItem(p.sku, { status: "error", error: msg });
      }

      setBatchResults([...current]);
      processed = i + 1;
      if (i < products.length - 1 && !cancelRef.current) await delay(500);
    }

    setBatchProgress(null);
    const wasCancelled = cancelRef.current;
    cancelRef.current = false;

    // Finalize run
    if (runId) {
      const finalStatus = wasCancelled ? "paused" : "completed";
      finishEnrichmentRun({ runId, status: finalStatus }).catch((e) =>
        console.error("[enrichment] finishEnrichmentRun failed:", e),
      );
      activeRunIdRef.current = null;
      // Refresh banner state
      refreshOpenRun().catch(() => {});
    }

    if (processed === products.length) {
      toast.success(`Generazione completata: ${successCount}/${products.length} riusciti`);
    }
  }

  /**
   * Publishes the EXACT enriched drafts the admin already generated and reviewed
   * in the panel (body HTML + SEO), via update_product. It does NOT regenerate
   * any AI content here, so what gets published always matches what was shown.
   * Products without a reviewed draft are skipped — we never auto-publish unseen
   * content. Custom metafields are updated through the same Shopify publish call.
   */
  async function publishAll(
    products: ShopifyAdminProduct[],
    adminEmail?: string,
  ) {
    void adminEmail; // publish path no longer needs it; kept for call-site stability
    cancelRef.current = false;
    let current: BatchProductResult[] = batchResults.length
      ? [...batchResults]
      : products.map((p) => ({
          productId: p.id,
          sku: p.sku,
          handle: p.handle,
          title: p.title,
          completeness: evaluateProductCompleteness(p),
          draft: null,
          publishedAt: null,
          savedAt: null,
          status: "pending" as BatchItemStatus,
          error: null,
        }));

    current = current.map((r) => ({ ...r, error: null }));
    setBatchResults(current);

    // Persistent run for publish phase
    let runId: string | null = null;
    try {
      const startRes = await startEnrichmentRun({
        mode: "generate_and_publish",
        items: products.map((p) => ({ sku: p.sku || `pid:${p.id}`, handle: p.handle, title: p.title })),
        notes: { phase: "publish", debug: debugMetafields, retries: metafieldsRetries },
      });
      runId = startRes.runId;
      activeRunIdRef.current = runId;
    } catch (e) {
      console.error("[enrichment] startEnrichmentRun (publish) failed:", e);
    }

    let successCount = 0;
    let skippedNoDraft = 0;
    let processed = 0;

    for (let i = 0; i < products.length; i++) {
      if (cancelRef.current) {
        toast.warning(`Pubblicazione interrotta — ${successCount}/${products.length} pubblicati`);
        break;
      }
      const p = products[i];

      // Only publish drafts the admin has actually generated/reviewed.
      const reviewedDraft = current.find((r) => r.productId === p.id)?.draft ?? null;
      if (!reviewedDraft) {
        current = updateBatchItem(
          p.id,
          { error: "Genera e rivedi una bozza prima di pubblicare" },
          current,
        );
        setBatchResults([...current]);
        skippedNoDraft++;
        processed = i + 1;
        persistItem(p.sku, { status: "error", error: "no draft" });
        continue;
      }

      setBatchProgress({ current: i + 1, total: products.length, phase: "publish", currentTitle: p.title });
      current = updateBatchItem(p.id, { status: "publishing" }, current);
      setBatchResults([...current]);

      try {
        const res = await publishReviewedDraft({
          productId: p.id,
          bodyHtml: reviewedDraft.body_html,
          seoTitle: reviewedDraft.seo_title,
          seoDescription: reviewedDraft.seo_description,
          metafields: reviewedDraft.metafields,
          debug: debugMetafields,
          retries: metafieldsRetries,
        });
        current = updateBatchItem(
          p.id,
          { publishedAt: new Date().toISOString(), status: "done", error: null, metafieldsReport: res?.metafields },
          current,
        );
        successCount++;
        persistItem(p.sku, { status: "done", metafieldsReport: res?.metafields ?? null });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Errore pubblicazione";
        current = updateBatchItem(p.id, { status: "error", error: msg }, current);
        persistItem(p.sku, { status: "error", error: msg });
      }

      setBatchResults([...current]);
      processed = i + 1;
      if (i < products.length - 1 && !cancelRef.current) await delay(800);
    }

    setBatchProgress(null);
    const wasCancelled = cancelRef.current;
    cancelRef.current = false;

    if (runId) {
      finishEnrichmentRun({
        runId,
        status: wasCancelled ? "paused" : "completed",
      }).catch((e) => console.error("[enrichment] finishEnrichmentRun failed:", e));
      activeRunIdRef.current = null;
      refreshOpenRun().catch(() => {});
    }

    if (processed === products.length) {
      const mfFailed = current.filter((r) => r.metafieldsReport?.details.some((d) => d.status === "failed")).length;
      const suffix = skippedNoDraft > 0 ? ` (${skippedNoDraft} senza bozza, saltati)` : "";
      if (mfFailed > 0) {
        toast.warning(`Pubblicati su Shopify: ${successCount}/${products.length}${suffix}. Metafield falliti su ${mfFailed} prodotto/i`);
      } else {
        toast.success(`Pubblicati su Shopify: ${successCount}/${products.length}${suffix}`);
      }
    }
  }

  /** Generates an enriched draft for a single product and persists it to DB. */
  async function generateOne(product: ShopifyAdminProduct, seedStyle: string) {
    let current = batchResults.length
      ? [...batchResults]
      : [
          {
            productId: product.id,
            sku: product.sku,
            handle: product.handle,
            title: product.title,
            completeness: evaluateProductCompleteness(product),
            draft: null,
            publishedAt: null,
            savedAt: null,
            restored: false,
            status: "pending" as BatchItemStatus,
            error: null,
          },
        ];

    current = updateBatchItem(product.id, { status: "generating", error: null }, current);
    setBatchResults([...current]);

    try {
      const input: EssentialProductInput = {
        handle: product.handle,
        title: product.title,
        product_category: "",
        type: "",
        tags: product.tags ?? "",
        seed_style: seedStyle,
      };
      const d = await generateEnrichedDraft(input);
      const newCompleteness = evaluateCompletenessWithDraft(product, d);

      let savedAt: string | null = null;
      if (product.sku) {
        try {
          await saveEnrichedDraftToDb({ sku: product.sku, draft: d, seedStyle });
          savedAt = new Date().toISOString();
        } catch (saveErr) {
          console.error("[enrichment] save to DB failed for sku", product.sku, saveErr);
        }
      }

      current = updateBatchItem(
        product.id,
        { draft: d, completeness: newCompleteness, savedAt, restored: false, status: "done", error: null },
        current,
      );
      setBatchResults([...current]);
      toast.success(`Bozza generata: ${product.title}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore generazione";
      current = updateBatchItem(product.id, { status: "error", error: msg }, current);
      setBatchResults([...current]);
      toast.error(`Errore generazione: ${msg}`);
    }
  }

  /** Publishes the already-generated draft for a single product to Shopify. */
  async function publishOne(product: ShopifyAdminProduct) {
    const item = batchResults.find((r) => r.productId === product.id);
    const reviewedDraft = item?.draft;
    if (!reviewedDraft) {
      toast.error("Genera prima una bozza per questo prodotto");
      return;
    }

    let current = [...batchResults];
    current = updateBatchItem(product.id, { status: "publishing", error: null }, current);
    setBatchResults([...current]);

    try {
      const res = await publishReviewedDraft({
        productId: product.id,
        bodyHtml: reviewedDraft.body_html,
        seoTitle: reviewedDraft.seo_title,
        seoDescription: reviewedDraft.seo_description,
        metafields: reviewedDraft.metafields,
        debug: debugMetafields,
        retries: metafieldsRetries,
      });
      current = updateBatchItem(
        product.id,
        { publishedAt: new Date().toISOString(), status: "done", error: null, metafieldsReport: res?.metafields },
        current,
      );
      setBatchResults([...current]);
      const mf = res?.metafields;
      if (mf && mf.errors.length) {
        toast.warning(`Pubblicato: ${product.title} — ${mf.written} metafield ok, ${mf.errors.length} con errori`);
      } else {
        toast.success(`Pubblicato: ${product.title}${mf ? ` (${mf.written} metafield)` : ""}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore pubblicazione";
      current = updateBatchItem(product.id, { status: "error", error: msg }, current);
      setBatchResults([...current]);
      toast.error(`Errore pubblicazione: ${msg}`);
    }
  }

  function resetBatch() {
    setBatchResults([]);
    setBatchProgress(null);
  }

  function reset() {
    setSelectedProduct(null);
    setCompleteness(null);
    setDraft(null);
    resetBatch();
  }

  return {
    // Single product (Mode A single + Mode B)
    selectedProduct,
    completeness,
    analyzing,
    analyzeProduct,
    enrichExisting,
    generateFromEssentials,
    draft,
    generating,
    // Batch (Mode A batch)
    batchResults,
    batchProgress,
    analyzeAll,
    generateAll,
    generateOne,
    publishAll,
    publishOne,
    cancelBatch,
    resetBatch,
    reset,
    debugMetafields,
    setDebugMetafields,
    metafieldsRetries,
    setMetafieldsRetries,
  };
}
