-- Solo cataloghi di sistema: niente righe prodotto, token o credenziali.
BEGIN READ ONLY;
SELECT version();
SELECT n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity,
       pg_get_userbyid(c.relowner) AS owner, c.relacl
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN
  ('product_enrichment_runs', 'product_enrichment_run_items');
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename IN
  ('product_enrichment_runs', 'product_enrichment_run_items') ORDER BY tablename, policyname;
SELECT r.rolname, t.name, p.privilege,
       has_table_privilege(r.oid, t.name, p.privilege) AS allowed
FROM pg_roles r CROSS JOIN (VALUES ('public.product_enrichment_runs'),
  ('public.product_enrichment_run_items')) t(name)
CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),
  ('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
WHERE r.rolname IN ('anon','authenticated','service_role') ORDER BY 1,2,3;
SELECT c.oid::regclass AS table_name, a.attname, a.attacl
FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
WHERE c.oid IN ('public.product_enrichment_runs'::regclass,
  'public.product_enrichment_run_items'::regclass) AND a.attnum > 0 AND NOT a.attisdropped;
SELECT rolname, rolsuper, rolbypassrls, rolinherit FROM pg_roles
WHERE rolname IN ('anon','authenticated','service_role');
SELECT parent.rolname AS granted_role, member.rolname AS member_role
FROM pg_auth_members m JOIN pg_roles parent ON parent.oid = m.roleid
JOIN pg_roles member ON member.oid = m.member;
-- Individuare viste/funzioni SQL dipendenti che possano aggirare i grant.
SELECT DISTINCT pg_describe_object(d.classid,d.objid,d.objsubid) AS dependent,
       d.refobjid::regclass AS referenced
FROM pg_depend d WHERE d.refobjid IN ('public.product_enrichment_runs'::regclass,
  'public.product_enrichment_run_items'::regclass);
-- Riferimenti dinamici PL/pgSQL non sempre compaiono in pg_depend.
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef, p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prokind IN ('f','p') AND
  (p.prosrc ILIKE '%product_enrichment_runs%' OR p.prosrc ILIKE '%product_enrichment_run_items%');
SELECT schemaname, viewname FROM pg_views WHERE
  definition ILIKE '%product_enrichment_runs%' OR definition ILIKE '%product_enrichment_run_items%';
SELECT pubname, schemaname, tablename FROM pg_publication_tables WHERE
  schemaname = 'public' AND tablename IN ('product_enrichment_runs','product_enrichment_run_items');
ROLLBACK;
