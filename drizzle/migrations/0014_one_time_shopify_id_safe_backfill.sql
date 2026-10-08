-- One-time SAFE_BACKFILL derived verbatim from scripts/admin-shopify-id-backfill.sql (execute branch).
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '10min';
SELECT set_config('app.admin_shopify_id_backfill_mode', 'execute', true);
LOCK TABLE public.product_sync_csv_products IN SHARE ROW EXCLUSIVE MODE;

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

CREATE TEMP TABLE _admin_shopify_existing_ids_before ON COMMIT DROP AS
SELECT md5(coalesce(string_agg(sku || '=' || shopify_product_id, '|' ORDER BY sku), '')) AS h
FROM public.product_sync_csv_products
WHERE nullif(btrim(shopify_product_id), '') IS NOT NULL;

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

CREATE TEMP TABLE _admin_shopify_exact_targets ON COMMIT DROP AS
SELECT sku, candidate_shopify_product_id
FROM _admin_shopify_backfill_plan
WHERE classification = 'SAFE_BACKFILL'
  AND nullif(btrim(current_shopify_product_id), '') IS NULL;

DO $$
DECLARE
  v_safe bigint; v_conflict bigint; v_invalid bigint; v_ambiguous bigint; v_unmatched bigint; v_existing_conflict bigint; v_canary text; v_targets bigint;
BEGIN
  SELECT
    count(*) FILTER (WHERE classification = 'SAFE_BACKFILL'),
    count(*) FILTER (WHERE nullif(btrim(current_shopify_product_id), '') IS NULL AND classification = 'CONFLICT'),
    count(*) FILTER (WHERE nullif(btrim(current_shopify_product_id), '') IS NULL AND invalid_evidence_count > 0),
    count(*) FILTER (WHERE nullif(btrim(current_shopify_product_id), '') IS NULL AND candidate_id_count > 1),
    count(*) FILTER (WHERE classification = 'UNMATCHED'),
    count(*) FILTER (WHERE nullif(btrim(current_shopify_product_id), '') IS NOT NULL AND classification = 'CONFLICT')
  INTO v_safe, v_conflict, v_invalid, v_ambiguous, v_unmatched, v_existing_conflict
  FROM _admin_shopify_backfill_plan;
  SELECT count(*) INTO v_targets FROM _admin_shopify_exact_targets;
  SELECT candidate_shopify_product_id INTO v_canary FROM _admin_shopify_backfill_plan
   WHERE sku = 'OG_111899' AND classification = 'SAFE_BACKFILL';
  IF v_safe <> 1833 OR v_targets <> 1833 THEN
    RAISE EXCEPTION 'GUARD: SAFE_BACKFILL=% targets=%, atteso 1833', v_safe, v_targets;
  END IF;
  IF v_conflict <> 0 OR v_invalid <> 0 OR v_ambiguous <> 0 THEN
    RAISE EXCEPTION 'GUARD: CONFLICT=% INVALID_GID=% AMBIGUOUS=%', v_conflict, v_invalid, v_ambiguous;
  END IF;
  IF v_unmatched <> 452 OR v_existing_conflict <> 421 THEN
    RAISE EXCEPTION 'GUARD: UNMATCHED=% EXISTING_CONFLICT=%', v_unmatched, v_existing_conflict;
  END IF;
  IF v_canary IS DISTINCT FROM 'gid://shopify/Product/15836694249812' THEN
    RAISE EXCEPTION 'GUARD: OG_111899 candidato %', coalesce(v_canary, '<NULL>');
  END IF;
END $$;

UPDATE public.product_sync_csv_products c
   SET shopify_product_id = t.candidate_shopify_product_id
  FROM _admin_shopify_exact_targets t
 WHERE c.sku = t.sku
   AND nullif(btrim(c.shopify_product_id), '') IS NULL;

DO $$
DECLARE v_h text;
BEGIN
  SELECT md5(coalesce(string_agg(c.sku || '=' || c.shopify_product_id, '|' ORDER BY c.sku), '')) INTO v_h
  FROM public.product_sync_csv_products c
  WHERE nullif(btrim(c.shopify_product_id), '') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM _admin_shopify_exact_targets t WHERE t.sku = c.sku);
  IF v_h <> (SELECT h FROM _admin_shopify_existing_ids_before) THEN
    RAISE EXCEPTION 'BACKFILL_VERIFY_FAILED: ID esistenti modificati';
  END IF;
END $$;

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
  IF after_non_null - before_snapshot.non_null_shopify_ids <> expected_writes
     OR expected_writes <> 1833 THEN
    RAISE EXCEPTION 'BACKFILL_VERIFY_FAILED: delta ID non-null %, atteso %',
      after_non_null - before_snapshot.non_null_shopify_ids, expected_writes;
  END IF;

  SELECT shopify_product_id INTO canary_id
    FROM public.product_sync_csv_products
   WHERE sku = 'OG_111899';
  IF canary_id IS DISTINCT FROM 'gid://shopify/Product/15836694249812' THEN
    RAISE EXCEPTION 'BACKFILL_CANARY_FAILED: OG_111899 = %', coalesce(canary_id, '<NULL>');
  END IF;
END $$;