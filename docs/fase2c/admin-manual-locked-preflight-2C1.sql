-- Fase 2C.1 — preflight live esclusivamente read-only.
-- Non invoca la RPC, non modifica dati e non espone valori prodotto.

-- 1. Firma, SECURITY DEFINER, search_path, owner e ACL della RPC esistente.
SELECT
  p.oid::regprocedure::text AS function_signature,
  p.prosecdef AS security_definer,
  p.proconfig AS function_config,
  pg_get_userbyid(p.proowner) AS owner,
  p.proacl AS acl
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

-- 4. Contratto dei cinque campi manuali golden su OG_393883.
-- Non legge né restituisce i valori prodotto. Ogni riga deve avere
-- registry_contract_ok=true, product_present=true, current_present=true,
-- is_locked=true e protected_on_reimport=true.
WITH expected_fields(field_key) AS (
  VALUES
    ('nome_comune'::text),
    ('ibridatore'::text),
    ('colore_fiore'::text),
    ('colore_foglia'::text),
    ('curiosita'::text)
)
SELECT
  ef.field_key,
  (
    fd.key IS NOT NULL
    AND fd.manual_only
    AND fd.visible
    AND fd.editable
    AND NOT fd.ai_allowed
    AND fd.protected_on_reimport
    AND fd.applies_to IN ('product', 'both')
  ) AS registry_contract_ok,
  p.id IS NOT NULL AS product_present,
  p.entity_type,
  cv.id IS NOT NULL AS current_present,
  cv.is_locked,
  cv.protected_on_reimport,
  cv.version,
  cv.source_snapshot_id IS NULL AS source_snapshot_id_is_null
FROM expected_fields ef
LEFT JOIN public.product_field_definitions fd ON fd.key = ef.field_key
LEFT JOIN public.products p ON p.sku = 'OG_393883'
LEFT JOIN public.product_current_values cv
  ON cv.product_id = p.id AND cv.field_key = ef.field_key
ORDER BY ef.field_key;

-- 5. Current values manual_only: conteggi e invarianti lock/lineage, nessun valore.
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

-- 6. Campi manual_only applicabili ma senza current value: solo aggregati per tipo.
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

-- 7. Dipendenze strutturali minime della RPC. Deve restituire zero righe.
WITH required_columns(table_name, column_name) AS (
  VALUES
    ('products', 'id'), ('products', 'sku'), ('products', 'entity_type'),
    ('products', 'parent_product_id'),
    ('product_field_definitions', 'key'),
    ('product_field_definitions', 'manual_only'),
    ('product_field_definitions', 'ai_allowed'),
    ('product_field_definitions', 'protected_on_reimport'),
    ('product_field_definitions', 'applies_to'),
    ('product_current_values', 'product_id'),
    ('product_current_values', 'field_key'),
    ('product_current_values', 'version'),
    ('product_current_values', 'is_locked'),
    ('product_current_values', 'protected_on_reimport'),
    ('product_current_values', 'source_snapshot_id'),
    ('product_field_history', 'request_key'),
    ('product_admin_command_log', 'idempotency_key'),
    ('product_admin_command_log', 'payload_hash'),
    ('user_roles', 'user_id'), ('user_roles', 'role')
)
SELECT rc.table_name, rc.column_name
FROM required_columns rc
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = rc.table_name
 AND c.column_name = rc.column_name
WHERE c.column_name IS NULL
ORDER BY rc.table_name, rc.column_name;

-- Il vincolo univoco usato per la creazione concorrente deve essere presente.
-- Con standard_conforming_strings il pattern usa un solo backslash per
-- carattere: non cerca accidentalmente un backslash letterale in indexdef.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'product_current_values'
  AND indexdef ~ '^CREATE UNIQUE INDEX'
  AND indexdef ~ '\(product_id, field_key\)';

-- 8. Registry migration. I due file sono equivalenti come migrazione ma non
-- byte-identici e hanno hash diversi:
-- - copia Supabase: b7f1fdafcced766f2f9443d9faa53cef769d3e9d48b3a35194ea2c0304b2a898
-- - file Drizzle registrato: 5ee7341bc5ce13e30dc6092bedac1c3635076c7db9bb2763e9a4cba21bcaae37
-- Stato atteso dopo il rilascio Lovable: una entry Drizzle e nessuna seconda
-- applicazione manuale nel registry Supabase.
SELECT count(*) AS drizzle_target_entries
FROM drizzle.__drizzle_migrations
WHERE hash = '5ee7341bc5ce13e30dc6092bedac1c3635076c7db9bb2763e9a4cba21bcaae37';

SELECT count(*) AS supabase_target_entries
FROM supabase_migrations.schema_migrations
WHERE version = '20260926150609';

-- 9. ACL di scrittura diretta: browser client senza INSERT/UPDATE/DELETE/TRUNCATE.
SELECT role_name, privilege_type, has_table_privilege(
  role_name,
  'public.product_current_values',
  privilege_type
) AS allowed
FROM unnest(ARRAY['anon','authenticated']) AS role_name
CROSS JOIN unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE']) AS privilege_type
ORDER BY role_name, privilege_type;
