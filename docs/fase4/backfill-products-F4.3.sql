-- =====================================================================
-- FASE 4.3 — BACKFILL IDENTITÀ CANONICA public.products
-- Sorgente read-only: public.product_sync_csv_products (mai modificata).
-- Idempotente (INSERT ... WHERE NOT EXISTS su sku_norm), nessun
-- ON CONFLICT DO UPDATE, nessuna riga esistente modificata.
-- Non crea current values, snapshot, proposte AI, storico, job,
-- assegnazioni categoria. Nessuna chiamata Shopify.
--
-- Classificazione entity_type (dedotta dalla relazione parent reale del
-- CSV WooCommerce, non da un default):
--   variation = la riga ha parent_sku valorizzato;
--   variable  = la riga è parent di almeno una variation;
--   simple    = né parent né figlio.
-- =====================================================================

-- Passo 1 — simple + variable
INSERT INTO public.products (sku, entity_type, parent_product_id, legacy_source, is_active)
SELECT s.sku,
       CASE WHEN EXISTS (
              SELECT 1 FROM public.product_sync_csv_products c
               WHERE lower(btrim(c.parent_sku)) = lower(btrim(s.sku))
            ) THEN 'variable' ELSE 'simple' END,
       NULL, 'woocommerce', true
FROM public.product_sync_csv_products s
WHERE nullif(btrim(coalesce(s.parent_sku, '')), '') IS NULL
  AND btrim(coalesce(s.sku, '')) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.products p WHERE p.sku_norm = lower(btrim(s.sku))
  );

-- Passo 2 — variation, parent risolto per SKU normalizzato (mai parent_sku)
INSERT INTO public.products (sku, entity_type, parent_product_id, legacy_source, is_active)
SELECT s.sku, 'variation', p.id, 'woocommerce', true
FROM public.product_sync_csv_products s
JOIN public.products p ON p.sku_norm = lower(btrim(s.parent_sku))
WHERE nullif(btrim(coalesce(s.parent_sku, '')), '') IS NOT NULL
  AND btrim(coalesce(s.sku, '')) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.products x WHERE x.sku_norm = lower(btrim(s.sku))
  );
