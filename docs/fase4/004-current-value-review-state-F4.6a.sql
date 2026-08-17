-- =====================================================================
-- F4.6a — Migration additiva: review state dei valori correnti
-- Additiva pura: nessun DROP, nessun RENAME, nessun backfill, nessun seed.
-- Nessuna modifica a tabelle legacy, nessuna mutation Shopify.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A. product_field_definitions — regole di validazione e review policy
-- ---------------------------------------------------------------------
ALTER TABLE public.product_field_definitions
  ADD COLUMN IF NOT EXISTS validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS review_policy    text  NOT NULL DEFAULT 'none';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pfd_review_policy') THEN
    ALTER TABLE public.product_field_definitions
      ADD CONSTRAINT chk_pfd_review_policy
      CHECK (review_policy IN ('none','legacy_unverified','always_review'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pfd_validation_rules_object') THEN
    ALTER TABLE public.product_field_definitions
      ADD CONSTRAINT chk_pfd_validation_rules_object
      CHECK (jsonb_typeof(validation_rules) = 'object');
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- B. product_current_values — origine, stato revisione, blocco pubblicazione
-- ---------------------------------------------------------------------
ALTER TABLE public.product_current_values
  ADD COLUMN IF NOT EXISTS value_origin          text    NOT NULL DEFAULT 'system_migration',
  ADD COLUMN IF NOT EXISTS review_status         text    NOT NULL DEFAULT 'review_required',
  ADD COLUMN IF NOT EXISTS publish_blocked       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reviewed_by           uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at           timestamptz,
  ADD COLUMN IF NOT EXISTS protected_on_reimport boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pcv_value_origin') THEN
    ALTER TABLE public.product_current_values
      ADD CONSTRAINT chk_pcv_value_origin
      CHECK (value_origin IN (
        'source_csv','legacy_db_baseline','legacy_shopify_export',
        'legacy_ai_unknown_approval','manual','ai_accepted','system_migration'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pcv_review_status') THEN
    ALTER TABLE public.product_current_values
      ADD CONSTRAINT chk_pcv_review_status
      CHECK (review_status IN ('approved','review_required','legacy_unverified','rejected'));
  END IF;

  -- Stati non approvati => pubblicazione sempre bloccata
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pcv_publish_blocked_consistency') THEN
    ALTER TABLE public.product_current_values
      ADD CONSTRAINT chk_pcv_publish_blocked_consistency
      CHECK (
        review_status = 'approved'
        OR publish_blocked = true
      );
  END IF;

  -- I valori AI legacy non possono mai essere marcati approvati automaticamente
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pcv_legacy_ai_unverified') THEN
    ALTER TABLE public.product_current_values
      ADD CONSTRAINT chk_pcv_legacy_ai_unverified
      CHECK (
        value_origin <> 'legacy_ai_unknown_approval'
        OR (review_status = 'legacy_unverified' AND publish_blocked = true
            AND protected_on_reimport = true)
      );
  END IF;

  -- reviewed_by / reviewed_at coerenti e presenti solo su decisione reale
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pcv_review_meta') THEN
    ALTER TABLE public.product_current_values
      ADD CONSTRAINT chk_pcv_review_meta
      CHECK (
        (reviewed_by IS NULL AND reviewed_at IS NULL)
        OR (reviewed_at IS NOT NULL AND review_status IN ('approved','rejected'))
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- Indici per i filtri Admin
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pcv_review_status   ON public.product_current_values (review_status);
CREATE INDEX IF NOT EXISTS idx_pcv_value_origin    ON public.product_current_values (value_origin);
CREATE INDEX IF NOT EXISTS idx_pcv_publish_blocked ON public.product_current_values (publish_blocked) WHERE publish_blocked = true;
CREATE INDEX IF NOT EXISTS idx_pcv_product_review  ON public.product_current_values (product_id, review_status);
CREATE INDEX IF NOT EXISTS idx_pfd_review_policy   ON public.product_field_definitions (review_policy);

COMMENT ON COLUMN public.product_current_values.value_origin IS 'Origine del valore corrente (CSV, baseline legacy, export Shopify, AI legacy non verificata, manuale, AI accettata, migrazione).';
COMMENT ON COLUMN public.product_current_values.review_status IS 'Stato di revisione editoriale del valore corrente.';
COMMENT ON COLUMN public.product_current_values.publish_blocked IS 'Se true il valore non può essere incluso in un job di pubblicazione.';
COMMENT ON COLUMN public.product_field_definitions.review_policy IS 'Politica di revisione del campo: none | legacy_unverified | always_review.';
COMMENT ON COLUMN public.product_field_definitions.validation_rules IS 'Regole di validazione strutturate (oggetto JSON dichiarativo, mai codice eseguibile).';
