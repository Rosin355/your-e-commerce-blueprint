-- Additive schema only: no account/capability row is inserted or updated.
ALTER TABLE public.admin_catalog_capabilities
 DROP CONSTRAINT admin_catalog_capabilities_capabilities_check,
 ADD CONSTRAINT admin_catalog_capabilities_capabilities_check
 CHECK(capabilities <@ ARRAY['edit','sync','drafts','images','categories','prices','publish','ai']::text[]);

CREATE TABLE public.admin_confirmed_ai_requests (
 actor uuid NOT NULL REFERENCES auth.users(id), request_key uuid NOT NULL,
 field_key text NOT NULL REFERENCES public.product_field_definitions(key),
 context_hash text NOT NULL CHECK(context_hash ~ '^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor,request_key)
);
ALTER TABLE public.admin_confirmed_ai_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_confirmed_ai_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.admin_confirmed_ai_requests TO service_role;
CREATE INDEX admin_confirmed_ai_actor_time ON public.admin_confirmed_ai_requests(actor,created_at);
CREATE FUNCTION public.reserve_confirmed_ai_request(p_actor uuid,p_request_key uuid,p_field_key text,p_context_hash text,p_action text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF p_action IS DISTINCT FROM 'suggest_confirmed_field' OR p_actor IS NULL OR p_request_key IS NULL OR p_context_hash IS NULL OR p_context_hash !~ '^[0-9a-f]{64}$' OR NOT EXISTS (
  SELECT 1 FROM public.admin_catalog_capabilities c JOIN public.user_roles r ON r.user_id=c.user_id
  JOIN public.product_field_definitions d ON d.key=p_field_key
  WHERE c.user_id=p_actor AND c.enabled AND r.role::text='editor'
  AND ARRAY['ai','edit']::text[] <@ c.capabilities AND p_field_key=ANY(c.field_keys)
  AND d.visible AND d.editable AND d.ai_allowed AND NOT d.manual_only
  AND d.field_group NOT IN ('inventory','shopify_state','system','other_imported')
  AND p_field_key IN ('description','optimized_description','short_description','key_benefits','key_features','special_bullets')
 ) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(621857913420260930::bigint);
 IF EXISTS(SELECT 1 FROM public.admin_confirmed_ai_requests WHERE actor=p_actor AND request_key=p_request_key) THEN RETURN false; END IF;
 IF ((SELECT count(*) FROM public.admin_confirmed_ai_requests WHERE actor=p_actor AND created_at>clock_timestamp()-interval '1 minute') + (SELECT count(*) FROM public.product_ai_generation_reservations WHERE actor=p_actor AND reserved_at>clock_timestamp()-interval '1 minute'))>=5 THEN RETURN false; END IF;
 INSERT INTO public.admin_confirmed_ai_requests(actor,request_key,field_key,context_hash) VALUES(p_actor,p_request_key,p_field_key,p_context_hash);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reserve_confirmed_ai_request(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_confirmed_ai_request(uuid,uuid,text,text,text) TO service_role;

-- Preserve the original reservation/deduplication logic; share the five/minute budget.
create or replace function public.reserve_product_ai_generation(
  p_actor uuid,
  p_product_id uuid,
  p_field_key text,
  p_base_version integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz;
  v_existing public.product_ai_generation_reservations%rowtype;
  v_recent_count integer;
  v_reservation_id uuid;
begin
  if p_actor is null or p_product_id is null
    or nullif(pg_catalog.btrim(p_field_key), '') is null
    or p_base_version is null or p_base_version < 1 then
    raise exception 'Invalid AI generation reservation input'
      using errcode = '22023';
  end if;

  -- Sezione critica volutamente breve: serializza soltanto la prenotazione,
  -- mai la chiamata esterna al provider. Il lock transazionale evita sia il
  -- check-then-call sul limite attore, sia due provider call sullo stesso target.
  perform pg_catalog.pg_advisory_xact_lock(621857913420260930::bigint);
  v_now := pg_catalog.clock_timestamp();

  select r.*
    into v_existing
  from public.product_ai_generation_reservations r
  where r.product_id = p_product_id
    and r.field_key = p_field_key
    and r.base_version = p_base_version
    and r.reserved_at >= v_now - interval '60 seconds'
    and (
      r.status = 'reserved'
      or (
        r.status = 'completed'
        and exists (
          select 1
          from public.product_ai_suggestions s
          where s.id = r.suggestion_id
            and s.status = 'pending'
        )
      )
    )
  order by r.reserved_at desc
  limit 1;

  if v_existing.id is not null then
    return pg_catalog.jsonb_build_object(
      'code', 'GENERATION_IN_PROGRESS',
      'reservationId', v_existing.id,
      'suggestionId', v_existing.suggestion_id
    );
  end if;

  select count(*)::integer
    into v_recent_count
  from public.product_ai_generation_reservations r
  where r.actor = p_actor
    and r.reserved_at >= v_now - interval '60 seconds';

  v_recent_count := v_recent_count + (select count(*)::integer from public.admin_confirmed_ai_requests where actor=p_actor and created_at >= v_now - interval '60 seconds');

  if v_recent_count >= 5 then
    return pg_catalog.jsonb_build_object('code', 'RATE_LIMITED');
  end if;

  insert into public.product_ai_generation_reservations (
    actor,
    product_id,
    field_key,
    base_version,
    reserved_at
  ) values (
    p_actor,
    p_product_id,
    p_field_key,
    p_base_version,
    v_now
  )
  returning id into v_reservation_id;

  return pg_catalog.jsonb_build_object(
    'code', 'RESERVED',
    'reservationId', v_reservation_id
  );
end;
$$;

revoke execute on function public.reserve_product_ai_generation(uuid, uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_product_ai_generation(uuid, uuid, text, integer)
  to service_role;

comment on function public.reserve_product_ai_generation(uuid, uuid, text, integer) is
  'Atomically reserves one of five actor/minute Admin AI provider calls and deduplicates active target requests.';
