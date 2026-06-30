
ALTER TABLE public.product_sync_csv_products
  ADD COLUMN IF NOT EXISTS shopify_product_id text,
  ADD COLUMN IF NOT EXISTS shopify_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS shopify_sync_status text,
  ADD COLUMN IF NOT EXISTS shopify_sync_error text,
  ADD COLUMN IF NOT EXISTS shopify_resolved_by text,
  ADD COLUMN IF NOT EXISTS shopify_metafields_written integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shopify_metafields_skipped integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shopify_metafields_failed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shopify_metafields_report jsonb,
  ADD COLUMN IF NOT EXISTS shopify_last_sync_mode text;

CREATE INDEX IF NOT EXISTS idx_product_sync_csv_products_shopify_sync_status
  ON public.product_sync_csv_products (shopify_sync_status);
