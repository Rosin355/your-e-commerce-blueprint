CREATE TABLE IF NOT EXISTS public.product_sync_csv_products (
  sku TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  price NUMERIC,
  compare_at_price NUMERIC,
  barcode TEXT,
  weight_grams INTEGER,
  inventory_quantity INTEGER,
  tags JSONB DEFAULT '[]'::jsonb,
  product_category TEXT,
  product_category_id TEXT,
  image_urls JSONB DEFAULT '[]'::jsonb,
  source_file TEXT,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_sync_csv_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access on product_sync_csv_products"
ON public.product_sync_csv_products
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);