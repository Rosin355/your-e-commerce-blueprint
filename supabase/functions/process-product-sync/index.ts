import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { assertAdminRequest } from "../_shared/admin-auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getSyncJob, updateSyncJob } from "../_shared/job-repo.ts";
import { processSyncBatch } from "../_shared/product-sync-processor.ts";

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

    const job = await getSyncJob(jobId);
    if (job.status === "completed" || job.status === "failed") {
      return jsonResponse({ success: true, done: true, job });
    }

    const marked = await updateSyncJob(jobId, { status: "processing" });

    try {
      const { updatedJob, done } = await processSyncBatch(marked);
      const persisted = await updateSyncJob(jobId, updatedJob);
      return jsonResponse({ success: true, done, job: persisted });
    } catch (error) {
      const failedJob = await updateSyncJob(jobId, {
        status: "failed",
        failed_products: marked.failed_products + 1,
        report_json: {
          ...marked.report_json,
          failed: (marked.report_json?.failed || 0) + 1,
          logs: [
            ...(marked.report_json?.logs || []),
            {
              level: "error" as const,
              message: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            },
          ].slice(-300),
          finishedAt: new Date().toISOString(),
        },
      });

      return jsonResponse({
        success: false,
        done: true,
        error: error instanceof Error ? error.message : String(error),
        job: failedJob,
      }, 500);
    }
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
