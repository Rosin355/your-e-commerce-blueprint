import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { shopifyAdminGraphQL } from "./shopify-admin-client.ts";
import { payloadHash } from "./admin-v2-commands.ts";
import type { CurrentValueRow, FieldDefinition } from "./admin-v2-types.ts";
import {
  resolveShopifyTarget,
  sameShopifyValue,
  serializeValueForShopify,
  type ShopifyFieldTarget,
} from "./admin-v2-field-policy.ts";
import { currentValueOf } from "./admin-v2-validation.ts";

export type SyncFailureCode =
  | "BLOCK_SYNC"
  | "STATE_DRIFT"
  | "SYNC_VERIFY_FAILED"
  | "SHOPIFY_WRITE_FAILED";

export class ShopifyFieldSyncError extends Error {
  constructor(readonly code: SyncFailureCode, message: string) {
    super(message);
    this.name = "ShopifyFieldSyncError";
  }
}

export interface ShopifyVariantSnapshot {
  id: string;
  sku: string;
  price: string;
  compareAtPrice: string | null;
  barcode: string | null;
}

export interface ShopifyMetafieldSnapshot {
  namespace: string;
  key: string;
  type: string;
  value: string;
}

export interface ShopifyLiveSnapshot {
  id: string;
  handle: string;
  status: string;
  title: string;
  descriptionHtml: string;
  vendor: string;
  tags: string[];
  seo: { title: string | null; description: string | null };
  variants: ShopifyVariantSnapshot[];
  metafields: ShopifyMetafieldSnapshot[];
}

const PRODUCT_FIELD_SNAPSHOT = `
query AdminV2ProductFieldSnapshot($id: ID!) {
  product(id: $id) {
    id handle status title descriptionHtml vendor tags
    seo { title description }
    variants(first: 100) { nodes { id sku price compareAtPrice barcode } }
    metafields(first: 100, namespace: "custom") {
      nodes { namespace key type value }
    }
  }
}`;

const PRODUCT_FIELD_UPDATE = `
mutation AdminV2ProductFieldUpdate($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product { id }
    userErrors { field message }
  }
}`;

const VARIANT_FIELD_UPDATE = `
mutation AdminV2VariantFieldUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id }
    userErrors { field message }
  }
}`;

const METAFIELD_UPDATE = `
mutation AdminV2MetafieldUpdate($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { namespace key value type }
    userErrors { field message code }
  }
}`;

export function toProductGid(id: string): string {
  const trimmed = id.trim();
  if (/^gid:\/\/shopify\/Product\/\d+$/.test(trimmed)) return trimmed;
  if (/^\d+$/.test(trimmed)) return `gid://shopify/Product/${trimmed}`;
  throw new ShopifyFieldSyncError("BLOCK_SYNC", "ID prodotto Shopify non valido.");
}

function userErrorMessage(
  errors: Array<{ message?: string }> | null | undefined,
): string | null {
  const messages = (errors ?? []).map((entry) => entry.message?.trim()).filter(Boolean);
  return messages.length ? messages.join(" | ") : null;
}

export async function readShopifyProductSnapshot(
  shopifyProductId: string,
): Promise<ShopifyLiveSnapshot> {
  const id = toProductGid(shopifyProductId);
  const data = await shopifyAdminGraphQL<{
    product: null | Omit<ShopifyLiveSnapshot, "variants" | "metafields"> & {
      variants: { nodes: ShopifyVariantSnapshot[] };
      metafields: { nodes: ShopifyMetafieldSnapshot[] };
    };
  }>(PRODUCT_FIELD_SNAPSHOT, { id });
  if (!data.product) {
    throw new ShopifyFieldSyncError("BLOCK_SYNC", "Prodotto Shopify non trovato.");
  }
  return {
    ...data.product,
    variants: data.product.variants.nodes,
    metafields: data.product.metafields.nodes,
  };
}

