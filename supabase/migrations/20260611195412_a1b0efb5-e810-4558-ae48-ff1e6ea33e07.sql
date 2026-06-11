
CREATE TABLE public.product_enrichment_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  initiated_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  mode TEXT NOT NULL DEFAULT 'generate',
  total INT NOT NULL DEFAULT 0,
  done INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  notes JSONB NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_enrichment_runs TO authenticated;
GRANT ALL ON public.product_enrichment_runs TO service_role;
ALTER TABLE public.product_enrichment_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read enrichment runs"
  ON public.product_enrichment_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert enrichment runs"
  ON public.product_enrichment_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update enrichment runs"
  ON public.product_enrichment_runs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_product_enrichment_runs_updated
  BEFORE UPDATE ON public.product_enrichment_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_per_status ON public.product_enrichment_runs (status, updated_at DESC);
CREATE INDEX idx_per_initiator ON public.product_enrichment_runs (initiated_by, updated_at DESC);

CREATE TABLE public.product_enrichment_run_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.product_enrichment_runs(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  handle TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  metafields_report JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, sku)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_enrichment_run_items TO authenticated;
GRANT ALL ON public.product_enrichment_run_items TO service_role;
ALTER TABLE public.product_enrichment_run_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read enrichment items"
  ON public.product_enrichment_run_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert enrichment items"
  ON public.product_enrichment_run_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update enrichment items"
  ON public.product_enrichment_run_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_per_items_updated
  BEFORE UPDATE ON public.product_enrichment_run_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_per_items_run ON public.product_enrichment_run_items (run_id, status);
