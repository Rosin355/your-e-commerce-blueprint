-- =====================================================================
-- F4.5 / F4.6 / F4.7 — Query READ-ONLY usate per l'audit (solo SELECT)
-- Nessuna DDL, nessuna DML. Rieseguibili senza effetti collaterali.
-- =====================================================================

-- [1] Struttura tabella legacy
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'product_sync_csv_products'
ORDER BY ordinal_position;

-- [2] Stato di riempimento delle tabelle del modello
SELECT
  (SELECT count(*) FROM public.product_sync_csv_products) AS legacy_rows,
  (SELECT count(*) FROM public.products)                  AS canonical,
  (SELECT count(*) FROM public.product_field_definitions) AS field_defs,
  (SELECT count(*) FROM public.product_categories)        AS categories,
  (SELECT count(*) FROM public.product_current_values)    AS current_values,
  (SELECT count(*) FROM public.product_source_snapshots)  AS snapshots,
  (SELECT count(*) FROM public.product_import_batches)    AS batches,
  (SELECT count(*) FROM public.product_ai_suggestions)    AS ai_suggestions,
  (SELECT count(*) FROM public.product_field_history)     AS history,
  (SELECT count(*) FROM public.product_publication_jobs)  AS pub_jobs,
  (SELECT count(*) FROM public.product_category_assignments) AS assignments,
  (SELECT count(*) FROM public.bulbi_classification_matrix)  AS bulbi;

-- [3] Provenienza righe legacy
SELECT source_file, count(*) FROM public.product_sync_csv_products GROUP BY 1;

-- [4] Chiavi JSON: metafields manuali/AI
SELECT k, count(*) c
FROM public.product_sync_csv_products, LATERAL jsonb_object_keys(coalesce(metafields,'{}'::jsonb)) k
GROUP BY k ORDER BY c DESC;

-- [5] Chiavi JSON: payload AI
SELECT k, count(*) c
FROM public.product_sync_csv_products, LATERAL jsonb_object_keys(coalesce(ai_enrichment_json,'{}'::jsonb)) k
GROUP BY k ORDER BY c DESC;

-- [6] Copertura identità canonica (attesi 0 orfani)
SELECT count(*) AS legacy_senza_product_id
FROM public.product_sync_csv_products l
LEFT JOIN public.products p ON p.sku_norm = lower(btrim(l.sku))
WHERE p.id IS NULL;

-- [7] Categorie per tipo prodotto
WITH j AS (
  SELECT p.entity_type, nullif(btrim(l.product_category),'') AS cat
  FROM public.product_sync_csv_products l
  JOIN public.products p ON p.sku_norm = lower(btrim(l.sku))
)
SELECT entity_type, count(*) AS tot, count(cat) AS con_categoria,
       count(*) - count(cat) AS senza_categoria
FROM j GROUP BY 1 ORDER BY 1;

-- [8] Ereditarietà categoria parent -> variation
WITH pc AS (
  SELECT p.id, p.entity_type, p.parent_product_id, nullif(btrim(l.product_category),'') AS cat
  FROM public.product_sync_csv_products l
  JOIN public.products p ON p.sku_norm = lower(btrim(l.sku))
)
SELECT
  count(*) FILTER (WHERE v.cat IS NULL AND par.cat IS NOT NULL) AS variation_con_categoria_ereditabile,
  count(*) FILTER (WHERE v.cat IS NULL AND par.cat IS NULL)     AS variation_parent_senza_categoria,
  count(*) FILTER (WHERE par.id IS NULL)                        AS variation_senza_parent
FROM pc v LEFT JOIN pc par ON par.id = v.parent_product_id
WHERE v.entity_type = 'variation';

-- [9] Categorie raw uniche
SELECT nullif(btrim(product_category),'') AS cat, count(*) c
FROM public.product_sync_csv_products GROUP BY 1 ORDER BY c DESC NULLS LAST;

-- [10] Qualità prezzi / immagini / inventario
SELECT
  count(*) FILTER (WHERE price IS NULL)                       AS price_assenti,
  count(*) FILTER (WHERE price <= 0)                          AS price_non_validi,
  count(*) FILTER (WHERE image_urls IS NULL)                  AS immagini_null,
  count(*) FILTER (WHERE jsonb_typeof(image_urls) <> 'array') AS immagini_non_array,
  count(*) FILTER (WHERE image_urls = '[]'::jsonb)            AS immagini_lista_vuota,
  count(inventory_quantity)                                   AS inventario_valorizzato
FROM public.product_sync_csv_products;

-- [11] Controllo SKU manuale di riferimento
SELECT sku, jsonb_pretty(metafields) FROM public.product_sync_csv_products WHERE sku = 'OG_393883';

-- [12] Stima dimensione baseline
SELECT avg(pg_column_size(l.*))::int AS avg_row_bytes, sum(pg_column_size(l.*)) AS tot_bytes
FROM public.product_sync_csv_products l;
