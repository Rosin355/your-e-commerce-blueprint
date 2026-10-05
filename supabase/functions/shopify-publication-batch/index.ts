import { authenticate, AuthError } from "../_shared/admin-v2-auth.ts";
import { canWriteCanary } from "../_shared/admin-v2-permissions.ts";
import { corsHeaders } from "../_shared/shopify-admin-client.ts";
import { assertApprovedDigest } from "../_shared/shopify-approved-manifest.ts";
import { executePublicationBatch } from "./executor.ts";
import { SupabasePublicationEvidenceLedger } from "./ledger.ts";
import { parsePublicationRequest } from "./request.ts";
import { AdminGraphqlPublicationClient } from "./shopify-client.ts";
import { loadApprovedPublicationManifest } from "./storage-manifest.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(code: string, message: string, status: number) {
  return json({ ok: false, error: { code, message } }, status);
}

export async function handlePublicationBatch(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail("METHOD_NOT_ALLOWED", "Usare POST", 405);
  }
  try {
    const auth = await authenticate(req);
    if (!canWriteCanary(auth.roles)) {
      return fail("FORBIDDEN", "Solo admin o tech_admin", 403);
    }
    const body = parsePublicationRequest(await req.json().catch(() => null));
    const approved = await loadApprovedPublicationManifest(body.batchId);
    assertApprovedDigest(
      body.mode,
      body.approvalDigest,
      approved.approvalDigest,
    );
    if (
      body.mode === "EXECUTE" &&
      (body.confirm !== "SHOPIFY_PUBLICATION_EXECUTE" ||
        Deno.env.get("SHOPIFY_PUBLICATION_EXECUTE_ENABLED") !== "true")
    ) {
      return fail(
        "EXECUTE_DISABLED",
        "Conferma e gate server-side richiesti",
        409,
      );
    }
    const report = await executePublicationBatch(
      new AdminGraphqlPublicationClient(),
      new SupabasePublicationEvidenceLedger(),
      approved.manifest,
      body.mode,
    );
    console.log(JSON.stringify({
      scope: "shopify-publication-batch",
      actor: `${auth.userId.slice(0, 8)}…`,
      batchId: body.batchId,
      mode: body.mode,
      summary: report.summary,
    }));
    return json({
      ...report,
      manifestSha256: approved.manifestSha256,
      approvalDigest: approved.approvalDigest,
    }, report.ok ? 200 : 207);
  } catch (error) {
    if (error instanceof AuthError) {
      return fail(
        error.code,
        error.message,
        error.code === "UNAUTHENTICATED" ? 401 : 403,
      );
    }
    const raw = error instanceof Error ? error.message : String(error);
    const code = raw.split(":", 1)[0] || "INTERNAL_ERROR";
    return fail(
      code,
      "Executor pubblicazione non disponibile; consultare i log",
      503,
    );
  }
}

if (import.meta.main) Deno.serve(handlePublicationBatch);
