# Online Garden · Ripristino SQL Lovable (solo per incident recovery)

**Non incollare questi blocchi durante la normale installazione.** Ogni blocco è il file sorgente della PR #76, convertito da `psql direction=restore` a SQL per Lovable. Ripristinare un grant solo se era stato **effettivamente aggiunto** dalla finestra di rilascio e assente prima. Non revocare grant preesistenti. Fermare le nuove operazioni, riconciliare journal `IN_FLIGHT` e `REVIEW_REQUIRED`, e applicare l'ordine inverso. Serve GO tecnico specifico di rollback e snapshot privato. La procedura non annulla scritture Shopify già effettuate.

**Prima dell'uso:** sostituire ogni `INSERISCI-UUID-MARCO-QUI` con lo stesso UUID staff di Marco. SQL editor: un blocco alla volta, controllare l'esito e verificare i dati.

## 01 · Revoca PRODUCT_ARCHIVE

```sql
-- Eseguire solo con GO nominativo dopo aver acquisito la riga originale.
-- Parametri psql: staff_id, grant_key, direction. Ogni transazione riguarda una chiave.
BEGIN;
SELECT set_config('onlinegarden.release_actor', 'INSERISCI-UUID-MARCO-QUI', true),
       set_config('onlinegarden.release_key', 'product_archive', true),
       set_config('onlinegarden.release_direction', 'restore', true);
DO $scope$
DECLARE
  actor_id uuid := current_setting('onlinegarden.release_actor')::uuid;
  item text := current_setting('onlinegarden.release_key');
  direction text := current_setting('onlinegarden.release_direction');
  keys text[];
BEGIN
  IF direction NOT IN ('apply','restore') OR item NOT IN ('product_unpublish','product_archive')
    THEN RAISE EXCEPTION 'Operazione o grant reversibile non valido'; END IF;
  SELECT c.field_keys INTO STRICT keys FROM public.admin_catalog_capabilities c
    WHERE c.user_id=actor_id AND c.enabled AND 'sync'=ANY(c.capabilities)
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=c.user_id AND r.role::text='editor')
      AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=c.user_id AND r.role::text IN ('admin','tech_admin'))
    FOR UPDATE;
  IF direction='apply' AND NOT (item=ANY(keys)) THEN
    UPDATE public.admin_catalog_capabilities SET field_keys=array_append(keys,item) WHERE user_id=actor_id;
  ELSIF direction='restore' AND item=ANY(keys) THEN
    UPDATE public.admin_catalog_capabilities SET field_keys=array_remove(keys,item) WHERE user_id=actor_id;
  END IF;
END $scope$;
COMMIT;

```

## 02 · Revoca PRODUCT_UNPUBLISH

```sql
-- Eseguire solo con GO nominativo dopo aver acquisito la riga originale.
-- Parametri psql: staff_id, grant_key, direction. Ogni transazione riguarda una chiave.
BEGIN;
SELECT set_config('onlinegarden.release_actor', 'INSERISCI-UUID-MARCO-QUI', true),
       set_config('onlinegarden.release_key', 'product_unpublish', true),
       set_config('onlinegarden.release_direction', 'restore', true);
DO $scope$
DECLARE
  actor_id uuid := current_setting('onlinegarden.release_actor')::uuid;
  item text := current_setting('onlinegarden.release_key');
  direction text := current_setting('onlinegarden.release_direction');
  keys text[];
BEGIN
  IF direction NOT IN ('apply','restore') OR item NOT IN ('product_unpublish','product_archive')
    THEN RAISE EXCEPTION 'Operazione o grant reversibile non valido'; END IF;
  SELECT c.field_keys INTO STRICT keys FROM public.admin_catalog_capabilities c
    WHERE c.user_id=actor_id AND c.enabled AND 'sync'=ANY(c.capabilities)
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=c.user_id AND r.role::text='editor')
      AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=c.user_id AND r.role::text IN ('admin','tech_admin'))
    FOR UPDATE;
  IF direction='apply' AND NOT (item=ANY(keys)) THEN
    UPDATE public.admin_catalog_capabilities SET field_keys=array_append(keys,item) WHERE user_id=actor_id;
  ELSIF direction='restore' AND item=ANY(keys) THEN
    UPDATE public.admin_catalog_capabilities SET field_keys=array_remove(keys,item) WHERE user_id=actor_id;
  END IF;
END $scope$;
COMMIT;

```

