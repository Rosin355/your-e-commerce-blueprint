import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NewProductFormData {
  title: string;
  description: string;
  category: string;
  price: number;
  tags: string;
  seedStyle: string;
  imageUrl: string;
  generateImage: boolean;
}

export interface GeneratedContent {
  seo_title: string;
  seo_description: string;
  optimized_description: string;
  h1_title: string;
  short_description: string;
  key_benefits: string[];
  care_guide: {
    light: string;
    watering: string;
    soil: string;
    temperature: string;
    notes: string;
  };
  characteristics: string[];
  faq: Array<{ q: string; a: string }>;
  image_alt_texts: string[];
}

export function useNewProductAI() {
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [generatedImageBase64, setGeneratedImageBase64] = useState<string | null>(null);

  async function generateContent(form: NewProductFormData) {
    if (!form.title.trim()) {
      toast.error("Titolo obbligatorio");
      return;
    }
    setGenerating(true);
    setGeneratedContent(null);
    setGeneratedImageBase64(null);

    try {
      const { data, error } = await supabase.functions.invoke("create-product-ai", {
        body: {
          action: "generate_content",
          data: {
            title: form.title,
            description: form.description,
            category: form.category,
            price: form.price,
            tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
            seedStyle: form.seedStyle,
            generateImage: form.generateImage,
          },
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setGeneratedContent(data.seoData as GeneratedContent);
      if (data.generatedImageBase64) {
        setGeneratedImageBase64(data.generatedImageBase64);
      }
      toast.success("Contenuti AI generati con successo");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore generazione";
      toast.error(msg);
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  async function createOnShopify(form: NewProductFormData) {
    if (!generatedContent) {
      toast.error("Genera prima i contenuti AI");
      return;
    }
    if (!form.price || form.price <= 0) {
      toast.error("Prezzo deve essere > 0");
      return;
    }
    setCreating(true);

    try {
      const imageUrl = generatedImageBase64 || form.imageUrl || null;

      const { data, error } = await supabase.functions.invoke("create-product-ai", {
        body: {
          action: "create_product",
          data: {
            seoData: generatedContent,
            title: form.title,
            category: form.category,
            price: form.price,
            tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
            imageUrl,
          },
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success(`Prodotto creato su Shopify (DRAFT) — ID: ${data.productId}`);
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore creazione Shopify";
      toast.error(msg);
      console.error(e);
      return null;
    } finally {
      setCreating(false);
    }
  }

  function reset() {
    setGeneratedContent(null);
    setGeneratedImageBase64(null);
  }

  return {
    generating,
    creating,
    generatedContent,
    generatedImageBase64,
    generateContent,
    createOnShopify,
    reset,
  };
}
