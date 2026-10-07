\set ON_ERROR_STOP on

-- ADMIN SHOPIFY ID BACKFILL
--
-- Uso sicuro (default DRY RUN):
--   psql "$SUPABASE_DB_URL" -X -v backfill_mode=dry-run \
--     -f scripts/admin-shopify-id-backfill.sql
--
-- Execute controllato (solo dopo approvazione del report DRY RUN):
--   psql "$SUPABASE_DB_URL" -X -v backfill_mode=execute \
--     -f scripts/admin-shopify-id-backfill.sql
--
-- Il ledger e' solo evidenza di riconciliazione. Il runtime Admin continua a
-- leggere esclusivamente product_sync_csv_products.shopify_product_id.

\if :{?backfill_mode}
\else
  \set backfill_mode dry-run
\endif

SELECT lower(:'backfill_mode') IN ('dry-run', 'execute') AS backfill_mode_valid,
       lower(:'backfill_mode') = 'execute' AS backfill_execute
\gset

\if :backfill_mode_valid
\else
  \echo 'ERRORE: backfill_mode deve essere dry-run oppure execute.'
  \quit 3
\endif

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '10min';
SELECT set_config(
  'app.admin_shopify_id_backfill_mode',
  lower(:'backfill_mode'),
  true
);

\if :backfill_execute
  LOCK TABLE public.product_sync_csv_products IN SHARE ROW EXCLUSIVE MODE;
\else
  LOCK TABLE public.product_sync_csv_products IN SHARE MODE;
\endif

DO $$
DECLARE
  required_table text;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'public.product_sync_csv_products',
    'public.products',
    'public.product_current_values',
    'public.product_field_history',
    'public.shopify_creation_ledger'
  ] LOOP
    IF to_regclass(required_table) IS NULL THEN
      RAISE EXCEPTION 'BACKFILL_SCHEMA_MISMATCH: tabella % assente', required_table;
    END IF;
  END LOOP;
END $$;

CREATE TEMP TABLE _admin_shopify_backfill_before ON COMMIT DROP AS
SELECT
  (SELECT count(*) FROM public.product_sync_csv_products) AS catalog_rows,
  (SELECT count(*)
     FROM public.product_sync_csv_products
    WHERE nullif(btrim(shopify_product_id), '') IS NOT NULL) AS non_null_shopify_ids,
  (SELECT md5(coalesce(string_agg(md5(to_jsonb(pcv)::text), '' ORDER BY pcv.id::text), ''))
     FROM public.product_current_values pcv) AS current_values_hash,
  (SELECT count(*) FROM public.product_current_values) AS current_values_rows,
  (SELECT md5(coalesce(string_agg(md5(to_jsonb(h)::text), '' ORDER BY h.id::text), ''))
     FROM public.product_field_history h) AS history_hash,
  (SELECT count(*) FROM public.product_field_history) AS history_rows,
  (SELECT md5(coalesce(string_agg(
            md5((to_jsonb(c) - 'shopify_product_id' - 'updated_at')::text),
            '' ORDER BY c.sku), ''))
     FROM public.product_sync_csv_products c) AS protected_catalog_hash;

-- Soltanto queste prove sono considerate verificate:
-- - creazione parent/variant completata e marcata verified_at;
-- - pubblicazione SET_ACTIVE nello stato finale VERIFIED, con applied_at.
CREATE TEMP TABLE _admin_shopify_verified_evidence ON COMMIT DROP AS
SELECT
  l.id AS ledger_id,
  l.internal_sku,
  l.operation,
  l.shopify_product_id,
  (l.shopify_product_id ~ '^gid://shopify/Product/[1-9][0-9]*$') AS valid_gid
FROM public.shopify_creation_ledger l
WHERE nullif(btrim(l.internal_sku), '') IS NOT NULL
  AND nullif(btrim(l.shopify_product_id), '') IS NOT NULL
  AND (
    (
      l.operation IN ('CREATE_PARENT', 'CREATE_VARIANT')
      AND l.status IN ('APPLIED', 'RECONCILED', 'VERIFIED')
      AND l.verified_at IS NOT NULL
    )
    OR (
      l.operation = 'SET_ACTIVE'
      AND l.status = 'VERIFIED'
      AND l.applied_at IS NOT NULL
      AND l.verified_at IS NOT NULL
    )
  );