## 03 · Revoca PRODUCT_FORMATS

```sql
-- psql -X -v ON_ERROR_STOP=1 -v staff_id=<UUID verificato privatamente> -v direction=apply|restore -f ...
-- Prerequisito: snapshot privato della riga di Marco con tags assente.
-- grant_key accetta tags, product_gallery o product_formats. Una sola scelta per transazione.
BEGIN;
SELECT set_config('onlinegarden.release_key', 'product_formats', true),
       set_config('onlinegarden.release_actor', 'INSERISCI-UUID-MARCO-QUI', true),
       set_config('onlinegarden.release_direction', 'restore', true);
DO $scope$
DECLARE
  actor_id uuid := current_setting('onlinegarden.release_actor')::uuid;
  action text := current_setting('onlinegarden.release_direction');
  item text := current_setting('onlinegarden.release_key');
  keys text[];
BEGIN
  IF action NOT IN ('apply','restore') THEN RAISE EXCEPTION 'Direzione non valida'; END IF;
  IF item NOT IN ('tags','product_gallery','product_formats') THEN RAISE EXCEPTION 'Abilitazione non valida'; END IF;
  SELECT c.field_keys INTO STRICT keys FROM public.admin_catalog_capabilities c
    WHERE c.user_id=actor_id AND c.enabled AND c.capabilities @> ARRAY['edit','sync']
      AND (item='tags' OR (CASE item WHEN 'product_gallery' THEN 'images' ELSE 'prices' END)=ANY(c.capabilities))
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=c.user_id AND r.role::text='editor')
      AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=c.user_id AND r.role::text IN ('admin','tech_admin'))
      AND (SELECT count(*) FROM public.admin_draft_ai_field_opt_ins o WHERE o.actor=c.user_id AND o.field_key IN ('seo_title','seo_description','tags'))=3
    FOR UPDATE;
  IF action='apply' AND NOT (item=ANY(keys)) THEN
    UPDATE public.admin_catalog_capabilities SET field_keys=array_append(keys,item) WHERE user_id=actor_id;
  ELSIF action='restore' AND item=ANY(keys) THEN
    UPDATE public.admin_catalog_capabilities SET field_keys=array_remove(keys,item) WHERE user_id=actor_id;
  END IF;
END $scope$;
COMMIT;

```

## 04 · Revoca PRODUCT_GALLERY

```sql
-- psql -X -v ON_ERROR_STOP=1 -v staff_id=<UUID verificato privatamente> -v direction=apply|restore -f ...
-- Prerequisito: snapshot privato della riga di Marco con tags assente.
-- grant_key accetta tags, product_gallery o product_formats. Una sola scelta per transazione.
BEGIN;
SELECT set_config('onlinegarden.release_key', 'product_gallery', true),
       set_config('onlinegarden.release_actor', 'INSERISCI-UUID-MARCO-QUI', true),
       set_config('onlinegarden.release_direction', 'restore', true);
DO $scope$
DECLARE
  actor_id uuid := current_setting('onlinegarden.release_actor')::uuid;
  action text := current_setting('onlinegarden.release_direction');
  item text := current_setting('onlinegarden.release_key');
  keys text[];
BEGIN
  IF action NOT IN ('apply','restore') THEN RAISE EXCEPTION 'Direzione non valida'; END IF;
  IF item NOT IN ('tags','product_gallery','product_formats') THEN RAISE EXCEPTION 'Abilitazione non valida'; END IF;
  SELECT c.field_keys INTO STRICT keys FROM public.admin_catalog_capabilities c
    WHERE c.user_id=actor_id AND c.enabled AND c.capabilities @> ARRAY['edit','sync']
      AND (item='tags' OR (CASE item WHEN 'product_gallery' THEN 'images' ELSE 'prices' END)=ANY(c.capabilities))
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=c.user_id AND r.role::text='editor')
      AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=c.user_id AND r.role::text IN ('admin','tech_admin'))
      AND (SELECT count(*) FROM public.admin_draft_ai_field_opt_ins o WHERE o.actor=c.user_id AND o.field_key IN ('seo_title','seo_description','tags'))=3
    FOR UPDATE;
  IF action='apply' AND NOT (item=ANY(keys)) THEN
    UPDATE public.admin_catalog_capabilities SET field_keys=array_append(keys,item) WHERE user_id=actor_id;
  ELSIF action='restore' AND item=ANY(keys) THEN
    UPDATE public.admin_catalog_capabilities SET field_keys=array_remove(keys,item) WHERE user_id=actor_id;
  END IF;
END $scope$;
COMMIT;

```

