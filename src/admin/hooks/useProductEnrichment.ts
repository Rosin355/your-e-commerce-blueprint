import { useEffect, useRef, useState } from "react";
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
  /** ISO timestamp set when the item enters status="publishing" or "generating". Used by the
   *  client-side watchdog to reset orphan states stuck > 5 min (e.g. tab closed / network drop). */
  startedAt?: string | null;
  /** True when proxy responded `skipped: true` (already synced and unchanged). */
  skippedAlreadySynced?: boolean;
}

export interface BatchProgress {
  current: number;
  total: number;
  phase: "generate" | "publish";
  currentTitle: string;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Derives the persistent Shopify sync state for a batch result.
 * - "ok": Shopify update succeeded AND no metafield failed (skipped is OK).
 * - "partial": Shopify update succeeded but at least one metafield failed.
 * - "error": update_product threw OR row marked failed.
 * - "none": never published / pending.
 */
export type DerivedShopifyStatus = "ok" | "partial" | "error" | "none";
export function deriveShopifyStatus(r: BatchProductResult): DerivedShopifyStatus {
  if (r.status === "error") return "error";
  if (!r.publishedAt) return "none";
  const failed = r.metafieldsReport?.details?.some((d) => d.status === "failed") ?? false;
  return failed ? "partial" : "ok";
}

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
  /** Concurrency for batch publish/generate. Default 1 (safe). Max 2 to avoid Shopify throttling. */
  const [concurrency, setConcurrencyState] = useState<number>(1);
  const setConcurrency = (n: number) => setConcurrencyState(Math.max(1, Math.min(2, Math.floor(n) || 1)));
  const cancelRef = useRef(false);
  const activeRunIdRef = useRef<string | null>(null);