CREATE TEMP TABLE _admin_shopify_parent_id_owners ON COMMIT DROP AS
SELECT e.shopify_product_id,
       count(DISTINCT e.internal_sku) AS parent_sku_count
FROM _admin_shopify_verified_evidence e
WHERE e.valid_gid
  AND e.operation IN ('CREATE_PARENT', 'SET_ACTIVE')
GROUP BY e.shopify_product_id;

-- Inventario completo delle prove 3B.2/3B.4 e delle ripetizioni. Piu' righe
-- sullo stesso SKU/GID (es. CREATE_PARENT + SET_ACTIVE) sono prove ridondanti;
-- piu' GID distinti per lo stesso SKU sono un conflitto.
SELECT
  count(*) AS "VERIFIED_LEDGER_EVIDENCE_ROWS",
  count(*) FILTER (WHERE valid_gid) AS "VALID_GID_EVIDENCE_ROWS",
  count(*) FILTER (WHERE NOT valid_gid) AS "INVALID_GID_EVIDENCE_ROWS",
  count(DISTINCT internal_sku) AS "VERIFIED_LEDGER_SKUS",
  count(DISTINCT (internal_sku, shopify_product_id)) FILTER (WHERE valid_gid)
    AS "DISTINCT_VALID_MAPPINGS"
FROM _admin_shopify_verified_evidence;

SELECT
  internal_sku,
  count(*) AS evidence_rows,
  count(DISTINCT shopify_product_id) AS distinct_product_ids,
  array_agg(DISTINCT operation ORDER BY operation) AS operations,
  array_agg(DISTINCT shopify_product_id ORDER BY shopify_product_id)
    AS shopify_product_ids,
  CASE
    WHEN count(DISTINCT shopify_product_id) > 1 THEN 'CONFLICT'
    ELSE 'DUPLICATE_EVIDENCE'
  END AS evidence_classification
FROM _admin_shopify_verified_evidence
GROUP BY internal_sku
HAVING count(*) > 1
ORDER BY evidence_classification, internal_sku;

