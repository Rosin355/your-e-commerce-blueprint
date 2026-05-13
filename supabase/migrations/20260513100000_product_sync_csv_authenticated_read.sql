-- Replace admin-role-gated policy with a simpler authenticated policy.
-- The enrichment panel is already behind Supabase auth so any logged-in
-- user can be trusted to read catalog products.
DROP POLICY IF EXISTS "Admin read product_sync_csv_products" ON public.product_sync_csv_products;

CREATE POLICY "Authenticated users read product_sync_csv_products"
  ON public.product_sync_csv_products
  FOR SELECT
  TO authenticated
  USING (true);
