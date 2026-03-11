CREATE POLICY "Allow anon upload to sync bucket"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'sync');

CREATE POLICY "Allow anon read sync bucket"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'sync');

CREATE POLICY "Allow anon update sync bucket"
ON storage.objects FOR UPDATE TO anon
USING (bucket_id = 'sync')
WITH CHECK (bucket_id = 'sync');