  // ── Orphan-state watchdog ─────────────────────────────────────────────
  // If a batch item gets stuck in "publishing"/"generating" for more than 5
  // minutes (tab closed, network drop, edge function 504, …) reset it to
  // "error" so the UI doesn't lie about ongoing work and the user can retry.
  const STUCK_AFTER_MS = 5 * 60 * 1000;
  useEffect(() => {
    const t = setInterval(() => {
      setBatchResults((prev) => {
        const now = Date.now();
        let mutated = false;
        const next = prev.map((r) => {
          if ((r.status === "publishing" || r.status === "generating") && r.startedAt) {
            const started = new Date(r.startedAt).getTime();
            if (Number.isFinite(started) && now - started > STUCK_AFTER_MS) {
              mutated = true;
              return { ...r, status: "error" as BatchItemStatus, error: r.error ?? "Timeout client (>5 min): nessuna risposta. Riprova." };
            }
          }
          return r;
        });
        return mutated ? next : prev;
      });
    }, 30_000);
    return () => clearInterval(t);
  }, []);

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
    const initial: BatchProductResult[] = products.map((p) => {
      const sync = p.shopifySync;
      const isSynced = sync?.status === "synced" || sync?.status === "partial";
      const isFailed = sync?.status === "failed";
      const report = sync?.metafields?.report as MetafieldsReport | undefined;
      return {
        productId: p.id,
        sku: p.sku,
        handle: p.handle,
        title: p.title,
        completeness: evaluateProductCompleteness(p),
        draft: null,
        publishedAt: isSynced ? sync?.syncedAt ?? null : null,
        savedAt: null,
        restored: false,
        status: (isFailed ? "error" : "pending") as BatchItemStatus,
        error: isFailed ? sync?.error ?? null : null,
        metafieldsReport: report && typeof report === "object" ? report : undefined,
      };
    });
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
        // Status: if Shopify sync already OK keep "done"; else mark as restored draft
        const wasSynced = !!r.publishedAt;
        return {
          ...r,
          draft,
          completeness,
          savedAt: row.ai_enriched_at,
          restored: true,
          status: (wasSynced || r.status === "error" ? r.status : "done") as BatchItemStatus,
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

  /** Generates enriched metafield drafts for all products — one AI call each.
   *  By default DOES NOT regenerate products that already have a draft (safe-resume).
   *  Pass `{ force: true }` to rigenerate tutto (overwrite). */
  async function generateAll(products: ShopifyAdminProduct[], seedStyle: string, opts?: { force?: boolean }) {
    const force = !!opts?.force;
    // Filter: skip products whose batch row already has a draft, unless force=true
    const existingDraftIds = new Set(batchResults.filter((r) => r.draft).map((r) => r.productId));
    const targets = force ? products : products.filter((p) => !existingDraftIds.has(p.id));
    if (targets.length === 0) {
      toast.info("Tutti i prodotti hanno già una bozza AI. Usa 'Rigenera' sul singolo prodotto se vuoi rifare l'AI.");
      return;
    }
    if (targets.length < products.length) {
      toast.info(`${products.length - targets.length} prodotti hanno già una bozza e verranno saltati. Genero solo i ${targets.length} mancanti.`);
    }
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
        items: targets.map((p) => ({ sku: p.sku || `pid:${p.id}`, handle: p.handle, title: p.title })),
        notes: { seedStyle, source: "batch", debug: debugMetafields, retries: metafieldsRetries, force },
      });
      runId = startRes.runId;
      activeRunIdRef.current = runId;
    } catch (e) {
      console.error("[enrichment] startEnrichmentRun failed:", e);
    }

    let successCount = 0;
    let processed = 0;

    for (let i = 0; i < targets.length; i++) {
      if (cancelRef.current) {
        toast.warning(`Generazione interrotta — ${successCount}/${targets.length} salvati nel DB`);
        break;
      }
      const p = targets[i];
      setBatchProgress({ current: i + 1, total: targets.length, phase: "generate", currentTitle: p.title });
      current = updateBatchItem(p.id, { status: "generating", startedAt: new Date().toISOString() }, current);
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
          { draft: d, completeness: newCompleteness, savedAt, status: "done", error: null, startedAt: null },
          current,
        );
        successCount++;
        persistItem(p.sku, { status: "done" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Errore generazione";
        current = updateBatchItem(p.id, { status: "error", error: msg, startedAt: null }, current);
        persistItem(p.sku, { status: "error", error: msg });
      }

      setBatchResults([...current]);
      processed = i + 1;
      if (i < targets.length - 1 && !cancelRef.current) await delay(500);
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

    if (processed === targets.length) {
      toast.success(`Generazione completata: ${successCount}/${targets.length} riusciti`);
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
    opts?: { force?: boolean },
  ) {
    void adminEmail;
    const force = !!opts?.force;
    cancelRef.current = false;

    // Build / refresh batch rows
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

    // ── Filter: skip already-OK on Shopify unless force ───────────────────
    const skippedAlready: BatchProductResult[] = [];
    const targets = products.filter((p) => {
      const row = current.find((r) => r.productId === p.id);
      if (!row) return true;
      if (!force && deriveShopifyStatus(row) === "ok") {
        skippedAlready.push(row);
        return false;
      }
      return true;
    });

    if (targets.length === 0) {
      toast.info(
        force
          ? "Nessun prodotto da pubblicare."
          : `Tutti i ${products.length} prodotti risultano già sincronizzati su Shopify. Usa "Forza re-sync" per ripubblicare.`,
      );
      return;
    }
    if (skippedAlready.length > 0) {
      toast.info(`${skippedAlready.length} prodotti già sincronizzati saltati. Pubblico i ${targets.length} restanti.`);
    }

    // Persistent run
    let runId: string | null = null;
    try {
      const startRes = await startEnrichmentRun({
        mode: "generate_and_publish",
        items: targets.map((p) => ({ sku: p.sku || `pid:${p.id}`, handle: p.handle, title: p.title })),
        notes: { phase: "publish", debug: debugMetafields, retries: metafieldsRetries, concurrency, force },
      });
      runId = startRes.runId;
      activeRunIdRef.current = runId;
    } catch (e) {
      console.error("[enrichment] startEnrichmentRun (publish) failed:", e);
    }

    let successCount = 0;
    let skippedNoDraft = 0;
    let skippedServerSide = 0;
    let processed = 0;
    let mfFailedCount = 0;

    // ── Worker pool runner (concurrency 1-2) ──────────────────────────────
    let nextIdx = 0;
    const total = targets.length;

    const processOne = async (p: ShopifyAdminProduct, displayIdx: number) => {
      if (cancelRef.current) return;

      // Re-read latest draft from state (set during generate phase / DB rehydrate)
      let reviewedDraft: EnrichedProductDraft | null = null;
      setBatchResults((prev) => {
        const row = prev.find((r) => r.productId === p.id);
        reviewedDraft = row?.draft ?? null;
        return prev;
      });

      if (!reviewedDraft) {
        setBatchResults((prev) => updateBatchItem(p.id, { error: "Genera e rivedi una bozza prima di pubblicare", startedAt: null }, prev));
        skippedNoDraft++;
        processed++;
        persistItem(p.sku, { status: "error", error: "no draft" });
        return;
      }

      setBatchProgress({ current: displayIdx, total, phase: "publish", currentTitle: p.title });
      setBatchResults((prev) => updateBatchItem(p.id, { status: "publishing", startedAt: new Date().toISOString() }, prev));

      try {
        const res = await publishReviewedDraft({
          productId: p.id,
          handle: p.handle,
          sku: p.sku,
          bodyHtml: reviewedDraft.body_html,
          seoTitle: reviewedDraft.seo_title,
          seoDescription: reviewedDraft.seo_description,
          metafields: reviewedDraft.metafields,
          debug: debugMetafields,
          retries: metafieldsRetries,
          force,
        });
        const wasSkipped = !!(res as any)?.skipped;
        if (wasSkipped) skippedServerSide++;
        const mfFailed = res?.metafields?.details?.some((d) => d.status === "failed") ?? false;
        if (mfFailed) mfFailedCount++;
        setBatchResults((prev) =>
          updateBatchItem(
            p.id,
            {
              publishedAt: new Date().toISOString(),
              status: "done",
              error: null,
              startedAt: null,
              metafieldsReport: res?.metafields,
              skippedAlreadySynced: wasSkipped,
            },
            prev,
          ),
        );
        successCount++;
        persistItem(p.sku, { status: "done", metafieldsReport: res?.metafields ?? null });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Errore pubblicazione";
        setBatchResults((prev) => updateBatchItem(p.id, { status: "error", error: msg, startedAt: null }, prev));
        persistItem(p.sku, { status: "error", error: msg });
      }
      processed++;
    };

    const worker = async () => {
      while (true) {
        if (cancelRef.current) return;
        const i = nextIdx++;
        if (i >= total) return;
        await processOne(targets[i], i + 1);
        // small jitter to ease Shopify rate-limits
        if (nextIdx < total && !cancelRef.current) await delay(concurrency === 1 ? 600 : 300);
      }
    };

    const lanes = Math.max(1, Math.min(2, concurrency));
    await Promise.all(Array.from({ length: lanes }, () => worker()));

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

    if (processed >= total) {
      const parts: string[] = [`Pubblicati: ${successCount}/${total}`];
      if (skippedServerSide > 0) parts.push(`${skippedServerSide} skip (già sync su Shopify)`);
      if (skippedNoDraft > 0) parts.push(`${skippedNoDraft} senza bozza`);
      if (skippedAlready.length > 0) parts.push(`${skippedAlready.length} skip lato client`);
      if (mfFailedCount > 0) {
        toast.warning(`${parts.join(" · ")}. Metafield falliti su ${mfFailedCount} prodotto/i`);
      } else {
        toast.success(parts.join(" · "));
      }
    }
  }


  /**
   * Pushes ONLY the 19 custom.* metafields to Shopify for products that already
   * exist (e.g. imported via base CSV). Skips body HTML / SEO update. Uses the
   * same persistent run tracking as publishAll.
   */
  async function publishMetafieldsOnly(products: ShopifyAdminProduct[], opts?: { force?: boolean }) {
    const force = !!opts?.force;
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

    // Filter already-OK unless force
    const skippedAlready: BatchProductResult[] = [];
    const targets = products.filter((p) => {
      const row = current.find((r) => r.productId === p.id);
      if (!row) return true;
      if (!force && deriveShopifyStatus(row) === "ok") {
        skippedAlready.push(row);
        return false;
      }
      return true;
    });
    if (targets.length === 0) {
      toast.info(force ? "Nessun prodotto da pubblicare." : `Tutti già sincronizzati. Usa "Forza re-sync" per ripubblicare.`);
      return;
    }
    if (skippedAlready.length > 0) {
      toast.info(`${skippedAlready.length} prodotti già sincronizzati saltati.`);
    }

    let runId: string | null = null;
    try {
      const startRes = await startEnrichmentRun({
        mode: "generate_and_publish",
        items: targets.map((p) => ({ sku: p.sku || `pid:${p.id}`, handle: p.handle, title: p.title })),
        notes: { phase: "publish_metafields_only", debug: debugMetafields, retries: metafieldsRetries, concurrency, force },
      });
      runId = startRes.runId;
      activeRunIdRef.current = runId;
    } catch (e) {
      console.error("[enrichment] startEnrichmentRun (metafields_only) failed:", e);
    }

    let successCount = 0;
    let skippedNoDraft = 0;
    let skippedServerSide = 0;
    let processed = 0;
    const total = targets.length;
    let nextIdx = 0;

    const processOne = async (p: ShopifyAdminProduct, displayIdx: number) => {
      if (cancelRef.current) return;
      let reviewedDraft: EnrichedProductDraft | null = null;
      setBatchResults((prev) => {
        const row = prev.find((r) => r.productId === p.id);
        reviewedDraft = row?.draft ?? null;
        return prev;
      });
      if (!reviewedDraft || !reviewedDraft.metafields) {
        setBatchResults((prev) => updateBatchItem(p.id, { error: "Genera prima i metafield AI", startedAt: null }, prev));
        skippedNoDraft++; processed++;
        persistItem(p.sku, { status: "error", error: "no metafields" });
        return;
      }
      setBatchProgress({ current: displayIdx, total, phase: "publish", currentTitle: p.title });
      setBatchResults((prev) => updateBatchItem(p.id, { status: "publishing", startedAt: new Date().toISOString() }, prev));

      try {
        const res = await publishReviewedDraft({
          productId: p.id,
          handle: p.handle,
          sku: p.sku,
          bodyHtml: "",
          metafields: reviewedDraft.metafields,
          debug: debugMetafields,
          retries: metafieldsRetries,
          metafieldsOnly: true,
          force,
        });
        const wasSkipped = !!(res as any)?.skipped;
        if (wasSkipped) skippedServerSide++;
        setBatchResults((prev) =>
          updateBatchItem(
            p.id,
            { publishedAt: new Date().toISOString(), status: "done", error: null, startedAt: null, metafieldsReport: res?.metafields, skippedAlreadySynced: wasSkipped },
            prev,
          ),
        );
        successCount++;
        persistItem(p.sku, { status: "done", metafieldsReport: res?.metafields ?? null });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Errore pubblicazione";
        setBatchResults((prev) => updateBatchItem(p.id, { status: "error", error: msg, startedAt: null }, prev));
        persistItem(p.sku, { status: "error", error: msg });
      }
      processed++;
    };

    const worker = async () => {
      while (true) {
        if (cancelRef.current) return;
        const i = nextIdx++;
        if (i >= total) return;
        await processOne(targets[i], i + 1);
        if (nextIdx < total && !cancelRef.current) await delay(concurrency === 1 ? 500 : 250);
      }
    };
    const lanes = Math.max(1, Math.min(2, concurrency));
    await Promise.all(Array.from({ length: lanes }, () => worker()));

    setBatchProgress(null);
    const wasCancelled = cancelRef.current;
    cancelRef.current = false;

    if (runId) {
      finishEnrichmentRun({ runId, status: wasCancelled ? "paused" : "completed" })
        .catch((e) => console.error("[enrichment] finishEnrichmentRun failed:", e));
      activeRunIdRef.current = null;
      refreshOpenRun().catch(() => {});
    }

    if (processed >= total) {
      const parts: string[] = [`Metafield aggiornati: ${successCount}/${total}`];
      if (skippedServerSide > 0) parts.push(`${skippedServerSide} skip lato server`);
      if (skippedNoDraft > 0) parts.push(`${skippedNoDraft} senza metafield`);
      if (skippedAlready.length > 0) parts.push(`${skippedAlready.length} skip lato client`);
      toast.success(parts.join(" · "));
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
        handle: product.handle,
        sku: product.sku,
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
    publishMetafieldsOnly,
    publishOne,
    cancelBatch,
    resetBatch,
    reset,
    debugMetafields,
    setDebugMetafields,
    metafieldsRetries,
    setMetafieldsRetries,
    // Persistent runs
    openRun,
    openRunItems,
    loadingOpenRun,
    refreshOpenRun,
    closeOpenRun,
  };
}
