
-- Fix: set search_path on mutable function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix: handle_new_user already has search_path set

-- Fix RLS enabled no policy on pipeline_jobs (it has RLS enabled but no policies)
CREATE POLICY "Service role full access on pipeline_jobs" ON public.pipeline_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
