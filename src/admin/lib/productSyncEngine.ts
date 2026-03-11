import { supabase } from "@/integrations/supabase/client";
import type { ProductSyncCatalogDashboard, ProductSyncJob, SyncMode } from "../types/productSync";

interface StartResponse {
  success: boolean;
  job_id: string;
  mode: SyncMode;
  status: string;
  created_at: string;
  error?: string;
}

interface ProcessResponse {
  success: boolean;
  done: boolean;
  error?: string;
  job: ProductSyncJob;
}

interface DashboardResponse {
  success: boolean;
  dashboard?: ProductSyncCatalogDashboard;
  error?: string;
}

function headers(adminEmail: string): Record<string, string> {
  return {
    "x-admin-email": adminEmail,
  };
}

export async function startProductSync(mode: SyncMode, adminEmail: string): Promise<StartResponse> {
  const { data, error } = await supabase.functions.invoke("start-product-sync", {
    body: { mode },
    headers: headers(adminEmail),
  });

  if (error) {
    throw new Error(error.message || "Errore avvio sincronizzazione");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Errore avvio job");
  }

  return data as StartResponse;
}

export async function processProductSync(jobId: string, adminEmail: string): Promise<ProcessResponse> {
  const { data, error } = await supabase.functions.invoke("process-product-sync", {
    body: { job_id: jobId },
    headers: headers(adminEmail),
  });

  if (error) {
    throw new Error(error.message || "Errore processamento sincronizzazione");
  }

  if (!data?.job) {
    throw new Error(data?.error || "Risposta job non valida");
  }

  return data as ProcessResponse;
}

export async function fetchProductSyncDashboard(adminEmail: string, limit = 20): Promise<ProductSyncCatalogDashboard> {
  const { data, error } = await supabase.functions.invoke("get-product-sync-dashboard", {
    body: { limit },
    headers: headers(adminEmail),
  });

  if (error) {
    throw new Error(error.message || "Errore caricamento dashboard catalogo");
  }

  const typed = data as DashboardResponse;
  if (!typed?.success || !typed.dashboard) {
    throw new Error(typed?.error || "Risposta dashboard non valida");
  }

  return typed.dashboard;
}

export async function uploadSyncCsv(file: File, _adminEmail: string): Promise<string> {
  const storagePath = "shopify-ready.csv";

  // Upload directly to storage bucket (no edge function, avoids timeout)
  const { error } = await supabase.storage
    .from("sync")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: "text/csv",
    });

  if (error) {
    throw new Error(error.message || "Errore upload CSV");
  }

  return storagePath;
}
