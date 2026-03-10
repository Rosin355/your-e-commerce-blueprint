import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type { JobStatus, ProductSyncJobRow, SyncMode, SyncReportState } from "./product-sync-types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function asReport(value: unknown): SyncReportState {
  return (value || {}) as SyncReportState;
}

export async function createSyncJob(mode: SyncMode, initiatedBy: string): Promise<ProductSyncJobRow> {
  const client = getAdminClient();
  const initialReport: SyncReportState = {
    mode,
    cursor: null,
    hasNextPage: true,
    processed: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
    logs: [],
    startedAt: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("product_sync_jobs")
    .insert({
      status: "pending",
      mode,
      total_products: 0,
      updated_products: 0,
      unchanged_products: 0,
      failed_products: 0,
      report_json: initialReport,
      initiated_by: initiatedBy,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Impossibile creare job sync");
  }

  return {
    ...data,
    report_json: asReport(data.report_json),
  } as ProductSyncJobRow;
}

export async function getSyncJob(jobId: string): Promise<ProductSyncJobRow> {
  const client = getAdminClient();
  const { data, error } = await client.from("product_sync_jobs").select("*").eq("id", jobId).single();
  if (error || !data) {
    throw new Error(error?.message || `Job ${jobId} non trovato`);
  }

  return {
    ...data,
    report_json: asReport(data.report_json),
  } as ProductSyncJobRow;
}

export async function updateSyncJob(
  jobId: string,
  payload: {
    status?: JobStatus;
    total_products?: number;
    updated_products?: number;
    unchanged_products?: number;
    failed_products?: number;
    report_json?: SyncReportState;
  },
): Promise<ProductSyncJobRow> {
  const client = getAdminClient();
  const { data, error } = await client
    .from("product_sync_jobs")
    .update(payload)
    .eq("id", jobId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || `Impossibile aggiornare job ${jobId}`);
  }

  return {
    ...data,
    report_json: asReport(data.report_json),
  } as ProductSyncJobRow;
}