-- Una riga variation e' eleggibile solo se:
-- 1. products.parent_product_id identifica esattamente il parent;
-- 2. parent_sku del catalogo coincide esattamente con lo SKU del parent;
-- 3. CREATE_VARIANT prova lo stesso Product GID del parent verificato.
CREATE TEMP TABLE _admin_shopify_backfill_plan ON COMMIT DROP AS
WITH catalog_identity AS (
  SELECT
    c.sku,
    c.parent_sku AS catalog_parent_sku,
    c.shopify_product_id AS current_shopify_product_id,
    p.id AS canonical_product_id,
    p.entity_type,
    parent.id AS canonical_parent_id,
    parent.sku AS canonical_parent_sku,
    CASE
      WHEN p.id IS NULL THEN false
      WHEN p.sku IS DISTINCT FROM c.sku THEN false
      WHEN p.entity_type = 'variation' THEN
        parent.id IS NOT NULL
        AND parent.entity_type = 'variable'
        AND c.parent_sku IS NOT DISTINCT FROM parent.sku
      ELSE
        p.parent_product_id IS NULL
        AND nullif(btrim(coalesce(c.parent_sku, '')), '') IS NULL
    END AS identity_consistent
  FROM public.product_sync_csv_products c
  LEFT JOIN public.products p ON p.sku = c.sku
  LEFT JOIN public.products parent ON parent.id = p.parent_product_id
),
direct_valid AS (
  SELECT
    i.sku,
    e.shopify_product_id
  FROM catalog_identity i
  JOIN _admin_shopify_verified_evidence e
    ON e.internal_sku = i.sku
   AND e.valid_gid
   AND (
     (i.entity_type = 'variation' AND e.operation = 'CREATE_VARIANT')
     OR
     (i.entity_type <> 'variation' AND e.operation IN ('CREATE_PARENT', 'SET_ACTIVE'))
   )
),
parent_valid AS (
  SELECT
    i.sku,
    e.shopify_product_id
  FROM catalog_identity i
  JOIN _admin_shopify_verified_evidence e
    ON i.entity_type = 'variation'
   AND e.internal_sku = i.canonical_parent_sku
   AND e.operation IN ('CREATE_PARENT', 'SET_ACTIVE')
   AND e.valid_gid
),
eligible_ids AS (
  SELECT i.sku, d.shopify_product_id
  FROM catalog_identity i
  JOIN direct_valid d ON d.sku = i.sku
  WHERE i.entity_type <> 'variation'
  UNION
  SELECT i.sku, d.shopify_product_id
  FROM catalog_identity i
  JOIN direct_valid d ON d.sku = i.sku
  JOIN parent_valid p
    ON p.sku = i.sku
   AND p.shopify_product_id = d.shopify_product_id
  WHERE i.entity_type = 'variation'
),
evidence_stats AS (
  SELECT
    i.sku,
    count(DISTINCT x.shopify_product_id) AS candidate_id_count,
    min(x.shopify_product_id) AS candidate_shopify_product_id,
    count(DISTINCT d.shopify_product_id) AS direct_valid_id_count,
    count(DISTINCT pv.shopify_product_id) AS parent_valid_id_count,
    count(DISTINCT bad.ledger_id) AS invalid_evidence_count
  FROM catalog_identity i
  LEFT JOIN eligible_ids x ON x.sku = i.sku
  LEFT JOIN direct_valid d ON d.sku = i.sku
  LEFT JOIN parent_valid pv ON pv.sku = i.sku
  LEFT JOIN _admin_shopify_verified_evidence bad
    ON NOT bad.valid_gid
   AND (
     bad.internal_sku = i.sku
     OR (i.entity_type = 'variation' AND bad.internal_sku = i.canonical_parent_sku)
   )
  GROUP BY i.sku
),
classified AS (
  SELECT
    i.*,
    s.candidate_id_count,
    s.candidate_shopify_product_id,
    s.direct_valid_id_count,
    s.parent_valid_id_count,
    s.invalid_evidence_count,
    coalesce(o.parent_sku_count, 0) AS product_id_parent_owner_count,
    CASE
      WHEN nullif(btrim(i.current_shopify_product_id), '') IS NOT NULL THEN
        CASE
          WHEN i.identity_consistent
           AND s.candidate_id_count = 1
           AND s.invalid_evidence_count = 0
           AND coalesce(o.parent_sku_count, 0) = 1
           AND i.current_shopify_product_id = s.candidate_shopify_product_id
          THEN 'EXISTING_MATCH'
          ELSE 'CONFLICT'
        END
      WHEN NOT i.identity_consistent THEN 'CONFLICT'
      WHEN s.invalid_evidence_count > 0 THEN 'CONFLICT'
      WHEN s.candidate_id_count > 1 THEN 'CONFLICT'
      WHEN s.candidate_id_count = 1 AND coalesce(o.parent_sku_count, 0) <> 1 THEN 'CONFLICT'
      WHEN i.entity_type = 'variation'
       AND (s.direct_valid_id_count <> 1 OR s.parent_valid_id_count <> 1)
      THEN CASE
        WHEN s.direct_valid_id_count = 0 AND s.parent_valid_id_count = 0
        THEN 'UNMATCHED'
        ELSE 'CONFLICT'
      END
      WHEN s.candidate_id_count = 1 THEN 'SAFE_BACKFILL'
      WHEN s.direct_valid_id_count = 0 THEN 'UNMATCHED'
      ELSE 'CONFLICT'
    END AS classification
  FROM catalog_identity i
  JOIN evidence_stats s ON s.sku = i.sku
  LEFT JOIN _admin_shopify_parent_id_owners o
    ON o.shopify_product_id = s.candidate_shopify_product_id
)
SELECT * FROM classified;

