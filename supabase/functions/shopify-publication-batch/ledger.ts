import { serviceClient } from "../_shared/admin-v2-auth.ts";
import type {
  PublicationEvidence,
  PublicationEvidenceLedger,
} from "./types.ts";

interface EvidenceRow {
  batch_id: string;
  internal_sku: string;
  operation: "SET_ACTIVE";
  request_key: string;
  payload_hash: string;
  shopify_product_id: string;
  status: PublicationEvidence["status"];
  applied_at: string | null;
  verified_at: string | null;
}

const COLUMNS =
  "batch_id,internal_sku,operation,request_key,payload_hash,shopify_product_id,status,applied_at,verified_at";

function fromRow(row: EvidenceRow): PublicationEvidence {
  return {
    batchId: row.batch_id,
    parentSku: row.internal_sku,
    productId: row.shopify_product_id,
    operation: "SET_ACTIVE",
    requestKey: row.request_key,
    payloadHash: row.payload_hash,
    status: row.status,
    appliedAt: row.applied_at,
    verifiedAt: row.verified_at,
  };
}

export class SupabasePublicationEvidenceLedger
  implements PublicationEvidenceLedger {
  async find(batchId: string, parentSku: string) {
    const { data, error } = await serviceClient()
      .from("shopify_creation_ledger")
      .select(COLUMNS)
      .eq("batch_id", batchId)
      .eq("internal_sku", parentSku)
      .eq("operation", "SET_ACTIVE")
      .maybeSingle();
    if (error) throw new Error("LEDGER_READ_FAILED");
    return data ? fromRow(data as EvidenceRow) : null;
  }

  async reserve(evidence: PublicationEvidence) {
    const { error } = await serviceClient()
      .from("shopify_creation_ledger")
      .insert({
        batch_id: evidence.batchId,
        internal_sku: evidence.parentSku,
        operation: "SET_ACTIVE",
        request_key: evidence.requestKey,
        payload_hash: evidence.payloadHash,
        shopify_product_id: evidence.productId,
        status: "RESERVED",
      });
    if (!error) return { kind: "RESERVED" as const };
    if (error.code !== "23505") throw new Error("LEDGER_RESERVE_FAILED");
    const existing = await this.find(evidence.batchId, evidence.parentSku);
    if (!existing) throw new Error("LEDGER_RESERVE_RACE");
    return { kind: "EXISTING" as const, evidence: existing };
  }

  async markApplied(evidence: PublicationEvidence) {
    const appliedAt = new Date().toISOString();
    const { data, error } = await serviceClient()
      .from("shopify_creation_ledger")
      .update({
        status: "APPLIED",
        applied_at: appliedAt,
        updated_at: appliedAt,
      })
      .eq("request_key", evidence.requestKey)
      .eq("payload_hash", evidence.payloadHash)
      .eq("shopify_product_id", evidence.productId)
      .eq("operation", "SET_ACTIVE")
      .eq("status", "RESERVED")
      .select("request_key")
      .maybeSingle();
    if (error || !data) throw new Error("LEDGER_APPLY_FAILED");
  }

  async markVerified(evidence: PublicationEvidence) {
    const verifiedAt = new Date().toISOString();
    const { data, error } = await serviceClient()
      .from("shopify_creation_ledger")
      .update({
        status: "VERIFIED",
        verified_at: verifiedAt,
        updated_at: verifiedAt,
      })
      .eq("request_key", evidence.requestKey)
      .eq("payload_hash", evidence.payloadHash)
      .eq("shopify_product_id", evidence.productId)
      .eq("operation", "SET_ACTIVE")
      .in("status", ["APPLIED", "VERIFIED"])
      .select("request_key")
      .maybeSingle();
    if (error || !data) throw new Error("LEDGER_VERIFY_FAILED");
  }
}
