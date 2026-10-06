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
  productId: string;
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

export interface ShopifyProductCoreSnapshot {
  id: string;
  handle: string;
  status: string;
  title: string;
  descriptionHtml: string;
  vendor: string;
  tags: string[];
  seo: { title: string | null; description: string | null };
}

export interface ShopifyGraphQL {
  <T>(query: string, variables?: Record<string, unknown>): Promise<T>;
}

export interface ExactShopifyTargetRead {
  value: unknown;
  variant?: ShopifyVariantSnapshot;
  metafield?: ShopifyMetafieldSnapshot | null;
}

const PRODUCT_CORE_SNAPSHOT = `
query AdminV2ProductCoreSnapshot($id: ID!) {
  product(id: $id) {
    id handle status title descriptionHtml vendor tags
    seo { title description }
  }
}`;

const EXACT_METAFIELD_TARGET = `
query AdminV2ExactMetafieldTarget($id: ID!, $namespace: String!, $key: String!) {
  product(id: $id) {
    id
    metafield(namespace: $namespace, key: $key) {
      namespace key type value
    }
  }
}`;

const EXACT_VARIANT_TARGET = `
query AdminV2ExactVariantTarget($first: Int!, $after: String, $query: String!) {
  productVariants(first: $first, after: $after, query: $query) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id sku price compareAtPrice barcode
      product { id }
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

export async function readProductCoreSnapshot(
  shopifyProductId: string,
  graphql: ShopifyGraphQL = shopifyAdminGraphQL,
): Promise<ShopifyProductCoreSnapshot> {
  const id = toProductGid(shopifyProductId);
  const data = await graphql<{ product: ShopifyProductCoreSnapshot | null }>(
    PRODUCT_CORE_SNAPSHOT,
    { id },
  );
  if (!data.product) {
    throw new ShopifyFieldSyncError("BLOCK_SYNC", "Prodotto Shopify non trovato.");
  }
  return data.product;
}

function escapeShopifySearchValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export async function readExactVariantTarget(
  shopifyProductId: string,
  sku: string,
  graphql: ShopifyGraphQL = shopifyAdminGraphQL,
): Promise<ShopifyVariantSnapshot> {
  const productId = toProductGid(shopifyProductId);
  const numericProductId = productId.slice("gid://shopify/Product/".length);
  const exactSku = sku.trim();
  if (!exactSku) {
    throw new ShopifyFieldSyncError(
      "BLOCK_SYNC",
      "Variante Shopify non identificata in modo univoco tramite SKU.",
    );
  }

  const matches: ShopifyVariantSnapshot[] = [];
  let after: string | null = null;
  let pages = 0;
  do {
    pages += 1;
    const data: {
      productVariants: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: Array<Omit<ShopifyVariantSnapshot, "productId"> & { product: { id: string } }>;
      };
    } = await graphql(EXACT_VARIANT_TARGET, {
      first: 100,
      after,
      query: `product_id:${numericProductId} AND sku:"${escapeShopifySearchValue(exactSku)}"`,
    });
    for (const node of data.productVariants?.nodes ?? []) {
      if (node.sku === exactSku && node.product?.id === productId) {
        matches.push({
          id: node.id,
          productId: node.product.id,
          sku: node.sku,
          price: node.price,
          compareAtPrice: node.compareAtPrice,
          barcode: node.barcode,
        });
      }
    }
    if (matches.length > 1) break;
    if (!data.productVariants?.pageInfo.hasNextPage) break;
    after = data.productVariants.pageInfo.endCursor;
    if (!after || pages >= 250) {
      throw new ShopifyFieldSyncError(
        "BLOCK_SYNC",
        "Ricerca variante Shopify non conclusiva; sincronizzazione bloccata.",
      );
    }
  } while (true);

  if (matches.length !== 1) {
    throw new ShopifyFieldSyncError(
      "BLOCK_SYNC",
      matches.length === 0
        ? "Nessuna variante Shopify corrisponde esattamente allo SKU richiesto."
        : "Più varianti Shopify corrispondono allo stesso SKU; sincronizzazione bloccata.",
    );
  }
  return matches[0];
}

export async function readExactMetafieldTarget(
  shopifyProductId: string,
  target: ShopifyFieldTarget,
  graphql: ShopifyGraphQL = shopifyAdminGraphQL,
): Promise<ShopifyMetafieldSnapshot | null> {
  if (target.kind !== "metafield") {
    throw new ShopifyFieldSyncError("BLOCK_SYNC", "Target metafield non valido.");
  }
  const id = toProductGid(shopifyProductId);
  const data = await graphql<{
    product: null | { id: string; metafield: ShopifyMetafieldSnapshot | null };
  }>(EXACT_METAFIELD_TARGET, {
    id,
    namespace: target.namespace,
    key: target.key,
  });
  if (!data.product) {
    throw new ShopifyFieldSyncError("BLOCK_SYNC", "Prodotto Shopify non trovato.");
  }
  return data.product.metafield;
}

export function readProductCoreTargetValue(
  snapshot: ShopifyProductCoreSnapshot,
  target: ShopifyFieldTarget,
): unknown {
  if (target.kind === "product") return snapshot[target.field];
  if (target.kind === "seo") return snapshot.seo?.[target.field] ?? null;
  throw new ShopifyFieldSyncError("BLOCK_SYNC", "Il target non è un campo prodotto core.");
}

export async function readExactShopifyTarget(input: {
  productId: string;
  sku: string;
  target: ShopifyFieldTarget;
  graphql?: ShopifyGraphQL;
}): Promise<ExactShopifyTargetRead> {
  const graphql = input.graphql ?? shopifyAdminGraphQL;
  if (input.target.kind === "product" || input.target.kind === "seo") {
    const core = await readProductCoreSnapshot(input.productId, graphql);
    return { value: readProductCoreTargetValue(core, input.target) };
  }
  if (input.target.kind === "variant") {
    const variant = await readExactVariantTarget(input.productId, input.sku, graphql);
    return { value: variant[input.target.field], variant };
  }
  const metafield = await readExactMetafieldTarget(input.productId, input.target, graphql);
  return { value: metafield?.value ?? null, metafield };
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
  target: ShopifyFieldTarget;
  value: string | string[];
  resolvedTarget?: ExactShopifyTargetRead;
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
    const variant = input.resolvedTarget?.variant;
    if (!variant || variant.productId !== productId) {
      throw new ShopifyFieldSyncError(
        "BLOCK_SYNC",
        "Variante Shopify non identificata in modo univoco tramite SKU.",
      );
    }
    return {
      operation: "productVariantsBulkUpdate",
      variables: {
        productId,
        variants: [{ id: variant.id, [input.target.field]: input.value }],
      },
    };
  }
  const target = input.target;
  return {
    operation: "metafieldsSet",
    variables: {
      metafields: [{
        ownerId: productId,
        namespace: target.namespace,
        key: target.key,
        type: input.resolvedTarget?.metafield?.type ?? target.valueType,
        value: input.value,
      }],
    },
  };
}

export async function executeShopifyWritePlan(
  plan: ShopifyWritePlan,
  graphql: ShopifyGraphQL = shopifyAdminGraphQL,
): Promise<void> {
  if (plan.operation === "productUpdate") {
    const data = await graphql<{
      productUpdate: { userErrors: Array<{ message: string }> };
    }>(PRODUCT_FIELD_UPDATE, plan.variables);
    const error = userErrorMessage(data.productUpdate?.userErrors);
    if (error) throw new ShopifyFieldSyncError("SHOPIFY_WRITE_FAILED", error);
    return;
  }
  if (plan.operation === "productVariantsBulkUpdate") {
    const data = await graphql<{
      productVariantsBulkUpdate: { userErrors: Array<{ message: string }> };
    }>(VARIANT_FIELD_UPDATE, plan.variables);
    const error = userErrorMessage(data.productVariantsBulkUpdate?.userErrors);
    if (error) throw new ShopifyFieldSyncError("SHOPIFY_WRITE_FAILED", error);
    return;
  }
  const data = await graphql<{
    metafieldsSet: { userErrors: Array<{ message: string }> };
  }>(METAFIELD_UPDATE, plan.variables);
  const error = userErrorMessage(data.metafieldsSet?.userErrors);
  if (error) throw new ShopifyFieldSyncError("SHOPIFY_WRITE_FAILED", error);
}

/**
 * Esegue la sequenza read/compare/write/read usando sempre lo stesso target
 * deterministico. La funzione è separata dal persistence layer per rendere
 * verificabile che anche la lettura post-write sia esatta.
 */
export async function performVerifiedShopifyFieldWrite(input: {
  productId: string;
  sku: string;
  target: ShopifyFieldTarget;
  expected: string | string[];
  previousVerifiedAt: string | null | undefined;
  previousVerifiedValue: unknown;
  graphql?: ShopifyGraphQL;
}): Promise<{ verifiedValue: unknown; writePerformed: boolean }> {
  const graphql = input.graphql ?? shopifyAdminGraphQL;
  const before = await readExactShopifyTarget({
    productId: input.productId,
    sku: input.sku,
    target: input.target,
    graphql,
  });

  // Riconcilia un retry dopo timeout/verifica interrotta: se Shopify espone già
  // il valore approvato non ripetiamo la mutation e registriamo la verifica.
  if (sameShopifyValue(input.target, before.value, input.expected)) {
    return { verifiedValue: before.value, writePerformed: false };
  }

  if (
    input.previousVerifiedAt &&
    !sameShopifyValue(input.target, before.value, input.previousVerifiedValue)
  ) {
    throw new ShopifyFieldSyncError(
      "STATE_DRIFT",
      "Il valore Shopify è cambiato dopo l’ultima verifica.",
    );
  }

  const plan = buildShopifyWritePlan({
    productId: input.productId,
    target: input.target,
    value: input.expected,
    resolvedTarget: before,
  });
  await executeShopifyWritePlan(plan, graphql);

  const after = await readExactShopifyTarget({
    productId: input.productId,
    sku: input.sku,
    target: input.target,
    graphql,
  });
  if (!sameShopifyValue(input.target, after.value, input.expected)) {
    throw new ShopifyFieldSyncError(
      "SYNC_VERIFY_FAILED",
      "Shopify non restituisce il valore appena scritto.",
    );
  }
  return { verifiedValue: after.value, writePerformed: true };
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
  const result = await performVerifiedShopifyFieldWrite({
    productId: input.shopifyProductId,
    sku: input.sku,
    target,
    expected,
    previousVerifiedAt: input.row.shopify_verified_at,
    previousVerifiedValue: input.row.shopify_verified_value,
  });
  return await markSyncResult(input.db, {
    ...input.command,
    success: true,
    verifiedValue: result.verifiedValue,
  });
}

export function shopifySyncEnabled(): boolean {
  return (Deno.env.get("PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED") ?? "false")
    .toLowerCase() === "true";
}
