-- =====================================================================
-- F4.6c — BACKFILL current values (24.466 righe)
-- Additivo puro: nessun UPDATE, nessun DELETE, nessun ON CONFLICT DO UPDATE.
-- Sorgente read-only: public.product_sync_csv_products + public.products.
-- Baseline e legacy non vengono toccati. Nessuna chiamata Shopify.
--
-- Classi incluse:
--   READY                    16.094  (10 campi)
--   CURRENT_REVIEW_REQUIRED   8.343  (3 campi legacy AI + 9 metafield AI)
--   PROTECTED_CURRENT            29  (5 campi manuali)
-- Classi escluse (restano solo nel baseline immutabile):
--   INVENTORY_PROTECTED 920 · SHOPIFY_SYNC_ONLY 11.143 · SOURCE_RAW_ONLY 13.415
--   SKIP_EMPTY (null, stringhe/array/oggetti vuoti)
-- =====================================================================

BEGIN;

WITH batch AS (
  SELECT id FROM public.product_import_batches
   WHERE profile_key = 'legacy_db_baseline'
   ORDER BY created_at LIMIT 1
),
src AS (
  SELECT l.*,
         p.id           AS product_id,
         p.entity_type  AS canonical_type,
         CASE WHEN p.entity_type = 'variation' THEN 'variant' ELSE 'product' END AS pcv_entity_type,
         CASE WHEN p.entity_type = 'variation'
              THEN nullif(btrim(coalesce(l.parent_sku,'')),'') END AS pcv_parent_sku
  FROM public.product_sync_csv_products l
  JOIN public.products p ON p.sku_norm = lower(btrim(l.sku))
),
-- ------------------------------------------------------------------
-- READY — dati sorgente reali, origine baseline legacy
-- ------------------------------------------------------------------
ready AS (
  SELECT product_id, sku, pcv_parent_sku, pcv_entity_type, 'sku'::text AS field_key,
         btrim(sku) AS value_text, NULL::jsonb AS value_json, NULL::numeric AS value_number
  FROM src WHERE nullif(btrim(coalesce(sku,'')),'') IS NOT NULL
  UNION ALL
  SELECT product_id, sku, pcv_parent_sku, pcv_entity_type, 'title',
         btrim(title), NULL, NULL
  FROM src WHERE nullif(btrim(coalesce(title,'')),'') IS NOT NULL
  UNION ALL
  SELECT product_id, sku, pcv_parent_sku, pcv_entity_type, 'entity_type',
         canonical_type, NULL, NULL
  FROM src WHERE canonical_type IS NOT NULL
  UNION ALL
  SELECT product_id, sku, pcv_parent_sku, pcv_entity_type, 'price',
         NULL, NULL, price
  FROM src WHERE price IS NOT NULL
  UNION ALL
  SELECT product_id, sku, pcv_parent_sku, pcv_entity_type, 'image_urls',
         NULL, image_urls, NULL
  FROM src WHERE jsonb_typeof(image_urls) = 'array' AND jsonb_array_length(image_urls) > 0
  UNION ALL
  SELECT product_id, sku, pcv_parent_sku, pcv_entity_type, 'description',
         btrim(description), NULL, NULL
  FROM src WHERE nullif(btrim(coalesce(description,'')),'') IS NOT NULL
  UNION ALL
  SELECT product_id, sku, pcv_parent_sku, pcv_entity_type, 'parent_sku',
         btrim(parent_sku), NULL, NULL
  FROM src WHERE nullif(btrim(coalesce(parent_sku,'')),'') IS NOT NULL
  UNION ALL
  SELECT product_id, sku, pcv_parent_sku, pcv_entity_type, 'product_category_raw',
         btrim(product_category), NULL, NULL
  FROM src WHERE nullif(btrim(coalesce(product_category,'')),'') IS NOT NULL
  UNION ALL
  SELECT product_id, sku, pcv_parent_sku, pcv_entity_type, 'short_description',
         btrim(short_description), NULL, NULL
  FROM src WHERE nullif(btrim(coalesce(short_description,'')),'') IS NOT NULL
  UNION ALL
  SELECT product_id, sku, pcv_parent_sku, pcv_entity_type, 'tags',
         NULL, tags, NULL
  FROM src WHERE jsonb_typeof(tags) = 'array' AND jsonb_array_length(tags) > 0
),
-- ------------------------------------------------------------------
-- CURRENT_REVIEW_REQUIRED — contenuti AI legacy, origine non verificabile
-- ------------------------------------------------------------------
ai_legacy AS (
  SELECT product_id, sku, pcv_parent_sku, pcv_entity_type, 'seo_title'::text AS field_key,
         btrim(seo_title) AS value_text, NULL::jsonb AS value_json
  FROM src WHERE nullif(btrim(coalesce(seo_title,'')),'') IS NOT NULL
  UNION ALL
  SELECT product_id, sku, pcv_parent_sku, pcv_entity_type, 'seo_description',
         btrim(seo_description), NULL
  FROM src WHERE nullif(btrim(coalesce(seo_description,'')),'') IS NOT NULL
  UNION ALL
  SELECT product_id, sku, pcv_parent_sku, pcv_entity_type, 'optimized_description',
         btrim(optimized_description), NULL
  FROM src WHERE nullif(btrim(coalesce(optimized_description,'')),'') IS NOT NULL
  UNION ALL
  -- 9 chiavi editoriali AI presenti in metafields (valori testuali)
  SELECT s.product_id, s.sku, s.pcv_parent_sku, s.pcv_entity_type, k.key,
         btrim(s.metafields->>k.key), NULL
  FROM src s
  CROSS JOIN (VALUES ('care_info'),('come_prendersene_cura'),('conosci_meglio_la_tua_pianta'),
                     ('difficolta_di_coltivazione'),('promo_text'),('short_intro'),
                     ('titolo_sezione_faq')) AS k(key)
  WHERE nullif(btrim(coalesce(s.metafields->>k.key,'')),'') IS NOT NULL
  UNION ALL
  -- 2 chiavi lista AI: conservate come array JSON strutturato
  SELECT s.product_id, s.sku, s.pcv_parent_sku, s.pcv_entity_type, k.key,
         NULL,
         CASE WHEN jsonb_typeof((s.metafields->>k.key)::jsonb) = 'array'
              THEN (s.metafields->>k.key)::jsonb END
  FROM src s
  CROSS JOIN (VALUES ('key_features'),('special_bullets')) AS k(key)
  WHERE nullif(btrim(coalesce(s.metafields->>k.key,'')),'') IS NOT NULL
    AND jsonb_typeof((s.metafields->>k.key)::jsonb) = 'array'
    AND jsonb_array_length((s.metafields->>k.key)::jsonb) > 0
),
-- ------------------------------------------------------------------
-- PROTECTED_CURRENT — campi manuali (5 chiavi)
-- ------------------------------------------------------------------
manual AS (
  SELECT s.product_id, s.sku, s.pcv_parent_sku, s.pcv_entity_type, k.key AS field_key,
         btrim(s.metafields->>k.key) AS value_text
  FROM src s
  CROSS JOIN (VALUES ('nome_comune'),('ibridatore'),('colore_fiore'),
                     ('colore_foglia'),('curiosita')) AS k(key)
  WHERE nullif(btrim(coalesce(s.metafields->>k.key,'')),'') IS NOT NULL
),
cells AS (
  SELECT r.product_id, r.sku, r.pcv_parent_sku, r.pcv_entity_type, r.field_key,
         r.value_text, r.value_json, r.value_number,
         'import'::text  AS origin,
         false           AS is_locked,
         'legacy_db_baseline'::text AS value_origin,
         'approved'::text AS review_status,
         false           AS publish_blocked,
         fd.protected_on_reimport AS protected_on_reimport
  FROM ready r
  JOIN public.product_field_definitions fd ON fd.key = r.field_key
  UNION ALL
  SELECT a.product_id, a.sku, a.pcv_parent_sku, a.pcv_entity_type, a.field_key,
         a.value_text, a.value_json, NULL,
         'import', false,
         'legacy_ai_unknown_approval', 'legacy_unverified', true, true
  FROM ai_legacy a
  JOIN public.product_field_definitions fd ON fd.key = a.field_key
  UNION ALL
  SELECT m.product_id, m.sku, m.pcv_parent_sku, m.pcv_entity_type, m.field_key,
         m.value_text, NULL, NULL,
         'manual', true,
         'manual', 'approved', false, true
  FROM manual m
  JOIN public.product_field_definitions fd ON fd.key = m.field_key
)
INSERT INTO public.product_current_values (
  product_id, sku, parent_sku, entity_type, field_key,
  value_text, value_json, value_number,
  origin, source_batch_id, is_locked, publish_state,
  value_origin, review_status, publish_blocked, protected_on_reimport
)
SELECT c.product_id, c.sku, c.pcv_parent_sku, c.pcv_entity_type, c.field_key,
       c.value_text, c.value_json, c.value_number,
       c.origin, (SELECT id FROM batch), c.is_locked, 'draft',
       c.value_origin, c.review_status, c.publish_blocked, c.protected_on_reimport
FROM cells c
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_current_values x
   WHERE x.product_id = c.product_id AND x.field_key = c.field_key
);

-- Gate finale: il totale deve essere esattamente 24.466, altrimenti rollback.
DO $$
DECLARE t integer;
BEGIN
  SELECT count(*) INTO t FROM public.product_current_values;
  IF t <> 24466 THEN
    RAISE EXCEPTION 'NO-GO: totale current values = % (atteso 24466)', t;
  END IF;
END $$;

COMMIT;
