ALTER TABLE public.product_sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access on product_sync_jobs"
ON public.product_sync_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);