-- Discovery aggregata richiesta. SAFE_BACKFILL/CONFLICT/UNMATCHED sono
-- calcolati sulle sole righe il cui ID Admin e' assente.
SELECT
  count(*) FILTER (
    WHERE nullif(btrim(current_shopify_product_id), '') IS NULL
  ) AS "TOTAL_MISSING",
  count(*) FILTER (
    WHERE nullif(btrim(current_shopify_product_id), '') IS NULL
      AND classification = 'SAFE_BACKFILL'
  ) AS "SAFE_BACKFILL",
  count(*) FILTER (
    WHERE nullif(btrim(current_shopify_product_id), '') IS NULL
      AND classification = 'CONFLICT'
  ) AS "CONFLICT",
  count(*) FILTER (
    WHERE nullif(btrim(current_shopify_product_id), '') IS NULL
      AND classification = 'UNMATCHED'
  ) AS "UNMATCHED",
  count(*) FILTER (WHERE classification = 'EXISTING_MATCH') AS "EXISTING_MATCH",
  count(*) FILTER (
    WHERE nullif(btrim(current_shopify_product_id), '') IS NOT NULL
      AND classification = 'CONFLICT'
  ) AS "EXISTING_CONFLICT"
FROM _admin_shopify_backfill_plan;

DO $$
DECLARE
  total_missing bigint;
  classified_missing bigint;
BEGIN
  SELECT
    count(*) FILTER (
      WHERE nullif(btrim(current_shopify_product_id), '') IS NULL
    ),
    count(*) FILTER (
      WHERE nullif(btrim(current_shopify_product_id), '') IS NULL
        AND classification IN ('SAFE_BACKFILL', 'CONFLICT', 'UNMATCHED')
    )
  INTO total_missing, classified_missing
  FROM _admin_shopify_backfill_plan;

  IF total_missing <> classified_missing THEN
    RAISE EXCEPTION
      'BACKFILL_CLASSIFICATION_FAILED: mancanti %, classificati %',
      total_missing,
      classified_missing;
  END IF;
END $$;

-- Report analitico: e' l'elenco esatto da approvare prima dell'execute.
SELECT
  classification,
  sku,
  entity_type,
  canonical_parent_sku,
  current_shopify_product_id,
  candidate_shopify_product_id,
  candidate_id_count,
  direct_valid_id_count,
  parent_valid_id_count,
  invalid_evidence_count,
  product_id_parent_owner_count,
  identity_consistent
FROM _admin_shopify_backfill_plan
WHERE classification <> 'EXISTING_MATCH'
ORDER BY classification, sku;

CREATE TEMP TABLE _admin_shopify_exact_targets ON COMMIT DROP AS
SELECT sku, candidate_shopify_product_id
FROM _admin_shopify_backfill_plan
WHERE classification = 'SAFE_BACKFILL'
  AND nullif(btrim(current_shopify_product_id), '') IS NULL;

\if :backfill_execute
  WITH changed AS (
    UPDATE public.product_sync_csv_products c
       SET shopify_product_id = t.candidate_shopify_product_id
      FROM _admin_shopify_exact_targets t
     WHERE c.sku = t.sku
       AND nullif(btrim(c.shopify_product_id), '') IS NULL
    RETURNING c.sku, c.shopify_product_id
  )
  SELECT count(*) AS "WRITES" FROM changed;
\else
  SELECT 0::bigint AS "WRITES",
         count(*) AS "WOULD_WRITE"
  FROM _admin_shopify_exact_targets;
\endif

-- Postcondizioni: qualunque mutazione fuori dalla singola colonna target
-- (oltre a updated_at, mantenuto dal trigger storico della tabella) abortisce.
DO $$
DECLARE
  before_snapshot _admin_shopify_backfill_before%ROWTYPE;
  after_catalog_rows bigint;
  after_non_null bigint;
  after_current_values_rows bigint;
  after_current_values_hash text;
  after_history_rows bigint;
  after_history_hash text;
  after_protected_catalog_hash text;
  expected_writes bigint;
  canary_id text;
