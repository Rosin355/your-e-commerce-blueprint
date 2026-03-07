export type ImportType = 'customers' | 'products';

export type ImportStatus = 'idle' | 'parsing' | 'validating' | 'dry-run' | 'syncing' | 'done' | 'error';

export interface CsvRow {
  [key: string]: string;
}

export interface ParsedCsv {
  headers: string[];
  rows: CsvRow[];
  rawRowCount: number;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  validRowCount: number;
  invalidRowCount: number;
}

export interface ImportRecordResult {
  row: number;
  status: 'created' | 'updated' | 'skipped' | 'error';
  identifier: string;
  message?: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  records: ImportRecordResult[];
  timestamp: string;
}

export interface ImportLogEntry {
  id: string;
  timestamp: string;
  adminEmail: string;
  fileName: string;
  importType: ImportType;
  result: ImportResult;
}

export interface ShopifyCustomerInput {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  addresses?: Array<{
    address1?: string;
    city?: string;
    zip?: string;
    country?: string;
  }>;
  email_marketing_consent?: {
    state: string;
    opt_in_level: string;
    consent_updated_at: string;
  };
}

export interface ShopifyProductInput {
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  variants?: Array<{
    sku?: string;
    price?: string;
    compare_at_price?: string;
    inventory_quantity?: number;
  }>;
  images?: Array<{ src: string }>;
}

export interface ProxyRequest {
  action: 'create_customer' | 'update_customer' | 'search_customer' | 'create_product' | 'update_product' | 'search_product';
  data: any;
}

export interface ProxyResponse {
  success: boolean;
  data?: any;
  error?: string;
}
