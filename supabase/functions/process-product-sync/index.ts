import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { assertAdminRequest } from "../_shared/admin-auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getSyncJob, updateSyncJob } from "../_shared/job-repo.ts";
import { processInBackground } from "../_shared/product-sync-processor.ts";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

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

    // If already done, just return current state
    if (job.status === "completed" || job.status === "failed") {
      return jsonResponse({ success: true, done: true, job });
    }

    // If already processing (background task running), just return current state for polling
    if (job.status === "processing") {
      return jsonResponse({ success: true, done: false, job });
    }

    // Start background processing (non-blocking)
    const marked = await updateSyncJob(jobId, { status: "processing" });

    EdgeRuntime.waitUntil(processInBackground(marked));

    // Return immediately - client will poll for progress
    return jsonResponse({ success: true, done: false, job: marked });
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
