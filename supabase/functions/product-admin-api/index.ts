import { COMMERCE_ACTIONS, handleCatalogCommerce, commerceSnapshot } from '../_shared/admin-catalog-commerce.ts';
import { loadCatalogGrant, prepareCatalogApproval, withCatalogApproval, catalogMode } from '../_shared/admin-catalog-approvals.ts';
import { catalogAllowed, CATALOG_MUTATIONS } from '../_shared/admin-catalog-policy.ts';
import { handleCatalogMedia } from '../_shared/admin-catalog-media.ts';
import { payloadHash } from '../_shared/admin-v2-commands.ts';
import { OPERATION_ACTIONS, OperationalError } from '../_shared/admin-operational-core.ts';
import { requireCanaryScope } from '../_shared/admin-canary-policy.ts';
import { handleOperational, operationalFlags } from '../_shared/admin-operational-service.ts';
import { canaryScope, requireCanaryProduct } from '../_shared/admin-canary-service.ts';
// F5 — Admin Product API (Online Garden).
// Letture Shopify e sync esplicita a campo singolo; nessuna pubblicazione automatica.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
import { authenticate, AuthError, serviceClient } from "./auth.ts";
import {
  authorizeAction,
  canManageLockedManualValues,
  canSyncShopify,
  canWrite,
  canWriteCanary,
  isCommandAction,
  isKnownAction,
} from "./permissions.ts";
import {
  getCurrentValue,
  getCurrentValues,
  getFieldDefinition,
  getFieldDefinitions,
  getExactShopifyProductMapping,
  getProduct,
  getProductHistory,
  getSourceBaseline,
  getSourceSnapshotsByIds,
  getDashboardStats,
  listProducts,
} from "./queries.ts";
import {
  CANARY_ACTIONS,
  CANARY_FIELD_KEYS,
  executeCommand,
  isCanaryField,
  reconcileCommandReplay,
  writeMode,
  writesEnabled,
} from "./commands.ts";
import { isFieldEditable, validateCommand } from "./validation.ts";
import {
  apiError,
  HTTP_BY_CODE,
  redactedLog,
  serializeProductSummary,
  serializeSections,
} from "./serializers.ts";
import type { ApiErrorCode, CommandAction } from "./types.ts";
import type { CommandInput } from "./commands.ts";
import { appliesToEntity, type ProductEntityType } from "./capabilities.ts";
import {
  lookupSyncReplay,
  markSyncResult,
  readExactMetafieldTarget,
  readExactVariantTarget,
  readProductCoreSnapshot,
  readProductCoreTargetValue,
  ShopifyFieldSyncError,
  shopifySyncEnabled,
  syncFieldToShopify,
  type SyncFieldInput,
} from "./shopify-field-sync.ts";
import {
  deserializeValueForAdminDisplay,
  resolveShopifyTarget,
} from "./field-policy.ts";

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
    const auth = await authenticate(req);
    actorId = auth.userId;
    if (!auth.roles.some(role => ['admin','tech_admin','editor','publisher'].includes(role))) return fail('FORBIDDEN','Account non autorizzato al catalogo Admin.');
    if (Number(req.headers.get('content-length') ?? 0) > 7_300_000) return fail('VALIDATION_ERROR','Richiesta troppo grande.');
    const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload || typeof payload !== "object") {
      return fail("VALIDATION_ERROR", "Payload non valido");
    }
    action = String(payload.action ?? "");
    if (!COMMERCE_ACTIONS.includes(action) && !['prepare_catalog_approval','upload_catalog_image','get_catalog_media','list_catalog_media','get_catalog_prices','set_catalog_prices','preview_catalog_publication','publish_catalog_product'].includes(action) && !(OPERATION_ACTIONS as readonly string[]).includes(action) && !isKnownAction(action)) return fail("VALIDATION_ERROR", "Azione non riconosciuta");

    const deliveryDb = serviceClient();
    await loadCatalogGrant(deliveryDb, auth);
    if (auth.catalogGrant?.enabled && isKnownAction(action) && isCommandAction(action) && !CATALOG_MUTATIONS[action]) {
      return fail('FORBIDDEN', 'Azione fuori dalle capability catalogo autorizzate.');
    }
    if (action === 'prepare_catalog_approval') {
      const command=payload.command as Record<string,unknown>;
      const commerce=['set_catalog_prices','set_catalog_collections','publish_catalog_product'].includes(String(command?.action));
      return json(await prepareCatalogApproval(deliveryDb, auth, payload, commerce?()=>commerceSnapshot(deliveryDb,auth,command):undefined));
    }
    if (['upload_catalog_image','get_catalog_media','list_catalog_media'].includes(action)) return json(await handleCatalogMedia(deliveryDb, auth, payload));
    return await withCatalogApproval(deliveryDb, auth, payload, async () => {
    if (COMMERCE_ACTIONS.includes(action)) return json(await handleCatalogCommerce(deliveryDb,auth,payload));
    if ((OPERATION_ACTIONS as readonly string[]).includes(action)) {
      return json(await handleOperational(serviceClient(), auth, payload));
    }
    if (!isKnownAction(action)) return fail("VALIDATION_ERROR", "Azione non riconosciuta");
    const authz = authorizeAction(action, auth.roles);
    if (!authz.allowed && !(action === 'sync_field' && catalogAllowed(auth,'sync',String(payload.fieldKey)))) return fail("FORBIDDEN", authz.reason ?? "Accesso negato");

    const db = serviceClient();

    // ---------------- READ ----------------
    if (action === "get_admin_context") {
      const mode = catalogMode(auth);
      const enabled = writesEnabled();
      const ordinary = auth.catalogGrant?.enabled === true && auth.roles.includes("editor");
      const canaryRole = canWriteCanary(auth.roles);
      const scope = canaryScope();
      const canWriteNow = enabled && (mode === "full" ? catalogAllowed(auth,'edit') : (canaryRole && scope?.actorId === auth.userId));
      // I campi solo-manuali sono editabili a mano anche in canary: la lista arriva dal registro campi.
      let manualKeys: string[] = [];
      if (canWriteNow && mode === "canary") {
        const { data: manualDefs } = await db
          .from("product_field_definitions")
          .select("key")
          .eq("manual_only", true)
          .eq("editable", true)
          .eq("visible", true);
        manualKeys = (manualDefs ?? []).map((d: { key: string }) => d.key);
      }
      return json({
        ok: true,
        roles: auth.roles,
        writesEnabled: enabled,
        writeMode: mode,
        canWrite: canWriteNow,
        canSync: (catalogAllowed(auth,'sync') || canSyncShopify(auth.roles)) && shopifySyncEnabled() && enabled &&
          (mode === "full" || (canWriteNow && scope?.actions.includes("sync_field"))),
        backendVersion: "admin-delivery-20261110-r1",
        ordinaryCatalog: ordinary,
        canUploadImages: enabled && (catalogAllowed(auth,"images") || (scope?.actorId===auth.userId && scope.actions.includes("upload_catalog_image"))),
        canManagePrices: enabled && catalogAllowed(auth,"prices"),
        canPublish: enabled && catalogAllowed(auth,"publish"),
        canaryConfigured: scope !== null,
        operationalCapabilities: {
          drafts: operationalFlags().drafts,
          draftShopify: operationalFlags().shopify,
          categories: enabled && (!ordinary || catalogAllowed(auth,'categories')) && Deno.env.get('PRODUCT_ADMIN_CATEGORIES_ENABLED') === 'true',
          approvalConfigured: ordinary || operationalFlags().approval,
        },
        shopifySyncEnabled: shopifySyncEnabled(),
        allowedActions: canWriteNow ? (mode === "canary" ? CANARY_ACTIONS.filter((a) => scope?.actions.includes(a)) : CANARY_ACTIONS) : [],
        editableFieldKeys: ordinary ? auth.catalogGrant?.fieldKeys ?? [] :
          canWriteNow && mode === "canary"
            ? [...new Set([...CANARY_FIELD_KEYS, ...manualKeys])].filter(key => scope?.fieldKeys.includes(key))
            : [],
        canaryManualOnly: mode === "canary",
        readOnlyReason: !enabled
          ? "Le modifiche sono temporaneamente disabilitate."
          : canWriteNow
            ? ""
            : "Modifiche non autorizzate per questo account o perimetro di collaudo.",
      });
    }

    if (action === "get_dashboard_stats") {
      return json({ ok: true, stats: await getDashboardStats(db), writesEnabled: writesEnabled() });
    }

    if (action === "get_field_definitions") {
      return json({ ok: true, definitions: await getFieldDefinitions(db) });
    }

    if (action === "list_products") {
      const { productRows, nextCursor, currentValues } = await listProducts(db, {
        search: typeof payload.search === "string" ? payload.search : undefined,
        sku: typeof payload.sku === "string" ? payload.sku : undefined,
        gtin: typeof payload.gtin === "string" ? payload.gtin : undefined,
        entityType: payload.entityType as never,
        category: typeof payload.category === "string" ? payload.category : undefined,
        completeness: (payload.completeness === "complete" || payload.completeness === "incomplete") ? payload.completeness : undefined,
        origin: (payload.origin === "shopify" || payload.origin === "import") ? payload.origin : undefined,
        needsClassification: payload.needsClassification === true,
        reviewRequired: payload.reviewRequired === true,
        publishBlocked: payload.publishBlocked === true,
        cursor: typeof payload.cursor === "string" ? payload.cursor : null,
        pageSize: typeof payload.pageSize === "number" ? payload.pageSize : undefined,
      });
      const ids = productRows.map((p: { id: string }) => p.id);
      const values = currentValues;
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
      const items = productRows.map((p) => {
        const row = p as { id: string; parent_product_id: string | null };
        return serializeProductSummary(
          p as { id: string; sku: string; entity_type: string; parent_product_id: string | null; updated_at: string },
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

      const [defs, values, snapshot, history, shopifyMapping] = await Promise.all([
        getFieldDefinitions(db),
        getCurrentValues(db, [productId]),
        getSourceBaseline(db, productId),
        getProductHistory(db, productId, 20),
        getExactShopifyProductMapping(db, product.sku),
      ]);
      let shopifyLive: Record<string, unknown> = {
        available: false,
        mapped: Boolean(shopifyMapping?.shopify_product_id),
        productId: shopifyMapping?.shopify_product_id ?? null,
        syncStatus: shopifyMapping?.shopify_sync_status ?? "never",
        error: shopifyMapping?.shopify_product_id
          ? "Valore live temporaneamente non disponibile."
          : "Mappatura Shopify assente per questo SKU.",
      };
      const shopifyLiveValues = new Map<string, unknown>();
      const baselineHashes = new Map<string,string>();
      if (shopifyMapping?.shopify_product_id) {
        try {
          const live = await readProductCoreSnapshot(shopifyMapping.shopify_product_id);
          let exactVariant: Awaited<ReturnType<typeof readExactVariantTarget>> | null = null;
          try {
            exactVariant = await readExactVariantTarget(
              shopifyMapping.shopify_product_id,
              product.sku,
            );
          } catch {
            // Zero o più varianti: non mostrare mai il valore di un'altra variante.
          }

          for (const def of defs) {
            const target = resolveShopifyTarget(def);
            if (!target) continue;
            try {
              let liveValue: unknown;
              if (target.kind === "product" || target.kind === "seo") {
                liveValue = readProductCoreTargetValue(live, target);
              } else if (target.kind === "variant") {
                if (!exactVariant) continue;
                liveValue = exactVariant[target.field];
              } else {
                const metafield = await readExactMetafieldTarget(
                  shopifyMapping.shopify_product_id,
                  target,
                );
                liveValue = metafield?.value ?? null;
              }
              baselineHashes.set(def.key, await payloadHash({value:liveValue}));
          shopifyLiveValues.set(
                def.key,
                deserializeValueForAdminDisplay(def, liveValue),
              );
            } catch {
              // Un singolo target non disponibile non impedisce le altre letture esatte.
            }
          }
          shopifyLive = {
            available: true,
            mapped: true,
            productId: live.id,
            handle: live.handle,
            publicationStatus: live.status,
            price: exactVariant?.price ?? null,
            compareAtPrice: exactVariant?.compareAtPrice ?? null,
            mappingSource: exactVariant ? "SKU esatto" : "SKU non risolto in modo univoco",
            syncStatus: shopifyMapping.shopify_sync_status ?? "never",
            error: null,
          };
        } catch {
          // Il dettaglio resta utilizzabile anche senza credenziali/rete Shopify.
        }
      }
      let canaryAllowed = catalogMode(auth) === "full";
      if (writesEnabled() && catalogMode(auth) === "canary") {
        try {
          await requireCanaryProduct(db, auth, product, canaryScope()?.actions.find(a => ["update_field", "confirm_legacy_value", "reject_legacy_value", "sync_field"].includes(a)) ?? "update_field");
          canaryAllowed = true;
        } catch { /* Unknown/live/commercial product: capabilities stay closed. */ }
      }
      const linkedSnapshots = await getSourceSnapshotsByIds(
        db,
        productId,
        values
          .map((value) => value.source_snapshot_id)
          .filter((id): id is string => typeof id === "string"),
      );
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
        sections: serializeSections(
          defs,
          values,
          product.entity_type as ProductEntityType,
          {
            roles: auth.roles,
            writesEnabled: writesEnabled() && canaryAllowed,
            writeMode: catalogMode(auth),
            productActive: product.is_active,
            scopedActions: catalogMode(auth) === 'canary' ? canaryScope()?.actions ?? [] : [...(catalogAllowed(auth,'edit')?['update_field','confirm_legacy_value','reject_legacy_value']:[]),...(catalogAllowed(auth,'sync')?['sync_field']:[])],
            scopedFieldKeys: catalogMode(auth) === "canary" ? canaryScope()?.fieldKeys ?? [] : auth.catalogGrant?.fieldKeys,
            aiEnabled: false,
            syncAllowed: writesEnabled() && canaryAllowed && (catalogAllowed(auth,'sync') || canSyncShopify(auth.roles)) && shopifySyncEnabled(),
          },
          { fallbackSnapshot: snapshot, linkedSnapshots, shopifyLiveValues },
        ).map(section=>({...section,fields:section.fields.map(field=>({...field,shopifyBaselineHash:baselineHashes.get(field.key)??null}))})),
        shopifyLive,
        history,
      });
    }

    // ------- validate + command (stessa validazione) -------
    const fieldKey = typeof payload.fieldKey === "string" ? payload.fieldKey : "";
    if (!uuidRe.test(productId)) return fail("VALIDATION_ERROR", "productId non valido");
    if (!fieldKey) return fail("VALIDATION_ERROR", "fieldKey mancante");

    const def = await getFieldDefinition(db, fieldKey);
    if (!def) return fail("NOT_FOUND", "Field key non registrata");

    const commandProduct = await getProduct(db, productId);
    if (!commandProduct) return fail("NOT_FOUND", "Prodotto inesistente");
    // Resolve identity from the DB and re-read Shopify DRAFT before replay or any command.
    if (!auth.catalogGrant?.enabled && (action !== "validate_field_update" || writesEnabled())) {
      await requireCanaryProduct(db, auth, commandProduct,
        action === "validate_field_update" ? String(payload.targetAction ?? "update_field") : action, fieldKey);
    }
    if (action === "sync_field" && !writesEnabled()) return fail("WRITES_DISABLED", "Scritture disabilitate");
    if (!appliesToEntity(def.applies_to, commandProduct.entity_type as ProductEntityType)) {
      if (action === "validate_field_update") {
        return json({
          ok: false,
          valid: false,
          code: "FIELD_NOT_EDITABLE",
          message: "Campo non applicabile a questo tipo di prodotto",
          currentVersion: null,
        });
      }
      return fail("FIELD_NOT_EDITABLE", "Campo non applicabile a questo tipo di prodotto");
    }

    const editable = isFieldEditable(def);
    if (!editable.ok) {
      if (action === "validate_field_update") {
        return json({ ok: false, valid: false, code: editable.code, message: editable.message, currentVersion: null });
      }
      return fail("FIELD_NOT_EDITABLE", editable.message ?? "Campo non modificabile");
    }

    if (action === "sync_field") {
      const expectedVersion = typeof payload.expectedVersion === "number" ? payload.expectedVersion : -1;
      const idempotencyKey = typeof payload.idempotencyKey === "string" ? payload.idempotencyKey : "";
      if (idempotencyKey.length < 8 || expectedVersion < 0) {
        return fail("VALIDATION_ERROR", "expectedVersion o idempotencyKey mancante");
      }
      if (!shopifySyncEnabled()) {
        return fail("WRITES_DISABLED", "La sincronizzazione Shopify non è abilitata in questo ambiente");
      }
      const command: SyncFieldInput = {
        actor: auth.userId,
        productId,
        fieldKey,
        expectedVersion,
        idempotencyKey,
      };
      const replay = await lookupSyncReplay(db, command);
      if (replay) {
        if (replay.ok === false) {
          return fail((replay.code as ApiErrorCode) ?? "INTERNAL_ERROR", "Sincronizzazione già conclusa con errore");
        }
        return json({ ok: true, result: replay });
      }

      const row = await getCurrentValue(db, productId, fieldKey);
      if (!row) return fail("BLOCK_SYNC", "Valore Admin assente");
      if (row.version !== expectedVersion) {
        return fail("VERSION_CONFLICT", "Il valore è stato modificato da un altro utente", {
          currentVersion: row.version,
        });
      }
      const shopifyTarget = resolveShopifyTarget(def);
      if (!def.publishable || !shopifyTarget) {
        return fail("BLOCK_SYNC", "Campo non sincronizzabile");
      }
      if (commandProduct.entity_type === "variation" && shopifyTarget.kind !== "variant") {
        return fail(
          "BLOCK_SYNC",
          "Una variante può sincronizzare soltanto campi variante con SKU univoco",
        );
      }
      if (row.review_status !== "approved" || row.publish_blocked) {
        return fail("BLOCK_SYNC", "Il valore deve essere approvato prima della sincronizzazione");
      }

      const mapping = await getExactShopifyProductMapping(db, commandProduct.sku);
      if (!mapping?.shopify_product_id) {
        await markSyncResult(db, {
          ...command,
          success: false,
          errorCode: "BLOCK_SYNC",
          errorMessage: "Mappatura Shopify assente per questo SKU.",
        });
        return fail("BLOCK_SYNC", "Mappatura Shopify assente per questo SKU");
      }

      try {
        if (catalogMode(auth) === 'canary') requireCanaryScope(canaryScope(), auth.userId, auth.roles, 'sync_field', fieldKey);
        const result = await syncFieldToShopify({
          db,
          command,
          definition: def,
          row,
          sku: commandProduct.sku,
          shopifyProductId: mapping.shopify_product_id,
          expectedRemote: auth.catalogApproval?.before.remoteValue,
          hasExpectedRemote: Boolean(auth.catalogApproval),
        });
        if (result.ok === false) {
          const code = (result.code as ApiErrorCode) ?? "INTERNAL_ERROR";
          return fail(code, "Sincronizzazione non completata", {
            currentVersion: result.currentVersion as number | undefined,
          });
        }
        console.log(redactedLog(action, actorId, "SYNCED"));
        return json({ ok: true, result });
      } catch (error) {
        const syncError = error instanceof ShopifyFieldSyncError
          ? error
          : new ShopifyFieldSyncError("SHOPIFY_WRITE_FAILED", "Shopify non disponibile.");
        const recorded = await markSyncResult(db, {
          ...command,
          success: false,
          errorCode: syncError.code,
          errorMessage: syncError.message,
        });
        if (recorded.code === "VERSION_CONFLICT") {
          return fail("VERSION_CONFLICT", "Il valore è cambiato durante la sincronizzazione", {
            currentVersion: recorded.currentVersion as number | undefined,
          });
        }
        console.log(redactedLog(action, actorId, syncError.code));
        return fail(syncError.code, syncError.message);
      }
    }

    const targetAction: CommandAction =
      action === "validate_field_update"
        ? ((payload.targetAction as CommandAction) ?? "update_field")
        : (action as CommandAction);

    const allowLockedManual = def.manual_only && canManageLockedManualValues(auth.roles);
    const expectedVersion = typeof payload.expectedVersion === "number" ? payload.expectedVersion : undefined;
    const idempotencyKey = typeof payload.idempotencyKey === "string" ? payload.idempotencyKey : "";
    const commandValue = targetAction === "clear_field" ? { confirm: "true" } : payload.value;
    let commandInput: CommandInput | null = null;

    if (action !== "validate_field_update") {
      if (idempotencyKey.length < 8) return fail("VALIDATION_ERROR", "idempotencyKey mancante");
      if (typeof expectedVersion !== "number" || expectedVersion < 0) {
        return fail("VALIDATION_ERROR", "expectedVersion mancante");
      }

      // Un replay resta soggetto al ruolo corrente; non è però una nuova write.
      const mode = catalogMode(auth);
      if (mode === "canary") {
        if (!canWriteCanary(auth.roles)) {
          console.log(redactedLog(action, actorId, "FORBIDDEN_CANARY"));
          return fail("FORBIDDEN", "Modifiche riservate agli amministratori in fase di collaudo");
        }
      }

      commandInput = {
        actor: auth.userId,
        action: targetAction,
        productId,
        fieldKey,
        value: commandValue,
        expectedVersion,
        idempotencyKey,
      };
      const replay = await reconcileCommandReplay(db, commandInput);
      if (replay?.ok === false) {
        return fail("IDEMPOTENCY_CONFLICT", String(replay.message));
      }
      if (replay) {
        console.log(redactedLog(action, actorId, "APPLIED_REPLAY"));
        return json({ ok: true, result: replay });
      }

      if (!writesEnabled()) {
        console.log(redactedLog(action, actorId, "WRITES_DISABLED"));
        return fail("WRITES_DISABLED", "Scritture disabilitate su questo ambiente");
      }

      // F7 — una nuova command resta limitata ad azioni e campi canary.
      if (mode === "canary") {
        if (!CANARY_ACTIONS.includes(targetAction)) {
          return fail("FORBIDDEN", "Operazione non consentita in fase di collaudo");
        }
        if (!isCanaryField(def)) {
          return fail("FIELD_NOT_EDITABLE", "Campo non ancora abilitato alle modifiche");
        }
      }
    }

    const row = await getCurrentValue(db, productId, fieldKey);
    const currentVersion = row?.version ?? 0;

    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      if (action === "validate_field_update") {
        return json({
          ok: false,
          valid: false,
          code: "VERSION_CONFLICT",
          message: "Il valore è stato modificato da un altro utente",
          currentVersion,
        });
      }
      // La prima request può aver committato tra il lookup iniziale e questa
      // lettura. Un solo re-check read-only riconcilia quel replay senza
      // chiamare la RPC; se la key è nuova resta un vero VERSION_CONFLICT.
      const replay = await reconcileCommandReplay(db, commandInput!);
      if (replay?.ok === false) {
        return fail("IDEMPOTENCY_CONFLICT", String(replay.message));
      }
      if (replay) {
        console.log(redactedLog(action, actorId, "APPLIED_REPLAY_PRE_RPC"));
        return json({ ok: true, result: replay });
      }
      return fail("VERSION_CONFLICT", "Il valore è stato modificato da un altro utente", {
        currentVersion,
      });
    }

    const check = validateCommand(targetAction, def, row ?? undefined, payload.value, {
      confirm: payload.confirm === true,
      expectedVersion,
      allowLockedManual,
    });

    if (action === "validate_field_update") {
      return json({
        ok: check.ok,
        valid: check.ok,
        code: check.code ?? "VALID",
        message: check.message ?? null,
        currentVersion,
      });
    }

    if (!check.ok) {
      if (check.code === "NO_CHANGE") {
        return json({ ok: true, code: "NO_CHANGE", version: row?.version ?? 0 }, HTTP_BY_CODE.NO_CHANGE);
      }
      return fail(check.code ?? "VALIDATION_ERROR", check.message ?? "Validazione fallita");
    }

    if (catalogMode(auth) === 'canary') requireCanaryScope(canaryScope(), auth.userId, auth.roles, targetAction, fieldKey);
    const result = await executeCommand(db, commandInput!);

    if (result?.ok === false) {
      const code = (result.code as ApiErrorCode) ?? "INTERNAL_ERROR";
      return fail(code, String(result.message ?? "Operazione rifiutata"), {
        currentVersion: result.currentVersion as number | undefined,
      });
    }

    console.log(redactedLog(action, actorId, String(result?.code ?? "APPLIED")));
    return json({ ok: true, result });
    }, ['set_catalog_prices','set_catalog_collections','publish_catalog_product'].includes(action)?()=>commerceSnapshot(deliveryDb,auth,payload):undefined);
  } catch (err) {
    if (err instanceof OperationalError) {
      console.log(redactedLog(action, actorId, err.code));
      return json({ ok: false, error: { code: err.code, message: err.message } }, err.code === 'FORBIDDEN' ? 403 : 400);
    }
    if (err instanceof AuthError) return fail(err.code, err.message);
    console.error(redactedLog(action, actorId, "INTERNAL_ERROR", { hint: (err as Error)?.name }));
    return fail("INTERNAL_ERROR", "Errore interno");
  }
});
