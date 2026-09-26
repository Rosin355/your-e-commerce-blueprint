-- Fase 2C.1 — preflight live esclusivamente read-only.
-- Non invoca la RPC, non modifica dati e non espone valori prodotto.

-- 1. Firma, SECURITY DEFINER e search_path della RPC esistente.
SELECT
  p.oid::regprocedure::text AS function_signature,
  p.prosecdef AS security_definer,
  p.proconfig AS function_config,
  pg_get_userbyid(p.proowner) AS owner
FROM pg_proc p
WHERE p.oid = to_regprocedure(
  'public.admin_update_product_field(uuid,text,uuid,text,jsonb,integer,text,text,text)'
);

-- 2. Privilegi effettivi: solo service_role deve poter eseguire la RPC.
SELECT role_name, has_function_privilege(
  role_name,
  'public.admin_update_product_field(uuid,text,uuid,text,jsonb,integer,text,text,text)',
  'EXECUTE'
) AS can_execute
FROM unnest(ARRAY['anon','authenticated','service_role']) AS role_name;

-- 3. Registry manual_only: soli conteggi, nessuna chiave o configurazione privata.
SELECT
  count(*) FILTER (WHERE manual_only) AS manual_only_total,
  count(*) FILTER (WHERE manual_only AND visible AND editable) AS manual_only_editable,
  count(*) FILTER (WHERE manual_only AND ai_allowed) AS manual_only_ai_drift,
  count(*) FILTER (WHERE manual_only AND NOT protected_on_reimport) AS manual_only_reimport_drift
FROM public.product_field_definitions;

-- 4. Current values manual_only: conteggi e invarianti lock/lineage, nessun valore.
SELECT
  count(*) AS current_manual_total,
  count(*) FILTER (WHERE cv.is_locked) AS current_manual_locked,
  count(*) FILTER (WHERE NOT cv.is_locked) AS current_manual_unlocked,
  count(*) FILTER (WHERE NOT cv.protected_on_reimport) AS current_manual_reimport_drift,
  count(*) FILTER (WHERE cv.source_snapshot_id IS NULL) AS nullable_lineage,
  min(cv.version) AS min_version,
  max(cv.version) AS max_version
FROM public.product_current_values cv
JOIN public.product_field_definitions fd ON fd.key = cv.field_key
WHERE fd.manual_only;

-- 5. Campi manual_only applicabili ma senza current value: solo aggregati per tipo.
SELECT p.entity_type, count(*) AS missing_manual_values
FROM public.products p
CROSS JOIN public.product_field_definitions fd
LEFT JOIN public.product_current_values cv
  ON cv.product_id = p.id AND cv.field_key = fd.key
WHERE fd.manual_only
  AND fd.visible
  AND fd.editable
  AND (
    fd.applies_to = 'both'
    OR (p.entity_type = 'variation' AND fd.applies_to = 'variant')
    OR (p.entity_type IN ('simple','variable') AND fd.applies_to = 'product')
  )
  AND cv.id IS NULL
GROUP BY p.entity_type
ORDER BY p.entity_type;

-- 6. ACL di scrittura diretta: browser client senza INSERT/UPDATE/DELETE/TRUNCATE.
SELECT role_name, privilege_type, has_table_privilege(
  role_name,
  'public.product_current_values',
  privilege_type
) AS allowed
FROM unnest(ARRAY['anon','authenticated']) AS role_name
CROSS JOIN unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE']) AS privilege_type
ORDER BY role_name, privilege_type;
