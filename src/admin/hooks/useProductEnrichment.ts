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
} from "../lib/productEnrichmentEngine";
import { generateProductDraft, getShopifyProduct, publishDraft, saveEnrichedDraftToDb } from "../lib/aiWriterEngine";

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
  status: BatchItemStatus;
  error: string | null;
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
  const cancelRef = useRef(false);

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

  /** Instant: evaluates completeness for all loaded products — no API calls */
  function analyzeAll(products: ShopifyAdminProduct[]) {
    const initial: BatchProductResult[] = products.map((p) => ({
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
    setBatchResults(initial);
    toast.success(`${initial.length} prodotti analizzati`);
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
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Errore generazione";
        current = updateBatchItem(p.id, { status: "error", error: msg }, current);
      }

      setBatchResults([...current]);
      processed = i + 1;
      if (i < products.length - 1 && !cancelRef.current) await delay(500);
    }

    setBatchProgress(null);
    cancelRef.current = false;
    if (processed === products.length) {
      toast.success(`Generazione completata: ${successCount}/${products.length} riusciti`);
    }
  }

  /**
   * Pushes body HTML + SEO to Shopify for each product using the existing
   * backend draft system (generate_product_copy_draft → publish_product_copy).
   * Custom metafields are not updated here — use the CSV export + import flow.
   */
  async function publishAll(
    products: ShopifyAdminProduct[],
    seedStyle: string,
    adminEmail?: string,
  ) {
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
    let successCount = 0;
    let processed = 0;

    for (let i = 0; i < products.length; i++) {
      if (cancelRef.current) {
        toast.warning(`Pubblicazione interrotta — ${successCount}/${products.length} pubblicati`);
        break;
      }
      const p = products[i];
      setBatchProgress({ current: i + 1, total: products.length, phase: "publish", currentTitle: p.title });
      current = updateBatchItem(p.id, { status: "publishing" }, current);
      setBatchResults([...current]);

      try {
        const { draft: backendDraft } = await generateProductDraft({
          productId: p.id,
          seedStyle,
          language: "it",
          adminEmail,
        });
        await publishDraft(backendDraft.id, adminEmail);
        current = updateBatchItem(
          p.id,
          { publishedAt: new Date().toISOString(), status: "done", error: null },
          current,
        );
        successCount++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Errore pubblicazione";
        current = updateBatchItem(p.id, { status: "error", error: msg }, current);
      }

      setBatchResults([...current]);
      processed = i + 1;
      if (i < products.length - 1 && !cancelRef.current) await delay(800);
    }

    setBatchProgress(null);
    cancelRef.current = false;
    if (processed === products.length) {
      toast.success(`Pubblicati su Shopify: ${successCount}/${products.length}`);
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
    publishAll,
    cancelBatch,
    resetBatch,
    reset,
  };
}
