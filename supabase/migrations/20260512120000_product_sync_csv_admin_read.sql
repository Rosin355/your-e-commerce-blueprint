-- Allow admin users to read imported catalog products in the enrichment panel
CREATE POLICY "Admin read product_sync_csv_products"
  ON public.product_sync_csv_products
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