function exactVariant(snapshot: ShopifyLiveSnapshot, sku: string): ShopifyVariantSnapshot {
  const matches = snapshot.variants.filter((variant) => variant.sku === sku);
  if (matches.length !== 1) {
    throw new ShopifyFieldSyncError(
      "BLOCK_SYNC",
      "Variante Shopify non identificata in modo univoco tramite SKU.",
    );
  }
  return matches[0];
}

export function readShopifyTargetValue(
  snapshot: ShopifyLiveSnapshot,
  sku: string,
  target: ShopifyFieldTarget,
): unknown {
  if (target.kind === "product") return snapshot[target.field];
  if (target.kind === "seo") return snapshot.seo?.[target.field] ?? null;
  if (target.kind === "variant") return exactVariant(snapshot, sku)[target.field];
  return snapshot.metafields.find(
    (item) => item.namespace === target.namespace && item.key === target.key,
  )?.value ?? null;
}

export type ShopifyWritePlan =
  | { operation: "productUpdate"; variables: { product: Record<string, unknown> } }
  | {
    operation: "productVariantsBulkUpdate";
    variables: { productId: string; variants: Array<Record<string, unknown>> };
  }
  | { operation: "metafieldsSet"; variables: { metafields: Array<Record<string, unknown>> } };

/** Costruisce una mutation a campo singolo: nessun attributo non correlato viene incluso. */
export function buildShopifyWritePlan(input: {
  productId: string;
  sku: string;
  target: ShopifyFieldTarget;
  value: string | string[];
  snapshot: ShopifyLiveSnapshot;
}): ShopifyWritePlan {
  const productId = toProductGid(input.productId);
  if (input.target.kind === "product") {
    return {
      operation: "productUpdate",
      variables: { product: { id: productId, [input.target.field]: input.value } },
    };
  }
  if (input.target.kind === "seo") {
    return {
      operation: "productUpdate",
      variables: {
        product: { id: productId, seo: { [input.target.field]: input.value } },
      },
    };
  }
  if (input.target.kind === "variant") {
    const variant = exactVariant(input.snapshot, input.sku);
    return {
      operation: "productVariantsBulkUpdate",
      variables: {
        productId,
        variants: [{ id: variant.id, [input.target.field]: input.value }],
      },
    };
  }
  const target = input.target;
  const existing = input.snapshot.metafields.find(
    (item) => item.namespace === target.namespace && item.key === target.key,
  );
  return {
    operation: "metafieldsSet",
    variables: {
      metafields: [{
        ownerId: productId,
        namespace: target.namespace,
        key: target.key,
        type: existing?.type ?? target.valueType,
        value: input.value,
      }],
    },
  };
}

export async function executeShopifyWritePlan(plan: ShopifyWritePlan): Promise<void> {
  if (plan.operation === "productUpdate") {
    const data = await shopifyAdminGraphQL<{
      productUpdate: { userErrors: Array<{ message: string }> };
    }>(PRODUCT_FIELD_UPDATE, plan.variables);
    const error = userErrorMessage(data.productUpdate?.userErrors);
    if (error) throw new ShopifyFieldSyncError("SHOPIFY_WRITE_FAILED", error);
    return;
  }
  if (plan.operation === "productVariantsBulkUpdate") {
    const data = await shopifyAdminGraphQL<{
      productVariantsBulkUpdate: { userErrors: Array<{ message: string }> };
    }>(VARIANT_FIELD_UPDATE, plan.variables);
    const error = userErrorMessage(data.productVariantsBulkUpdate?.userErrors);
    if (error) throw new ShopifyFieldSyncError("SHOPIFY_WRITE_FAILED", error);
    return;
  }
  const data = await shopifyAdminGraphQL<{
    metafieldsSet: { userErrors: Array<{ message: string }> };
  }>(METAFIELD_UPDATE, plan.variables);
  const error = userErrorMessage(data.metafieldsSet?.userErrors);
  if (error) throw new ShopifyFieldSyncError("SHOPIFY_WRITE_FAILED", error);
}

