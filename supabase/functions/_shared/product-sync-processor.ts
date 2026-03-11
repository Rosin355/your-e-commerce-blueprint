import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { parseShopifyReadyCsv } from "./csv-parser.ts";
import { upsertCsvCatalogRows } from "./product-catalog-repo.ts";
import { updateSyncJob } from "./job-repo.ts";
import type {
  CsvProductRow,
  ProductSyncJobRow,
  SyncLogEntry,
  SyncReportState,
} from "./product-sync-types.ts";

const STORAGE_BUCKET = Deno.env.get("SYNC_CSV_BUCKET") || "sync";
const STORAGE_PATH = Deno.env.get("SYNC_CSV_PATH") || "shopify-ready.csv";
const MAX_LOG_ENTRIES = 300;
const UPSERT_BATCH_SIZE = 200;

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
    throw new Error(`CSV non disponibile in Storage (${error?.message || "file non trovato"}). Carica prima un file CSV nel tab "Catalogo DB".`);
  }

  return await data.text();
}

/**
 * Background processing: downloads CSV, parses it, and upserts in batches.
 * Updates the job row progressively so the frontend can poll progress.
 */
export async function processInBackground(job: ProductSyncJobRow): Promise<void> {
  let report = normalizeReport(job.report_json, job.mode);

  try {
    // Step 1: Download and parse CSV
    report = appendLog(report, { level: "info", message: "Download CSV da Storage..." });
    await updateSyncJob(job.id, { status: "processing", report_json: report });

    const csvText = await loadCsvText();
    const csvRows = parseShopifyReadyCsv(csvText);
    const totalRows = csvRows.length;

    report = appendLog(report, { level: "info", message: `CSV parsato: ${totalRows} righe trovate` });
    await updateSyncJob(job.id, {
      total_products: totalRows,
      report_json: report,
    });

    if (totalRows === 0) {
      report = appendLog(report, { level: "warn", message: "Nessuna riga valida nel CSV" });
      report = { ...report, hasNextPage: false, finishedAt: nowIso() };
      await updateSyncJob(job.id, { status: "completed", report_json: report });
      return;
    }

    // Step 2: Upsert in batches
    let persisted = 0;
    let failed = 0;
    const totalBatches = Math.ceil(totalRows / UPSERT_BATCH_SIZE);

    for (let i = 0; i < totalRows; i += UPSERT_BATCH_SIZE) {
      const batchIndex = Math.floor(i / UPSERT_BATCH_SIZE) + 1;
      const batch = csvRows.slice(i, i + UPSERT_BATCH_SIZE);

      report = appendLog(report, {
        level: "info",
        message: `Batch ${batchIndex}/${totalBatches} — righe ${i + 1}-${Math.min(i + UPSERT_BATCH_SIZE, totalRows)}`,
      });

      try {
        const count = await upsertCsvCatalogRows(batch, STORAGE_PATH);
        persisted += count;
      } catch (batchError) {
        failed += batch.length;
        report = appendLog(report, {
          level: "error",
          message: `Errore batch ${batchIndex}/${totalBatches}: ${batchError instanceof Error ? batchError.message : String(batchError)}`,
        });
      }

      // Update progress after each batch
      report = {
        ...report,
        processed: persisted + failed,
        updated: persisted,
        failed,
        batchProgress: { current: batchIndex, total: totalBatches },
      };
      await updateSyncJob(job.id, {
        updated_products: persisted,
        failed_products: failed,
        total_products: totalRows,
        report_json: report,
      });
    }

    // Step 3: Finalize
    report = appendLog(report, {
      level: "info",
      message: `Catalogo CSV salvato su DB (${persisted} righe, ${failed} errori)`,
    });
    report = {
      ...report,
      cursor: null,
      hasNextPage: false,
      processed: totalRows,
      updated: persisted,
      unchanged: 0,
      failed,
      finishedAt: nowIso(),
      csvSnapshot: {
        persistedAt: nowIso(),
        persistedCount: persisted,
        sourceFile: STORAGE_PATH,
      },
    };

    await updateSyncJob(job.id, {
      status: "completed",
      total_products: totalRows,
      updated_products: persisted,
      unchanged_products: 0,
      failed_products: failed,
      report_json: report,
    });
  } catch (error) {
    report = appendLog(report, {
      level: "error",
      message: error instanceof Error ? error.message : String(error),
    });
    report = { ...report, finishedAt: nowIso(), hasNextPage: false };

    await updateSyncJob(job.id, {
      status: "failed",
      failed_products: (job.failed_products || 0) + 1,
      report_json: report,
    });
  }
}
