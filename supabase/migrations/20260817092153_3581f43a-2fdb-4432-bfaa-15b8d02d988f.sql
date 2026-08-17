ALTER TABLE public.product_source_snapshots
  ADD COLUMN IF NOT EXISTS product_id uuid;
ALTER TABLE public.product_source_snapshots
  ADD CONSTRAINT pss_product_fk FOREIGN KEY (product_id)
    REFERENCES public.products(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_pss_product ON public.product_source_snapshots (product_id)
  WHERE product_id IS NOT NULL;

ALTER TABLE public.product_current_values
  ADD COLUMN IF NOT EXISTS product_id uuid;
DO $$
DECLARE v_rows bigint;
BEGIN
  SELECT count(*) INTO v_rows FROM public.product_current_values;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'product_current_values non vuota (% righe)', v_rows;
  END IF;
END $$;
ALTER TABLE public.product_current_values ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE public.product_current_values
  ADD CONSTRAINT pcv_product_fk FOREIGN KEY (product_id)
    REFERENCES public.products(id) ON DELETE RESTRICT;
ALTER TABLE public.product_current_values
  ADD CONSTRAINT pcv_product_field_key UNIQUE (product_id, field_key);
CREATE INDEX IF NOT EXISTS idx_pcv_product ON public.product_current_values (product_id);

ALTER TABLE public.product_ai_suggestions
  ADD COLUMN IF NOT EXISTS product_id uuid;
DO $$
DECLARE v_rows bigint;
BEGIN
  SELECT count(*) INTO v_rows FROM public.product_ai_suggestions;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'product_ai_suggestions non vuota (% righe)', v_rows;
  END IF;
END $$;
ALTER TABLE public.product_ai_suggestions ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE public.product_ai_suggestions
  ADD CONSTRAINT pas_product_fk FOREIGN KEY (product_id)
    REFERENCES public.products(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pas_pending_product
  ON public.product_ai_suggestions (product_id, field_key) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pas_product_status
  ON public.product_ai_suggestions (product_id, status);

ALTER TABLE public.product_field_history
  ADD COLUMN IF NOT EXISTS product_id uuid;
DO $$
DECLARE v_rows bigint;
BEGIN
  SELECT count(*) INTO v_rows FROM public.product_field_history;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'product_field_history non vuota (% righe)', v_rows;
  END IF;
END $$;
ALTER TABLE public.product_field_history ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE public.product_field_history
  ADD CONSTRAINT pfh_product_fk FOREIGN KEY (product_id)
    REFERENCES public.products(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_pfh_product_created
  ON public.product_field_history (product_id, created_at DESC);

ALTER TABLE public.product_publication_jobs
  ADD COLUMN IF NOT EXISTS product_id uuid;
DO $$
DECLARE v_rows bigint;
BEGIN
  SELECT count(*) INTO v_rows FROM public.product_publication_jobs;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'product_publication_jobs non vuota (% righe)', v_rows;
  END IF;
END $$;
ALTER TABLE public.product_publication_jobs ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE public.product_publication_jobs
  ADD CONSTRAINT ppj_product_fk FOREIGN KEY (product_id)
    REFERENCES public.products(id) ON DELETE RESTRICT;
ALTER TABLE public.product_publication_jobs ALTER COLUMN lock_key DROP NOT NULL;
ALTER TABLE public.product_publication_jobs ALTER COLUMN skus SET DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS uq_ppj_active_product
  ON public.product_publication_jobs (product_id)
  WHERE status IN ('queued','running');
ALTER TABLE public.product_publication_jobs
  ADD CONSTRAINT ppj_product_idem_key UNIQUE (product_id, target, idempotency_key);