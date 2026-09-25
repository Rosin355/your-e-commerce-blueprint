-- Fase 2C.0: restrizione legacy. Non applicata live da Codex.
-- Eseguire prima il preflight read-only e ottenere approvazione.
-- Solo le due tabelle legacy; nessuna modifica a dati, service_role o RPC.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.product_enrichment_runs,
  public.product_enrichment_run_items IN ACCESS EXCLUSIVE MODE;

DO $guard$
DECLARE
  t regclass;
  p record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role' AND rolbypassrls) THEN
    RAISE EXCEPTION 'STOP: service_role deve mantenere BYPASSRLS';
  END IF;
  FOR t IN SELECT unnest(ARRAY[
    'public.product_enrichment_runs'::regclass,
    'public.product_enrichment_run_items'::regclass
  ]) LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = t) THEN
      RAISE EXCEPTION 'STOP: RLS disabilitata su %', t;
    END IF;
    IF NOT (has_table_privilege('service_role', t, 'SELECT')
        AND has_table_privilege('service_role', t, 'INSERT')
        AND has_table_privilege('service_role', t, 'UPDATE')
        AND has_table_privilege('service_role', t, 'DELETE')) THEN
      RAISE EXCEPTION 'STOP: grant service_role inattesi su %', t;
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) acl
      WHERE a.attrelid = t AND a.attnum > 0 AND NOT a.attisdropped
        AND (acl.grantee = 0 OR acl.grantee IN
          (SELECT oid FROM pg_roles WHERE rolname IN ('anon','authenticated')))
    ) THEN
      RAISE EXCEPTION 'STOP: ACL di colonna inattesa su %', t;
    END IF;
    -- Non eliminare policy sconosciute: richiedono una nuova analisi.
    FOR p IN SELECT polname, polcmd, polpermissive, polroles,
        pg_get_expr(polqual, polrelid) AS qual,
        pg_get_expr(polwithcheck, polrelid) AS chk
      FROM pg_policy WHERE polrelid = t
    LOOP
      IF NOT (
        p.polpermissive
        AND p.polroles = ARRAY[(SELECT oid FROM pg_roles WHERE rolname = 'authenticated')]
        AND (
          (p.polcmd = 'r' AND p.qual = 'true' AND p.chk IS NULL
            AND p.polname = CASE WHEN t = 'public.product_enrichment_runs'::regclass
              THEN 'Authenticated can read enrichment runs' ELSE 'Authenticated can read enrichment items' END)
          OR (p.polcmd = 'a' AND p.qual IS NULL AND p.chk = 'true'
            AND p.polname = CASE WHEN t = 'public.product_enrichment_runs'::regclass
              THEN 'Authenticated can insert enrichment runs' ELSE 'Authenticated can insert enrichment items' END)
          OR (p.polcmd = 'w' AND p.qual = 'true' AND p.chk = 'true'
            AND p.polname = CASE WHEN t = 'public.product_enrichment_runs'::regclass
              THEN 'Authenticated can update enrichment runs' ELSE 'Authenticated can update enrichment items' END)
        )
      ) IS TRUE THEN
        RAISE EXCEPTION 'STOP: policy inattesa %.%', t, p.polname;
      END IF;
    END LOOP;
  END LOOP;
END
$guard$;

REVOKE ALL PRIVILEGES ON TABLE public.product_enrichment_runs,
  public.product_enrichment_run_items FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Authenticated can read enrichment runs" ON public.product_enrichment_runs;
DROP POLICY IF EXISTS "Authenticated can insert enrichment runs" ON public.product_enrichment_runs;
DROP POLICY IF EXISTS "Authenticated can update enrichment runs" ON public.product_enrichment_runs;
DROP POLICY IF EXISTS "Authenticated can read enrichment items" ON public.product_enrichment_run_items;
DROP POLICY IF EXISTS "Authenticated can insert enrichment items" ON public.product_enrichment_run_items;
DROP POLICY IF EXISTS "Authenticated can update enrichment items" ON public.product_enrichment_run_items;

-- RLS rimane attiva senza policy client: default deny.
-- Fallire atomicamente se ACL di colonna o membership ereditate lasciano accesso.
DO $verify$
DECLARE
  t regclass;
  r text;
  privilege text;
BEGIN
  FOREACH t IN ARRAY ARRAY['public.product_enrichment_runs'::regclass,
                           'public.product_enrichment_run_items'::regclass] LOOP
    FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      IF NOT has_table_privilege('service_role', t, privilege) THEN
        RAISE EXCEPTION 'STOP: perdita privilegio service_role % %', t, privilege;
      END IF;
    END LOOP;
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r AND (rolsuper OR rolbypassrls)) THEN
        RAISE EXCEPTION 'STOP: attributi privilegiati del ruolo %', r;
      END IF;
      FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
        IF has_table_privilege(r, t, privilege) THEN
          RAISE EXCEPTION 'STOP: privilegio effettivo residuo % % %', r, t, privilege;
        END IF;
      END LOOP;
      FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
        IF has_any_column_privilege(r, t, privilege) THEN
          RAISE EXCEPTION 'STOP: ACL di colonna residua % % %', r, t, privilege;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END
$verify$;
COMMIT;
