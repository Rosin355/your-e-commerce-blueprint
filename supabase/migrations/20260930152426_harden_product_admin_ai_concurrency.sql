-- Fase 2D.2: prenotazione atomica delle chiamate AI.
-- La reservation viene creata prima della chiamata al provider e non modifica
-- product_current_values, history, suggestion esistenti o dati Shopify.

create table public.product_ai_generation_reservations (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null,
  product_id uuid not null references public.products(id) on delete restrict,
  field_key text not null references public.product_field_definitions(key) on delete restrict,
  base_version integer not null check (base_version > 0),
  status text not null default 'reserved'
    check (status in ('reserved', 'completed', 'failed')),
  suggestion_id uuid references public.product_ai_suggestions(id) on delete restrict,
  reserved_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint product_ai_generation_reservations_resolution_check check (
    (status = 'reserved' and resolved_at is null and suggestion_id is null)
    or (status = 'completed' and resolved_at is not null and suggestion_id is not null)
    or (status = 'failed' and resolved_at is not null and suggestion_id is null)
  )
);

create index product_ai_generation_reservations_actor_time_idx
  on public.product_ai_generation_reservations (actor, reserved_at desc);

create index product_ai_generation_reservations_target_time_idx
  on public.product_ai_generation_reservations
  (product_id, field_key, base_version, reserved_at desc);

alter table public.product_ai_generation_reservations enable row level security;

revoke all on table public.product_ai_generation_reservations
  from public, anon, authenticated;
grant select, insert, update on table public.product_ai_generation_reservations
  to service_role;

comment on table public.product_ai_generation_reservations is
  'Short-lived audit reservations for server-side Admin AI provider calls.';

create function public.reserve_product_ai_generation(
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
