-- Solo simulazione per default. Richiede il nuovo schema e tre variabili private psql.
-- Sostituire ROLLBACK con COMMIT esclusivamente nel change nominativo autorizzato.
\set ON_ERROR_STOP on
begin;
with eligible as (
  select u.id from auth.users u
   where u.id=:'staff_id'::uuid and lower(u.email)=lower(:'staff_email')
     and u.email_confirmed_at is not null and u.deleted_at is null
     and (u.banned_until is null or u.banned_until<=now())
     and exists(select from public.user_roles r where r.user_id=u.id and r.role::text='editor')
     and not exists(select from public.user_roles r where r.user_id=u.id and r.role::text in ('admin','tech_admin'))
), granted as (
  insert into woo_archive.page_admins(user_id,approval_ref)
    select id,:'approval_ref' from eligible on conflict(user_id) do nothing
    returning user_id
)
select count(*) as nuovi_grant_archivio from granted;
rollback;
