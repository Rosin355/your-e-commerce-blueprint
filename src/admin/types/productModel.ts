/**
 * FASE 3 — Definizioni TypeScript del nuovo modello prodotto Admin.
 * Solo tipi: nessuna logica, nessuna chiamata di rete.
 * Rispecchiano la migration additiva in docs/fase3/002-product-model-additive.sql
 * (non ancora applicata al database).
 */

export type ProductRole = 'admin' | 'tech_admin' | 'publisher' | 'editor' | 'moderator' | 'user';

export type EntityType = 'product' | 'variant';
export type RowType = 'simple' | 'parent' | 'variation';

export type FieldOrigin = 'import' | 'manual' | 'ai_accepted' | 'shopify_backfill';
export type PublishState = 'draft' | 'pending_publish' | 'published' | 'failed';

export type EditorType =
  | 'text' | 'textarea' | 'richtext' | 'number' | 'boolean'
  | 'select' | 'multiselect' | 'json' | 'image' | 'readonly';

export type FieldDataType = 'text' | 'number' | 'boolean' | 'json' | 'array';

export interface ProductFieldDefinition {
  key: string;
  label: string;
  field_group: string;
  source_aliases: string[];
  editor_type: EditorType;
  data_type: FieldDataType;
  shopify_mapping: Record<string, unknown>;
  visible: boolean;
  editable: boolean;
  ai_allowed: boolean;
  manual_only: boolean;
  publishable: boolean;
  required: boolean;
  protected_on_reimport: boolean;
  applies_to: 'product' | 'variant' | 'both';
  sort_order: number;
  help_text: string | null;
  created_at: string;
  updated_at: string;
}

export type ImportBatchStatus =
  | 'analyzing' | 'report_ready' | 'blocked' | 'applying' | 'applied' | 'failed';

export interface ProductImportBatch {
  id: string;
  file_name: string;
  storage_path: string;
  checksum_sha256: string;
  idempotency_key: string;
  profile_key: string;
  detected_headers: string[];
  header_mapping: Record<string, string>;
  unmapped_headers: string[];
  total_rows: number;
  parent_rows: number;
  variation_rows: number;
  status: ImportBatchStatus;
  report_json: ImportBatchReport;
  potential_data_loss: number;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  applied_at: string | null;
}

export interface ImportBatchReport {
  create?: number;
  update?: number;
  keep?: number;
  protected?: number;
  skip_empty?: number;
  potential_data_loss?: number;
  byField?: Record<string, number>;
  [key: string]: unknown;
}

export interface ProductSourceSnapshot {
  id: string;
  batch_id: string;
  row_index: number;
  sku: string;
  parent_sku: string | null;
  source_id: string | null;
  source_parent_id: string | null;
  row_type: RowType;
  position: number;
  variant_options: Record<string, string>;
  variant_price: number | null;
  variant_compare_price: number | null;
  variant_image_url: string | null;
  variant_weight_grams: number | null;
  variant_dimensions: Record<string, number | string>;
  variant_status: string | null;
  shopify_variant_id: string | null;
  /** Inventario: dato storico importato, MAI autorevole e MAI pubblicato. */
  inventory_in_stock: boolean | null;
  inventory_quantity: number | null;
  inventory_backorder: string | null;
  category_path_original: string | null;
  category_root: string | null;
  category_levels: string[];
  category_leaf: string | null;
  raw_row: Record<string, string>;
  normalized: Record<string, unknown>;
  created_at: string;
}

export interface ProductCurrentValue {
  id: string;
  sku: string;
  parent_sku: string | null;
  entity_type: EntityType;
  field_key: string;
  value_text: string | null;
  value_json: unknown | null;
  value_number: number | null;
  origin: FieldOrigin;
  source_batch_id: string | null;
  is_locked: boolean;
  publish_state: PublishState;
  published_at: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AiSuggestionStatus = 'pending' | 'accepted' | 'discarded' | 'superseded';

export interface ProductAiSuggestion {
  id: string;
  sku: string;
  entity_type: EntityType;
  field_key: string;
  suggestion_text: string | null;
  suggestion_json: unknown | null;
  model: string | null;
  prompt_hint: string | null;
  based_on_value: unknown | null;
  status: AiSuggestionStatus;
  created_by: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export type FieldChangeType =
  | 'import' | 'manual' | 'ai_accepted' | 'ai_discarded'
  | 'restore_original' | 'publish' | 'publish_failed' | 'inventory_proposal';

export interface ProductFieldHistoryEntry {
  id: string;
  sku: string;
  entity_type: EntityType;
  field_key: string;
  previous_value: unknown | null;
  new_value: unknown | null;
  change_type: FieldChangeType;
  actor: string | null;
  actor_label: string | null;
  batch_id: string | null;
  job_id: string | null;
  created_at: string;
}

export type PublicationTarget =
  | 'shopify_product' | 'shopify_metafields' | 'shopify_collections';

export type PublicationJobStatus =
  | 'queued' | 'running' | 'succeeded' | 'partial' | 'failed' | 'cancelled';

export interface ProductPublicationJob {
  id: string;
  skus: string[];
  scope: string[];
  target: PublicationTarget;
  status: PublicationJobStatus;
  idempotency_key: string;
  lock_key: string;
  requested_by: string | null;
  approved_by: string | null;
  summary_json: Record<string, unknown>;
  error_json: Record<string, unknown> | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Stato di mapping categoria WooCommerce → collezione Shopify (mai automatico). */
export type CategoryMappingStatus = 'da_verificare' | 'approvato' | 'non_mappato' | 'errore';

export interface CategoryMappingProposal {
  path_original: string;
  root: string;
  levels: string[];
  leaf: string;
  proposed_handles: string[];
  status: CategoryMappingStatus;
}
