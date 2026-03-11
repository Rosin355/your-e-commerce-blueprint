import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { assertAdminRequest } from "../_shared/admin-auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getSyncJob, updateSyncJob } from "../_shared/job-repo.ts";
import { upsertCsvCatalogRows } from "../_shared/product-catalog-repo.ts";
import type { CsvProductRow } from "../_shared/product-sync-types.ts";

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminEmail = assertAdminRequest(request);

    if (request.method === "GET") {
      const url = new URL(request.url);
      const jobId = String(url.searchParams.get("job_id") || "").trim();
      if (!jobId) return jsonResponse({ error: "job_id mancante" }, 400);

      const job = await getSyncJob(jobId);
      return jsonResponse({ success: true, adminEmail, job });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const body = await request.json().catch(() => ({}));
    const jobId = String(body?.job_id || "").trim();
    if (!jobId) {
      return jsonResponse({ error: "job_id mancante" }, 400);
    }

    const rows: CsvProductRow[] = body?.rows || [];
    const batchIndex: number = body?.batch_index ?? 0;
    const totalBatches: number = body?.total_batches ?? 1;
    const totalRows: number = body?.total_rows ?? rows.length;
    const sourceFile: string = body?.source_file || "shopify-ready.csv";

    const job = await getSyncJob(jobId);

    // If already done, just return current state
    if (job.status === "completed" || job.status === "failed") {
      return jsonResponse({ success: true, done: true, job });
    }

    // Mark as processing if pending
    if (job.status === "pending") {
      await updateSyncJob(jobId, { status: "processing", total_products: totalRows });
    }

    // Upsert this batch
    let persisted = 0;
    let failed = 0;
    const report = job.report_json || { mode: "sync", cursor: null, hasNextPage: true, processed: 0, updated: 0, unchanged: 0, failed: 0, logs: [], startedAt: new Date().toISOString() };
    const logs = Array.isArray(report.logs) ? [...report.logs] : [];

    logs.push({ level: "info", message: `Batch ${batchIndex + 1}/${totalBatches} — ${rows.length} righe`, timestamp: new Date().toISOString() });

    try {
      persisted = await upsertCsvCatalogRows(rows, sourceFile);
    } catch (err) {
      failed = rows.length;
      logs.push({ level: "error", message: `Errore batch ${batchIndex + 1}: ${err instanceof Error ? err.message : String(err)}`, timestamp: new Date().toISOString() });
    }

    // Keep only last 300 logs
    while (logs.length > 300) logs.shift();

    const prevUpdated = Number(report.updated || 0);
    const prevFailed = Number(report.failed || 0);
    const newUpdated = prevUpdated + persisted;
    const newFailed = prevFailed + failed;
    const isLastBatch = batchIndex + 1 >= totalBatches;

    if (isLastBatch) {
      logs.push({ level: "info", message: `Completato: ${newUpdated} righe salvate, ${newFailed} errori`, timestamp: new Date().toISOString() });
    }

    const updatedReport = {
      ...report,
      processed: Math.min((batchIndex + 1) * rows.length, totalRows),
      updated: newUpdated,
      failed: newFailed,
      logs,
      batchProgress: { current: batchIndex + 1, total: totalBatches },
      ...(isLastBatch ? {
        hasNextPage: false,
        finishedAt: new Date().toISOString(),
        csvSnapshot: { persistedAt: new Date().toISOString(), persistedCount: newUpdated, sourceFile },
      } : {}),
    };

    const updated = await updateSyncJob(jobId, {
      status: isLastBatch ? "completed" : "processing",
      total_products: totalRows,
      updated_products: newUpdated,
      unchanged_products: 0,
      failed_products: newFailed,
      report_json: updatedReport,
    });

    return jsonResponse({ success: true, done: isLastBatch, job: updated });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      401,
    );
  }
});
