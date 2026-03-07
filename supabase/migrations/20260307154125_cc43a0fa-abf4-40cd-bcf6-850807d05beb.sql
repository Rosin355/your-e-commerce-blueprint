INSERT INTO storage.buckets (id, name, public) VALUES ('csv-pipeline', 'csv-pipeline', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admin upload csv-pipeline" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'csv-pipeline');
CREATE POLICY "Admin read csv-pipeline" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'csv-pipeline');
CREATE POLICY "Admin delete csv-pipeline" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'csv-pipeline');