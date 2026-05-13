-- product_sync_csv_products contains non-sensitive catalog data (names,
-- descriptions, tags, prices) that is already public on the storefront.
-- Disabling RLS allows the admin enrichment panel to read it directly
-- without depending on role-based policy evaluation.
ALTER TABLE public.product_sync_csv_products DISABLE ROW LEVEL SECURITY;
