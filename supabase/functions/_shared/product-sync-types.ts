export type SyncMode = "sync" | "ai_content" | "ai_images" | "integrity";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface CsvProductRow {
  sku: string;
  title?: string;
  description?: string;
  price?: string;
  compareAtPrice?: string;
  barcode?: string;
  weight?: number;
  inventoryQuantity?: number;
  tags?: string[];
  productCategory?: string;
  productCategoryId?: string;
  imageUrls?: string[];
}

export interface ShopifyVariantSnapshot {
  id: string;
  sku: string;
  inventoryItemId?: string | null;
  barcode?: string | null;
  price?: string | null;
  compareAtPrice?: string | null;
  inventoryQuantity?: number | null;
  weight?: number | null;
  weightUnit?: string | null;
}

export interface ShopifyProductSnapshot {
  id: string;
  title: string;
  descriptionHtml?: string | null;
  tags: string[];
  productCategoryName?: string | null;
  productCategoryId?: string | null;
  mediaImageUrls: string[];
  variants: ShopifyVariantSnapshot[];
}

export interface ComparisonResult {
  needsUpdate: boolean;
  fieldsToUpdate: {
    productInput?: Record<string, unknown>;
    variantInput?: Record<string, unknown>;
    inventoryQuantity?: number;
  };
  changedFields: string[];
}

export interface SyncLogEntry {
  level: "info" | "warn" | "error";
  message: string;
  sku?: string;
  productId?: string;
  timestamp: string;
}

export interface SyncReportState {
  mode: SyncMode;
  cursor: string | null;
  hasNextPage: boolean;
  processed: number;
  updated: number;
  unchanged: number;
  failed: number;
  logs: SyncLogEntry[];
  startedAt: string;
  finishedAt?: string;
  batchOffset?: number;
  batchProgress?: { current: number; total: number };
  csvSnapshot?: {
    persistedAt: string;
    persistedCount: number;
    sourceFile: string;
  };
  integrity?: {
    csvSkuCount: number;
    shopifySkuCount: number;
    missingInShopify: string[];
    missingInCsv: string[];
    productsWithoutImages: string[];
    productsWithoutBarcode: string[];
  };
}

export interface ProductSyncJobRow {
  id: string;
  status: JobStatus;
  mode: SyncMode;
  total_products: number;
  updated_products: number;
  unchanged_products: number;
  failed_products: number;
  report_json: SyncReportState;
  created_at: string;
  updated_at: string;
}

export interface CatalogDashboardPreviewRow {
  sku: string;
  title: string | null;
  price: number | null;
  inventory_quantity: number | null;
  source_file: string | null;
  imported_at: string;
}

export interface CatalogDashboardSummary {
  totalProducts: number;
  lastImportAt: string | null;
  sourceFiles: string[];
  preview: CatalogDashboardPreviewRow[];
}
