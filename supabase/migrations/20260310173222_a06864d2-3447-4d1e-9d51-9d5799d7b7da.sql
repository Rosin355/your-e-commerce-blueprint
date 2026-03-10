INSERT INTO storage.buckets (id, name, public)
VALUES ('sync', 'sync', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow service role all on sync bucket"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'sync')
WITH CHECK (bucket_id = 'sync');