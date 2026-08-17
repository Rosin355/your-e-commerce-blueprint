-- FASE A · Hardening additivo: has_role non deve essere invocabile
-- senza autenticazione (accetta un user_id arbitrario e rivelerebbe i ruoli
-- di altri utenti). Nessuna policy esistente usa has_role con il ruolo anon.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;