
-- 1. Drop anon policies on sync bucket
DROP POLICY IF EXISTS "Allow anon upload to sync bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read sync bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update sync bucket" ON storage.objects;

-- 2. Replace with admin-only policies for sync bucket (non-image paths)
CREATE POLICY "Admin upload to sync bucket"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'sync'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin read sync bucket"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'sync'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin update sync bucket"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'sync'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'sync'
  AND public.has_role(auth.uid(), 'admin')
);

-- 3. Restrict csv-pipeline bucket to admin role
DROP POLICY IF EXISTS "Admin delete csv-pipeline" ON storage.objects;
DROP POLICY IF EXISTS "Admin read csv-pipeline" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload csv-pipeline" ON storage.objects;

CREATE POLICY "Admin delete csv-pipeline"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'csv-pipeline'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin read csv-pipeline"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'csv-pipeline'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin upload csv-pipeline"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'csv-pipeline'
  AND public.has_role(auth.uid(), 'admin')
);

-- 4. Remove admin SELECT on shopify_connections (tokens should only be accessible via service_role)
DROP POLICY IF EXISTS "Admins can view shopify_connections" ON public.shopify_connections;
