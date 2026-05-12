import { useState } from "react";
import { toast } from "sonner";
import type { ShopifyAdminProduct } from "../types/aiWriter";
import type {
  EnrichedProductDraft,
  EssentialProductInput,
  ProductFieldCompleteness,
} from "../types/productEnrichment";
import {
  evaluateProductCompleteness,
  generateEnrichedDraft,
} from "../lib/productEnrichmentEngine";
import { getShopifyProduct } from "../lib/aiWriterEngine";

interface UseProductEnrichmentReturn {
  // Mode A — existing product
  selectedProduct: ShopifyAdminProduct | null;
  completeness: ProductFieldCompleteness | null;
  analyzing: boolean;
  analyzeProduct: (productId: number) => Promise<void>;
  enrichExisting: (seedStyle: string) => Promise<void>;
  // Mode B — create from essentials
  generateFromEssentials: (input: EssentialProductInput) => Promise<void>;
  // Shared
  draft: EnrichedProductDraft | null;
  generating: boolean;
  reset: () => void;
}

export function useProductEnrichment(): UseProductEnrichmentReturn {
  const [selectedProduct, setSelectedProduct] = useState<ShopifyAdminProduct | null>(null);
  const [completeness, setCompleteness] = useState<ProductFieldCompleteness | null>(null);
  const [draft, setDraft] = useState<EnrichedProductDraft | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);

  // ── Mode A: load product + run completeness check ──────────────────────

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

  // ── Mode B: generate from minimal essential inputs ──────────────────────

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

  function reset() {
    setSelectedProduct(null);
    setCompleteness(null);
    setDraft(null);
  }

  return {
    selectedProduct,
    completeness,
    analyzing,
    analyzeProduct,
    enrichExisting,
    generateFromEssentials,
    draft,
    generating,
    reset,
  };
}
