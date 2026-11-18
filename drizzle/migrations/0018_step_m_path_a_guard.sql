-- Step M (Path A): technical, harmless guard. No schema or data changes.
-- Runs in the same transaction after canonical 0016/0017; aborts everything if their objects are missing.
DO $$
BEGIN
  IF to_regclass('public.admin_confirmed_ai_requests') IS NULL THEN
    RAISE EXCEPTION 'Step M guard: public.admin_confirmed_ai_requests missing after 0017';
  END IF;
  IF to_regprocedure('public.reserve_confirmed_ai_request(uuid,uuid,text,text,text)') IS NULL THEN
    RAISE EXCEPTION 'Step M guard: reserve_confirmed_ai_request missing after 0017';
  END IF;
  IF has_table_privilege('anon', 'public.admin_confirmed_ai_requests', 'SELECT')
     OR has_table_privilege('authenticated', 'public.admin_confirmed_ai_requests', 'SELECT') THEN
    RAISE EXCEPTION 'Step M guard: client roles can read admin_confirmed_ai_requests';
  END IF;
  IF has_function_privilege('anon', 'public.reserve_confirmed_ai_request(uuid,uuid,text,text,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.reserve_confirmed_ai_request(uuid,uuid,text,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Step M guard: client roles can execute reserve_confirmed_ai_request';
  END IF;
END
$$;