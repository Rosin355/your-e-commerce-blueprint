-- =====================================================================
-- FASE 3.1a — IDENTITÀ CANONICA PRODOTTO  ·  revisione 3
-- public.products diventa l'identità canonica dell'intero nuovo Admin.
-- Migration completamente additiva: nessun backfill, nessuna riga inserita,
-- nessuna modifica alle tabelle legacy popolate
-- (product_sync_csv_products, product_enrichment_run_items, ...).
--
-- SCELTA SKU NORMALIZZATO
-- Si usa una COLONNA GENERATA STORED `sku_norm` = lower(btrim(sku)) con
-- UNIQUE ordinaria, invece di un indice univoco su espressione, perché:
--   1. il valore normalizzato è leggibile e interrogabile dal backfill
--      (JOIN diretto contro gli SKU legacy normalizzati);
--   2. può essere il bersaglio di una FK futura, cosa impossibile con un
--      indice su espressione dichiarato solo a livello di indice;
--   3. non è scrivibile dai client: è sempre derivato dallo SKU originale,
--      quindi non può divergere.
-- La forma originale dello SKU resta intatta in `sku`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Guardie di identità
-- ---------------------------------------------------------------------

-- Le colonne di identità non sono modificabili dai client (nemmeno da un
-- eventuale UPDATE via PostgREST o Edge Function): richiedono una sessione
-- tecnica esplicita. Nessuna AI può quindi alterare SKU, tipo o parent.
CREATE OR REPLACE FUNCTION public.protect_product_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.sku IS DISTINCT FROM OLD.sku
     OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
     OR NEW.parent_product_id IS DISTINCT FROM OLD.parent_product_id THEN
    IF NOT (current_setting('app.allow_product_identity_change', true) = 'on'
            AND current_user = 'postgres') THEN
      RAISE EXCEPTION 'Identità prodotto immutabile: sku/entity_type/parent_product_id non modificabili'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Coerenza della relazione parent/variante + anti-ciclo con errore esplicito.
-- La FK garantisce l'esistenza del parent; il trigger garantisce che il parent
-- sia di tipo 'variable', che non esistano cicli e che la profondità non superi
-- il limite. Ogni violazione solleva un errore: nessun aggiornamento parziale,
-- l'intera transazione viene annullata.
CREATE OR REPLACE FUNCTION public.enforce_product_parent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_cursor uuid;
  v_type   text;
  v_depth  integer := 0;
BEGIN
  IF NEW.entity_type IN ('simple','variable') THEN
    IF NEW.parent_product_id IS NOT NULL THEN
      RAISE EXCEPTION 'Un prodotto % non può avere un parent', NEW.entity_type
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  -- entity_type = 'variation'
  IF NEW.parent_product_id IS NULL THEN
    RAISE EXCEPTION 'Una variation richiede parent_product_id' USING ERRCODE = '23502';
  END IF;
  IF NEW.parent_product_id = NEW.id THEN
    RAISE EXCEPTION 'Un prodotto non può essere parent di sé stesso' USING ERRCODE = '23514';
  END IF;

  SELECT entity_type INTO v_type FROM public.products WHERE id = NEW.parent_product_id;
  IF v_type IS NULL THEN
    RAISE EXCEPTION 'Parent prodotto inesistente' USING ERRCODE = '23503';
  END IF;
  IF v_type <> 'variable' THEN
    RAISE EXCEPTION 'Una variation deve puntare a un prodotto variable (trovato %)', v_type
      USING ERRCODE = '23514';
  END IF;

  -- risalita esplicita: nessun ciclo ammesso
  v_cursor := NEW.parent_product_id;
  WHILE v_cursor IS NOT NULL LOOP
    v_depth := v_depth + 1;
    IF v_depth > 4 THEN
      RAISE EXCEPTION 'Profondità gerarchia prodotto oltre il limite consentito'
        USING ERRCODE = '23514';
    END IF;
    IF v_cursor = NEW.id THEN
      RAISE EXCEPTION 'Ciclo nella gerarchia prodotto non consentito' USING ERRCODE = '23514';
    END IF;
    SELECT parent_product_id INTO v_cursor FROM public.products WHERE id = v_cursor;
  END LOOP;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 1. public.products — solo identità, nessun contenuto editoriale
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku               text NOT NULL,
  -- forma normalizzata derivata: case-insensitive e trim-safe
  sku_norm          text GENERATED ALWAYS AS (lower(btrim(sku))) STORED,
  entity_type       text NOT NULL DEFAULT 'simple'
                      CHECK (entity_type IN ('simple','variable','variation')),
  -- relazione canonica: MAI parent_sku
  parent_product_id uuid REFERENCES public.products(id)
                      ON DELETE RESTRICT
                      DEFERRABLE INITIALLY IMMEDIATE,
  legacy_source     text NOT NULL DEFAULT 'unknown'
                      CHECK (legacy_source IN ('unknown','woocommerce','bulbi','shopify','manuale')),
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_sku_not_blank CHECK (btrim(sku) <> ''),
  CONSTRAINT products_sku_norm_key UNIQUE (sku_norm),
  CONSTRAINT products_no_self_parent CHECK (parent_product_id IS NULL OR parent_product_id <> id),
  CONSTRAINT products_variation_parent
    CHECK ((entity_type = 'variation') = (parent_product_id IS NOT NULL))
);

-- La FK è DEFERRABLE: parent e variation possono essere creati nella stessa
-- transazione posticipando il controllo con SET CONSTRAINTS ... DEFERRED.
-- Il default resta IMMEDIATE, così l'errore emerge subito nel caso ordinario.
-- Il trigger di coerenza è BEFORE ROW (non differibile): l'ordine di
-- inserimento controllato (prima il variable, poi le variation) resta quindi
-- la modalità raccomandata per il backfill.

CREATE INDEX IF NOT EXISTS idx_products_parent ON public.products (parent_product_id)
  WHERE parent_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_type_active ON public.products (entity_type, is_active);

-- ---------------------------------------------------------------------
-- 2. RLS e grant
--    Lettura: qualunque ruolo redazionale autorizzato (Editor, Publisher,
--    Admin, Tech Admin) tramite can_edit_products.
--    Scrittura: NESSUNA policy per i client. La creazione e la modifica di
--    identità passano esclusivamente da API/Edge Function server-side
--    (service_role) con validazione e audit. anon: nessun accesso.
-- ---------------------------------------------------------------------
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
REVOKE ALL ON public.products FROM anon;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_read" ON public.products
  FOR SELECT TO authenticated USING (public.can_edit_products((SELECT auth.uid())));

CREATE TRIGGER trg_products_parent BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_product_parent();
CREATE TRIGGER trg_products_identity BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.protect_product_identity();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

REVOKE ALL ON FUNCTION public.protect_product_identity() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_product_parent() FROM PUBLIC, anon, authenticated, service_role;

-- Rollback logico: tabella nuova e vuota. Nessun impatto se non popolata.
