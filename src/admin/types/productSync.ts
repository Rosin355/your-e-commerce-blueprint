export type SyncMode = "sync" | "ai_content" | "ai_images" | "integrity";
export type SyncStatus = "pending" | "processing" | "completed" | "failed";

export interface SyncLogEntry {
  level: "info" | "warn" | "error";
  message: string;
  sku?: string;
  productId?: string;
  timestamp: string;
}

export interface CatalogIntegrityReport {
  csvSkuCount: number;
  shopifySkuCount: number;
  missingInShopify: string[];
  missingInCsv: string[];
  productsWithoutImages: string[];
  productsWithoutBarcode: string[];
}

export interface ProductSyncReport {
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
  integrity?: CatalogIntegrityReport;
}

export interface ProductSyncJob {
  id: string;
  status: SyncStatus;
  mode: SyncMode;
  total_products: number;
  updated_products: number;
  unchanged_products: number;
  failed_products: number;
  report_json: ProductSyncReport;
  created_at: string;
  updated_at: string;
}

export interface ProductSyncCatalogPreviewRow {
  sku: string;
  title: string | null;
  price: number | null;
  inventory_quantity: number | null;
  source_file: string | null;
  imported_at: string;
}

export interface ProductSyncCatalogDashboard {
  totalProducts: number;
  missingPriceCount: number;
  lastImportAt: string | null;
  sourceFiles: string[];
  preview: ProductSyncCatalogPreviewRow[];
}
