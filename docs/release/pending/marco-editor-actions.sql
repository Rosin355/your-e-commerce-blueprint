-- psql -X -v ON_ERROR_STOP=1 -v direction=apply|restore -f ...
-- Confrontare in sola lettura questi hash con il progetto prima del GO.
BEGIN;
SELECT set_config('onlinegarden.release_direction', :'direction', true);
DO $release$
DECLARE
  dir text := current_setting('onlinegarden.release_direction');
  old_case text := 'WHEN ''set_catalog_prices'' THEN ''prices''';
  new_case text := 'WHEN ''set_catalog_image'' THEN ''images'' WHEN ''rename_catalog_format'' THEN ''prices'' ' || old_case;
  old_actor text := 'AND (a.command->>''fieldKey'' IS NULL';
  new_actor text := 'AND (a.action NOT IN (''set_catalog_image'',''rename_catalog_format'') OR (''sync''=ANY(c.capabilities) AND
    (CASE a.action WHEN ''set_catalog_image'' THEN ''product_gallery'' ELSE ''product_formats'' END)=ANY(c.field_keys))) ' || old_actor;
  old_list text := '''publish_catalog_product''::text';
  new_list text := old_list || ', ''set_catalog_image''::text, ''rename_catalog_format''::text';
  body text; def text; chk text; baseline text; retained boolean;
BEGIN
  IF dir NOT IN ('apply','restore') THEN RAISE EXCEPTION 'Direzione non valida'; END IF;
  LOCK TABLE public.admin_catalog_approvals IN SHARE ROW EXCLUSIVE MODE;
  SELECT prosrc,pg_get_functiondef(oid) INTO STRICT body,def FROM pg_proc
    WHERE oid='public.admin_claim_catalog_approval(uuid,uuid,text)'::regprocedure;
  SELECT pg_get_constraintdef(oid) INTO STRICT chk FROM pg_constraint
    WHERE conrelid='public.admin_catalog_approvals'::regclass AND conname='admin_catalog_approvals_action_check';
  chk:=replace(chk,' NOT VALID','');
  baseline:=replace(chk,new_list,old_list);
  IF md5(baseline)<>'64e1d5e82f4babec09cc753d023eb5cc' OR
     md5(replace(replace(body,new_case,old_case),new_actor,old_actor))<>'35742108b8980a1cb930aee7d453dc75' THEN
    RAISE EXCEPTION 'Baseline del registro approvazioni diversa da quella verificata';
  END IF;
  IF dir='apply' THEN
    IF strpos(body,new_case)=0 THEN EXECUTE replace(replace(def,old_case,new_case),old_actor,new_actor); END IF;
    IF strpos(chk,new_list)=0 THEN
      ALTER TABLE public.admin_catalog_approvals DROP CONSTRAINT admin_catalog_approvals_action_check;
      EXECUTE 'ALTER TABLE public.admin_catalog_approvals ADD CONSTRAINT admin_catalog_approvals_action_check '||replace(baseline,old_list,new_list);
    END IF;
  ELSE
    IF EXISTS(SELECT 1 FROM public.admin_catalog_approvals WHERE action IN ('set_catalog_image','rename_catalog_format') AND state IN ('IN_FLIGHT','REVIEW_REQUIRED'))
      THEN RAISE EXCEPTION 'Operazione da riconciliare prima del rollback'; END IF;
    IF strpos(body,new_case)>0 THEN EXECUTE replace(replace(def,new_case,old_case),new_actor,old_actor); END IF;
    IF strpos(chk,new_list)>0 THEN
      SELECT EXISTS(SELECT 1 FROM public.admin_catalog_approvals WHERE action IN ('set_catalog_image','rename_catalog_format')) INTO retained;
      ALTER TABLE public.admin_catalog_approvals DROP CONSTRAINT admin_catalog_approvals_action_check;
      EXECUTE 'ALTER TABLE public.admin_catalog_approvals ADD CONSTRAINT admin_catalog_approvals_action_check '||baseline||CASE WHEN retained THEN ' NOT VALID' ELSE '' END;
    END IF;
  END IF;
END $release$;
COMMIT;
