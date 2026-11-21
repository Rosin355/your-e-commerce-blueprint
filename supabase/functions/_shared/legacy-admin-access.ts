import { assertAdminRequest } from "./admin-auth.ts";

/** Gate legacy privileged tools before parsing input or accessing any provider. */
export async function denyUnlessAdmin(request: Request, corsHeaders: Record<string, string>): Promise<Response | null> {
  try {
    await assertAdminRequest(request);
    return null;
  } catch {
    return new Response(JSON.stringify({ error: "Accesso amministratore richiesto" }), {
      status: request.headers.get("authorization")?.startsWith("Bearer ") ? 403 : 401,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
}