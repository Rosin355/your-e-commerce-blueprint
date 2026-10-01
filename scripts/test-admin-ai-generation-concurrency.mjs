#!/usr/bin/env node
// PostgreSQL reale e isolato: nessun accesso al progetto Supabase live.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migration = readFileSync(
  join(
    root,
    "supabase/migrations/20260930152426_harden_product_admin_ai_concurrency.sql",
  ),
  "utf8",
);
const privilegeMigration = readFileSync(
  join(
    root,
    "supabase/migrations/20261001130202_restrict_product_admin_ai_reservation_privileges.sql",
  ),
  "utf8",
);
const readOnlyAudit = readFileSync(
  join(root, "docs/fase2d/product-ai-privilege-audit-2D4A.sql"),
  "utf8",
);
// Socket Unix corto: PostgreSQL impone un limite di lunghezza al path.
const temp = mkdtempSync("/tmp/ogai-");
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
  "55445",
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

function sqlFails(input, pattern) {
  const result = spawnSync("psql", psqlArgs, {
    cwd: root,
    env,
    input,
    encoding: "utf8",
    timeout: 60_000,
  });
  if (result.error) throw result.error;
  assert.notEqual(result.status, 0, "la query doveva essere respinta");
  assert.match(result.stderr, pattern);
}

function startSql(input) {
  const child = spawn("psql", psqlArgs, { cwd: root, env });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  child.stdin.end(input);
  return new Promise((resolvePromise, rejectPromise) => {
    child.on("error", rejectPromise);
    child.on("close", (status) => {
      if (status !== 0) rejectPromise(new Error(stderr));
      else resolvePromise(stdout.trim());
    });
  });
}

