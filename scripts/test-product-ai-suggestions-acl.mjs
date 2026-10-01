#!/usr/bin/env node
// PostgreSQL reale e isolato: nessun accesso al progetto Supabase live.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const concurrencyMigration = readFileSync(
  join(
    root,
    "supabase/migrations/20260930152426_harden_product_admin_ai_concurrency.sql",
  ),
  "utf8",
);
const privilegeMigration = readFileSync(
  join(
    root,
    "supabase/migrations/20261001131926_restrict_product_ai_suggestion_privileges.sql",
  ),
  "utf8",
);

const temp = mkdtempSync("/tmp/ogai-acl-");
const dataDir = join(temp, "data");
const socket = join(temp, "socket");
mkdirSync(socket, { mode: 0o700 });
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("PG")),
);
const psqlArgs = [
  "-X",
  "-h",
  socket,
  "-p",
  "55449",
  "-U",
  "postgres",
  "-d",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
  "-A",
  "-t",
  "-q",
];
let started = false;

function command(bin, args, input) {
  const result = spawnSync(bin, args, {
    cwd: root,
    env,
    input,
    encoding: "utf8",
    timeout: 60_000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function sql(input) {
  return command("psql", psqlArgs, input);
}

function sqlDenied(label, input, pattern = /permission denied/i) {
  const result = spawnSync("psql", psqlArgs, {
    cwd: root,
    env,
    input,
    encoding: "utf8",
    timeout: 60_000,
  });
  if (result.error) throw result.error;
  assert.notEqual(result.status, 0, `${label}: la query doveva essere negata`);
  assert.match(result.stderr, pattern, `${label}: errore inatteso`);
}

function waitForPostgres() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const ready = spawnSync("pg_isready", ["-h", socket, "-p", "55449"], {
      cwd: root,
      env,
      encoding: "utf8",
      timeout: 2_000,
    });
    if (ready.status === 0) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  throw new Error("PostgreSQL temporaneo non pronto entro 10 secondi");
}

const productId = "10000000-0000-4000-8000-000000000001";
const actorId = "20000000-0000-4000-8000-000000000001";
const suggestionId = "30000000-0000-4000-8000-000000000001";

const tableSnapshot = `
  SELECT pg_catalog.jsonb_build_object(
    'columns', (
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_array(a.attname, a.atttypid::regtype::text,
          a.attnotnull, pg_catalog.pg_get_expr(d.adbin, d.adrelid))
        ORDER BY a.attnum
      )
      FROM pg_catalog.pg_attribute a
      LEFT JOIN pg_catalog.pg_attrdef d
        ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    ),
    'rls', c.relrowsecurity,
    'force_rls', c.relforcerowsecurity,
    'indexes', (
      SELECT pg_catalog.jsonb_agg(pg_catalog.pg_get_indexdef(i.indexrelid)
        ORDER BY i.indexrelid::regclass::text)
      FROM pg_catalog.pg_index i WHERE i.indrelid = c.oid
    ),
    'constraints', (
      SELECT pg_catalog.jsonb_agg(pg_catalog.pg_get_constraintdef(k.oid)
        ORDER BY k.conname)
      FROM pg_catalog.pg_constraint k WHERE k.conrelid = c.oid
    ),
    'triggers', (
      SELECT pg_catalog.jsonb_agg(pg_catalog.pg_get_triggerdef(t.oid)
        ORDER BY t.tgname)
      FROM pg_catalog.pg_trigger t
      WHERE t.tgrelid = c.oid AND NOT t.tgisinternal
    )
  )
  FROM pg_catalog.pg_class c
  WHERE c.oid = 'public.product_ai_suggestions'::regclass;
`;

const policySnapshot = `
  SELECT coalesce(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_array(
      p.polname,
      p.polcmd,
      p.polpermissive,
      p.polroles,
      pg_catalog.pg_get_expr(p.polqual, p.polrelid),
      pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid)
    ) ORDER BY p.polname
  ), '[]'::jsonb)
  FROM pg_catalog.pg_policy p
  WHERE p.polrelid = 'public.product_ai_suggestions'::regclass;
`;

const rpcSnapshot = `
  SELECT pg_catalog.jsonb_build_object(
    'definition', pg_catalog.pg_get_functiondef(p.oid),
    'security_definer', p.prosecdef,
    'config', p.proconfig,
    'acl', p.proacl
  )
  FROM pg_catalog.pg_proc p
  WHERE p.oid =
    'public.reserve_product_ai_generation(uuid,uuid,text,integer)'::regprocedure;
`;

try {
  command("initdb", [
    "-D",
    dataDir,
    "-U",
    "postgres",
    "--no-locale",
    "--encoding=UTF8",
    "--auth=trust",
  ]);
  command("pg_ctl", [
    "-D",
    dataDir,
    "-l",
    join(temp, "postgres.log"),
    "-o",
    `-F -k ${socket} -p 55449`,
    "-W",
    "start",
  ]);
  started = true;
  waitForPostgres();

  sql(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid
      LANGUAGE sql STABLE SET search_path = ''
      AS 'SELECT ''40000000-0000-4000-8000-000000000001''::uuid';
    CREATE FUNCTION public.can_edit_products(uuid) RETURNS boolean
      LANGUAGE sql STABLE SET search_path = '' AS 'SELECT true';

    CREATE TABLE public.products (id uuid PRIMARY KEY);
    CREATE TABLE public.product_field_definitions (
      key text PRIMARY KEY,
      ai_allowed boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.product_ai_suggestions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      sku text NOT NULL,
      entity_type text NOT NULL DEFAULT 'product',
      product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
      field_key text NOT NULL REFERENCES public.product_field_definitions(key)
        ON DELETE RESTRICT,
      suggestion_text text,
      suggestion_json jsonb,
      model text,
      prompt_hint text,
      based_on_value jsonb,
      status text NOT NULL DEFAULT 'pending',
      created_by uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      resolved_at timestamptz,
      resolved_by uuid,
      base_version integer,
      prompt_version text
    );
    CREATE UNIQUE INDEX uq_pas_pending_product
      ON public.product_ai_suggestions (product_id, field_key)
      WHERE status = 'pending';
    CREATE INDEX idx_pas_product_status
      ON public.product_ai_suggestions (product_id, status);
    CREATE FUNCTION public.assert_ai_field_allowed() RETURNS trigger
      LANGUAGE plpgsql SET search_path = public AS $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM public.product_field_definitions
          WHERE key = NEW.field_key AND ai_allowed
        ) THEN
          RAISE EXCEPTION 'Campo non abilitato' USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
      END;
      $$;
    CREATE TRIGGER trg_pas_ai_allowed
      BEFORE INSERT ON public.product_ai_suggestions
      FOR EACH ROW EXECUTE FUNCTION public.assert_ai_field_allowed();

    GRANT ALL PRIVILEGES ON TABLE public.product_ai_suggestions
      TO authenticated, service_role;
    GRANT SELECT ON TABLE public.products, public.product_field_definitions
      TO service_role;
    ALTER TABLE public.product_ai_suggestions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY ai_suggestions_read ON public.product_ai_suggestions
      FOR SELECT TO authenticated
      USING (public.can_edit_products(auth.uid()));

    INSERT INTO public.products (id) VALUES ('${productId}');
    INSERT INTO public.product_field_definitions (key, ai_allowed)
      VALUES ('title', true);
    INSERT INTO public.product_ai_suggestions (
      id, sku, product_id, field_key, suggestion_text, status, base_version
    ) VALUES (
      '${suggestionId}', 'OG_ACL_FIXTURE', '${productId}', 'title',
      'Fixture iniziale', 'pending', 1
    );

    ${concurrencyMigration}
  `);

  const beforeAcl = sql(`SELECT concat_ws('|',
    has_table_privilege('authenticated', 'public.product_ai_suggestions', 'SELECT'),
    has_table_privilege('authenticated', 'public.product_ai_suggestions', 'INSERT'),
    has_table_privilege('authenticated', 'public.product_ai_suggestions', 'UPDATE'),
    has_table_privilege('authenticated', 'public.product_ai_suggestions', 'DELETE'),
    has_table_privilege('authenticated', 'public.product_ai_suggestions', 'TRUNCATE'),
    has_table_privilege('authenticated', 'public.product_ai_suggestions', 'REFERENCES'),
    has_table_privilege('authenticated', 'public.product_ai_suggestions', 'TRIGGER'),
    has_table_privilege('service_role', 'public.product_ai_suggestions', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  );`);
  assert.equal(beforeAcl, "t|t|t|t|t|t|t|t");

  const rowsBefore = sql(`
    SELECT pg_catalog.jsonb_agg(to_jsonb(s) ORDER BY s.id)
    FROM public.product_ai_suggestions s;
  `);
  const tableBefore = sql(tableSnapshot);
  const policyBefore = sql(policySnapshot);
  const rpcBefore = sql(rpcSnapshot);
  const defaultsBefore = sql(`
    SELECT pg_catalog.md5(coalesce(
      pg_catalog.string_agg(d::text, ',' ORDER BY d::text), ''
    )) FROM pg_catalog.pg_default_acl d;
  `);

  sql(privilegeMigration);

  assert.equal(sql(`
    SELECT pg_catalog.jsonb_agg(to_jsonb(s) ORDER BY s.id)
    FROM public.product_ai_suggestions s;
  `), rowsBefore, "la migration ACL non deve cambiare le suggestion");
  assert.equal(sql(tableSnapshot), tableBefore, "schema, RLS, indici, FK e trigger devono restare invariati");
  assert.equal(sql(policySnapshot), policyBefore, "le policy devono restare invariate");
  assert.equal(sql(rpcSnapshot), rpcBefore, "la RPC deve restare invariata");
  assert.equal(sql(`
    SELECT pg_catalog.md5(coalesce(
      pg_catalog.string_agg(d::text, ',' ORDER BY d::text), ''
    )) FROM pg_catalog.pg_default_acl d;
  `), defaultsBefore, "i default ACL devono restare invariati");

  const finalAcl = sql(`SELECT concat_ws('|',
    has_table_privilege('anon', 'public.product_ai_suggestions', 'SELECT'),
    has_table_privilege('authenticated', 'public.product_ai_suggestions', 'SELECT'),
    has_table_privilege('authenticated', 'public.product_ai_suggestions', 'INSERT'),
    has_table_privilege('authenticated', 'public.product_ai_suggestions', 'UPDATE'),
    has_table_privilege('authenticated', 'public.product_ai_suggestions', 'DELETE'),
    has_table_privilege('authenticated', 'public.product_ai_suggestions', 'TRUNCATE'),
    has_table_privilege('authenticated', 'public.product_ai_suggestions', 'REFERENCES'),
    has_table_privilege('authenticated', 'public.product_ai_suggestions', 'TRIGGER'),
    has_table_privilege('service_role', 'public.product_ai_suggestions', 'SELECT'),
    has_table_privilege('service_role', 'public.product_ai_suggestions', 'INSERT'),
    has_table_privilege('service_role', 'public.product_ai_suggestions', 'UPDATE'),
    has_table_privilege('service_role', 'public.product_ai_suggestions', 'DELETE'),
    has_table_privilege('service_role', 'public.product_ai_suggestions', 'TRUNCATE'),
    has_table_privilege('service_role', 'public.product_ai_suggestions', 'REFERENCES'),
    has_table_privilege('service_role', 'public.product_ai_suggestions', 'TRIGGER'),
    (SELECT relrowsecurity FROM pg_catalog.pg_class
      WHERE oid='public.product_ai_suggestions'::regclass),
    (SELECT relforcerowsecurity FROM pg_catalog.pg_class
      WHERE oid='public.product_ai_suggestions'::regclass)
  );`);
  assert.equal(finalAcl, "f|f|f|f|f|f|f|f|t|t|t|f|f|f|f|t|f");
  assert.equal(sql(`
    SELECT coalesce(pg_catalog.string_agg(
      CASE WHEN x.grantee = 0 THEN 'PUBLIC'
        ELSE pg_catalog.pg_get_userbyid(x.grantee) END || ':' || x.privilege_type,
      ',' ORDER BY x.grantee, x.privilege_type
    ), '')
    FROM pg_catalog.pg_class c
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      coalesce(c.relacl, pg_catalog.acldefault('r', c.relowner))
    ) x
    WHERE c.oid = 'public.product_ai_suggestions'::regclass
      AND (x.grantee = 0 OR pg_catalog.pg_get_userbyid(x.grantee)
        IN ('anon', 'authenticated', 'service_role'));
  `), "service_role:INSERT,service_role:SELECT,service_role:UPDATE");

  sqlDenied("authenticated SELECT", `SET ROLE authenticated; SELECT * FROM public.product_ai_suggestions;`);
  sqlDenied("authenticated INSERT", `SET ROLE authenticated; INSERT INTO public.product_ai_suggestions (sku, product_id, field_key) VALUES ('X', '${productId}', 'title');`);
  sqlDenied("authenticated UPDATE", `SET ROLE authenticated; UPDATE public.product_ai_suggestions SET status='discarded';`);
  sqlDenied("authenticated DELETE", `SET ROLE authenticated; DELETE FROM public.product_ai_suggestions;`);
  sqlDenied("authenticated TRUNCATE", `SET ROLE authenticated; TRUNCATE public.product_ai_suggestions;`);

  sql(`CREATE SCHEMA auth_fixture AUTHORIZATION authenticated;`);
  sqlDenied("authenticated REFERENCES", `SET ROLE authenticated; CREATE TABLE auth_fixture.suggestion_refs (suggestion_id uuid REFERENCES public.product_ai_suggestions(id));`);
  sql(`
    CREATE FUNCTION auth_fixture.noop_trigger() RETURNS trigger
      LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';
    GRANT EXECUTE ON FUNCTION auth_fixture.noop_trigger() TO authenticated;
  `);
  sqlDenied("authenticated TRIGGER", `SET ROLE authenticated; CREATE TRIGGER forbidden_trigger BEFORE UPDATE ON public.product_ai_suggestions FOR EACH ROW EXECUTE FUNCTION auth_fixture.noop_trigger();`);

  const serviceResult = sql(`
    SET ROLE service_role;
    SELECT count(*) FROM public.product_ai_suggestions;
    INSERT INTO public.product_ai_suggestions (
      sku, product_id, field_key, suggestion_text, status, base_version
    ) VALUES (
      'OG_ACL_SERVICE', '${productId}', 'title', 'Fixture service', 'discarded', 1
    );
    UPDATE public.product_ai_suggestions
      SET suggestion_text = 'Fixture service aggiornata'
      WHERE sku = 'OG_ACL_SERVICE';
    SELECT suggestion_text FROM public.product_ai_suggestions
      WHERE sku = 'OG_ACL_SERVICE';
    RESET ROLE;
  `);
  assert.match(serviceResult, /Fixture service aggiornata/);
  sqlDenied("service_role DELETE", `SET ROLE service_role; DELETE FROM public.product_ai_suggestions WHERE sku='OG_ACL_SERVICE';`);
  sqlDenied("service_role TRUNCATE", `SET ROLE service_role; TRUNCATE public.product_ai_suggestions;`);

  const reservation = sql(`
    SET ROLE service_role;
    SELECT public.reserve_product_ai_generation(
      '${actorId}'::uuid,
      '${productId}'::uuid,
      'title',
      1
    );
    RESET ROLE;
  `);
  assert.match(reservation, /"code": "RESERVED"/);

  sql(privilegeMigration);
  assert.equal(sql(`
    SELECT pg_catalog.string_agg(x.privilege_type, ',' ORDER BY x.privilege_type)
    FROM pg_catalog.pg_class c
    CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) x
    WHERE c.oid = 'public.product_ai_suggestions'::regclass
      AND x.grantee = 'service_role'::regrole;
  `), "INSERT,SELECT,UPDATE");

  console.log("PASS ACL 2D.4B: PUBLIC/anon/authenticated none; service_role SELECT/INSERT/UPDATE.");
  console.log("PASS negativi: SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER authenticated negati.");
  console.log("PASS runtime: service_role legge, inserisce e aggiorna; DELETE/TRUNCATE negati; RPC reservation operativa.");
  console.log("PASS non-drift: dati, RLS/FORCE, policy, schema, indici, FK, trigger, RPC e default ACL invariati.");
  console.log("PASS stabilità: seconda applicazione offline conserva l'ACL target.");
} finally {
  if (started) command("pg_ctl", ["-D", dataDir, "-m", "fast", "-W", "stop"]);
  console.log(`Cluster arrestato; fixture sintetiche in ${temp}`);
}
