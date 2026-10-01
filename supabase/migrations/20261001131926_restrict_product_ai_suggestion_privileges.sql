-- Fase 2D.4B: least privilege per le proposte AI.
-- Tutti gli accessi applicativi passano dalla Edge Function product-admin-ai,
-- che usa service_role dopo l'autenticazione e richiede soltanto SIU.

revoke all privileges
on table public.product_ai_suggestions
from public, anon, authenticated, service_role;

grant select, insert, update
on table public.product_ai_suggestions
to service_role;
