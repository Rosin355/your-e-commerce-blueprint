import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { parseShopifyReadyCsv } from "./csv-parser.ts";
import { upsertCsvCatalogRows } from "./product-catalog-repo.ts";
import { updateSyncJob } from "./job-repo.ts";
import type {
  ProductSyncJobRow,
  SyncLogEntry,
  SyncReportState,
} from "./product-sync-types.ts";

const STORAGE_BUCKET = Deno.env.get("SYNC_CSV_BUCKET") || "sync";
const STORAGE_PATH = Deno.env.get("SYNC_CSV_PATH") || "shopify-ready.csv";
const UPSERT_BATCH_SIZE = 200;
const MAX_LOG_ENTRIES = 300;

function nowIso(): string {
  return new Date().toISOString();
}

function appendLog(report: SyncReportState, entry: Omit<SyncLogEntry, "timestamp">): SyncReportState {
  const logs = [...(report.logs || []), { ...entry, timestamp: nowIso() }].slice(-MAX_LOG_ENTRIES);
  return { ...report, logs };
}

function normalizeReport(report: SyncReportState | null | undefined, mode: ProductSyncJobRow["mode"]): SyncReportState {
  return {
    mode,
    cursor: report?.cursor || null,
    hasNextPage: typeof report?.hasNextPage === "boolean" ? report.hasNextPage : true,
    processed: Number(report?.processed || 0),
    updated: Number(report?.updated || 0),
    unchanged: Number(report?.unchanged || 0),
    failed: Number(report?.failed || 0),
    logs: Array.isArray(report?.logs) ? report.logs : [],
    startedAt: report?.startedAt || nowIso(),
    finishedAt: report?.finishedAt,
    integrity: report?.integrity,
    batchOffset: Number(report?.batchOffset || 0),
  };
}

function getStorageClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancante");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadCsvText(): Promise<string> {
  const client = getStorageClient();
  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .download(STORAGE_PATH);

  if (error || !data) {
    throw new Error(`CSV non disponibile in Storage (${error?.message || "file non trovato"}). Carica prima un file CSV.`);
  }

  return await data.text();
}

/**
 * Incremental processing: each call processes ONE batch.
 * Returns the updated job. The caller (client) should keep calling
 * until done=true.
 */
export async function processOneBatch(job: ProductSyncJobRow): Promise<{ done: boolean; job: ProductSyncJobRow }> {
  let report = normalizeReport(job.report_json, job.mode);
  const batchOffset = report.batchOffset || 0;

  try {
    // Step 1: Download and parse CSV
    report = appendLog(report, { level: "info", message: `Download e parsing CSV (offset ${batchOffset})...` });
    await updateSyncJob(job.id, { status: "processing", report_json: report });

    const csvText = await loadCsvText();
    const csvRows = parseShopifyReadyCsv(csvText);
    const totalRows = csvRows.length;

    if (totalRows === 0) {
      report = appendLog(report, { level: "warn", message: "Nessuna riga valida nel CSV" });
      report = { ...report, hasNextPage: false, finishedAt: nowIso() };
      const updated = await updateSyncJob(job.id, { status: "completed", report_json: report });
      return { done: true, job: updated };
    }

    // Update total count
    await updateSyncJob(job.id, { total_products: totalRows });

    // If we've already processed everything
    if (batchOffset >= totalRows) {
      report = appendLog(report, {
        level: "info",
        message: `Catalogo CSV salvato su DB (${report.updated} righe, ${report.failed} errori)`,
      });
      report = {
        ...report,
        cursor: null,
        hasNextPage: false,
        processed: totalRows,
        finishedAt: nowIso(),
        csvSnapshot: {
          persistedAt: nowIso(),
          persistedCount: report.updated,
          sourceFile: STORAGE_PATH,
        },
      };
      const updated = await updateSyncJob(job.id, {
        status: "completed",
        total_products: totalRows,
        updated_products: report.updated,
        unchanged_products: 0,
        failed_products: report.failed,
        report_json: report,
      });
      return { done: true, job: updated };
    }

    // Process current batch
    const batch = csvRows.slice(batchOffset, batchOffset + UPSERT_BATCH_SIZE);
    const totalBatches = Math.ceil(totalRows / UPSERT_BATCH_SIZE);
    const currentBatch = Math.floor(batchOffset / UPSERT_BATCH_SIZE) + 1;

    report = appendLog(report, {
      level: "info",
      message: `Batch ${currentBatch}/${totalBatches} — righe ${batchOffset + 1}-${Math.min(batchOffset + UPSERT_BATCH_SIZE, totalRows)}`,
    });

    let batchPersisted = 0;
    let batchFailed = 0;

    try {
      const count = await upsertCsvCatalogRows(batch, STORAGE_PATH);
      batchPersisted = count;
    } catch (batchError) {
      batchFailed = batch.length;
      report = appendLog(report, {
        level: "error",
        message: `Errore batch ${currentBatch}: ${batchError instanceof Error ? batchError.message : String(batchError)}`,
      });
    }

    const newOffset = batchOffset + UPSERT_BATCH_SIZE;
    const allDone = newOffset >= totalRows;

    report = {
      ...report,
      processed: Math.min(newOffset, totalRows),
      updated: (report.updated || 0) + batchPersisted,
      failed: (report.failed || 0) + batchFailed,
      batchOffset: newOffset,
      batchProgress: { current: currentBatch, total: totalBatches },
    };

    if (allDone) {
      report = appendLog(report, {
        level: "info",
        message: `Catalogo CSV salvato su DB (${report.updated} righe, ${report.failed} errori)`,
      });
      report = {
        ...report,
        cursor: null,
        hasNextPage: false,
        finishedAt: nowIso(),
        csvSnapshot: {
          persistedAt: nowIso(),
          persistedCount: report.updated,
          sourceFile: STORAGE_PATH,
        },
      };
    }

    const updated = await updateSyncJob(job.id, {
      status: allDone ? "completed" : "processing",
      total_products: totalRows,
      updated_products: report.updated,
      unchanged_products: 0,
      failed_products: report.failed,
      report_json: report,
    });

    return { done: allDone, job: updated };
  } catch (error) {
    report = appendLog(report, {
      level: "error",
      message: error instanceof Error ? error.message : String(error),
    });
    report = { ...report, finishedAt: nowIso(), hasNextPage: false };

    const updated = await updateSyncJob(job.id, {
      status: "failed",
      failed_products: (job.failed_products || 0) + 1,
      report_json: report,
    });

    return { done: true, job: updated };
  }
}
