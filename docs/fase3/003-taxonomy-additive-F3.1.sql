-- =====================================================================
-- FASE 3.1 — MIGRATION ADDITIVA TASSONOMIA CATEGORIE  ·  NON APPLICATA
-- Motivazione: il modello F3 (7 tabelle) non rappresenta le categorie.
-- Nessuna tabella F3 già applicata viene modificata o rinominata.
-- Nessun seed, nessun prodotto toccato.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. product_categories — albero tassonomia, ID stabile, nome mutabile
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_categories (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key         text NOT NULL,          -- ID logico stabile (mai cambia): es. 'rose.fiore_grande'
  display_name       text NOT NULL,          -- nome visualizzato, modificabile liberamente
  slug               text NOT NULL,          -- handle interno Admin/storefront
  parent_id          uuid REFERENCES public.product_categories(id) ON DELETE RESTRICT,
  level              integer NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 4),
  path_keys          text[] NOT NULL DEFAULT '{}',  -- percorso completo di stable_key
  sort_order         integer NOT NULL DEFAULT 100,
  is_active          boolean NOT NULL DEFAULT true,
  visible_admin      boolean NOT NULL DEFAULT true,
  visible_storefront boolean NOT NULL DEFAULT false,
  taxonomy_version   text NOT NULL DEFAULT 'v1',
  legacy_aliases     text[] NOT NULL DEFAULT '{}',  -- nomi WooCommerce/CSV storici
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_categories_stable_key_version UNIQUE (stable_key, taxonomy_version),
  CONSTRAINT product_categories_slug_version UNIQUE (slug, taxonomy_version),
  CONSTRAINT product_categories_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE INDEX IF NOT EXISTS idx_pc_parent ON public.product_categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_pc_active_sort ON public.product_categories (is_active, sort_order);

GRANT SELECT ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_read" ON public.product_categories
  FOR SELECT TO authenticated USING (public.can_edit_products(auth.uid()));
CREATE POLICY "categories_admin_write" ON public.product_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'tech_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'tech_admin'));
CREATE TRIGGER trg_pc_updated BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 2. product_category_source_map — categoria sorgente → categoria target
--    (mapping legacy, con stato e approvazione manuale)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_category_source_map (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_profile   text NOT NULL DEFAULT 'woocommerce'
                     CHECK (source_profile IN ('woocommerce','bulbi','shopify','manuale')),
  source_value     text NOT NULL,          -- valore grezzo (es. 'Rose fiore grande')
  target_category  uuid REFERENCES public.product_categories(id) ON DELETE RESTRICT,
  mapping_status   text NOT NULL DEFAULT 'proposed'
                     CHECK (mapping_status IN ('proposed','ambiguous','approved','rejected','ignored')),
  confidence       numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  proposed_by      text NOT NULL DEFAULT 'rule'
                     CHECK (proposed_by IN ('rule','ai','manual','import')),
  approved_by      uuid,
  approved_at      timestamptz,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pcsm_source_key UNIQUE (source_profile, source_value),
  -- un mapping approvato deve avere una destinazione
  CONSTRAINT pcsm_approved_needs_target CHECK (mapping_status <> 'approved' OR target_category IS NOT NULL)
);
GRANT SELECT ON public.product_category_source_map TO authenticated;
GRANT ALL ON public.product_category_source_map TO service_role;
ALTER TABLE public.product_category_source_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_map_read" ON public.product_category_source_map
  FOR SELECT TO authenticated USING (public.can_edit_products(auth.uid()));
CREATE TRIGGER trg_pcsm_updated BEFORE UPDATE ON public.product_category_source_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 3. product_category_assignments — molti-a-molti prodotto/categoria
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_category_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku           text NOT NULL,
  category_id   uuid NOT NULL REFERENCES public.product_categories(id) ON DELETE RESTRICT,
  is_primary    boolean NOT NULL DEFAULT false,
  origin        text NOT NULL DEFAULT 'mapping'
                  CHECK (origin IN ('mapping','manual_override','ai_proposal','shopify_backfill')),
  status        text NOT NULL DEFAULT 'proposed'
                  CHECK (status IN ('proposed','approved','rejected')),
  approved_by   uuid,
  approved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pca_sku_category_key UNIQUE (sku, category_id)
);
-- una sola categoria primaria approvata per SKU
CREATE UNIQUE INDEX IF NOT EXISTS uq_pca_primary
  ON public.product_category_assignments (sku) WHERE is_primary AND status = 'approved';
