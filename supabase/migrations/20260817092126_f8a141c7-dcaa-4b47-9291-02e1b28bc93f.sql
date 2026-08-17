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

CREATE TABLE IF NOT EXISTS public.products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku               text NOT NULL,
  sku_norm          text GENERATED ALWAYS AS (lower(btrim(sku))) STORED,
  entity_type       text NOT NULL DEFAULT 'simple'
                      CHECK (entity_type IN ('simple','variable','variation')),
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

CREATE INDEX IF NOT EXISTS idx_products_parent ON public.products (parent_product_id)
  WHERE parent_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_type_active ON public.products (entity_type, is_active);

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