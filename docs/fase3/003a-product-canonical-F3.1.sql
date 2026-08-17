-- =====================================================================
-- FASE 3.1a — ENTITÀ CANONICA PRODOTTO  ·  PREPARATA, NON APPLICATA
-- BLOCCANTE per F3.1: oggi `sku` è testo libero in 6 tabelle senza alcuna
-- foreign key. Senza un'entità canonica, le assegnazioni categoria
-- resterebbero orfane, non vincolate e non deduplicabili.
-- Migration completamente additiva: nessun backfill, nessuna riga inserita,
-- nessuna modifica alle 7 tabelle F3 né a product_sync_csv_products.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.products (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- identità canonica stabile
  sku            text NOT NULL,                               -- chiave naturale, univoca
  legacy_source  text NOT NULL DEFAULT 'unknown'
                   CHECK (legacy_source IN ('unknown','woocommerce','bulbi','shopify','manuale')),
  entity_type    text NOT NULL DEFAULT 'product'
                   CHECK (entity_type IN ('product','variant')),
  parent_sku     text,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_sku_key UNIQUE (sku),
  CONSTRAINT products_variant_parent CHECK (entity_type <> 'variant' OR parent_sku IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_products_parent_sku ON public.products (parent_sku) WHERE parent_sku IS NOT NULL;

GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
REVOKE ALL ON public.products FROM anon;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_read" ON public.products
  FOR SELECT TO authenticated USING (public.can_edit_products((SELECT auth.uid())));
CREATE POLICY "products_admin_write" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()),'admin') OR public.has_role((SELECT auth.uid()),'tech_admin'))
  WITH CHECK (public.has_role((SELECT auth.uid()),'admin') OR public.has_role((SELECT auth.uid()),'tech_admin'));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Popolamento: NON incluso. La tabella nasce vuota; il popolamento da
-- product_sync_csv_products / snapshot è un'operazione di backfill separata
-- e da autorizzare esplicitamente.
--
-- Rollback logico: tabella nuova e vuota, nessun impatto se non popolata.
