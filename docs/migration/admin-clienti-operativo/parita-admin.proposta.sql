-- Eseguire con psql -X. Il default termina con ROLLBACK.
-- UUID, email confermate e riferimento provengono dal change privato nominativo.
\set ON_ERROR_STOP on
\if :{?apply_change}
\else
  \set apply_change off
\endif
begin isolation level serializable;
create temporary table alignment on commit drop as
select :'owner_id'::uuid as owner_id, :'staff_id'::uuid as staff_id,
       lower(:'owner_email') as owner_email, lower(:'staff_email') as staff_email,
       trim(:'approval_ref') as approval_ref;
do $alignment$
declare
  a record;
  owner_grant public.admin_catalog_capabilities%rowtype;
  staff_grant public.admin_catalog_capabilities%rowtype;
  roles_owner text[];
  roles_staff text[];
  surplus text[];
  opts text[];
begin
  select * into strict a from alignment;
  if a.owner_id=a.staff_id or a.owner_email=a.staff_email or length(a.approval_ref)<4 or
      (select count(*) from auth.users u where ((u.id=a.owner_id and lower(u.email)=a.owner_email)
       or (u.id=a.staff_id and lower(u.email)=a.staff_email)) and u.deleted_at is null
       and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=now()))<>2 then
    raise exception 'Identità staff o autorizzazione non confermata';
  end if;
  select array_agg(role::text order by role::text) into roles_owner from public.user_roles where user_id=a.owner_id;
  select array_agg(role::text order by role::text) into roles_staff from public.user_roles where user_id=a.staff_id;
  if roles_owner is distinct from array['admin','editor'] or roles_staff is distinct from array['editor'] then
    raise exception 'Baseline ruoli cambiata';
  end if;
  select * into strict owner_grant from public.admin_catalog_capabilities where user_id=a.owner_id and enabled for update;
  select * into strict staff_grant from public.admin_catalog_capabilities where user_id=a.staff_id and enabled for update;
  select array(select unnest(staff_grant.field_keys) except select unnest(owner_grant.field_keys) order by 1) into surplus;
  select array(select field_key from public.admin_draft_ai_field_opt_ins where actor=a.staff_id order by 1) into opts;
  if not (owner_grant.capabilities @> staff_grant.capabilities and staff_grant.capabilities @> owner_grant.capabilities)
    or cardinality(owner_grant.capabilities)<>8 or cardinality(owner_grant.field_keys)<>17
    or cardinality(staff_grant.field_keys)<>22 or not staff_grant.field_keys @> owner_grant.field_keys
    or surplus<>array['product_archive','product_formats','product_gallery','product_unpublish','tags']
    or opts<>array['seo_description','seo_title','tags']
    or exists(select from public.admin_draft_ai_field_opt_ins where actor=a.owner_id) then
    raise exception 'Baseline campi, capability o opt-in cambiata';
  end if;
  insert into public.user_roles(user_id,role) values(a.staff_id,'admin');
  update public.admin_catalog_capabilities set field_keys=owner_grant.field_keys,
    approved_reference=a.approval_ref,updated_at=now() where user_id=a.staff_id;
  delete from public.admin_draft_ai_field_opt_ins where actor=a.staff_id and field_key=any(opts);
  if not exists(select from public.user_roles where user_id=a.staff_id and role='admin')
    or exists(select from public.admin_draft_ai_field_opt_ins where actor=a.staff_id)
    or not exists(select from public.admin_catalog_capabilities where user_id=a.staff_id and enabled and field_keys=owner_grant.field_keys) then
    raise exception 'Parità amministrativa non verificata';
  end if;
end $alignment$;
\if :apply_change
  commit;
\else
  rollback;
\endif
