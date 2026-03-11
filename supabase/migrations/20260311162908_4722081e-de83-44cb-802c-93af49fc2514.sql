UPDATE storage.buckets SET public = true WHERE id = 'sync';

CREATE POLICY "Public read access to product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sync' AND (storage.foldername(name))[1] = 'product-images');