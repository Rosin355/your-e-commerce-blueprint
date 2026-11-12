import { OperationalError, UUID } from "./admin-operational-core.ts";
import type { AuthContext } from "./admin-v2-types.ts";

export const CATALOG_CAPABILITIES = [
  "edit",
  "sync",
  "drafts",
  "images",
  "categories",
  "prices",
  "publish",
] as const;
export const CLIENT_FIELD_KEYS = [
  "title",
  "description",
  "short_description",
  "optimized_description",
  "seo_title",
  "seo_description",
  "nome_botanico",
  "nome_comune",
  "periodo_di_fioritura",
  "periodo_di_messa_a_dimora",
  "periodo_di_raccolta",
  "periodo_ottimale_di_potatura",
  "difficolta_di_coltivazione",
  "faq",
];
export interface CatalogGrant {
  enabled: boolean;
  capabilities: string[];
  fieldKeys: string[];
}
export const NO_CATALOG_GRANT: CatalogGrant = Object.freeze({
  enabled: false,
  capabilities: [],
  fieldKeys: [],
});
export function catalogAllowed(
  auth: AuthContext,
  capability: string,
  fieldKey?: string,
): boolean {
  const grant = auth.catalogGrant;
  return Boolean(
    grant?.enabled && auth.roles.includes("editor") &&
      grant.capabilities.includes(capability) &&
      (fieldKey === undefined ||
        (CLIENT_FIELD_KEYS.includes(fieldKey) &&
          grant.fieldKeys.includes(fieldKey))),
  );
}
export function requireCatalog(
  auth: AuthContext,
  capability: string,
  fieldKey?: string,
) {
  if (!catalogAllowed(auth, capability, fieldKey)) {
    throw new OperationalError(
      "FORBIDDEN",
      "Azione catalogo non autorizzata per questo account.",
    );
  }
}
export const CATALOG_MUTATIONS: Record<string, string> = {
  update_field: "edit",
  confirm_legacy_value: "edit",
  reject_legacy_value: "edit",
  sync_field: "sync",
  save_new_product: "drafts",
  create_shopify_draft: "drafts",
  recover_shopify_draft: "drafts",
  apply_categories: "categories",
  set_catalog_collections: "categories",
  set_catalog_prices: "prices",
  publish_catalog_product: "publish",
};
export function catalogCommand(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new OperationalError("VALIDATION_ERROR", "Comando non valido.");
  }
  const p = raw as Record<string, unknown>;
  const action = String(p.action);
  if (!CATALOG_MUTATIONS[action]) {
    throw new OperationalError(
      "FORBIDDEN",
      "Comando fuori dal catalogo consentito.",
    );
  }
  const keys = [
    "action",
    "productId",
    "fieldKey",
    "value",
    "expectedVersion",
    "idempotencyKey",
    "operationId",
    "draft",
    "categoryIds",
    "expectedHash",
    "prices",
    "expectedUpdatedAt",
    "logistics",
    "expectedShopifyHash",
    "collectionIds",
    "allowSoldOut",
  ];
  const result = Object.fromEntries(
    keys.filter((k) => Object.hasOwn(p, k)).map((k) => [k, p[k]]),
  );
  if (
    typeof result.idempotencyKey !== "string" ||
    !UUID.test(result.idempotencyKey)
  ) {
    throw new OperationalError(
      "VALIDATION_ERROR",
      "Identificativo richiesta non valido.",
    );
  }
  return result;
}
export function approvalValid(
  row: {
    actor: string;
    action: string;
    payload_hash: string;
    expires_at: string;
    state: string;
  },
  actor: string,
  action: string,
  hash: string,
  now = Date.now(),
) {
  return row.actor === actor && row.action === action &&
    row.payload_hash === hash &&
    (["PENDING", "COMPLETE"].includes(row.state) ||
      (action === "recover_shopify_draft" &&
        row.state === "REVIEW_REQUIRED")) &&
    Date.parse(row.expires_at) > now;
}

/** Accept actual image bytes, not MIME/file extension alone. SVG and active content are rejected. */
export function validateImage(bytes: Uint8Array, declared: string) {
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) {
    throw new OperationalError("VALIDATION_ERROR", "Immagine: massimo 5 MB.");
  }
  let mime = "";
  if (
    bytes.length > 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
  ) {
    mime = "image/png";
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16), height = view.getUint32(20);
    if (
      !width || !height || width * height > 25_000_000 || width > 10000 ||
      height > 10000
    ) {
      throw new OperationalError(
        "VALIDATION_ERROR",
        "Dimensioni immagine eccessive o non valide.",
      );
    }
  } else if (
    bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  ) {
    mime = "image/jpeg";
    let found = false;
    for (let offset = 2; offset + 9 < bytes.length;) {
      if (bytes[offset] !== 255) break;
      const marker = bytes[offset + 1];
      if (marker === 217 || marker === 218) break;
      const length = bytes[offset + 2] * 256 + bytes[offset + 3];
      if (length < 2) break;
      if (
        [192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207]
          .includes(marker)
      ) {
        const height = bytes[offset + 5] * 256 + bytes[offset + 6],
          width = bytes[offset + 7] * 256 + bytes[offset + 8];
        if (
          !width || !height || width * height > 25_000_000 || width > 10000 ||
          height > 10000
        ) {
          throw new OperationalError(
            "VALIDATION_ERROR",
            "Dimensioni JPEG non valide.",
          );
        }
        found = true;
        break;
      }
      offset += 2 + length;
    }
    if (!found) {
      throw new OperationalError("VALIDATION_ERROR", "JPEG non valido.");
    }
  }
  if (!mime || mime !== declared) {
    throw new OperationalError(
      "VALIDATION_ERROR",
      "Usare un file PNG o JPEG valido.",
    );
  }
  return { mime, extension: mime === "image/png" ? "png" : "jpg" };
}
