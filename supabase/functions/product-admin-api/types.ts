// F5 — Tipi condivisi della Admin Product API.
// Modulo puro: nessuna dipendenza Deno, Shopify o pipeline legacy.

export type AppRole =
  | "admin"
  | "tech_admin"
  | "publisher"
  | "editor"
  | "moderator"
  | "user";

export type ReadAction =
  | "list_products"
  | "get_product"
  | "get_field_definitions"
  | "get_product_history"
  | "get_source_baseline"
  | "validate_field_update"
  | "get_admin_context"
  | "get_dashboard_stats";

export type CommandAction =
  | "update_field"
  | "clear_field"
  | "confirm_legacy_value"
  | "reject_legacy_value";

export type ApiAction = ReadAction | CommandAction;

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "FIELD_NOT_EDITABLE"
  | "VALIDATION_ERROR"
  | "VERSION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "REVIEW_STATE_INVALID"
  | "NO_CHANGE"
  | "WRITES_DISABLED"
  | "INTERNAL_ERROR";

export interface AuthContext {
  userId: string;
  roles: AppRole[];
}

export interface FieldDefinition {
  key: string;
  label: string;
  field_group: string;
  editor_type: string;
  data_type: "text" | "number" | "boolean" | "json" | "array";
  visible: boolean;
  editable: boolean;
  ai_allowed: boolean;
  manual_only: boolean;
  publishable: boolean;
  required: boolean;
  protected_on_reimport: boolean;
  applies_to: "product" | "variant" | "both";
  sort_order: number;
  help_text: string | null;
  validation_rules: Record<string, unknown>;
  review_policy: string;
}

export interface CurrentValueRow {
  id: string;
  product_id: string;
  sku: string;
  field_key: string;
  entity_type: string;
  value_text: string | null;
  value_number: number | null;
  value_json: unknown | null;
  value_origin: string;
  origin: string;
  review_status: string;
  publish_blocked: boolean;
  protected_on_reimport: boolean;
  is_locked: boolean;
  version: number;
  updated_at: string;
}

export interface ListProductsFilters {
  search?: string;
  sku?: string;
  gtin?: string;
  entityType?: "simple" | "variable" | "variation";
  category?: string;
  reviewRequired?: boolean;
  publishBlocked?: boolean;
  completeness?: "complete" | "incomplete";
  origin?: string;
  needsClassification?: boolean;
}

export interface ListProductsRequest extends ListProductsFilters {
  cursor?: string | null;
  pageSize?: number;
}

export interface CommandRequest {
  productId: string;
  fieldKey: string;
  value?: unknown;
  expectedVersion?: number;
  idempotencyKey?: string;
  confirm?: boolean;
}
