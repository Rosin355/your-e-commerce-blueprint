-- psql: variabili private staff_id e staff_email, ottenute da riferimenti indipendenti.
-- Eseguibile prima della migrazione. Restituisce soli booleani e conteggi.
begin read only;
select count(*)=1 as identita_confermata,
       count(*) filter(where exists(select from public.user_roles r where r.user_id=u.id
                                    and r.role::text in ('admin','tech_admin')))=1 as admin_globale,
       count(*) filter(where exists(select from public.user_roles r where r.user_id=u.id
                                    and r.role::text='editor'))=1 as editor
from auth.users u where u.id=:'staff_id'::uuid and lower(u.email)=lower(:'staff_email')
  and u.email_confirmed_at is not null and u.deleted_at is null
  and (u.banned_until is null or u.banned_until<=now());
commit;
