-- =====================================================================
-- FASE 3.1 — MIGRATION ADDITIVA TASSONOMIA CATEGORIE  ·  revisione 3
--
-- PREREQUISITI: 003a-product-canonical-F3.1.sql (public.products)
--               003b-product-identity-links-F3.1.sql
-- Le assegnazioni categoria referenziano SEMPRE public.products.id:
-- mai uno SKU libero, mai lo snapshot, mai product_sync_csv_products.
--
-- Nessun DROP, TRUNCATE, DELETE, UPDATE di dati, backfill, seed,
-- assegnazione prodotti o chiamata esterna.
--
-- Tassonomia ufficiale provvisoria: 8 categorie principali + 14
-- sottocategorie = 22 (Esterno 4, Rose 5, Frutto 2, Bulbi 3).
-- Nome confermato: "Rose a Fiore Grande". Il seed NON è incluso.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Funzioni di supporto (SECURITY DEFINER con search_path vuoto)
-- ---------------------------------------------------------------------

-- Chi può gestire la struttura tassonomica: solo Admin e Tech Admin.
CREATE OR REPLACE FUNCTION public.can_manage_taxonomy(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
      OR public.has_role(_user_id, 'tech_admin'::public.app_role)
$$;

-- stable_key è realmente stabile: dopo la creazione non è modificabile in
-- modo ordinario. Cambiano liberamente display_name e (in modo controllato)
-- lo slug pubblico; l'ID e le relazioni non cambiano mai.
CREATE OR REPLACE FUNCTION public.protect_category_stable_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.stable_key IS DISTINCT FROM OLD.stable_key THEN
    IF NOT (current_setting('app.allow_stable_key_change', true) = 'on'
            AND current_user = 'postgres') THEN
      RAISE EXCEPTION 'stable_key non modificabile: identità stabile della categoria'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Coerenza livello/percorso + anti-ciclo con errore esplicito.
-- Il percorso interno è composto solo da identificatori stabili (stable_key),
-- mai da display_name.
CREATE OR REPLACE FUNCTION public.enforce_category_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_parent_level integer;
  v_parent_path  text[];
  v_cursor       uuid;
  v_guard        integer := 0;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.level := 1;
    NEW.path_keys := ARRAY[NEW.stable_key];
    RETURN NEW;
  END IF;

  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'Categoria non può essere parent di sé stessa' USING ERRCODE = '23514';
  END IF;

  -- risalita: nessun antenato può coincidere con la categoria stessa
  v_cursor := NEW.parent_id;
  WHILE v_cursor IS NOT NULL LOOP
    v_guard := v_guard + 1;
    IF v_guard > 10 THEN
      RAISE EXCEPTION 'Profondità gerarchia categorie oltre il limite di 10 livelli'
        USING ERRCODE = '23514';
    END IF;
    IF v_cursor = NEW.id THEN
      RAISE EXCEPTION 'Ciclo nella gerarchia categorie non consentito' USING ERRCODE = '23514';
    END IF;
    SELECT parent_id INTO v_cursor FROM public.product_categories WHERE id = v_cursor;
  END LOOP;

  SELECT level, path_keys INTO v_parent_level, v_parent_path
  FROM public.product_categories WHERE id = NEW.parent_id;

  IF v_parent_level IS NULL THEN
    RAISE EXCEPTION 'Parent categoria inesistente' USING ERRCODE = '23503';
  END IF;

  NEW.level := v_parent_level + 1;
  NEW.path_keys := v_parent_path || NEW.stable_key;

  IF NEW.level > 10 THEN
    RAISE EXCEPTION 'Profondità gerarchia categorie oltre il limite di 10 livelli'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

-- Ricalcolo ricorsivo di livello e percorso dei discendenti quando una
-- categoria cambia parent. Avviene nella stessa transazione dell'UPDATE:
-- un errore su un discendente annulla l'intera operazione.
-- Non è previsto il ricalcolo su modifica di stable_key, perché la stable key
-- non è ordinariamente modificabile.
CREATE OR REPLACE FUNCTION public.recalc_category_descendants()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
    WITH RECURSIVE tree AS (
      SELECT c.id, NEW.level + 1 AS lvl, NEW.path_keys || c.stable_key AS pk
        FROM public.product_categories c
       WHERE c.parent_id = NEW.id
      UNION ALL
      SELECT c.id, t.lvl + 1, t.pk || c.stable_key
        FROM public.product_categories c
        JOIN tree t ON c.parent_id = t.id
       WHERE t.lvl < 10
    )
    UPDATE public.product_categories c
       SET level = t.lvl, path_keys = t.pk
      FROM tree t
     WHERE c.id = t.id;

    IF EXISTS (SELECT 1 FROM public.product_categories WHERE level > 10) THEN
      RAISE EXCEPTION 'Spostamento rifiutato: profondità oltre 10 livelli'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------
-- 1. product_categories — albero tassonomia, ID stabile, nome mutabile
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_categories (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key         text NOT NULL,          -- identità logica stabile e immutabile
  display_name       text NOT NULL,          -- nome visualizzato, liberamente modificabile
  slug               text NOT NULL,          -- handle pubblico, modificabile in modo controllato
  parent_id          uuid REFERENCES public.product_categories(id) ON DELETE RESTRICT,
  level              integer NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  path_keys          text[] NOT NULL DEFAULT '{}',  -- percorso di stable_key
  sort_order         integer NOT NULL DEFAULT 100,
  is_active          boolean NOT NULL DEFAULT true,   -- disattivazione logica, mai DELETE
  visible_admin      boolean NOT NULL DEFAULT true,
  visible_storefront boolean NOT NULL DEFAULT false,
  taxonomy_version   text NOT NULL DEFAULT 'v1',
  legacy_aliases     text[] NOT NULL DEFAULT '{}',
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_categories_stable_key_global UNIQUE (stable_key),
  CONSTRAINT product_categories_stable_key_not_blank CHECK (btrim(stable_key) <> ''),
  CONSTRAINT product_categories_slug_version UNIQUE (slug, taxonomy_version),
  CONSTRAINT product_categories_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT product_categories_root_level CHECK ((parent_id IS NULL) = (level = 1))
);

-- Unicità fra fratelli: indici parziali distinti per gestire parent_id NULL.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pc_root_name
  ON public.product_categories (taxonomy_version, lower(display_name)) WHERE parent_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pc_sibling_name
  ON public.product_categories (parent_id, lower(display_name)) WHERE parent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pc_root_slug
  ON public.product_categories (taxonomy_version, slug) WHERE parent_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_pc_parent ON public.product_categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_pc_active_sort ON public.product_categories (is_active, sort_order);

GRANT SELECT ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;
REVOKE ALL ON public.product_categories FROM anon;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_read" ON public.product_categories
  FOR SELECT TO authenticated USING (public.can_edit_products((SELECT auth.uid())));
CREATE POLICY "categories_admin_write" ON public.product_categories
  FOR ALL TO authenticated
  USING (public.can_manage_taxonomy((SELECT auth.uid())))
  WITH CHECK (public.can_manage_taxonomy((SELECT auth.uid())));

CREATE TRIGGER trg_pc_hierarchy BEFORE INSERT OR UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.enforce_category_hierarchy();
CREATE TRIGGER trg_pc_stable_key BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.protect_category_stable_key();
CREATE TRIGGER trg_pc_descendants AFTER UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.recalc_category_descendants();
CREATE TRIGGER trg_pc_updated BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 2. product_category_source_map — mapping legacy, molti-a-molti ammesso
--    con protezione contro mapping primari approvati contraddittori.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_category_source_map (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system       text NOT NULL DEFAULT 'woocommerce'
                        CHECK (source_system IN ('woocommerce','bulbi','shopify','manuale','altro')),
  source_profile      text NOT NULL DEFAULT 'default',
  source_path_original text NOT NULL,
  source_path_norm    text NOT NULL,
  target_category     uuid REFERENCES public.product_categories(id) ON DELETE RESTRICT,
  assignment_role     text NOT NULL DEFAULT 'primary'
                        CHECK (assignment_role IN ('primary','secondary')),
  mapping_status      text NOT NULL DEFAULT 'proposed'
                        CHECK (mapping_status IN ('proposed','approved','rejected','ambiguous','unmapped')),
  mapping_method      text NOT NULL DEFAULT 'rule'
                        CHECK (mapping_method IN ('rule','exact','alias','ai','manual','import')),
  confidence          numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  approved_by         uuid,
  approved_at         timestamptz,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- molti-a-molti consentito: lo stesso percorso sorgente può proporre più
  -- target; è vietato solo il duplicato esatto della stessa coppia.
  CONSTRAINT pcsm_source_target_key UNIQUE (source_system, source_profile, source_path_norm, target_category),
  CONSTRAINT pcsm_approved_needs_target CHECK (mapping_status <> 'approved' OR target_category IS NOT NULL),
  CONSTRAINT pcsm_approved_needs_actor  CHECK (mapping_status <> 'approved' OR approved_by IS NOT NULL)
);
-- un solo mapping PRIMARIO approvato per percorso sorgente; i secondari
-- approvati restano illimitati, gli ambigui restano proponibili.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pcsm_primary_approved
  ON public.product_category_source_map (source_system, source_profile, source_path_norm)
  WHERE assignment_role = 'primary' AND mapping_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_pcsm_status ON public.product_category_source_map (mapping_status);
CREATE INDEX IF NOT EXISTS idx_pcsm_norm ON public.product_category_source_map (source_path_norm);

GRANT SELECT ON public.product_category_source_map TO authenticated;
GRANT ALL ON public.product_category_source_map TO service_role;
REVOKE ALL ON public.product_category_source_map FROM anon;
ALTER TABLE public.product_category_source_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_map_read" ON public.product_category_source_map
  FOR SELECT TO authenticated USING (public.can_edit_products((SELECT auth.uid())));
CREATE POLICY "cat_map_admin_write" ON public.product_category_source_map
  FOR ALL TO authenticated
  USING (public.can_manage_taxonomy((SELECT auth.uid())))
  WITH CHECK (public.can_manage_taxonomy((SELECT auth.uid())));
CREATE TRIGGER trg_pcsm_updated BEFORE UPDATE ON public.product_category_source_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 3. product_category_assignments — molti-a-molti prodotto/categoria
--    Identità prodotto: public.products.id (canonica).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_category_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  category_id   uuid NOT NULL REFERENCES public.product_categories(id) ON DELETE RESTRICT,
  is_primary    boolean NOT NULL DEFAULT false,
  origin        text NOT NULL DEFAULT 'mapping'
                  CHECK (origin IN ('mapping','manual_override','ai_proposal','shopify_backfill','import')),
  status        text NOT NULL DEFAULT 'proposed'
                  CHECK (status IN ('proposed','approved','rejected')),
  source_map_id uuid REFERENCES public.product_category_source_map(id) ON DELETE SET NULL,
  proposed_by   uuid,
  approved_by   uuid,
  approved_at   timestamptz,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pca_product_category_key UNIQUE (product_id, category_id),
  CONSTRAINT pca_approved_needs_actor CHECK (status <> 'approved' OR approved_by IS NOT NULL)
);
-- una sola primaria approvata per prodotto; secondarie sempre ammesse
CREATE UNIQUE INDEX IF NOT EXISTS uq_pca_primary
  ON public.product_category_assignments (product_id) WHERE is_primary AND status = 'approved';
