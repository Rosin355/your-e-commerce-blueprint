import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { assertAdminRequest } from "../_shared/admin-auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getCatalogDashboard } from "../_shared/product-catalog-repo.ts";

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    assertAdminRequest(request);

    const url = new URL(request.url);
    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const limitParam = Number(body?.limit ?? url.searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 100)) : 20;

    const dashboard = await getCatalogDashboard(limit);
    return jsonResponse({ success: true, dashboard });
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
