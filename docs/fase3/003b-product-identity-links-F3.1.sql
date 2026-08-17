-- =====================================================================
-- FASE 3.1b — COLLEGAMENTO TABELLE F3 ALL'IDENTITÀ CANONICA
-- Prerequisito: 003a-product-canonical-F3.1.sql (public.products).
--
-- Le 7 tabelle F3 sono vuote: si applica ora il modello corretto, prima
-- di qualunque backfill. Nessuna colonna o constraint legacy viene
-- eliminata; le colonne `sku` restano come dato transitorio.
-- Nessun dato inserito, nessun backfill, nessuna tabella legacy toccata.
--
-- Matrice:
--   product_field_definitions  → nessun product_id (campi globali)
--   product_import_batches     → nessun product_id (file/batch)
--   product_source_snapshots   → product_id NULL     (riga raw non risolta)
--   product_current_values     → product_id NOT NULL
--   product_ai_suggestions     → product_id NOT NULL
--   product_field_history      → product_id NOT NULL
--   product_publication_jobs   → product_id NOT NULL
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. product_source_snapshots — nullable per definizione
--    Una riga sorgente può essere invalida, priva di SKU o non ancora
--    risolta: resta comunque conservata con SKU raw e JSON originale.
--    Più snapshot possono riferirsi allo stesso prodotto.
-- ---------------------------------------------------------------------
ALTER TABLE public.product_source_snapshots
  ADD COLUMN IF NOT EXISTS product_id uuid;
ALTER TABLE public.product_source_snapshots
  ADD CONSTRAINT pss_product_fk FOREIGN KEY (product_id)
    REFERENCES public.products(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_pss_product ON public.product_source_snapshots (product_id)
  WHERE product_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. product_current_values — identità obbligatoria
-- ---------------------------------------------------------------------
ALTER TABLE public.product_current_values
  ADD COLUMN IF NOT EXISTS product_id uuid;
DO $$
DECLARE v_rows bigint;
BEGIN
  SELECT count(*) INTO v_rows FROM public.product_current_values;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'product_current_values non vuota (% righe): backfill richiesto prima di NOT NULL', v_rows;
  END IF;
END $$;
ALTER TABLE public.product_current_values ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE public.product_current_values
  ADD CONSTRAINT pcv_product_fk FOREIGN KEY (product_id)
    REFERENCES public.products(id) ON DELETE RESTRICT;
-- Nuova unique operativa basata sull'identità stabile.
-- La vecchia unique (sku, field_key) resta in vita durante la transizione.
ALTER TABLE public.product_current_values
  ADD CONSTRAINT pcv_product_field_key UNIQUE (product_id, field_key);
CREATE INDEX IF NOT EXISTS idx_pcv_product ON public.product_current_values (product_id);

-- ---------------------------------------------------------------------
-- 3. product_ai_suggestions — una sola proposta pending per prodotto/campo
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 4. product_field_history — storico legato all'identità stabile
--    (append-only: i trigger deny_snapshot_mutation restano attivi)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 5. product_publication_jobs — un job attivo per prodotto
--    Il lock passa da lock_key testuale a product_id.
--    Le colonne legacy skus/lock_key non vengono eliminate, ma rese
--    facoltative per non richiedere valori fittizi.
-- ---------------------------------------------------------------------
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
-- lock: un solo job queued/running per prodotto
CREATE UNIQUE INDEX IF NOT EXISTS uq_ppj_active_product
  ON public.product_publication_jobs (product_id)
  WHERE status IN ('queued','running');
-- idempotenza: prodotto stabile + target + contenuto del job
ALTER TABLE public.product_publication_jobs
  ADD CONSTRAINT ppj_product_idem_key UNIQUE (product_id, target, idempotency_key);

-- Rollback logico: colonne e vincoli nuovi su tabelle vuote.
-- Rollback = DROP delle colonne product_id e dei relativi indici/constraint.
