import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { assertAdminRequest } from "../_shared/admin-auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createSyncJob } from "../_shared/job-repo.ts";
import type { SyncMode } from "../_shared/product-sync-types.ts";

function normalizeMode(value: unknown): SyncMode {
  const mode = String(value || "sync").trim().toLowerCase();
  if (mode === "ai_content" || mode === "ai_images" || mode === "integrity") {
    return mode;
  }
  return "sync";
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const adminEmail = assertAdminRequest(request);
    const payload = await request.json().catch(() => ({}));
    const mode = normalizeMode(payload?.mode);

    const job = await createSyncJob(mode, adminEmail);

    return jsonResponse({
      success: true,
      job_id: job.id,
      mode: job.mode,
      status: job.status,
      created_at: job.created_at,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      400,
    );
  }
});
