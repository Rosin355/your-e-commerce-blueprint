-- =====================================================================
-- FASE 3 · MIGRATION 2/2 — Nuovo modello prodotto Admin Online Garden
-- MIGRATION COMPLETAMENTE ADDITIVA — NON APPLICATA
--
-- Non tocca product_sync_csv_products né alcuna tabella/colonna esistente.
-- Crea 7 tabelle nuove + funzioni di supporto + RLS + protezioni snapshot.
-- Nessuna mutation Shopify, nessun backfill, nessun dato modificato.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Funzione permessi server-side (nessun controllo basato solo su UI)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_publish_products(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR public.has_role(_user_id, 'tech_admin')
      OR public.has_role(_user_id, 'publisher')
$$;

CREATE OR REPLACE FUNCTION public.can_edit_products(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR public.has_role(_user_id, 'tech_admin')
      OR public.has_role(_user_id, 'editor')
      OR public.has_role(_user_id, 'publisher')
$$;

-- Blocco UPDATE/DELETE sugli snapshot immutabili.
-- Unica via tecnica controllata: SET LOCAL app.allow_snapshot_maintenance = 'on'
-- eseguibile solo da una sessione service_role/superuser dentro una procedura
-- di manutenzione tracciata; la variabile non è impostabile dal client PostgREST.
CREATE OR REPLACE FUNCTION public.deny_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.allow_snapshot_maintenance', true) = 'on'
     AND current_user IN ('postgres', 'service_role') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'Snapshot immutabile: % non consentita su %', TG_OP, TG_TABLE_NAME
    USING ERRCODE = '42501';
END;
$$;

-- ---------------------------------------------------------------------
-- 1. product_field_definitions — registry configurabile dei campi
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_field_definitions (
  key                   text PRIMARY KEY,
  label                 text NOT NULL,
  field_group           text NOT NULL DEFAULT 'generale',
  source_aliases        text[] NOT NULL DEFAULT '{}',
  editor_type           text NOT NULL DEFAULT 'text'
                          CHECK (editor_type IN ('text','textarea','richtext','number','boolean','select','multiselect','json','image','readonly')),
  data_type             text NOT NULL DEFAULT 'text'
                          CHECK (data_type IN ('text','number','boolean','json','array')),
  shopify_mapping       jsonb NOT NULL DEFAULT '{}'::jsonb,
  visible               boolean NOT NULL DEFAULT true,
  editable              boolean NOT NULL DEFAULT true,
  ai_allowed            boolean NOT NULL DEFAULT false,
  manual_only           boolean NOT NULL DEFAULT false,
  publishable           boolean NOT NULL DEFAULT false,
  required              boolean NOT NULL DEFAULT false,
  protected_on_reimport boolean NOT NULL DEFAULT false,
  applies_to            text NOT NULL DEFAULT 'product'
                          CHECK (applies_to IN ('product','variant','both')),
  sort_order            integer NOT NULL DEFAULT 100,
  help_text             text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pfd_group_sort ON public.product_field_definitions (field_group, sort_order);

GRANT SELECT ON public.product_field_definitions TO authenticated;
GRANT ALL ON public.product_field_definitions TO service_role;
ALTER TABLE public.product_field_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_defs_read" ON public.product_field_definitions
  FOR SELECT TO authenticated USING (public.can_edit_products(auth.uid()));
CREATE POLICY "field_defs_admin_write" ON public.product_field_definitions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'tech_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'tech_admin'));
CREATE TRIGGER trg_pfd_updated BEFORE UPDATE ON public.product_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 2. product_import_batches — un batch per file, idempotente per checksum
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_import_batches (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name            text NOT NULL,
  storage_path         text NOT NULL,
  checksum_sha256      text NOT NULL,
  idempotency_key      text NOT NULL,
  profile_key          text NOT NULL DEFAULT 'unknown',
  detected_headers     jsonb NOT NULL DEFAULT '[]'::jsonb,
  header_mapping       jsonb NOT NULL DEFAULT '{}'::jsonb,
  unmapped_headers     jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_rows           integer NOT NULL DEFAULT 0,
  parent_rows          integer NOT NULL DEFAULT 0,
  variation_rows       integer NOT NULL DEFAULT 0,
  status               text NOT NULL DEFAULT 'analyzing'
                         CHECK (status IN ('analyzing','report_ready','blocked','applying','applied','failed')),
  report_json          jsonb NOT NULL DEFAULT '{}'::jsonb,
  potential_data_loss  integer NOT NULL DEFAULT 0 CHECK (potential_data_loss >= 0),
  error_message        text,
  created_by           uuid,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  applied_at           timestamptz,
  CONSTRAINT product_import_batches_checksum_key UNIQUE (checksum_sha256),
  CONSTRAINT product_import_batches_idem_key UNIQUE (idempotency_key),
  -- un batch con perdita potenziale di dati non può risultare applicato
  CONSTRAINT product_import_batches_no_apply_on_loss
    CHECK (NOT (status = 'applied' AND potential_data_loss > 0))
);
CREATE INDEX IF NOT EXISTS idx_pib_status_created ON public.product_import_batches (status, created_at DESC);

GRANT SELECT ON public.product_import_batches TO authenticated;
GRANT ALL ON public.product_import_batches TO service_role;
ALTER TABLE public.product_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "import_batches_read" ON public.product_import_batches
  FOR SELECT TO authenticated USING (public.can_edit_products(auth.uid()));
-- scrittura solo via Edge Function (service_role): nessuna policy di write per authenticated.

-- ---------------------------------------------------------------------
-- 3. product_source_snapshots — riga sorgente immutabile (parent/variante)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_source_snapshots (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id               uuid NOT NULL REFERENCES public.product_import_batches(id) ON DELETE RESTRICT,
  row_index              integer NOT NULL,
  sku                    text NOT NULL,
  parent_sku             text,
  source_id              text,               -- ID WooCommerce riga
  source_parent_id       text,               -- ID WooCommerce genitore
  row_type               text NOT NULL DEFAULT 'simple'
                           CHECK (row_type IN ('simple','parent','variation')),
  position               integer NOT NULL DEFAULT 0,
  variant_options        jsonb NOT NULL DEFAULT '{}'::jsonb,  -- attributi/opzioni variante
  variant_price          numeric,
  variant_compare_price  numeric,
  variant_image_url      text,
  variant_weight_grams   integer,
  variant_dimensions     jsonb NOT NULL DEFAULT '{}'::jsonb,
  variant_status         text,
  shopify_variant_id     text,
  -- inventario: conservato come dato storico, MAI autorevole, MAI pubblicato
  inventory_in_stock     boolean,
  inventory_quantity     integer,
  inventory_backorder    text,
  -- categorie WooCommerce conservate integralmente
  category_path_original text,
  category_root          text,
  category_levels        jsonb NOT NULL DEFAULT '[]'::jsonb,
  category_leaf          text,
  raw_row                jsonb NOT NULL,
  normalized             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_source_snapshots_batch_row_key UNIQUE (batch_id, row_index),
  CONSTRAINT product_source_snapshots_batch_sku_key UNIQUE (batch_id, sku, row_type, position),
  CONSTRAINT product_source_snapshots_variation_parent
    CHECK (row_type <> 'variation' OR parent_sku IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_pss_sku ON public.product_source_snapshots (sku);
CREATE INDEX IF NOT EXISTS idx_pss_parent_sku ON public.product_source_snapshots (parent_sku) WHERE parent_sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pss_batch ON public.product_source_snapshots (batch_id);
CREATE INDEX IF NOT EXISTS idx_pss_row_type ON public.product_source_snapshots (row_type);

GRANT SELECT ON public.product_source_snapshots TO authenticated;
GRANT ALL ON public.product_source_snapshots TO service_role;
ALTER TABLE public.product_source_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snapshots_read" ON public.product_source_snapshots
  FOR SELECT TO authenticated USING (public.can_edit_products(auth.uid()));

-- Immutabilità garantita dal database, non dalla UI:
REVOKE UPDATE, DELETE, TRUNCATE ON public.product_source_snapshots FROM authenticated;
CREATE TRIGGER trg_pss_no_update BEFORE UPDATE ON public.product_source_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.deny_snapshot_mutation();
CREATE TRIGGER trg_pss_no_delete BEFORE DELETE ON public.product_source_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.deny_snapshot_mutation();

-- ---------------------------------------------------------------------
-- 4. product_current_values — valore corrente approvato (EAV controllato)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_current_values (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             text NOT NULL,
  parent_sku      text,
  entity_type     text NOT NULL DEFAULT 'product'
                    CHECK (entity_type IN ('product','variant')),
  field_key       text NOT NULL REFERENCES public.product_field_definitions(key) ON DELETE RESTRICT,
  value_text      text,
  value_json      jsonb,
  value_number    numeric,
  origin          text NOT NULL DEFAULT 'import'
                    CHECK (origin IN ('import','manual','ai_accepted','shopify_backfill')),
  source_batch_id uuid REFERENCES public.product_import_batches(id) ON DELETE SET NULL,
  is_locked       boolean NOT NULL DEFAULT false,
  publish_state   text NOT NULL DEFAULT 'draft'
                    CHECK (publish_state IN ('draft','pending_publish','published','failed')),
  published_at    timestamptz,
  updated_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_current_values_sku_field_key UNIQUE (sku, field_key),
  CONSTRAINT product_current_values_variant_parent
    CHECK (entity_type <> 'variant' OR parent_sku IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_pcv_sku ON public.product_current_values (sku);
CREATE INDEX IF NOT EXISTS idx_pcv_parent ON public.product_current_values (parent_sku) WHERE parent_sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pcv_publish_state ON public.product_current_values (publish_state)
  WHERE publish_state <> 'published';

GRANT SELECT ON public.product_current_values TO authenticated;
GRANT ALL ON public.product_current_values TO service_role;
ALTER TABLE public.product_current_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "current_values_read" ON public.product_current_values
  FOR SELECT TO authenticated USING (public.can_edit_products(auth.uid()));
-- Scritture solo via Edge Function service_role (validazione registry + storico).

CREATE TRIGGER trg_pcv_updated BEFORE UPDATE ON public.product_current_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 5. product_ai_suggestions — proposte AI separate dal valore corrente
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_ai_suggestions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             text NOT NULL,
  entity_type     text NOT NULL DEFAULT 'product'
                    CHECK (entity_type IN ('product','variant')),
  field_key       text NOT NULL REFERENCES public.product_field_definitions(key) ON DELETE RESTRICT,
  suggestion_text text,
  suggestion_json jsonb,
  model           text,
  prompt_hint     text,
  based_on_value  jsonb,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','discarded','superseded')),
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  resolved_by     uuid
);
-- una sola proposta pendente per (sku, campo)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pas_pending
  ON public.product_ai_suggestions (sku, field_key) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pas_sku_status ON public.product_ai_suggestions (sku, status);

GRANT SELECT ON public.product_ai_suggestions TO authenticated;
GRANT ALL ON public.product_ai_suggestions TO service_role;
ALTER TABLE public.product_ai_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_suggestions_read" ON public.product_ai_suggestions
  FOR SELECT TO authenticated USING (public.can_edit_products(auth.uid()));

-- L'AI non può proporre campi manuali o di inventario:
CREATE OR REPLACE FUNCTION public.assert_ai_field_allowed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE allowed boolean;
BEGIN
  SELECT ai_allowed INTO allowed
  FROM public.product_field_definitions WHERE key = NEW.field_key;
  IF COALESCE(allowed, false) = false THEN
    RAISE EXCEPTION 'Campo % non abilitato alle proposte AI', NEW.field_key
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_pas_ai_allowed BEFORE INSERT ON public.product_ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.assert_ai_field_allowed();

-- ---------------------------------------------------------------------
-- 6. product_field_history — audit trail append-only
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_field_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku            text NOT NULL,
  entity_type    text NOT NULL DEFAULT 'product'
                   CHECK (entity_type IN ('product','variant')),
  field_key      text NOT NULL,
  previous_value jsonb,
  new_value      jsonb,
  change_type    text NOT NULL
                   CHECK (change_type IN ('import','manual','ai_accepted','ai_discarded','restore_original','publish','publish_failed','inventory_proposal')),
  actor          uuid,
  actor_label    text,
  batch_id       uuid REFERENCES public.product_import_batches(id) ON DELETE SET NULL,
  job_id         uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pfh_sku_created ON public.product_field_history (sku, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pfh_change_type ON public.product_field_history (change_type);

GRANT SELECT ON public.product_field_history TO authenticated;
GRANT ALL ON public.product_field_history TO service_role;
ALTER TABLE public.product_field_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_history_read" ON public.product_field_history
  FOR SELECT TO authenticated USING (public.can_edit_products(auth.uid()));

REVOKE UPDATE, DELETE, TRUNCATE ON public.product_field_history FROM authenticated;
CREATE TRIGGER trg_pfh_no_update BEFORE UPDATE ON public.product_field_history
  FOR EACH ROW EXECUTE FUNCTION public.deny_snapshot_mutation();
CREATE TRIGGER trg_pfh_no_delete BEFORE DELETE ON public.product_field_history
  FOR EACH ROW EXECUTE FUNCTION public.deny_snapshot_mutation();

-- ---------------------------------------------------------------------
-- 7. product_publication_jobs — pubblicazione esplicita, idempotente, con lock
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_publication_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skus            text[] NOT NULL,
  scope           jsonb NOT NULL DEFAULT '[]'::jsonb,   -- elenco field_key inclusi
  target          text NOT NULL DEFAULT 'shopify_product'
                    CHECK (target IN ('shopify_product','shopify_metafields','shopify_collections')),
  status          text NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','running','succeeded','partial','failed','cancelled')),
  idempotency_key text NOT NULL,
  lock_key        text NOT NULL,
  requested_by    uuid,
  approved_by     uuid,
  summary_json    jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_json      jsonb,
  started_at      timestamptz,
  finished_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_publication_jobs_idem_key UNIQUE (idempotency_key)
);
-- un solo job attivo per lock_key (prodotto): impedisce doppie pubblicazioni
CREATE UNIQUE INDEX IF NOT EXISTS uq_ppj_active_lock
  ON public.product_publication_jobs (lock_key) WHERE status IN ('queued','running');
CREATE INDEX IF NOT EXISTS idx_ppj_status_created ON public.product_publication_jobs (status, created_at DESC);

GRANT SELECT ON public.product_publication_jobs TO authenticated;
GRANT ALL ON public.product_publication_jobs TO service_role;
ALTER TABLE public.product_publication_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "publication_jobs_read" ON public.product_publication_jobs
  FOR SELECT TO authenticated USING (public.can_edit_products(auth.uid()));
-- Creazione job solo via Edge Function, che verifica can_publish_products(auth.uid()).

CREATE TRIGGER trg_ppj_updated BEFORE UPDATE ON public.product_publication_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
