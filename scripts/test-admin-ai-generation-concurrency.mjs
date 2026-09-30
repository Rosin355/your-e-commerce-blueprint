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
    has_table_privilege('service_role', 'public.product_ai_generation_reservations', 'SELECT,INSERT,UPDATE'),
    has_function_privilege('anon', 'public.reserve_product_ai_generation(uuid,uuid,text,integer)', 'EXECUTE'),
    has_function_privilege('authenticated', 'public.reserve_product_ai_generation(uuid,uuid,text,integer)', 'EXECUTE'),
    has_function_privilege('service_role', 'public.reserve_product_ai_generation(uuid,uuid,text,integer)', 'EXECUTE'),
    (SELECT relrowsecurity FROM pg_class WHERE oid='public.product_ai_generation_reservations'::regclass)
  );`);
  assert.equal(acl, "f|f|t|f|f|t|t");

  console.log(
    "PASS PostgreSQL concorrente: 6 tentativi => 5 reservation/provider slot e 1 RATE_LIMITED.",
  );
  console.log(
    "PASS PostgreSQL concorrente: stesso target/version => 1 RESERVED e 1 GENERATION_IN_PROGRESS.",
  );
  console.log(
    "PASS ACL/RLS: anon e authenticated negati; service_role minimo; RLS attiva.",
  );
} finally {
  if (started) command("pg_ctl", ["-D", dataDir, "-m", "fast", "-W", "stop"]);
  console.log(`Cluster arrestato; fixture sintetiche in ${temp}`);
}
