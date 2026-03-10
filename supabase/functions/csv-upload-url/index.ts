import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const bucket = body.bucket || "csv-pipeline";
    const allowedBuckets = ["csv-pipeline", "sync"];
    if (!allowedBuckets.includes(bucket)) {
      return new Response(JSON.stringify({ success: false, error: "Bucket non consentito" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let path: string;
    let jobId: string | undefined;

    if (bucket === "sync" && body.path) {
      path = String(body.path).replace(/[^a-zA-Z0-9._\-\/]/g, "_").slice(0, 200);
    } else {
      const safeName = (body.fileName || "upload.csv").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
      jobId = crypto.randomUUID();
      path = `jobs/${jobId}/input.csv`;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: true });

    if (error) {
      console.error("[UploadURL] Error:", error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      ...(jobId ? { jobId } : {}),
      uploadUrl: data.signedUrl,
      token: data.token,
      path,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[UploadURL] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Errore" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