CREATE INDEX IF NOT EXISTS idx_pca_category ON public.product_category_assignments (category_id);

GRANT SELECT ON public.product_category_assignments TO authenticated;
GRANT ALL ON public.product_category_assignments TO service_role;
ALTER TABLE public.product_category_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_assign_read" ON public.product_category_assignments
  FOR SELECT TO authenticated USING (public.can_edit_products(auth.uid()));
CREATE TRIGGER trg_pca_updated BEFORE UPDATE ON public.product_category_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 4. product_category_shopify_map — mapping collezioni, separato dall'albero
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_category_shopify_map (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         uuid NOT NULL REFERENCES public.product_categories(id) ON DELETE RESTRICT,
  shopify_handle      text NOT NULL,
  shopify_collection_id text,
  map_status          text NOT NULL DEFAULT 'unverified'
                        CHECK (map_status IN ('unverified','verified','missing','conflict','disabled')),
  approved_by         uuid,
  approved_at         timestamptz,
  last_checked_at     timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pcsm_shopify_category_key UNIQUE (category_id, shopify_handle)
);
GRANT SELECT ON public.product_category_shopify_map TO authenticated;
GRANT ALL ON public.product_category_shopify_map TO service_role;
ALTER TABLE public.product_category_shopify_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_shopify_map_read" ON public.product_category_shopify_map
  FOR SELECT TO authenticated USING (public.can_edit_products(auth.uid()));
CREATE TRIGGER trg_pcsm_shop_updated BEFORE UPDATE ON public.product_category_shopify_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 5. bulbi_classification_matrix — periodo fioritura proposto,
--    SENZA perdere la tipologia botanica originale
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bulbi_classification_matrix (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                 text NOT NULL,
  product_name        text,
  botanical_type      text NOT NULL,     -- Tulipani, Iris, Dalie, ... (SEMPRE conservato)
  proposed_season     text CHECK (proposed_season IN ('primaverile','estiva','autunnale')),
  proposal_source     text NOT NULL DEFAULT 'rule'
                        CHECK (proposal_source IN ('rule','ai','manual','fornitore')),
  confidence          numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  review_status       text NOT NULL DEFAULT 'da_verificare'
                        CHECK (review_status IN ('da_verificare','approvato','rifiutato','ambiguo')),
  manual_override     text CHECK (manual_override IN ('primaverile','estiva','autunnale')),
  approved_by         uuid,
  approved_at         timestamptz,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bcm_sku_key UNIQUE (sku),
  -- nessuna approvazione senza una stagione definita (proposta o override)
  CONSTRAINT bcm_approved_needs_season
    CHECK (review_status <> 'approvato' OR COALESCE(manual_override, proposed_season) IS NOT NULL)
);
GRANT SELECT ON public.bulbi_classification_matrix TO authenticated;
GRANT ALL ON public.bulbi_classification_matrix TO service_role;
ALTER TABLE public.bulbi_classification_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bulbi_matrix_read" ON public.bulbi_classification_matrix
  FOR SELECT TO authenticated USING (public.can_edit_products(auth.uid()));
CREATE TRIGGER trg_bcm_updated BEFORE UPDATE ON public.bulbi_classification_matrix
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- Hardening coerente con F3: nessun accesso al ruolo anonimo
-- ---------------------------------------------------------------------
REVOKE ALL ON public.product_categories FROM anon;
REVOKE ALL ON public.product_category_source_map FROM anon;
REVOKE ALL ON public.product_category_assignments FROM anon;
REVOKE ALL ON public.product_category_shopify_map FROM anon;
REVOKE ALL ON public.bulbi_classification_matrix FROM anon;

-- ROLLBACK LOGICO: le tabelle sono nuove e vuote; il rollback consiste nel
-- non popolarle (nessun DROP automatico previsto in questa fase).
