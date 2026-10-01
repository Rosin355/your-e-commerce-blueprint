-- Fase 2D.4A: restringe i privilegi della tabella di reservation AI.
-- La migration 2D.2 e i dati esistenti restano invariati. Il REVOKE esplicito
-- neutralizza i privilegi più ampi eventualmente ereditati dai default ACL.

revoke all privileges
on table public.product_ai_generation_reservations
from public, anon, authenticated, service_role;

grant select, insert, update
on table public.product_ai_generation_reservations
to service_role;
