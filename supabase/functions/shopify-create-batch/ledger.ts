import { serviceClient } from "../_shared/admin-v2-auth.ts";
import type { CreationLedger, LedgerRecord } from "./types.ts";

interface LedgerRow {
  batch_id: string;
  internal_sku: string;
  operation: LedgerRecord["operation"];
  request_key: string;
  payload_hash: string;
  shopify_product_id: string | null;
  shopify_variant_id: string | null;
  status: LedgerRecord["status"];
  result_json: Record<string, unknown> | null;
}

function fromRow(row: LedgerRow): LedgerRecord {
  return {
    batchId: row.batch_id,
    internalSku: row.internal_sku,
    operation: row.operation,
    requestKey: row.request_key,
    payloadHash: row.payload_hash,
    status: row.status,
    ...(row.shopify_product_id
      ? { shopifyProductId: row.shopify_product_id }
      : {}),
    ...(row.shopify_variant_id
      ? { shopifyVariantId: row.shopify_variant_id }
      : {}),
    result: row.result_json ?? {},
  };
}

function values(record: LedgerRecord) {
  return {
    batch_id: record.batchId,
    internal_sku: record.internalSku,
    operation: record.operation,
    request_key: record.requestKey,
    payload_hash: record.payloadHash,
    status: record.status,
    shopify_product_id: record.shopifyProductId ?? null,
    shopify_variant_id: record.shopifyVariantId ?? null,
    result_json: record.result ?? {},
  };
}

export class SupabaseCreationLedger implements CreationLedger {
  async get(requestKey: string): Promise<LedgerRecord | null> {
    const { data, error } = await serviceClient()
      .from("shopify_creation_ledger")
      .select(
        "batch_id,internal_sku,operation,request_key,payload_hash,shopify_product_id,shopify_variant_id,status,result_json",
      )
      .eq("request_key", requestKey)
      .maybeSingle();
    if (error) throw new Error("LEDGER_READ_FAILED");
    return data ? fromRow(data as LedgerRow) : null;
  }

  async reserve(record: LedgerRecord): Promise<
    | { kind: "RESERVED" }
    | { kind: "EXISTING"; record: LedgerRecord }
  > {
    const { error } = await serviceClient()
      .from("shopify_creation_ledger")
      .insert(values({ ...record, status: "RESERVED" }));
    if (!error) return { kind: "RESERVED" };
    if (error.code !== "23505") throw new Error("LEDGER_RESERVE_FAILED");
    const existing = await this.get(record.requestKey);
    if (!existing) throw new Error("LEDGER_RESERVE_RACE");
    return { kind: "EXISTING", record: existing };
  }

  async complete(record: LedgerRecord): Promise<void> {
    const { data, error } = await serviceClient()
      .from("shopify_creation_ledger")
      .update({
        status: record.status,
        shopify_product_id: record.shopifyProductId ?? null,
        shopify_variant_id: record.shopifyVariantId ?? null,
        result_json: record.result ?? {},
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("request_key", record.requestKey)
      .eq("payload_hash", record.payloadHash)
      .select("request_key")
      .maybeSingle();
    if (error || !data) throw new Error("LEDGER_COMPLETE_FAILED");
  }
}