CREATE INDEX IF NOT EXISTS idx_pca_category ON public.product_category_assignments (category_id);
CREATE INDEX IF NOT EXISTS idx_pca_status ON public.product_category_assignments (status);

GRANT SELECT ON public.product_category_assignments TO authenticated;
GRANT ALL ON public.product_category_assignments TO service_role;
REVOKE ALL ON public.product_category_assignments FROM anon;
ALTER TABLE public.product_category_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_assign_read" ON public.product_category_assignments
  FOR SELECT TO authenticated USING (public.can_edit_products((SELECT auth.uid())));
CREATE POLICY "cat_assign_propose" ON public.product_category_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_products((SELECT auth.uid())) AND status = 'proposed');
CREATE POLICY "cat_assign_admin_write" ON public.product_category_assignments
  FOR UPDATE TO authenticated
  USING (public.can_manage_taxonomy((SELECT auth.uid())))
  WITH CHECK (public.can_manage_taxonomy((SELECT auth.uid())));
CREATE TRIGGER trg_pca_updated BEFORE UPDATE ON public.product_category_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 4. product_category_shopify_map — solo registrazione, nessuna creazione
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_category_shopify_map (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id           uuid NOT NULL REFERENCES public.product_categories(id) ON DELETE RESTRICT,
  shopify_handle        text NOT NULL,
  shopify_collection_gid text,
  map_status            text NOT NULL DEFAULT 'unverified'
                          CHECK (map_status IN ('unverified','verified','missing','conflict','disabled')),
  approved_by           uuid,
  approved_at           timestamptz,
  last_checked_at       timestamptz,
  last_error            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pcshm_category_handle_key UNIQUE (category_id, shopify_handle),
  CONSTRAINT pcshm_gid_key UNIQUE (shopify_collection_gid)
);
CREATE INDEX IF NOT EXISTS idx_pcshm_status ON public.product_category_shopify_map (map_status);

