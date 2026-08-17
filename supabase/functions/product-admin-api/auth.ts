// F5 — Autenticazione: JWT verificato realmente, ruoli caricati server-side.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type { AppRole, AuthContext } from "./types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN", message: string) {
    super(message);
  }
}

export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Verifica il bearer token con Supabase Auth e carica i ruoli dal database.
 * Nulla viene letto dal body: né email, né user id, né ruolo.
 */
export async function authenticate(req: Request): Promise<AuthContext> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new AuthError("UNAUTHENTICATED", "Token mancante");
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) throw new AuthError("UNAUTHENTICATED", "Token mancante");

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await anon.auth.getUser();
  if (error || !data?.user) throw new AuthError("UNAUTHENTICATED", "Token non valido o scaduto");

  const admin = serviceClient();
  const { data: roleRows, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);

  if (roleError) throw new AuthError("FORBIDDEN", "Impossibile determinare i permessi");

  const roles = (roleRows ?? []).map((r: { role: AppRole }) => r.role);
  return { userId: data.user.id, roles };
}
