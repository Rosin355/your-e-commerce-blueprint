import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { assertAdminRequest } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-email",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// 16 metafield keys we track for "metafields presenti"
const METAFIELD_KEYS = [
  "nome_botanico",
  "nome_comune",
  "short_intro",
  "promo_text",
  "key_features",
  "special_bullets",
  "care_info",
  "come_prendersene_cura",
  "conosci_meglio_la_tua_pianta",
  "difficolta_di_coltivazione",
  "origini_e_habitat",
  "periodo_di_fioritura",
  "periodo_di_messa_a_dimora",
  "periodo_di_raccolta",
  "periodo_ottimale_di_potatura",
  "titolo_sezione_faq",
];
// Soglia: almeno N metafield non vuoti per considerare il prodotto "metafield-completi"
const MIN_METAFIELDS_FILLED = 8;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let adminEmail: string;
  try {
    adminEmail = await assertAdminRequest(req);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unauthorized" }, 401);
  }

  let payload: { action?: string; data?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = payload.action;
  const data = payload.data ?? {};
  const db = admin();

  try {
    switch (action) {
      case "start": {
        const skus = Array.isArray(data.skus) ? (data.skus as string[]) : [];
        const items = Array.isArray(data.items)
          ? (data.items as Array<{ sku: string; handle?: string; title?: string }>)
          : skus.map((s) => ({ sku: s }));
        if (items.length === 0) return json({ error: "items vuoti" }, 400);
        const mode = String(data.mode || "generate");
        const notes = (data.notes as Record<string, unknown>) || {};

        const { data: run, error: runErr } = await db
          .from("product_enrichment_runs")
          .insert({
            initiated_by: adminEmail,
            status: "running",
            mode,
            total: items.length,
            done: 0,
            failed: 0,
            notes,
          })
          .select("*")
          .single();
        if (runErr || !run) throw new Error(runErr?.message || "Impossibile creare run");

        const rows = items.map((it) => ({
          run_id: run.id,
          sku: it.sku,
          handle: it.handle ?? null,
          title: it.title ?? null,
          status: "pending",
        }));
        const { error: itemsErr } = await db
          .from("product_enrichment_run_items")
          .insert(rows);
        if (itemsErr) throw new Error(itemsErr.message);

        return json({ runId: run.id, total: items.length });
      }

      case "update_item": {
        const runId = String(data.runId || "");
        const sku = String(data.sku || "");
        const status = String(data.status || "pending");
        const error_message = (data.error as string) || null;
        const metafields_report = data.metafieldsReport ?? null;
        if (!runId || !sku) return json({ error: "runId/sku mancanti" }, 400);

        const { error: upErr } = await db
          .from("product_enrichment_run_items")
          .update({ status, error_message, metafields_report })
          .eq("run_id", runId)
          .eq("sku", sku);
        if (upErr) throw new Error(upErr.message);

        // Recompute counters
        const { data: counts } = await db
          .from("product_enrichment_run_items")
          .select("status")
          .eq("run_id", runId);
        const done = (counts ?? []).filter((r: any) => r.status === "done").length;
        const failed = (counts ?? []).filter((r: any) => r.status === "error").length;
        await db
          .from("product_enrichment_runs")
          .update({ done, failed })
          .eq("id", runId);

        return json({ ok: true, done, failed });
      }

      case "finish": {
        const runId = String(data.runId || "");
        const status = String(data.status || "completed");
        if (!runId) return json({ error: "runId mancante" }, 400);
        const { error } = await db
          .from("product_enrichment_runs")
          .update({ status })
          .eq("id", runId);
        if (error) throw new Error(error.message);
        return json({ ok: true });
      }

      case "get_open_run": {
        const { data: run } = await db
          .from("product_enrichment_runs")
          .select("*")
          .eq("initiated_by", adminEmail)
          .in("status", ["running", "paused"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!run) return json({ run: null, items: [] });
        const { data: items } = await db
          .from("product_enrichment_run_items")
          .select("*")
          .eq("run_id", run.id)
          .order("updated_at", { ascending: true });
        return json({ run, items: items ?? [] });
      }

      case "get_run": {
        const runId = String(data.runId || "");
        if (!runId) return json({ error: "runId mancante" }, 400);
        const { data: run } = await db
          .from("product_enrichment_runs")
          .select("*")
          .eq("id", runId)
          .maybeSingle();
        const { data: items } = await db
          .from("product_enrichment_run_items")
          .select("*")
          .eq("run_id", runId)
          .order("updated_at", { ascending: true });
        return json({ run: run ?? null, items: items ?? [] });
      }

      case "get_catalog_status": {
        // Aggregato sul catalogo: legge product_sync_csv_products in pagine
        const totals = {
          total: 0,
          withImage: 0,
          withPriceAndImage: 0,
          aiEnriched: 0,
          seoComplete: 0,
          metafieldsComplete: 0,
        };
        const PAGE = 1000;
        let offset = 0;
        // Single count query for total
        const { count } = await db
          .from("product_sync_csv_products")
          .select("id", { count: "exact", head: true });
        totals.total = count ?? 0;

        while (true) {
          const { data: rows, error } = await db
            .from("product_sync_csv_products")
            .select("price,image_urls,seo_title,seo_description,ai_enriched_at,metafields")
            .range(offset, offset + PAGE - 1);
          if (error) throw new Error(error.message);
          if (!rows || rows.length === 0) break;
          for (const r of rows as any[]) {
            const hasImage = Array.isArray(r.image_urls) && r.image_urls.length > 0;
            const price = Number(r.price ?? 0);
            if (hasImage) totals.withImage++;
            if (hasImage && price > 0) totals.withPriceAndImage++;
            if (r.ai_enriched_at) totals.aiEnriched++;
            if ((r.seo_title || "").trim() && (r.seo_description || "").trim())
              totals.seoComplete++;
            const mf = (r.metafields || {}) as Record<string, unknown>;
            let filled = 0;
            for (const k of METAFIELD_KEYS) {
              const v = mf[k];
              if (v != null && String(v).trim() !== "") filled++;
            }
            if (filled >= MIN_METAFIELDS_FILLED) totals.metafieldsComplete++;
          }
          if (rows.length < PAGE) break;
          offset += PAGE;
        }

        return json({ totals, minMetafieldsFilled: MIN_METAFIELDS_FILLED });
      }

      default:
        return json({ error: `Azione sconosciuta: ${action}` }, 400);
    }
  } catch (e) {
    console.error("[enrichment-run] error:", e);
    return json({ error: e instanceof Error ? e.message : "Errore" }, 500);
  }
});
