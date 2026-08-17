-- =====================================================================
-- FASE 3 · ROLLBACK — non distruttivo per i dati esistenti
-- Elimina esclusivamente gli oggetti creati dalla migration F3.
-- product_sync_csv_products e tutte le tabelle preesistenti restano intatte.
-- =====================================================================

-- 1. Trigger e tabelle nuove (ordine inverso rispetto alle FK)
DROP TABLE IF EXISTS public.product_publication_jobs CASCADE;
DROP TABLE IF EXISTS public.product_field_history CASCADE;
DROP TABLE IF EXISTS public.product_ai_suggestions CASCADE;
DROP TABLE IF EXISTS public.product_current_values CASCADE;
DROP TABLE IF EXISTS public.product_source_snapshots CASCADE;
DROP TABLE IF EXISTS public.product_import_batches CASCADE;
DROP TABLE IF EXISTS public.product_field_definitions CASCADE;

-- 2. Funzioni introdotte da F3
DROP FUNCTION IF EXISTS public.assert_ai_field_allowed();
DROP FUNCTION IF EXISTS public.deny_snapshot_mutation();
DROP FUNCTION IF EXISTS public.can_edit_products(uuid);
DROP FUNCTION IF EXISTS public.can_publish_products(uuid);

-- 3. Enum app_role
-- Postgres non consente DROP di un valore di enum. I valori 'editor',
-- 'publisher' e 'tech_admin' restano definiti ma inerti se non assegnati.
-- Rollback logico (opzionale, da eseguire solo se sono stati assegnati):
-- DELETE FROM public.user_roles WHERE role IN ('editor','publisher','tech_admin');