export interface SyncFieldInput {
  actor: string;
  productId: string;
  fieldKey: string;
  expectedVersion: number;
  idempotencyKey: string;
}

function syncPayload(input: SyncFieldInput): Record<string, unknown> {
  return {
    action: "sync_field",
    productId: input.productId,
    fieldKey: input.fieldKey,
    expectedVersion: input.expectedVersion,
  };
}

export async function lookupSyncReplay(
  db: SupabaseClient,
  input: SyncFieldInput,
): Promise<Record<string, unknown> | null> {
  const hash = await payloadHash(syncPayload(input));
  const { data, error } = await db
    .from("product_admin_command_log")
    .select("payload_hash,result_json")
    .eq("actor", input.actor)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.payload_hash !== hash) {
    return { ok: false, code: "IDEMPOTENCY_CONFLICT" };
  }
  return { ...(data.result_json as Record<string, unknown>), replayed: true };
}

export async function markSyncResult(
  db: SupabaseClient,
  input: SyncFieldInput & {
    success: boolean;
    verifiedValue?: unknown;
    errorCode?: SyncFailureCode;
    errorMessage?: string;
  },
): Promise<Record<string, unknown>> {
  const hash = await payloadHash(syncPayload(input));
  const { data, error } = await db.rpc("admin_complete_product_field_sync", {
    p_actor: input.actor,
    p_product_id: input.productId,
    p_field_key: input.fieldKey,
    p_expected_version: input.expectedVersion,
    p_idempotency_key: input.idempotencyKey,
    p_payload_hash: hash,
    p_success: input.success,
    p_verified_value: input.verifiedValue ?? null,
    p_error_code: input.errorCode ?? null,
    p_error_message: input.errorMessage ?? null,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function syncFieldToShopify(input: {
  db: SupabaseClient;
  command: SyncFieldInput;
  definition: FieldDefinition;
  row: CurrentValueRow;
  sku: string;
  shopifyProductId: string;
}): Promise<Record<string, unknown>> {
  const target = resolveShopifyTarget(input.definition);
  if (!target) {
    throw new ShopifyFieldSyncError("BLOCK_SYNC", "Campo non sincronizzabile.");
  }
  const expected = serializeValueForShopify(
    input.definition,
    currentValueOf(input.row),
  );
  const before = await readShopifyProductSnapshot(input.shopifyProductId);
  const liveBefore = readShopifyTargetValue(before, input.sku, target);

  // Riconcilia un retry dopo timeout/verifica interrotta: se Shopify espone già
  // il valore approvato non ripetiamo la mutation e registriamo la verifica.
  if (sameShopifyValue(target, liveBefore, expected)) {
    return await markSyncResult(input.db, {
      ...input.command,
      success: true,
      verifiedValue: liveBefore,
    });
  }

  if (
    input.row.shopify_verified_at &&
    !sameShopifyValue(target, liveBefore, input.row.shopify_verified_value)
  ) {
    throw new ShopifyFieldSyncError(
      "STATE_DRIFT",
      "Il valore Shopify è cambiato dopo l’ultima verifica.",
    );
  }

  const plan = buildShopifyWritePlan({
    productId: input.shopifyProductId,
    sku: input.sku,
    target,
    value: expected,
    snapshot: before,
  });
  await executeShopifyWritePlan(plan);

  const after = await readShopifyProductSnapshot(input.shopifyProductId);
  const verified = readShopifyTargetValue(after, input.sku, target);
  if (!sameShopifyValue(target, verified, expected)) {
    throw new ShopifyFieldSyncError(
      "SYNC_VERIFY_FAILED",
      "Shopify non restituisce il valore appena scritto.",
    );
  }
  return await markSyncResult(input.db, {
    ...input.command,
    success: true,
    verifiedValue: verified,
  });
}

export function shopifySyncEnabled(): boolean {
  return (Deno.env.get("PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED") ?? "false")
    .toLowerCase() === "true";
}
