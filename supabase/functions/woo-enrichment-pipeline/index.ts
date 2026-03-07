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
    const { jobId, inputPath, dryRun, useAi, limit, defaultVendor } = body;

    if (!jobId || !inputPath) {
      return new Response(JSON.stringify({ success: false, error: "jobId e inputPath richiesti" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // For dry run: download only first ~20KB to preview rows
    if (dryRun) {
      const { data: csvData, error: dlError } = await supabase.storage
        .from("csv-pipeline")
        .download(inputPath);

      if (dlError || !csvData) {
        return new Response(JSON.stringify({ success: false, error: "File non trovato in storage" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only read first chunk for preview
      const fullText = await csvData.text();
      const lines = fullText.split("\n");
      const totalSourceRows = lines.length - 1; // minus header

      // Count parent rows (simple + variable, not variation)
      let totalParentRows = 0;
      if (lines.length > 1) {
        const headers = parseHeaderLine(lines[0]);
        const typeIdx = headers.findIndex(h => h === "Tipo" || h === "Type");
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          if (typeIdx >= 0) {
            const type = extractFieldFromLine(lines[i], typeIdx).toLowerCase();
            if (!type || type === "simple" || type === "variable") totalParentRows++;
          } else {
            totalParentRows++;
          }
        }
      }

      // Simple preview of first 5 data rows
      const sampleRows: Record<string, string>[] = [];
      if (lines.length > 1) {
        const headers = parseHeaderLine(lines[0]);
        for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
          if (!lines[i].trim()) continue;
          const fields = parseHeaderLine(lines[i]);
          const row: Record<string, string> = {};
          const nameIdx = headers.findIndex(h => h === "Nome" || h === "Name" || h === "Title");
          const skuIdx = headers.findIndex(h => h === "SKU");
          const priceIdx = headers.findIndex(h => h === "Prezzo di listino" || h === "Regular price");
          const typeIdx2 = headers.findIndex(h => h === "Tipo" || h === "Type");
          const tagsIdx = headers.findIndex(h => h === "Tag" || h === "Tags");
          row.Title = nameIdx >= 0 ? fields[nameIdx] || "" : "";
          row.SKU = skuIdx >= 0 ? fields[skuIdx] || "" : "";
          row.Price = priceIdx >= 0 ? fields[priceIdx] || "" : "";
          row.Type = typeIdx2 >= 0 ? fields[typeIdx2] || "" : "";
          row.Tags = tagsIdx >= 0 ? fields[tagsIdx] || "" : "";
          row.Status = "draft";
          sampleRows.push(row);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        report: { totalSourceRows },
        totalParentRows,
        sampleRows,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Full run: create job record (do NOT parse the CSV here)
    // Count rows using a lightweight line counter
    const { data: csvData, error: dlError } = await supabase.storage
      .from("csv-pipeline")
      .download(inputPath);

    if (dlError || !csvData) {
      return new Response(JSON.stringify({ success: false, error: "File non trovato in storage" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullText = await csvData.text();
    const lines = fullText.split("\n");

    // Count parent rows
    let totalParentRows = 0;
    if (lines.length > 1) {
      const headers = parseHeaderLine(lines[0]);
      const typeIdx = headers.findIndex(h => h === "Tipo" || h === "Type");
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        if (typeIdx >= 0) {
          const type = extractFieldFromLine(lines[i], typeIdx).toLowerCase();
          if (!type || type === "simple" || type === "variable") totalParentRows++;
        } else {
          totalParentRows++;
        }
      }
    }

    // Create job record
    const { error: insertError } = await supabase.from("pipeline_jobs").insert({
      id: jobId,
      status: "pending",
      total_rows: totalParentRows,
      processed_rows: 0,
      created_rows: 0,
      skipped_rows: 0,
      warning_count: 0,
      error_count: 0,
      ai_enriched_count: 0,
      fallback_count: 0,
      input_file_path: inputPath,
      dry_run: false,
      use_ai: useAi !== false,
      default_vendor: defaultVendor || "Online Garden",
      row_limit: limit || null,
      warnings: [],
      errors: [],
      partial_rows: [],
    });

    if (insertError) {
      console.error("[Pipeline] Insert error:", insertError);
      return new Response(JSON.stringify({ success: false, error: `Errore creazione job: ${insertError.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Pipeline] Job created: ${jobId}, total_rows=${totalParentRows}`);

    return new Response(JSON.stringify({
      success: true,
      jobId,
      totalRows: totalParentRows,
      totalSourceRows: lines.length - 1,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[Pipeline] Error:", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Minimal CSV helpers (no full parsing, just header extraction) ───

function parseHeaderLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { fields.push(field.trim()); field = ""; }
      else if (ch !== "\r") { field += ch; }
    }
  }
  fields.push(field.trim());
  return fields;
}

function extractFieldFromLine(line: string, targetIdx: number): string {
  let field = "";
  let inQuotes = false;
  let idx = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else if (idx === targetIdx) { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") {
        if (idx === targetIdx) return field.trim();
        idx++;
        field = "";
      }
      else if (ch !== "\r" && idx === targetIdx) { field += ch; }
    }
  }
  return idx === targetIdx ? field.trim() : "";
}
