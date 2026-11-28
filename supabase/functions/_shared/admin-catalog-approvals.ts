import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type { AuthContext } from "./admin-v2-types.ts";
import { payloadHash, writesEnabled } from "./admin-v2-commands.ts";
import {
  approvalValid,
  botanicalReviewTarget,
  savedDraftReceipt,
  isEditorialList,
  editorialListSyncRevision,
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
import { readExactShopifyTarget, shopifySyncEnabled } from "./admin-v2-shopify-field-sync.ts";
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
  if (p.action === 'sync_field' && isEditorialList(p.fieldKey)) demand(shopifySyncEnabled(), 'Sincronizzazione Shopify temporaneamente disabilitata.');
  demand(writesEnabled(), "Modifiche temporaneamente disabilitate.");
}
export async function catalogSnapshot(
  db: SupabaseClient,
  auth: AuthContext,
  p: Record<string, unknown>,
) {
  const action = String(p.action);
  if (action === "save_new_product" && typeof p.operationId === 'string') {
    const { data, error } = await db.from('admin_product_operations').select('id,actor,state,payload_hash')
      .eq('id', p.operationId).eq('actor', auth.userId).single();
    demand(!error && data?.state === 'LOCAL_DRAFT' && data.payload_hash === p.expectedHash, 'Bozza cambiata: ricaricare prima di confermare.');
    return { operationId: data.id, payloadHash: data.payload_hash };
  }
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
    if (action !== "sync_field" && !(action === "update_field" && !value)) return { internal };
    const def = await getFieldDefinition(db, p.fieldKey);
    const target = def && resolveShopifyTarget(def);
    if (!target && action === 'update_field') return { internal };
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
      ...(action === 'sync_field' && isEditorialList(p.fieldKey) ? { syncRevision: editorialListSyncRevision(p.fieldKey), listContract: remote.editorialDefinition, compareDigest: remote.metafield?.compareDigest ?? null } : {}),
      internal,
      remoteValue: remote.value,
      shopifyProductId: mapping.shopify_product_id,
    };
  }
  return { productVersion: product.updated_at };
}
export function freshListSyncApproval(command: Record<string, unknown>, snapshot: Record<string, unknown> | null | undefined): boolean {
  return command.action !== 'sync_field' || !isEditorialList(command.fieldKey) || snapshot?.syncRevision === editorialListSyncRevision(command.fieldKey);
}

async function demandNoUnresolvedListSync(db: SupabaseClient, auth: AuthContext, command: Record<string, unknown>, target: string, exceptId?: string) {
  if (command.action !== 'sync_field' || !isEditorialList(command.fieldKey)) return;
  const { data: unresolved, error } = await db.from('admin_catalog_approvals').select('id,command')
    .eq('actor', auth.userId).eq('target', target).eq('action', 'sync_field').in('state', ['IN_FLIGHT', 'REVIEW_REQUIRED']);
  demand(!error && !(unresolved ?? []).some((row: {id: string; command: Record<string, unknown>}) => row.id !== exceptId && row.command?.fieldKey === command.fieldKey),
    'Sincronizzazione da verificare: non ripetere la scrittura.');
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
    ? typeof command.operationId === 'string' ? botanicalReviewTarget(command.operationId) : "new-sku:" +
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
      approvalValid(existing, auth.userId, String(command.action), hash) && freshListSyncApproval(command, existing.target_snapshot),
      "Richiesta già usata, scaduta o da riconciliare.",
    );
    return {
      ok: true,
      approvalId: existing.id,
      expiresAt: existing.expires_at,
      replayed: true,
    };
  }
  await demandNoUnresolvedListSync(db, auth, command, target);
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
    !approvalValid(approval, auth.userId, String(p.action), hash) ||
    !freshListSyncApproval(command, approval.target_snapshot)
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
  // A committed local save can be read back even after the original approval expires.
  // This path never claims another write or invokes the original save RPC.
  if (savedDraftReceipt(String(p.action), approval.state)) {
    if (p.operationId) demand(Date.parse(approval.expires_at) > Date.now(), 'Conferma botanica scaduta. Conferma nuovamente i valori salvati.');
    auth.catalogApproval = { action: 'save_new_product', target: approval.target, before: approval.target_snapshot, recoverSavedDraft: !p.operationId };
    try {
      const response = await dispatch();
      const result = await response.clone().json();
      if (response.ok && result.ok !== false) {
        const { error } = await db.from('admin_catalog_approvals').update({
          state: 'COMPLETE', result, finished_at: new Date().toISOString(),
        }).eq('id', approval.id).eq('actor', auth.userId).in('state', ['REVIEW_REQUIRED','IN_FLIGHT']);
        demand(!error, 'Bozza riletta. Riprovare il recupero della ricevuta.');
      }
      return response;
    } finally { delete auth.catalogApproval; }
  }
  await demandNoUnresolvedListSync(db, auth, command, approval.target, approval.id);
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
      result?.result?.state === "VERIFIED_DRAFT" && Array.isArray(result.metafieldVerification)
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
        ).in("state", ["IN_FLIGHT", "REVIEW_REQUIRED"]);
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
      ...(error instanceof OperationalError && error.details ? { result: { ok: false, error: {code: error.code, message: error.message, details: error.details} } } : {}),
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
