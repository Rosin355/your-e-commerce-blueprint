-- Isolated fixture database only; no real Supabase sessions or Shopify calls.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id) VALUES ('00000000-0000-4000-8000-000000000004'),('00000000-0000-4000-8000-000000000005');
INSERT INTO public.user_roles VALUES ('00000000-0000-4000-8000-000000000004','tech_admin'),('00000000-0000-4000-8000-000000000005','publisher');
SET LOCAL ROLE service_role;
DO $$
DECLARE payload jsonb:='{"sku":"TEST-ROLLBACK-TECH","variants":[{"sku":"TEST-ROLLBACK-TECH"}],"categoryIds":[]}'::jsonb; op jsonb; blocked boolean:=false;
BEGIN
  op:=public.admin_save_new_draft('00000000-0000-4000-8000-000000000004',gen_random_uuid(),repeat('e',64),payload,'[]');
  ASSERT public.admin_claim_draft('00000000-0000-4000-8000-000000000004',(op->>'operationId')::uuid),'Tech admin cannot claim';
  BEGIN
    PERFORM public.admin_save_new_draft('00000000-0000-4000-8000-000000000005',gen_random_uuid(),repeat('f',64),payload,'[]');
  EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
  END;
  ASSERT blocked,'Publisher bypassed server write policy';
END $$;
ROLLBACK;
DO $$ BEGIN
  ASSERT NOT EXISTS(SELECT 1 FROM public.products WHERE sku='TEST-ROLLBACK-TECH'),'Draft survived transaction rollback';
  ASSERT NOT EXISTS(SELECT 1 FROM auth.users WHERE id IN ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000005')),'Role fixtures survived rollback';
  ASSERT (SELECT count(*) FROM public.products)=1,'Rollback changed previous fixture';
  ASSERT (SELECT bool_and(relrowsecurity) FROM pg_class WHERE relname IN ('admin_product_operations','admin_product_shopify_links','admin_operation_events','admin_category_operations')),'New tables missing RLS';
  ASSERT NOT EXISTS(SELECT 1 FROM pg_proc WHERE proname IN ('admin_save_new_draft','admin_claim_draft','admin_complete_draft','admin_finish_categories') AND prosecdef),'Operational RPC unexpectedly SECURITY DEFINER';
  RAISE NOTICE 'PASS: tech_admin, publisher denial, transactional rollback and security posture';
END $$;
