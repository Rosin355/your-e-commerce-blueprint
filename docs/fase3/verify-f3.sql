-- =====================================================================
-- FASE 3 · SCRIPT DI VERIFICA — SOLA LETTURA
-- Nessuna INSERT/UPDATE/DELETE. Eseguibile prima e dopo la migration.
-- =====================================================================

-- 1. Le 7 tabelle attese esistono?
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'product_field_definitions','product_import_batches','product_source_snapshots',
    'product_current_values','product_ai_suggestions','product_field_history',
    'product_publication_jobs')
ORDER BY table_name;

-- 2. RLS abilitata su tutte le nuove tabelle
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname LIKE 'product\_%'
ORDER BY relname;

-- 3. Policy presenti
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename LIKE 'product\_%'
ORDER BY tablename, policyname;

-- 4. Grants: nessun UPDATE/DELETE per authenticated su snapshot e storico
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('product_source_snapshots','product_field_history')
ORDER BY table_name, grantee, privilege_type;

-- 5. Vincoli e indici unici (idempotenza, lock, proposta AI pendente)
SELECT conrelid::regclass AS tabella, conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conrelid::regclass::text LIKE 'product\_%'
ORDER BY 1, 2;

SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename LIKE 'product\_%'
ORDER BY tablename, indexname;

-- 6. Trigger di immutabilità snapshot/storico
SELECT event_object_table, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('product_source_snapshots','product_field_history')
ORDER BY 1, 2;

-- 7. Compatibilità: la tabella legacy è intatta e conta le righe attese
SELECT count(*) AS righe_legacy FROM public.product_sync_csv_products;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'product_sync_csv_products'
ORDER BY ordinal_position;

-- 8. Le nuove tabelle sono vuote subito dopo la migration (nessun backfill)
SELECT 'product_field_definitions' AS t, count(*) FROM public.product_field_definitions
UNION ALL SELECT 'product_import_batches', count(*) FROM public.product_import_batches
UNION ALL SELECT 'product_source_snapshots', count(*) FROM public.product_source_snapshots
UNION ALL SELECT 'product_current_values', count(*) FROM public.product_current_values
UNION ALL SELECT 'product_ai_suggestions', count(*) FROM public.product_ai_suggestions
UNION ALL SELECT 'product_field_history', count(*) FROM public.product_field_history
UNION ALL SELECT 'product_publication_jobs', count(*) FROM public.product_publication_jobs;

-- 9. Nuovi valori enum app_role
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'public.app_role'::regtype ORDER BY enumsortorder;