BEGIN
  SELECT * INTO STRICT before_snapshot FROM _admin_shopify_backfill_before;
  SELECT count(*) INTO after_catalog_rows FROM public.product_sync_csv_products;
  SELECT count(*) INTO after_non_null
    FROM public.product_sync_csv_products
   WHERE nullif(btrim(shopify_product_id), '') IS NOT NULL;
  SELECT count(*), md5(coalesce(string_agg(md5(to_jsonb(pcv)::text), '' ORDER BY pcv.id::text), ''))
    INTO after_current_values_rows, after_current_values_hash
    FROM public.product_current_values pcv;
  SELECT count(*), md5(coalesce(string_agg(md5(to_jsonb(h)::text), '' ORDER BY h.id::text), ''))
    INTO after_history_rows, after_history_hash
    FROM public.product_field_history h;
  SELECT md5(coalesce(string_agg(
           md5((to_jsonb(c) - 'shopify_product_id' - 'updated_at')::text),
           '' ORDER BY c.sku), ''))
    INTO after_protected_catalog_hash
    FROM public.product_sync_csv_products c;
  SELECT count(*) INTO expected_writes FROM _admin_shopify_exact_targets;

  IF after_catalog_rows <> before_snapshot.catalog_rows THEN
    RAISE EXCEPTION 'BACKFILL_VERIFY_FAILED: numero righe catalogo modificato';
  END IF;
  IF after_current_values_rows <> before_snapshot.current_values_rows
     OR after_current_values_hash <> before_snapshot.current_values_hash THEN
    RAISE EXCEPTION 'BACKFILL_VERIFY_FAILED: product_current_values modificata';
  END IF;
  IF after_history_rows <> before_snapshot.history_rows
     OR after_history_hash <> before_snapshot.history_hash THEN
    RAISE EXCEPTION 'BACKFILL_VERIFY_FAILED: product_field_history modificata';
  END IF;
  IF after_protected_catalog_hash <> before_snapshot.protected_catalog_hash THEN
    RAISE EXCEPTION 'BACKFILL_VERIFY_FAILED: colonna catalogo non autorizzata modificata';
  END IF;

  IF current_setting('app.admin_shopify_id_backfill_mode') = 'execute'
     AND after_non_null - before_snapshot.non_null_shopify_ids <> expected_writes THEN
    RAISE EXCEPTION
      'BACKFILL_VERIFY_FAILED: delta ID non-null %, atteso %',
      after_non_null - before_snapshot.non_null_shopify_ids,
      expected_writes;
  END IF;
  IF current_setting('app.admin_shopify_id_backfill_mode') = 'dry-run'
     AND after_non_null <> before_snapshot.non_null_shopify_ids THEN
    RAISE EXCEPTION 'BACKFILL_VERIFY_FAILED: il dry-run ha scritto dati';
  END IF;

  SELECT shopify_product_id INTO canary_id
    FROM public.product_sync_csv_products
   WHERE sku = 'OG_111899';

  IF current_setting('app.admin_shopify_id_backfill_mode') = 'execute'
     AND canary_id IS DISTINCT FROM 'gid://shopify/Product/15836694249812' THEN
    RAISE EXCEPTION
      'BACKFILL_CANARY_FAILED: OG_111899 = %, atteso gid://shopify/Product/15836694249812',
      coalesce(canary_id, '<NULL>');
  END IF;
END $$;

SELECT
  :'backfill_mode' AS mode,
  b.catalog_rows,
  (SELECT count(*) FROM public.product_sync_csv_products) AS catalog_rows_after,
  b.current_values_rows,
  b.current_values_hash,
  b.history_rows,
  b.history_hash,
  b.non_null_shopify_ids AS non_null_shopify_ids_before,
  (SELECT count(*) FROM public.product_sync_csv_products
    WHERE nullif(btrim(shopify_product_id), '') IS NOT NULL) AS non_null_shopify_ids_after,
  (SELECT shopify_product_id FROM public.product_sync_csv_products
    WHERE sku = 'OG_111899') AS og_111899_shopify_product_id
FROM _admin_shopify_backfill_before b;

\if :backfill_execute
  COMMIT;
\else
  ROLLBACK;
\endif
