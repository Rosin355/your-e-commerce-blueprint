-- PREPARATO, NON APPLICATO. Richiede approvazione prima dell'esecuzione.
-- Scopo: un utente registrato può verificare solo i PROPRI ruoli.
-- Le regole RLS/Storage passano sempre auth.uid(), quindi restano invariate.
-- Le funzioni server con service role (auth.uid() nullo) restano invariate.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (auth.uid() IS NULL OR auth.uid() = _user_id)
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
-- can_edit_products, can_publish_products e can_manage_taxonomy delegano a has_role:
-- ereditano il controllo senza modifiche. Grant invariati.

-- Verifica post-applicazione (da sessione utente):
--   SELECT public.has_role(auth.uid(), 'admin');          -- risultato reale
--   SELECT public.has_role('<altro uuid>', 'admin');      -- sempre false
-- Rollback: ricreare has_role con il corpo originale (migration 20260407205602).
