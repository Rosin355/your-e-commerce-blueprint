-- Online Garden · Fase 2D.4A
-- Preflight/audit SOLO LETTURA per ACL, RLS, policy, funzioni e default ACL AI.
-- Non legge valori prodotto o contenuti delle suggestion.

begin transaction read only;

-- 1. Owner e stato RLS delle due tabelle AI interessate.
select
  n.nspname as schema_name,
  c.relname as table_name,
  pg_catalog.pg_get_userbyid(c.relowner) as owner,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls,
  c.relacl
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'product_ai_generation_reservations',
    'product_ai_suggestions'
  )
  and c.relkind in ('r', 'p')
order by c.relname;

-- 2. ACL effettive per singolo privilege, inclusi PUBLIC e service_role.
select
  c.relname as table_name,
  pg_catalog.pg_get_userbyid(x.grantor) as grantor,
  coalesce(grantee.rolname, 'PUBLIC') as grantee,
  x.privilege_type,
  x.is_grantable
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
cross join lateral pg_catalog.aclexplode(
  coalesce(c.relacl, pg_catalog.acldefault('r', c.relowner))
) x
left join pg_catalog.pg_roles grantee on grantee.oid = x.grantee
where n.nspname = 'public'
  and c.relname in (
    'product_ai_generation_reservations',
    'product_ai_suggestions'
  )
order by c.relname, grantee, x.privilege_type;

-- 3. Matrice dei privilegi effettivi per i ruoli applicativi.
with roles(role_name) as (
  values ('anon'::text), ('authenticated'::text), ('service_role'::text)
), privileges(privilege_name) as (
  values
    ('SELECT'::text),
    ('INSERT'::text),
    ('UPDATE'::text),
    ('DELETE'::text),
    ('TRUNCATE'::text),
    ('REFERENCES'::text),
    ('TRIGGER'::text),
    ('MAINTAIN'::text)
), tables(table_name) as (
  values
    ('public.product_ai_generation_reservations'::text),
    ('public.product_ai_suggestions'::text)
)
select
  tables.table_name,
  roles.role_name,
  privileges.privilege_name,
  case
    when privileges.privilege_name = 'MAINTAIN'
      and current_setting('server_version_num')::integer < 170000
      then null
    else pg_catalog.has_table_privilege(
      roles.role_name,
      tables.table_name,
      privileges.privilege_name
    )
  end as allowed
from tables
cross join roles
cross join privileges
order by tables.table_name, roles.role_name, privileges.privilege_name;

-- 4. Policy RLS. L'assenza di policy write blocca INSERT/UPDATE/DELETE, ma
-- RLS non governa TRUNCATE, REFERENCES o TRIGGER.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in (
    'product_ai_generation_reservations',
    'product_ai_suggestions'
  )
order by tablename, policyname;

-- 5. Firma, owner, security mode, search_path e ACL delle RPC/funzioni usate.
select
  p.oid::pg_catalog.regprocedure::text as signature,
  pg_catalog.pg_get_userbyid(p.proowner) as owner,
  case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end
    as security_mode,
  p.proconfig,
  p.proacl
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('reserve_product_ai_generation', 'can_edit_products')
order by signature;

-- 6. Funzioni/triggers/FK che dipendono dalle tabelle AI.
select
  p.oid::pg_catalog.regprocedure::text as signature,
  p.prosecdef as security_definer
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and pg_catalog.pg_get_functiondef(p.oid) ilike '%product_ai_suggestions%'
order by signature;

select
  event_object_table,
  trigger_name,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in (
    'product_ai_generation_reservations',
    'product_ai_suggestions'
  )
order by event_object_table, trigger_name, event_manipulation;

select
  conrelid::pg_catalog.regclass::text as source_table,
  confrelid::pg_catalog.regclass::text as referenced_table,
  conname,
  pg_catalog.pg_get_constraintdef(oid) as definition
from pg_catalog.pg_constraint
where contype = 'f'
  and (
    conrelid in (
      'public.product_ai_generation_reservations'::pg_catalog.regclass,
      'public.product_ai_suggestions'::pg_catalog.regclass
    )
    or confrelid in (
      'public.product_ai_generation_reservations'::pg_catalog.regclass,
      'public.product_ai_suggestions'::pg_catalog.regclass
    )
  )
order by source_table, conname;

-- 7. Default ACL per owner/schema. Serve a distinguere la causa futura dagli
-- ACL per-oggetto; questa fase NON esegue ALTER DEFAULT PRIVILEGES.
select
  pg_catalog.pg_get_userbyid(d.defaclrole) as owner,
  case
    when d.defaclnamespace = 0 then '<all schemas>'
    else n.nspname
  end as schema_name,
  d.defaclobjtype,
  coalesce(grantee.rolname, 'PUBLIC') as grantee,
  x.privilege_type,
  x.is_grantable
from pg_catalog.pg_default_acl d
left join pg_catalog.pg_namespace n on n.oid = d.defaclnamespace
cross join lateral pg_catalog.aclexplode(d.defaclacl) x
left join pg_catalog.pg_roles grantee on grantee.oid = x.grantee
where d.defaclobjtype = 'r'
  and (d.defaclnamespace = 0 or n.nspname = 'public')
order by owner, schema_name, grantee, x.privilege_type;

rollback;
