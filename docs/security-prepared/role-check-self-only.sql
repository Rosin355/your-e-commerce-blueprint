-- PREPARATO, NON APPLICATO. Richiede approvazione esplicita.
-- Un utente vede solo i PROPRI ruoli. Chiamate fidate: service role (funzioni server)
-- o sessione tecnica postgres (migration). Anonimi e richieste sui ruoli altrui: false.
-- Nota: si usa session_user, non current_user, perché dentro le funzioni
-- SECURITY DEFINER (can_edit_products ecc.) current_user è il proprietario.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ((auth.uid() = _user_id) IS TRUE
          OR coalesce(auth.role(), '') = 'service_role'
          OR session_user = 'postgres')
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
-- can_edit_products, can_publish_products, can_manage_taxonomy delegano a has_role. Grant invariati
-- (anon già senza EXECUTE). Le 27 policy passano auth.uid(): invariate. Admin V2 legge user_roles direttamente.
-- Verifica della condizione (21/11/2026, claims simulati): anon=false, self=true, altro utente=false,
-- service_role=true, nessun claim=false.
-- Rollback: corpo originale = SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
