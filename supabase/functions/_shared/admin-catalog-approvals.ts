import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type { AuthContext } from "./admin-v2-types.ts";
import { payloadHash, writesEnabled } from "./admin-v2-commands.ts";
import {
  approvalValid,
  CATALOG_MUTATIONS,
  catalogAllowed,
  catalogCommand,
  NO_CATALOG_GRANT,
  requireCatalog,
} from "./admin-catalog-policy.ts";
import { demand, OperationalError, UUID } from "./admin-operational-core.ts";
import {
  getCurrentValue,
  getExactShopifyProductMapping,
  getFieldDefinition,
  getProduct,
} from "./admin-v2-queries-deferred.ts";
import { readExactShopifyTarget } from "./admin-v2-shopify-field-sync.ts";
import { resolveShopifyTarget } from "./admin-v2-field-policy.ts";

export async function loadCatalogGrant(db: SupabaseClient, auth: AuthContext) {
  const { data, error } = await db.from("admin_catalog_capabilities").select(
    "enabled,capabilities,field_keys",
  ).eq("user_id", auth.userId).maybeSingle();
  if (error && !["42P01", "PGRST205"].includes(error.code)) {
    throw new OperationalError(
      "FORBIDDEN",
      "Impossibile verificare le capability catalogo.",
    );
  }
  auth.catalogGrant = data
    ? {
      enabled: data.enabled === true,
      capabilities: data.capabilities,
      fieldKeys: data.field_keys,
    }
    : NO_CATALOG_GRANT;
}
function demandCommand(auth: AuthContext, p: Record<string, unknown>) {
  const capability = CATALOG_MUTATIONS[String(p.action)];
  requireCatalog(
    auth,
    capability,
    typeof p.fieldKey === "string" ? p.fieldKey : undefined,
  );
  demand(writesEnabled(), "Modifiche temporaneamente disabilitate.");
}
export async function catalogSnapshot(
  db: SupabaseClient,
  auth: AuthContext,
  p: Record<string, unknown>,
) {
  const action = String(p.action);
  if (action === "save_new_product") return { newDraft: true };
  if (["create_shopify_draft", "recover_shopify_draft"].includes(action)) {
    const { data, error } = await db.from("admin_product_operations").select(
      "id,actor,payload_hash,state,product_id,updated_at",
    ).eq("id", p.operationId).single();
    demand(
      !error && data && data.actor === auth.userId,
      "Bozza non disponibile per questo account.",
    );
    return {
      operation: action === "recover_shopify_draft"
        ? {
          id: data.id,
          actor: data.actor,
          payload_hash: data.payload_hash,
          product_id: data.product_id,
        }
        : data,
    };
  }
  demand(
    typeof p.productId === "string" && UUID.test(p.productId),
    "Prodotto non valido.",
  );
  const product = await getProduct(db, p.productId);
  demand(product && product.is_active, "Prodotto non disponibile.");
  if (typeof p.fieldKey === "string") {
    const value = await getCurrentValue(db, p.productId, p.fieldKey);
    demand(
      (value?.version ?? 0) === p.expectedVersion,
      "Il campo è cambiato: ricarica la scheda.",
    );
    // Journal keeps only the field being changed, never the complete catalogue/database.
    const internal = value
      ? {
        value_text: value.value_text,
        value_number: value.value_number,
        value_json: value.value_json,
        version: value.version,
      }
      : null;
    if (action !== "sync_field") return { internal };
    const def = await getFieldDefinition(db, p.fieldKey);
    const target = def && resolveShopifyTarget(def);
    const mapping = await getExactShopifyProductMapping(db, product.sku);
    demand(
      target && mapping?.shopify_product_id,
      "Campo o mapping Shopify non disponibile.",
    );
    const remote = await readExactShopifyTarget({
      productId: mapping.shopify_product_id,
      sku: product.sku,
      target,
    });
    const hash = await payloadHash({ value: remote.value });
    demand(
      p.expectedShopifyHash === hash,
      "Shopify è cambiato rispetto alla scheda: ricarica e confronta prima di sincronizzare.",
    );
    return {
      internal,
      remoteValue: remote.value,
      shopifyProductId: mapping.shopify_product_id,
    };
  }
  return { productVersion: product.updated_at };
}
export async function prepareCatalogApproval(
  db: SupabaseClient,
  auth: AuthContext,
  p: Record<string, unknown>,
  extraSnapshot?: () => Promise<unknown>,
) {
  demand(p.confirm === true, "Conferma esplicita mancante.");
  const command = catalogCommand(p.command);
  demandCommand(auth, command);
  const target = command.action === "save_new_product"
    ? "new-sku:" +
      String((command.draft as Record<string, unknown>)?.sku ?? "")
        .toLowerCase()
    : ["create_shopify_draft", "recover_shopify_draft"].includes(
        String(command.action),
      )
    ? (command.action === "recover_shopify_draft" ? "recovery:" : "") +
      String(command.operationId ?? "")
    : String(command.productId ?? "");
  demand(target.length > 0 && target.length <= 200, "Destinazione non valida.");
  const hash = await payloadHash(command);
  const { data: existing, error: readError } = await db.from(
    "admin_catalog_approvals",
  ).select("*").eq("actor", auth.userId).eq(
    "request_key",
    command.idempotencyKey,
  ).maybeSingle();
  demand(!readError, "Approvazioni non disponibili.");
  if (existing) {
    demand(
      approvalValid(existing, auth.userId, String(command.action), hash),
      "Richiesta già usata, scaduta o da riconciliare.",
    );
    return {
      ok: true,
      approvalId: existing.id,
      expiresAt: existing.expires_at,
      replayed: true,
    };
  }
  const snapshot = extraSnapshot
    ? await extraSnapshot()
    : await catalogSnapshot(db, auth, command);
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { data, error } = await db.from("admin_catalog_approvals").insert({
    actor: auth.userId,
    action: command.action,
    target,
    request_key: command.idempotencyKey,
    payload_hash: hash,
    command,
    target_snapshot: snapshot,
    expires_at: expires,
  }).select("id").single();
  demand(
    !error && data,
    "Conferma non registrata: riprovare con la stessa richiesta.",
  );
  return { ok: true, approvalId: data.id, expiresAt: expires };
}
export async function withCatalogApproval(
  db: SupabaseClient,
  auth: AuthContext,
  p: Record<string, unknown>,
  dispatch: () => Promise<Response>,
  extraSnapshot?: () => Promise<unknown>,
) {
  if (!auth.catalogGrant?.enabled || !CATALOG_MUTATIONS[String(p.action)]) {
    return dispatch();
  }
  const command = catalogCommand(p);
  demandCommand(auth, command);
  demand(
    typeof p.approvalId === "string" && UUID.test(p.approvalId),
    "Conferma dell’operazione mancante.",
  );
  const { data: approval, error } = await db.from("admin_catalog_approvals")
    .select("*").eq("id", p.approvalId).eq("actor", auth.userId).single();
  const hash = await payloadHash(command);
  if (
    error || !approval ||
    !approvalValid(approval, auth.userId, String(p.action), hash)
  ) {
    throw new OperationalError(
      "FORBIDDEN",
      "Conferma scaduta, diversa dai dati o non autorizzata.",
    );
  }
  if (approval.state === "COMPLETE") {
    return new Response(
      JSON.stringify({ ...approval.result, replayed: true }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
      },
    );
  }
  const snapshot = extraSnapshot
    ? await extraSnapshot()
    : await catalogSnapshot(db, auth, command);
  demand(
    await payloadHash({ snapshot }) ===
      await payloadHash({ snapshot: approval.target_snapshot }),
    "I dati sono cambiati dopo la conferma: ricarica la scheda.",
  );
  const { data: claimed, error: claimError } = await db.rpc(
    "admin_claim_catalog_approval",
    { p_id: approval.id, p_actor: auth.userId, p_hash: hash },
  );
  demand(
    !claimError && claimed === true,
    "Operazione già in corso: non inviare una seconda richiesta.",
  );
  auth.catalogApproval = {
    action: String(p.action),
    target: approval.target,
    before: approval.target_snapshot,
  };
  try {
    const response = await dispatch();
    const result = await response.clone().json();
    const { error: finishError } = await db.from("admin_catalog_approvals")
      .update({
        state: response.ok && result.ok !== false
          ? "COMPLETE"
          : "REVIEW_REQUIRED",
        result,
        finished_at: new Date().toISOString(),
      }).eq("id", approval.id).eq("state", "IN_FLIGHT");
    if (finishError) {
      throw new OperationalError(
        "NEEDS_RECONCILIATION",
        "Operazione da verificare: non ripetere la scrittura.",
      );
    }
    if (
      p.action === "recover_shopify_draft" && response.ok &&
      result?.result?.state === "VERIFIED_DRAFT"
    ) {
      const { error: reconcileError } = await db.from("admin_catalog_approvals")
        .update({
          state: "COMPLETE",
          result,
          finished_at: new Date().toISOString(),
        })
        .eq("actor", auth.userId).eq("action", "create_shopify_draft").eq(
          "target",
          String(p.operationId),
        ).eq("state", "REVIEW_REQUIRED");
      if (reconcileError) {
        throw new OperationalError(
          "NEEDS_RECONCILIATION",
          "Bozza recuperata: registro di conferma da verificare.",
        );
      }
    }
    return response;
  } catch (error) {
    await db.from("admin_catalog_approvals").update({
      state: "REVIEW_REQUIRED",
      finished_at: new Date().toISOString(),
    }).eq("id", approval.id).eq("state", "IN_FLIGHT");
    throw error;
  } finally {
    delete auth.catalogApproval;
  }
}
export function catalogMode(auth: AuthContext): "full" | "canary" {
  return catalogAllowed(auth, "edit") || catalogAllowed(auth, "drafts")
    ? "full"
    : "canary";
}
