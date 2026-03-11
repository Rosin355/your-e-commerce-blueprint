ALTER TABLE product_sync_csv_products
  ADD COLUMN IF NOT EXISTS handle text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS vendor text,
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS parent_sku text,
  ADD COLUMN IF NOT EXISTS metafields jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS optimized_description text,
  ADD COLUMN IF NOT EXISTS ai_enrichment_json jsonb,
  ADD COLUMN IF NOT EXISTS ai_enriched_at timestamptz;