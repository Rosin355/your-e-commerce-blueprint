// F5 — Admin Product API (Online Garden).
// Nessuna chiamata Shopify, nessuna AI, nessuna pubblicazione, nessun import.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authenticate, AuthError, serviceClient } from "./auth.ts";
import { authorizeAction, isCommandAction, isKnownAction } from "./permissions.ts";
import {
  getCurrentValue,
  getCurrentValues,
  getFieldDefinition,
  getFieldDefinitions,
  getProduct,
  getProductHistory,
  getSourceBaseline,
  getDashboardStats,
  listProducts,
} from "./queries.ts";
import { executeCommand, writesEnabled } from "./commands.ts";
import { isFieldEditable, validateCommand } from "./validation.ts";
import {
  apiError,
  HTTP_BY_CODE,
  redactedLog,
  serializeProductSummary,
  serializeSections,
} from "./serializers.ts";
import type { ApiErrorCode, CommandAction } from "./types.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(code: ApiErrorCode, message: string, details?: Record<string, unknown>): Response {
  const { body, status } = apiError(code, message, details);
  return json(body, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("VALIDATION_ERROR", "Metodo non supportato");

  let action = "unknown";
  let actorId: string | null = null;

  try {
    const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload || typeof payload !== "object") {
      return fail("VALIDATION_ERROR", "Payload non valido");
    }
    action = String(payload.action ?? "");
    if (!isKnownAction(action)) return fail("VALIDATION_ERROR", "Azione non riconosciuta");

    const auth = await authenticate(req);
    actorId = auth.userId;
    const authz = authorizeAction(action, auth.roles);
    if (!authz.allowed) return fail("FORBIDDEN", authz.reason ?? "Accesso negato");

    const db = serviceClient();

    // ---------------- READ ----------------
    if (action === "get_admin_context") {
      return json({
        ok: true,
        roles: auth.roles,
        writesEnabled: writesEnabled(),
        canWrite: false,
        readOnlyReason:
          "Le modifiche saranno abilitate dopo il completamento dei test di sicurezza.",
      });
    }

    if (action === "get_dashboard_stats") {
      return json({ ok: true, stats: await getDashboardStats(db), writesEnabled: writesEnabled() });
    }

    if (action === "get_field_definitions") {
      return json({ ok: true, definitions: await getFieldDefinitions(db) });
    }

    if (action === "list_products") {
      const { productRows, nextCursor } = await listProducts(db, {
        search: typeof payload.search === "string" ? payload.search : undefined,
        sku: typeof payload.sku === "string" ? payload.sku : undefined,
        gtin: typeof payload.gtin === "string" ? payload.gtin : undefined,
        entityType: payload.entityType as never,
        reviewRequired: payload.reviewRequired === true,
        publishBlocked: payload.publishBlocked === true,
        cursor: typeof payload.cursor === "string" ? payload.cursor : null,
        pageSize: typeof payload.pageSize === "number" ? payload.pageSize : undefined,
      });
      const ids = productRows.map((p: { id: string }) => p.id);
      const values = await getCurrentValues(db, ids);
      const parentIds = [
        ...new Set(
          productRows
            .map((p: { parent_product_id: string | null }) => p.parent_product_id)
            .filter((id): id is string => !!id),
        ),
      ];
      const parentSkuById = new Map<string, string>();
      if (parentIds.length) {
        const { data: parents } = await db.from("products").select("id,sku").in("id", parentIds);
        for (const parent of parents ?? []) parentSkuById.set(parent.id, parent.sku);
      }
      const items = productRows.map((p: never) => {
        const row = p as { id: string; parent_product_id: string | null };
        return serializeProductSummary(
          p,
          values.filter((v) => v.product_id === row.id),
          row.parent_product_id ? (parentSkuById.get(row.parent_product_id) ?? null) : null,
        );
      });
      return json({ ok: true, items, nextCursor, pageSize: items.length });
    }

    const productId = typeof payload.productId === "string" ? payload.productId : "";
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (action === "get_product" || action === "get_product_history" || action === "get_source_baseline") {
      if (!uuidRe.test(productId)) return fail("VALIDATION_ERROR", "productId non valido");
      const product = await getProduct(db, productId);
      if (!product) return fail("NOT_FOUND", "Prodotto inesistente");

      if (action === "get_product_history") {
        return json({ ok: true, history: await getProductHistory(db, productId) });
      }
      if (action === "get_source_baseline") {
        return json({ ok: true, baseline: await getSourceBaseline(db, productId) });
      }

      const [defs, values, snapshot, history] = await Promise.all([
        getFieldDefinitions(db),
        getCurrentValues(db, [productId]),
        getSourceBaseline(db, productId),
        getProductHistory(db, productId, 20),
      ]);
      const baseline = (snapshot?.normalized ?? {}) as Record<string, unknown>;
      return json({
        ok: true,
        product: {
          productId: product.id,
          sku: product.sku,
          entityType: product.entity_type,
          parentProductId: product.parent_product_id,
          parentSku: product.parent_product_id
            ? ((await getProduct(db, product.parent_product_id))?.sku ?? null)
            : null,
          isActive: product.is_active,
          updatedAt: product.updated_at,
        },
        sections: serializeSections(defs, values, baseline),
        history,
      });
    }

    // ------- validate + command (stessa validazione) -------
    const fieldKey = typeof payload.fieldKey === "string" ? payload.fieldKey : "";
    if (!uuidRe.test(productId)) return fail("VALIDATION_ERROR", "productId non valido");
    if (!fieldKey) return fail("VALIDATION_ERROR", "fieldKey mancante");

    const def = await getFieldDefinition(db, fieldKey);
    if (!def) return fail("NOT_FOUND", "Field key non registrata");

    const editable = isFieldEditable(def);
    if (!editable.ok) {
      if (action === "validate_field_update") {
        return json({ ok: false, valid: false, code: editable.code, message: editable.message, currentVersion: null });
      }
      return fail("FIELD_NOT_EDITABLE", editable.message ?? "Campo non modificabile");
    }

    const row = await getCurrentValue(db, productId, fieldKey);
    if (!row) return fail("NOT_FOUND", "Valore corrente inesistente per questo campo");

    const targetAction: CommandAction =
      action === "validate_field_update"
        ? ((payload.targetAction as CommandAction) ?? "update_field")
        : (action as CommandAction);

    const check = validateCommand(targetAction, def, row, payload.value, {
      confirm: payload.confirm === true,
      expectedVersion: typeof payload.expectedVersion === "number" ? payload.expectedVersion : undefined,
    });

    if (action === "validate_field_update") {
      return json({
        ok: check.ok,
        valid: check.ok,
        code: check.code ?? "VALID",
        message: check.message ?? null,
        currentVersion: row.version,
      });
    }

    if (!check.ok) {
      if (check.code === "NO_CHANGE") {
        return json({ ok: true, code: "NO_CHANGE", version: row.version }, HTTP_BY_CODE.NO_CHANGE);
      }
      return fail(check.code ?? "VALIDATION_ERROR", check.message ?? "Validazione fallita");
    }

    if (row.version !== payload.expectedVersion) {
      return fail("VERSION_CONFLICT", "Il valore è stato modificato da un altro utente", {
        currentVersion: row.version,
      });
    }

    const idempotencyKey = typeof payload.idempotencyKey === "string" ? payload.idempotencyKey : "";
    if (idempotencyKey.length < 8) return fail("VALIDATION_ERROR", "idempotencyKey mancante");

    if (!writesEnabled()) {
      console.log(redactedLog(action, actorId, "WRITES_DISABLED"));
      return fail("WRITES_DISABLED", "Scritture disabilitate su questo ambiente");
    }

    const result = await executeCommand(db, {
      actor: auth.userId,
      action: targetAction,
      productId,
      fieldKey,
      value: targetAction === "clear_field" ? { confirm: "true" } : payload.value,
      expectedVersion: payload.expectedVersion as number,
      idempotencyKey,
    });

    if (result?.ok === false) {
      const code = (result.code as ApiErrorCode) ?? "INTERNAL_ERROR";
      return fail(code, String(result.message ?? "Operazione rifiutata"), {
        currentVersion: result.currentVersion as number | undefined,
      });
    }

    console.log(redactedLog(action, actorId, String(result?.code ?? "APPLIED")));
    return json({ ok: true, result });
  } catch (err) {
    if (err instanceof AuthError) return fail(err.code, err.message);
    console.error(redactedLog(action, actorId, "INTERNAL_ERROR", { hint: (err as Error)?.name }));
    return fail("INTERNAL_ERROR", "Errore interno");
  }
});