GRANT SELECT ON public.product_category_shopify_map TO authenticated;
GRANT ALL ON public.product_category_shopify_map TO service_role;
REVOKE ALL ON public.product_category_shopify_map FROM anon;
ALTER TABLE public.product_category_shopify_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_shopify_map_read" ON public.product_category_shopify_map
  FOR SELECT TO authenticated USING (public.can_edit_products((SELECT auth.uid())));
CREATE POLICY "cat_shopify_map_admin_write" ON public.product_category_shopify_map
  FOR ALL TO authenticated
  USING (public.can_manage_taxonomy((SELECT auth.uid())))
  WITH CHECK (public.can_manage_taxonomy((SELECT auth.uid())));
CREATE TRIGGER trg_pcshm_updated BEFORE UPDATE ON public.product_category_shopify_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 5. bulbi_classification_matrix — identità via product_id, nessuno SKU
--    duplicato: lo SKU si ricava con JOIN su public.products.
--    Tipologia botanica e stagione proposta restano campi separati.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bulbi_classification_matrix (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  botanical_type      text NOT NULL,   -- Tulipani, Iris, Dalie, ... SEMPRE conservato
  proposed_season     text CHECK (proposed_season IN ('primaverile','estiva','autunnale')),
  proposal_source     text NOT NULL DEFAULT 'rule'
                        CHECK (proposal_source IN ('rule','ai','manual','fornitore')),
  confidence          numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  review_status       text NOT NULL DEFAULT 'unclassified'
                        CHECK (review_status IN ('unclassified','proposed','approved','rejected','needs_review')),
  manual_override     text CHECK (manual_override IN ('primaverile','estiva','autunnale')),
  approved_by         uuid,
  approved_at         timestamptz,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bcm_product_key UNIQUE (product_id),
  CONSTRAINT bcm_approved_needs_season
    CHECK (review_status <> 'approved' OR COALESCE(manual_override, proposed_season) IS NOT NULL),
  CONSTRAINT bcm_approved_needs_actor
    CHECK (review_status <> 'approved' OR approved_by IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_bcm_status ON public.bulbi_classification_matrix (review_status);
CREATE INDEX IF NOT EXISTS idx_bcm_botanical ON public.bulbi_classification_matrix (botanical_type);

GRANT SELECT ON public.bulbi_classification_matrix TO authenticated;
GRANT ALL ON public.bulbi_classification_matrix TO service_role;
REVOKE ALL ON public.bulbi_classification_matrix FROM anon;
ALTER TABLE public.bulbi_classification_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bulbi_matrix_read" ON public.bulbi_classification_matrix
  FOR SELECT TO authenticated USING (public.can_edit_products((SELECT auth.uid())));
CREATE POLICY "bulbi_matrix_admin_write" ON public.bulbi_classification_matrix
  FOR ALL TO authenticated
  USING (public.can_manage_taxonomy((SELECT auth.uid())))
  WITH CHECK (public.can_manage_taxonomy((SELECT auth.uid())));
CREATE TRIGGER trg_bcm_updated BEFORE UPDATE ON public.bulbi_classification_matrix
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 6. Grant minimi sulle funzioni introdotte
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.can_manage_taxonomy(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_taxonomy(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_category_hierarchy() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.recalc_category_descendants() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.protect_category_stable_key() FROM PUBLIC, anon, authenticated, service_role;

-- ROLLBACK LOGICO: tabelle nuove e vuote. Rollback = non popolarle e
-- disattivare logicamente (is_active = false). Nessun DELETE automatico.