## 05 · Revoca TAGS

```sql
-- psql -X -v ON_ERROR_STOP=1 -v staff_id=<UUID verificato privatamente> -v direction=apply|restore -f ...
-- Prerequisito: snapshot privato della riga di Marco con tags assente.
-- grant_key accetta tags, product_gallery o product_formats. Una sola scelta per transazione.
BEGIN;
SELECT set_config('onlinegarden.release_key', 'tags', true),
       set_config('onlinegarden.release_actor', 'INSERISCI-UUID-MARCO-QUI', true),
       set_config('onlinegarden.release_direction', 'restore', true);
DO $scope$
DECLARE
  actor_id uuid := current_setting('onlinegarden.release_actor')::uuid;
  action text := current_setting('onlinegarden.release_direction');
  item text := current_setting('onlinegarden.release_key');
  keys text[];
BEGIN
  IF action NOT IN ('apply','restore') THEN RAISE EXCEPTION 'Direzione non valida'; END IF;
  IF item NOT IN ('tags','product_gallery','product_formats') THEN RAISE EXCEPTION 'Abilitazione non valida'; END IF;
  SELECT c.field_keys INTO STRICT keys FROM public.admin_catalog_capabilities c
    WHERE c.user_id=actor_id AND c.enabled AND c.capabilities @> ARRAY['edit','sync']
      AND (item='tags' OR (CASE item WHEN 'product_gallery' THEN 'images' ELSE 'prices' END)=ANY(c.capabilities))
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=c.user_id AND r.role::text='editor')
      AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=c.user_id AND r.role::text IN ('admin','tech_admin'))
      AND (SELECT count(*) FROM public.admin_draft_ai_field_opt_ins o WHERE o.actor=c.user_id AND o.field_key IN ('seo_title','seo_description','tags'))=3
    FOR UPDATE;
  IF action='apply' AND NOT (item=ANY(keys)) THEN
    UPDATE public.admin_catalog_capabilities SET field_keys=array_append(keys,item) WHERE user_id=actor_id;
  ELSIF action='restore' AND item=ANY(keys) THEN
    UPDATE public.admin_catalog_capabilities SET field_keys=array_remove(keys,item) WHERE user_id=actor_id;
  END IF;
END $scope$;
COMMIT;

```

## 06 · Ripristino lifecycle

```sql
-- Eseguire dopo marco-editor-actions.sql. Non concede permessi a utenti.
-- psql -X -v ON_ERROR_STOP=1 -v direction=apply|restore -f <file>
BEGIN;
SELECT set_config('onlinegarden.lifecycle_direction', 'restore', true);
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
COMMIT;

```

## 07 · Ripristino journal

```sql
-- psql -X -v ON_ERROR_STOP=1 -v direction=apply|restore -f ...
-- Confrontare in sola lettura questi hash con il progetto prima del GO.
BEGIN;
SELECT set_config('onlinegarden.release_direction', 'restore', true);
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
      SELECT EXISTS(SELECT 1 FROM public.admin_catalog_approvals WHERE action IN ('unpublish_catalog_product','archive_catalog_product','restore_catalog_product','delete_catalog_product')) INTO retained;
      EXECUTE 'ALTER TABLE public.admin_catalog_approvals ADD CONSTRAINT admin_catalog_approvals_action_check '||replace(baseline,old_list,new_list)||CASE WHEN retained THEN ' NOT VALID' ELSE '' END;
    END IF;
  ELSE
    IF EXISTS(SELECT 1 FROM public.admin_catalog_approvals WHERE action IN ('set_catalog_image','rename_catalog_format') AND state IN ('IN_FLIGHT','REVIEW_REQUIRED'))
      THEN RAISE EXCEPTION 'Operazione da riconciliare prima del rollback'; END IF;
    IF strpos(body,new_case)>0 THEN EXECUTE replace(replace(def,new_case,old_case),new_actor,old_actor); END IF;
    IF strpos(chk,new_list)>0 THEN
      SELECT EXISTS(SELECT 1 FROM public.admin_catalog_approvals WHERE action IN ('set_catalog_image','rename_catalog_format','unpublish_catalog_product','archive_catalog_product','restore_catalog_product','delete_catalog_product')) INTO retained;
      ALTER TABLE public.admin_catalog_approvals DROP CONSTRAINT admin_catalog_approvals_action_check;
      EXECUTE 'ALTER TABLE public.admin_catalog_approvals ADD CONSTRAINT admin_catalog_approvals_action_check '||baseline||CASE WHEN retained THEN ' NOT VALID' ELSE '' END;
    END IF;
  END IF;
END $release$;
COMMIT;

```