function waitForPostgres() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const ready = spawnSync("pg_isready", ["-h", socket, "-p", "55445"], {
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

function jsonResult(output) {
  const line = output.split("\n").map((item) => item.trim()).findLast((item) =>
    item.startsWith("{")
  );
  assert.ok(line, `risultato JSON assente: ${output}`);
  return JSON.parse(line);
}

function reserveSql(actor, productId, fieldKey = "title", version = 1) {
  return `SET ROLE service_role;
    SELECT public.reserve_product_ai_generation(
      '${actor}'::uuid,
      '${productId}'::uuid,
      '${fieldKey}',
      ${version}
    );
    RESET ROLE;`;
}

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
    `-F -k ${socket} -p 55445`,
    "-W",
    "start",
  ]);
  started = true;
  waitForPostgres();

  sql(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;

    -- Riproduce il default ACL osservato live: un GRANT successivo non
    -- restringe i privilegi già assegnati alla creazione della tabella.
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
      GRANT ALL ON TABLES TO service_role;

    CREATE TABLE public.products (id uuid PRIMARY KEY);
    CREATE TABLE public.product_field_definitions (key text PRIMARY KEY);
    CREATE TABLE public.product_ai_suggestions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      status text NOT NULL
    );
    GRANT SELECT ON public.product_ai_suggestions TO service_role;

    INSERT INTO public.product_field_definitions (key) VALUES ('title');
    INSERT INTO public.products (id) VALUES
      ('10000000-0000-4000-8000-000000000001'),
      ('10000000-0000-4000-8000-000000000002'),
      ('10000000-0000-4000-8000-000000000003'),
      ('10000000-0000-4000-8000-000000000004'),
      ('10000000-0000-4000-8000-000000000005'),
      ('10000000-0000-4000-8000-000000000006');

    ${migration}
  `);

  const liveLikeAcl = sql(`
    SELECT pg_catalog.string_agg(x.privilege_type, ',' ORDER BY x.privilege_type)
    FROM pg_catalog.pg_class c
    CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) x
    WHERE c.oid = 'public.product_ai_generation_reservations'::regclass
      AND x.grantee = 'service_role'::regrole;
  `);
  assert.match(liveLikeAcl, /DELETE/);
  assert.match(liveLikeAcl, /TRUNCATE/);
  assert.match(liveLikeAcl, /REFERENCES/);
  assert.match(liveLikeAcl, /TRIGGER/);

  const preflightActor = "20000000-0000-4000-8000-000000000099";
  const preflightReservation = jsonResult(sql(reserveSql(
    preflightActor,
    "10000000-0000-4000-8000-000000000001",
  )));
  assert.equal(preflightReservation.code, "RESERVED");

  const dataBefore = sql(`
    SELECT pg_catalog.jsonb_agg(to_jsonb(r) ORDER BY r.id)
    FROM public.product_ai_generation_reservations r;
  `);
  const tableBefore = sql(`
    SELECT pg_catalog.jsonb_build_object(
      'rls', c.relrowsecurity,
      'force_rls', c.relforcerowsecurity,
      'indexes', (
        SELECT pg_catalog.jsonb_agg(pg_catalog.pg_get_indexdef(i.indexrelid)
          ORDER BY i.indexrelid::regclass::text)
        FROM pg_catalog.pg_index i
        WHERE i.indrelid = c.oid
      ),
      'constraints', (
        SELECT pg_catalog.jsonb_agg(pg_catalog.pg_get_constraintdef(k.oid)
          ORDER BY k.conname)
        FROM pg_catalog.pg_constraint k
        WHERE k.conrelid = c.oid
      )
    )
    FROM pg_catalog.pg_class c
    WHERE c.oid = 'public.product_ai_generation_reservations'::regclass;
  `);
  const functionBefore = sql(`
    SELECT pg_catalog.jsonb_build_object(
      'definition', pg_catalog.pg_get_functiondef(p.oid),
      'security_definer', p.prosecdef,
      'config', p.proconfig,
      'acl', p.proacl
    )
    FROM pg_catalog.pg_proc p
    WHERE p.oid =
      'public.reserve_product_ai_generation(uuid,uuid,text,integer)'::regprocedure;
  `);
  const defaultsBefore = sql(`
    SELECT pg_catalog.md5(coalesce(
      pg_catalog.string_agg(d::text, ',' ORDER BY d::text),
      ''
    ))
    FROM pg_catalog.pg_default_acl d;
  `);

  sql(privilegeMigration);

  assert.equal(sql(`
    SELECT pg_catalog.jsonb_agg(to_jsonb(r) ORDER BY r.id)
    FROM public.product_ai_generation_reservations r;
  `), dataBefore, "la forward migration non deve cambiare le reservation");
  assert.equal(sql(`
    SELECT pg_catalog.jsonb_build_object(
      'rls', c.relrowsecurity,
      'force_rls', c.relforcerowsecurity,
      'indexes', (
        SELECT pg_catalog.jsonb_agg(pg_catalog.pg_get_indexdef(i.indexrelid)
          ORDER BY i.indexrelid::regclass::text)
        FROM pg_catalog.pg_index i
        WHERE i.indrelid = c.oid
      ),
      'constraints', (
        SELECT pg_catalog.jsonb_agg(pg_catalog.pg_get_constraintdef(k.oid)
          ORDER BY k.conname)
        FROM pg_catalog.pg_constraint k
        WHERE k.conrelid = c.oid
      )
    )
    FROM pg_catalog.pg_class c
    WHERE c.oid = 'public.product_ai_generation_reservations'::regclass;
  `), tableBefore, "RLS, indici e vincoli devono restare invariati");
  assert.equal(sql(`
    SELECT pg_catalog.jsonb_build_object(
      'definition', pg_catalog.pg_get_functiondef(p.oid),
      'security_definer', p.prosecdef,
      'config', p.proconfig,
      'acl', p.proacl
    )
    FROM pg_catalog.pg_proc p
    WHERE p.oid =
      'public.reserve_product_ai_generation(uuid,uuid,text,integer)'::regprocedure;
  `), functionBefore, "RPC e ACL funzione devono restare invariati");
  assert.equal(sql(`
    SELECT pg_catalog.md5(coalesce(
      pg_catalog.string_agg(d::text, ',' ORDER BY d::text),
      ''
    ))
    FROM pg_catalog.pg_default_acl d;
  `), defaultsBefore, "la forward migration non deve cambiare i default ACL");

  const restrictedAcl = sql(`
    SELECT pg_catalog.string_agg(x.privilege_type, ',' ORDER BY x.privilege_type)
    FROM pg_catalog.pg_class c
    CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) x
    WHERE c.oid = 'public.product_ai_generation_reservations'::regclass
      AND x.grantee = 'service_role'::regrole;
  `);
  assert.equal(restrictedAcl, "INSERT,SELECT,UPDATE");

  // Seconda applicazione offline: il risultato ACL resta identico.
  sql(privilegeMigration);
  assert.equal(sql(`
    SELECT pg_catalog.string_agg(x.privilege_type, ',' ORDER BY x.privilege_type)
    FROM pg_catalog.pg_class c
    CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) x
    WHERE c.oid = 'public.product_ai_generation_reservations'::regclass
      AND x.grantee = 'service_role'::regrole;
  `), "INSERT,SELECT,UPDATE");

  // Dimostrazione isolata: RLS blocca DML senza policy write, ma non TRUNCATE.
  sql(`
    CREATE TABLE public.rls_acl_probe (id integer PRIMARY KEY);
    ALTER TABLE public.rls_acl_probe ENABLE ROW LEVEL SECURITY;
    CREATE POLICY rls_acl_probe_read ON public.rls_acl_probe
      FOR SELECT TO authenticated USING (true);
    GRANT ALL ON public.rls_acl_probe TO authenticated;
    INSERT INTO public.rls_acl_probe VALUES (1);
  `);
  assert.equal(sql(`SET ROLE authenticated;
    SELECT count(*) FROM public.rls_acl_probe;
    RESET ROLE;`), "1");
  sqlFails(
    `SET ROLE authenticated;
     INSERT INTO public.rls_acl_probe VALUES (2);`,
    /row-level security policy/,
  );
  sql(`SET ROLE authenticated;
    TRUNCATE public.rls_acl_probe;
    RESET ROLE;`);
  assert.equal(sql(`SELECT count(*) FROM public.rls_acl_probe;`), "0");

  sql(`TRUNCATE public.product_ai_generation_reservations;`);

  const actor = "20000000-0000-4000-8000-000000000001";
  const six = await Promise.all(
    Array.from(
      { length: 6 },
      (_, index) =>
        startSql(
          reserveSql(actor, `10000000-0000-4000-8000-00000000000${index + 1}`),
        )
          .then(jsonResult),
    ),
  );
  const reserved = six.filter((item) => item.code === "RESERVED");
  const limited = six.filter((item) => item.code === "RATE_LIMITED");
  assert.equal(
    reserved.length,
    5,
    "sei richieste concorrenti devono prenotare al massimo cinque provider call",
  );
  assert.equal(limited.length, 1);
  assert.equal(
    sql(`SELECT count(*) FROM public.product_ai_generation_reservations;`),
    "5",
  );

  sql(`TRUNCATE public.product_ai_generation_reservations;`);
  const sameTargetActor = "20000000-0000-4000-8000-000000000002";
  const sameTarget = await Promise.all([
    startSql(
      reserveSql(sameTargetActor, "10000000-0000-4000-8000-000000000001"),
    ).then(jsonResult),
    startSql(
      reserveSql(sameTargetActor, "10000000-0000-4000-8000-000000000001"),
    ).then(jsonResult),
  ]);
  assert.deepEqual(
    sameTarget.map((item) => item.code).sort(),
    ["GENERATION_IN_PROGRESS", "RESERVED"],
  );
  assert.equal(
    sameTarget.filter((item) => item.code === "RESERVED").length,
    1,
    "una sola reservation equivale a una sola provider call",
  );
  assert.equal(
    sql(`SELECT count(*) FROM public.product_ai_generation_reservations;`),
    "1",
  );

  const reservationId = sameTarget.find((item) =>
    item.code === "RESERVED"
  ).reservationId;
  sql(`SET ROLE service_role;
    UPDATE public.product_ai_generation_reservations
    SET status='failed', resolved_at=clock_timestamp()
    WHERE id='${reservationId}'::uuid AND status='reserved';
    RESET ROLE;`);
  const afterFailure = jsonResult(sql(reserveSql(
    sameTargetActor,
    "10000000-0000-4000-8000-000000000001",
  )));
  assert.equal(
    afterFailure.code,
    "RESERVED",
    "un fallimento non blocca il target per un minuto",
  );

  const acl = sql(`SELECT concat_ws('|',
    has_table_privilege('anon', 'public.product_ai_generation_reservations', 'SELECT'),
    has_table_privilege('authenticated', 'public.product_ai_generation_reservations', 'SELECT'),
    has_table_privilege('service_role', 'public.product_ai_generation_reservations', 'SELECT'),
    has_table_privilege('service_role', 'public.product_ai_generation_reservations', 'INSERT'),
    has_table_privilege('service_role', 'public.product_ai_generation_reservations', 'UPDATE'),
    has_table_privilege('service_role', 'public.product_ai_generation_reservations', 'DELETE'),
    has_table_privilege('service_role', 'public.product_ai_generation_reservations', 'TRUNCATE'),
    has_table_privilege('service_role', 'public.product_ai_generation_reservations', 'REFERENCES'),
    has_table_privilege('service_role', 'public.product_ai_generation_reservations', 'TRIGGER'),
    has_function_privilege('anon', 'public.reserve_product_ai_generation(uuid,uuid,text,integer)', 'EXECUTE'),
    has_function_privilege('authenticated', 'public.reserve_product_ai_generation(uuid,uuid,text,integer)', 'EXECUTE'),
    has_function_privilege('service_role', 'public.reserve_product_ai_generation(uuid,uuid,text,integer)', 'EXECUTE'),
    (SELECT relrowsecurity FROM pg_class WHERE oid='public.product_ai_generation_reservations'::regclass),
    (SELECT prosecdef = false FROM pg_proc WHERE oid=
      'public.reserve_product_ai_generation(uuid,uuid,text,integer)'::regprocedure),
    (SELECT proconfig = ARRAY['search_path=""'] FROM pg_proc WHERE oid=
      'public.reserve_product_ai_generation(uuid,uuid,text,integer)'::regprocedure)
  );`);
  assert.equal(acl, "f|f|t|t|t|f|f|f|f|f|f|t|t|t|t");

  // Il preflight consegnato a Lovable deve essere sintatticamente valido e
  // chiudersi senza lasciare transazioni o modifiche nel cluster isolato.
  sql(readOnlyAudit);

  console.log(
    "PASS PostgreSQL concorrente: 6 tentativi => 5 reservation/provider slot e 1 RATE_LIMITED.",
  );
  console.log(
    "PASS PostgreSQL concorrente: stesso target/version => 1 RESERVED e 1 GENERATION_IN_PROGRESS.",
  );
  console.log(
    "PASS ACL/RLS: anon e authenticated negati; service_role minimo; RLS attiva.",
  );
  console.log(
    "PASS forward-only: dati, RLS, indici, vincoli, RPC e default ACL invariati; seconda applicazione stabile.",
  );
  console.log(
    "PASS audit RLS: DML senza policy write negata; TRUNCATE non è governato da RLS.",
  );
  console.log("PASS preflight read-only 2D.4A: sintassi PostgreSQL valida.");
} finally {
  if (started) command("pg_ctl", ["-D", dataDir, "-m", "fast", "-W", "stop"]);
  console.log(`Cluster arrestato; fixture sintetiche in ${temp}`);
}
