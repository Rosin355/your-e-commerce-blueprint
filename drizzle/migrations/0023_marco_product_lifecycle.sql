SELECT set_config('onlinegarden.lifecycle_direction', 'apply', true);
DO $release$
DECLARE
  direction text := current_setting('onlinegarden.lifecycle_direction');
  proc regprocedure := 'public.admin_claim_catalog_approval(uuid,uuid,text)'::regprocedure;
  anchor text := 'WHEN ''set_catalog_image'' THEN ''images''';
  old_guard text := 'AND (a.action NOT IN (''set_catalog_image'',''rename_catalog_format'')';
  scope text := 'AND (a.action NOT IN (''unpublish_catalog_product'',''archive_catalog_product'',''restore_catalog_product'',''delete_catalog_product'') OR (CASE a.action WHEN ''unpublish_catalog_product'' THEN ''product_unpublish'' WHEN ''delete_catalog_product'' THEN ''product_delete'' ELSE ''product_archive'' END)=ANY(c.field_keys)) ';
  extra text := 'WHEN ''unpublish_catalog_product'' THEN ''sync'' WHEN ''archive_catalog_product'' THEN ''sync'' WHEN ''restore_catalog_product'' THEN ''sync'' WHEN ''delete_catalog_product'' THEN ''sync'' ';
  list_anchor text := '''rename_catalog_format''::text';
  more text := ', ''unpublish_catalog_product''::text, ''archive_catalog_product''::text, ''restore_catalog_product''::text, ''delete_catalog_product''::text';
  prev_case text := 'WHEN ''set_catalog_image'' THEN ''images'' WHEN ''rename_catalog_format'' THEN ''prices'' ';
  prev_guard text := 'AND (a.action NOT IN (''set_catalog_image'',''rename_catalog_format'') OR (''sync''=ANY(c.capabilities) AND
    (CASE a.action WHEN ''set_catalog_image'' THEN ''product_gallery'' ELSE ''product_formats'' END)=ANY(c.field_keys))) ';
  chk text; body text; def text; retained boolean;
BEGIN
  IF direction NOT IN ('apply','restore') THEN RAISE EXCEPTION 'Direzione non valida'; END IF;
  LOCK TABLE public.admin_catalog_approvals IN SHARE ROW EXCLUSIVE MODE;
  SELECT pg_get_functiondef(oid),prosrc INTO STRICT def,body FROM pg_proc WHERE oid=proc;
  SELECT replace(pg_get_constraintdef(oid),' NOT VALID','') INTO STRICT chk FROM pg_constraint
    WHERE conrelid='public.admin_catalog_approvals'::regclass AND conname='admin_catalog_approvals_action_check';
  IF strpos(body,prev_case)=0 OR strpos(body,prev_guard)=0 OR
     md5(replace(replace(replace(replace(body,scope,''),extra,''),prev_case,''),prev_guard,'')) <> '35742108b8980a1cb930aee7d453dc75' OR
     md5(replace(replace(chk,more,''),', ''set_catalog_image''::text, ''rename_catalog_format''::text','')) <> '64e1d5e82f4babec09cc753d023eb5cc'
    THEN RAISE EXCEPTION 'Baseline RPC/journal inattesa. Verificare lo snapshot e applicare prima la PR74'; END IF;
  IF direction='apply' THEN
    IF strpos(body,extra)=0 THEN EXECUTE replace(replace(def,anchor,extra||anchor),old_guard,scope||old_guard); END IF;
    IF strpos(chk,more)=0 THEN
      ALTER TABLE public.admin_catalog_approvals DROP CONSTRAINT admin_catalog_approvals_action_check;
      EXECUTE 'ALTER TABLE public.admin_catalog_approvals ADD CONSTRAINT admin_catalog_approvals_action_check '||replace(chk,list_anchor,list_anchor||more);
    END IF;
    CREATE TABLE IF NOT EXISTS public.admin_product_deletion_clearances (
      actor uuid NOT NULL REFERENCES auth.users(id), product_id uuid NOT NULL REFERENCES public.products(id),
      shopify_gid text NOT NULL CHECK(shopify_gid ~ '^gid://shopify/Product/[0-9]+$'),
      shopify_updated_at timestamptz NOT NULL, reference text NOT NULL CHECK(length(trim(reference))>=8),
      issued_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
      internal_refs_clear boolean NOT NULL CHECK(internal_refs_clear),
      orders_checked boolean NOT NULL CHECK(orders_checked), media_clear boolean NOT NULL CHECK(media_clear),
      redirects_checked boolean NOT NULL CHECK(redirects_checked), commercially_approved boolean NOT NULL CHECK(commercially_approved),
      CHECK(expires_at>issued_at AND expires_at<=issued_at+interval '24 hours'), PRIMARY KEY(actor,product_id)
    );
    ALTER TABLE public.admin_product_deletion_clearances ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.admin_product_deletion_clearances FROM PUBLIC,anon,authenticated,service_role;
    GRANT SELECT ON public.admin_product_deletion_clearances TO service_role;
  ELSE
    IF EXISTS(SELECT 1 FROM public.admin_catalog_approvals WHERE action IN ('unpublish_catalog_product','archive_catalog_product','restore_catalog_product','delete_catalog_product') AND state IN ('IN_FLIGHT','REVIEW_REQUIRED'))
      THEN RAISE EXCEPTION 'Riconciliare prima le operazioni incerte'; END IF;
    IF strpos(body,extra)>0 THEN EXECUTE replace(replace(def,extra,''),scope,''); END IF;
    IF strpos(chk,more)>0 THEN
      SELECT EXISTS(SELECT 1 FROM public.admin_catalog_approvals WHERE action IN ('unpublish_catalog_product','archive_catalog_product','restore_catalog_product','delete_catalog_product')) INTO retained;
      ALTER TABLE public.admin_catalog_approvals DROP CONSTRAINT admin_catalog_approvals_action_check;
      EXECUTE 'ALTER TABLE public.admin_catalog_approvals ADD CONSTRAINT admin_catalog_approvals_action_check '||replace(chk,more,'')||CASE WHEN retained THEN ' NOT VALID' ELSE '' END;
    END IF;
    IF to_regclass('public.admin_product_deletion_clearances') IS NOT NULL THEN
      REVOKE ALL ON public.admin_product_deletion_clearances FROM PUBLIC,anon,authenticated,service_role;
    END IF;
  END IF;
END $release$;