## 08 · Ripristino registro

```sql
-- psql -X -v ON_ERROR_STOP=1 -v direction=apply|restore -f ...
-- Eseguire solo sul progetto verificato, dopo snapshot e GO registro/RPC.
BEGIN;
SELECT set_config('onlinegarden.release_direction', 'restore', true);
DO $release$
DECLARE
  target regprocedure := 'public.admin_update_product_field(uuid,text,uuid,text,jsonb,integer,text,text,text)'::regprocedure;
  original_hash constant text := '2621cc0ee78a99e6dc55bd0602dc4ac3';
  marker constant text := 'v_client_create_allowed := v_def.key = ANY (v_client_creatable_missing_keys);';
  replacement constant text := 'v_client_create_allowed := v_def.key = ANY (v_client_creatable_missing_keys) OR
      (v_def.key = ''tags'' AND EXISTS (
        SELECT 1 FROM public.admin_catalog_capabilities c JOIN public.user_roles r ON r.user_id = c.user_id
        WHERE c.user_id = p_actor AND c.enabled AND r.role::text = ''editor''
          AND ''edit'' = ANY(c.capabilities) AND ''tags'' = ANY(c.field_keys)));';
  mapping constant jsonb := '{"type":"metafield","namespace":"custom","key":"short_intro"}';
  current_mapping jsonb;
  current_body text;
  definition text;
  direction text := current_setting('onlinegarden.release_direction');
BEGIN
  IF direction NOT IN ('apply','restore') THEN RAISE EXCEPTION 'Direzione non valida'; END IF;
  SELECT shopify_mapping INTO STRICT current_mapping FROM public.product_field_definitions
    WHERE key='short_description' AND editor_type='textarea' AND editable AND publishable FOR UPDATE;
  IF current_mapping IS NULL OR current_mapping NOT IN ('{}'::jsonb,mapping) THEN RAISE EXCEPTION 'Mapping inatteso'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.product_field_definitions WHERE key='short_intro' AND shopify_mapping=mapping)
    THEN RAISE EXCEPTION 'Metafield storico non riconosciuto'; END IF;
  SELECT prosrc,pg_get_functiondef(oid) INTO STRICT current_body,definition FROM pg_proc WHERE oid=target;
  IF md5(current_body)=original_hash AND strpos(current_body,marker)>0 THEN
    IF direction='apply' THEN EXECUTE replace(definition,marker,replacement); END IF;
  ELSIF strpos(current_body,replacement)>0 AND md5(replace(current_body,replacement,marker))=original_hash THEN
    IF direction='restore' THEN EXECUTE replace(definition,replacement,marker); END IF;
  ELSE RAISE EXCEPTION 'Revisione RPC diversa dallo snapshot'; END IF;
  UPDATE public.product_field_definitions SET shopify_mapping=CASE WHEN direction='apply' THEN mapping ELSE '{}'::jsonb END
    WHERE key='short_description' AND shopify_mapping IS DISTINCT FROM CASE WHEN direction='apply' THEN mapping ELSE '{}'::jsonb END;
END $release$;
COMMIT;

```

## Verifica

Confronta RPC `pg_get_functiondef`, constraint, mapping e field_keys con lo snapshot privato precedente all'apply; non aspettarti che il constraint torni VALID se esistono eventi storici da conservare e il codice di restore lo crea come NOT VALID.
