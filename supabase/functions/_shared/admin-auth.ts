import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Validates the Authorization header JWT and checks for admin role.
 * Returns the authenticated user's email.
 * Throws on any auth failure.
 */
export async function assertAdminRequest(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.replace("Bearer ", "");

  // Verify the JWT and get the user
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Unauthorized: invalid or expired token");
  }

  // Check admin role using service role client
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: roleData, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !roleData) {
    throw new Error("Forbidden: admin role required");
  }

  return user.email || user.id;
}
