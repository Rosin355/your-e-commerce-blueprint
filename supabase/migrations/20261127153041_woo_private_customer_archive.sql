begin;
create schema woo_archive;
revoke all on schema woo_archive from public, anon, authenticated, service_role;

create table woo_archive.customers (
  woo_id bigint primary key check (woo_id between 1 and 9007199254740991),
  first_name text not null,
  last_name text not null,
  email text not null,
  purchases integer not null check (purchases >= 0)
);
-- Grant amministrativo circoscritto alla pagina. Nessuna assegnazione nella migrazione.
create table woo_archive.page_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  approval_ref text not null check (length(trim(approval_ref)) > 0),
  granted_at timestamptz not null default now()
);
alter table woo_archive.page_admins enable row level security;
create table woo_archive.audit (
  id bigint generated always as identity primary key,
  recorded_at timestamptz not null default clock_timestamp(),
  actor text not null,
  action text not null check (action in ('list','detail','export','import','grant','revoke','erase')),
  quantity integer not null check (quantity >= 0),
  woo_id bigint,
  purpose text,
  staff_subject uuid
);
alter table woo_archive.customers enable row level security;
alter table woo_archive.audit enable row level security;
revoke all on all tables in schema woo_archive from public, anon, authenticated, service_role;
revoke all on all sequences in schema woo_archive from public, anon, authenticated, service_role;

create function woo_archive.audit_grant() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='DELETE' then
    insert into woo_archive.audit(actor,action,quantity,staff_subject) values(session_user,'revoke',1,old.user_id);
    return old;
  end if;
  insert into woo_archive.audit(actor,action,quantity,staff_subject) values(session_user,'grant',1,new.user_id);
  return new;
end $$;
revoke all on function woo_archive.audit_grant() from public, anon, authenticated, service_role;
create trigger archive_grant_log after insert or delete on woo_archive.page_admins
  for each row execute function woo_archive.audit_grant();

create function woo_archive.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
    and exists (
      select from auth.users u join auth.sessions s on s.user_id=u.id
       where u.id=auth.uid() and s.id::text=auth.jwt()->>'session_id'
         and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
         and (s.not_after is null or s.not_after>now())
    )
    and (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'tech_admin')
         or (public.has_role(auth.uid(),'editor') and exists
             (select from woo_archive.page_admins where user_id=auth.uid())))
$$;
revoke all on function woo_archive.is_admin() from public, anon, authenticated, service_role;
grant execute on function woo_archive.is_admin() to authenticated;
create function public.woo_archive_access() returns boolean language sql stable security invoker set search_path = '' as $$
  select woo_archive.is_admin()
$$;
revoke all on function public.woo_archive_access() from public, anon, authenticated, service_role;
grant execute on function public.woo_archive_access() to authenticated;

-- Single audited authority. PostgREST validates the bearer token; re-read its grant for each operation.
create function woo_archive.consult(p_action text, p_query text, p_filter text, p_page integer,
                                    p_id bigint, p_purpose text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  result jsonb;
  n integer;
  needle text := lower(trim(p_query));
begin
  if actor is null or not coalesce(woo_archive.is_admin(),false) then
    raise insufficient_privilege using message = 'Accesso Admin richiesto';
  end if;
  -- Require a committed audit event even if gateway transaction overrides are enabled.
  if lower(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'prefer',''))
     ~ 'tx[[:space:]]*=[[:space:]]*rollback' then
    raise insufficient_privilege using message = 'Accesso Admin richiesto con audit persistente';
  end if;
  if p_action is null or p_action not in ('list','detail','export')
     or p_query is null or length(p_query)>200 or p_filter is null or p_filter not in ('all','with','without')
     or p_page is null or p_page not between 0 and 1000000
     or (p_action='detail' and (p_id is null or p_id<1))
     or (p_action='export' and (p_purpose is null or p_purpose not in ('verifica_archivio','assistenza_cliente'))) then
    raise invalid_parameter_value using message = 'Parametri archivio non validi';
  end if;

  if p_action='detail' then
    select jsonb_build_object('id',woo_id::text,'first_name',first_name,'last_name',last_name,
                              'email',email,'purchases',purchases) into result
      from woo_archive.customers where woo_id=p_id;
    n := case when found then 1 else 0 end;
  else
    with filtered as materialized (
      select * from woo_archive.customers
      where (p_filter='all' or (p_filter='with')=(purchases>0))
        and (needle='' or woo_id::text=needle or strpos(lower(first_name || ' ' || last_name),needle)>0
             or strpos(lower(email),needle)>0)
    ), selection as (
      select * from filtered order by woo_id
      limit case when p_action='list' then 50 else 10001 end
      offset case when p_action='list' then 50*p_page else 0 end
    )
    select jsonb_build_object(
      'total',(select count(*) from filtered),
      'accounts',count(*),'buyers',count(*) filter(where purchases>0),'purchases',coalesce(sum(purchases),0),
      'rows',coalesce((select jsonb_agg(jsonb_build_object('id',woo_id::text,
        'name',trim(first_name || ' ' || last_name),'purchases',purchases) ||
        case when p_action='export' then jsonb_build_object('email',email) else '{}'::jsonb end
        order by woo_id) from selection),'[]'::jsonb)
    ) into result from woo_archive.customers;
    n := jsonb_array_length(result->'rows');
    if p_action='export' and (result->>'total')::integer > 10000 then
      raise invalid_parameter_value using message = 'Restringere i filtri di esportazione';
    end if;
  end if;

  insert into woo_archive.audit(actor,action,quantity,woo_id,purpose)
    values(actor::text,p_action,n,case when p_action='detail' then p_id end,
           case when p_action='export' then p_purpose end);
  perform set_config('response.headers','[{"Cache-Control":"private, no-store"}]',true);
  return result;
end $$;
revoke all on function woo_archive.consult(text,text,text,integer,bigint,text) from public, anon, authenticated, service_role;
grant usage on schema woo_archive to authenticated;
grant execute on function woo_archive.consult(text,text,text,integer,bigint,text) to authenticated;

create function public.woo_archive_read(p_action text, p_query text default '', p_filter text default 'all',
  p_page integer default 0, p_id bigint default null, p_purpose text default null)
returns jsonb language sql volatile security invoker set search_path = '' as $$
  select woo_archive.consult(p_action,p_query,p_filter,p_page,p_id,p_purpose)
$$;
revoke all on function public.woo_archive_read(text,text,text,integer,bigint,text) from public, anon, authenticated, service_role;
grant execute on function public.woo_archive_read(text,text,text,integer,bigint,text) to authenticated;
commit;
