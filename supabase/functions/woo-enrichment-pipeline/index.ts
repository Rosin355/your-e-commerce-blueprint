import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── CSV Parser ───

function stripBom(input: string): string {
  return input.replace(/^\uFEFF/, "");
}

function parseCsvText(csvText: string): string[][] {
  const text = stripBom(csvText);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") { field += ch; }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

function csvToObjects(csvText: string): Record<string, string>[] {
  const rows = parseCsvText(csvText);
  if (rows.length <= 1) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map((csvRow, idx) => {
    const obj: Record<string, string> = { __rowNumber: String(idx + 2) };
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = String(csvRow[i] ?? "");
    }
    return obj;
  });
}

// ─── Helpers ───

function safeString(v: unknown): string { return String(v ?? "").trim(); }

function pick(row: Record<string, string>, names: string[]): string {
  for (const n of names) {
    const v = row?.[n];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

/**
 * Count "parent" rows (simple + variable products, not variations).
 * This is the total_rows for job tracking.
 */
function countParentRows(rows: Record<string, string>[]): number {
  let count = 0;
  for (const row of rows) {
    const type = pick(row, ["Tipo", "Type"]).toLowerCase();
    if (!type || type === "simple" || type === "variable") count++;
  }
  return count;
}

// ─── Serve ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let csvText: string;
    let dryRun = false;
    let limit: number | undefined;
    let defaultVendor = "Online Garden";
    let useAi = true;
    let originalFileName = "upload.csv";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return new Response(JSON.stringify({ success: false, error: "File CSV mancante" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
        return new Response(JSON.stringify({ success: false, error: "Solo file CSV accettati" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (file.size > 50 * 1024 * 1024) {
        return new Response(JSON.stringify({ success: false, error: "File troppo grande (max 50MB)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      csvText = await file.text();
      originalFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
      dryRun = formData.get("dryRun") === "true";
      limit = formData.get("limit") ? Number(formData.get("limit")) : undefined;
      if (formData.get("defaultVendor")) defaultVendor = String(formData.get("defaultVendor"));
      useAi = formData.get("useAi") !== "false";
    } else {
      const body = await req.json();
      csvText = body.csvText;
      dryRun = body.dryRun === true;
      limit = body.limit;
      defaultVendor = body.defaultVendor || "Online Garden";
      useAi = body.useAi !== false;
      if (body.fileName) originalFileName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    }

    if (!csvText) {
      return new Response(JSON.stringify({ success: false, error: "CSV vuoto" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Quick validation: parse and count rows
    const allRows = csvToObjects(csvText);
    if (!allRows.length) {
      return new Response(JSON.stringify({ success: false, error: "CSV vuoto o non valido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalParentRows = countParentRows(allRows);
    console.log(`[Pipeline] Validated CSV: ${allRows.length} total rows, ${totalParentRows} parent products, dryRun=${dryRun}`);

    // ─── DRY RUN: process inline (max 5 rows preview) ───
    if (dryRun) {
      // Import the full processing logic inline for dry run only (small subset)
      const { runDryRunPreview } = await import("./dry-run-preview.ts");
      // We don't have a separate file, so we do a minimal inline dry run
      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        report: {
          processedRows: 0,
          createdRows: 0,
          skippedRows: 0,
          warningCount: 0,
          errorCount: 0,
          aiEnrichedCount: 0,
          fallbackCount: 0,
          dryRun: true,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          totalSourceRows: allRows.length,
        },
        totalParentRows,
        sampleRows: allRows.slice(0, 5).map(r => {
          const title = pick(r, ["Nome", "Name", "Title"]);
          const sku = pick(r, ["SKU"]);
          const price = pick(r, ["Prezzo di listino", "Regular price"]);
          const type = pick(r, ["Tipo", "Type"]);
          const cats = pick(r, ["Categorie", "Categories"]);
          const tags = pick(r, ["Tag", "Tags"]);
          return { Title: title, SKU: sku, Price: price, Type: type, Tags: tags, Status: "draft", "URL handle": "", "SEO title": "" };
        }),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── FULL RUN: Create async job ───
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Generate job ID first
    const jobId = crypto.randomUUID();

    // Upload CSV to storage
    const inputPath = `jobs/${jobId}/input.csv`;
    const { error: uploadError } = await supabase.storage
      .from("csv-pipeline")
      .upload(inputPath, new Blob([csvText], { type: "text/csv" }), { contentType: "text/csv" });

    if (uploadError) {
      console.error("[Pipeline] Upload error:", uploadError);
      return new Response(JSON.stringify({ success: false, error: `Errore upload: ${uploadError.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      use_ai: useAi,
      default_vendor: defaultVendor,
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
      totalSourceRows: allRows.length,
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
