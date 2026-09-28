#!/usr/bin/env node
// PostgreSQL reale e isolato: riproduce il retry sovrapposto senza accessi live.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import {
  commandPayloadHash,
  executeCommand,
  lookupCommandReplay,
} from '../supabase/functions/product-admin-api/commands.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sequentialSource = readFileSync(join(root, 'scripts/test-admin-manual-locked-backend.mjs'), 'utf8');
const fixture = sequentialSource.match(/  sql\(`([\s\S]*?)\n    \$\{migration\}\n  `\);/);
assert.ok(fixture, 'fixture PostgreSQL 2C.1 non trovata');

const migration = readFileSync(
  join(root, 'supabase/migrations/20260926150609_allow_admin_manual_locked_field_edits.sql'),
  'utf8',
);
const adminId = '00000000-0000-4000-8000-000000000001';
const techId = '00000000-0000-4000-8000-000000000002';
const editorId = '00000000-0000-4000-8000-000000000003';
const productId = '10000000-0000-4000-8000-000000000001';
const setup = fixture[1]
  .replaceAll('${adminId}', adminId)
  .replaceAll('${techId}', techId)
  .replaceAll('${editorId}', editorId)
  .replaceAll('${productId}', productId);

const temp = mkdtempSync(join(tmpdir(), 'og-admin-idempotent-race-'));
const dataDir = join(temp, 'data');
const socket = join(temp, 'socket');
mkdirSync(socket, { mode: 0o700 });
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PG')));
const psqlArgs = ['-X', '-h', socket, '-p', '55443', '-U', 'postgres', '-d', 'postgres',
  '-v', 'ON_ERROR_STOP=1', '-A', '-t', '-q'];
let started = false;

function command(bin, args, input) {
  const result = spawnSync(bin, args, { cwd: root, env, input, encoding: 'utf8', timeout: 60000 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function sql(input) {
  return command('psql', psqlArgs, input);
}

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function jsonResult(output) {
  const line = output.split('\n').map((item) => item.trim()).findLast((item) => item.startsWith('{'));
  assert.ok(line, `risultato JSON assente: ${output}`);
  return JSON.parse(line);
}

function startSql(input, gateToken) {
  const child = spawn('psql', psqlArgs, { cwd: root, env });
  let stdout = '';
  let stderr = '';
  let gateResolved = false;
  let resolveGate;
  const gate = new Promise((resolveGatePromise) => { resolveGate = resolveGatePromise; });
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
    if (!gateResolved && gateToken && stderr.includes(gateToken)) {
      gateResolved = true;
      resolveGate();
    }
  });
  child.stdin.end(input);
  const completion = new Promise((resolveCompletion, rejectCompletion) => {
    child.on('error', rejectCompletion);
    child.on('close', (status) => {
      if (status !== 0) rejectCompletion(new Error(stderr));
      else resolveCompletion(stdout.trim());
    });
  });
  return { gate, completion };
}

function rpcSql(args) {
  return `SET ROLE service_role;
    SELECT public.admin_update_product_field(
      ${quote(args.p_actor)}, ${quote(args.p_action)}, ${quote(args.p_product_id)},
      ${quote(args.p_field_key)}, ${quote(JSON.stringify(args.p_value))}::jsonb,
      ${args.p_expected_version}, ${quote(args.p_idempotency_key)},
      ${quote(args.p_payload_hash)}, NULL
    ); RESET ROLE;`;
}

function postgresClient() {
  let rpcCalls = 0;
  let lookupCalls = 0;
  return {
    get rpcCalls() {
      return rpcCalls;
    },
    get lookupCalls() {
      return lookupCalls;
    },
    client: {
      rpc: async (name, args) => {
        assert.equal(name, 'admin_update_product_field');
        rpcCalls += 1;
        const output = await startSql(rpcSql(args)).completion;
        return { data: jsonResult(output), error: null };
      },
      from: (table) => {
        assert.equal(table, 'product_admin_command_log');
        const filters = {};
        const builder = {
          select: () => builder,
          eq: (column, value) => {
            filters[column] = value;
            return builder;
          },
          maybeSingle: async () => {
            lookupCalls += 1;
            const output = sql(`SELECT json_build_object(
                'payload_hash', payload_hash, 'result_json', result_json
              )::text
              FROM public.product_admin_command_log
              WHERE actor=${quote(filters.actor)}::uuid
                AND idempotency_key=${quote(filters.idempotency_key)};`);
            return { data: output ? JSON.parse(output) : null, error: null };
          },
        };
        return builder;
      },
    },
  };
}

try {
  command('initdb', ['-D', dataDir, '-U', 'postgres', '--auth=trust', '--no-locale']);
  command('pg_ctl', ['-D', dataDir, '-l', join(temp, 'postgres.log'), '-o',
    `-k ${socket} -h '' -p 55443`, '-w', 'start']);
  started = true;
  sql(`${setup}\n${migration}`);

  // Barriera di test deterministica: il NOTICE segnala che la prima request ha
  // già aggiornato il current value ma non ha ancora committato il command log.
  sql(`
    CREATE FUNCTION public.pause_race_command_log() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.idempotency_key IN ('race-replay-key', 'race-different-key') THEN
        RAISE NOTICE 'RACE_GATE_REACHED';
        PERFORM pg_sleep(3);
      END IF;
      RETURN NEW;
    END$$;
    CREATE TRIGGER pause_race_command_log BEFORE INSERT ON public.product_admin_command_log
    FOR EACH ROW EXECUTE FUNCTION public.pause_race_command_log();
  `);

  const input = {
    actor: adminId,
    action: 'update_field',
    productId,
    fieldKey: 'nome_comune',
    value: 'Race value',
    expectedVersion: 1,
    idempotencyKey: 'race-replay-key',
  };
  const hash = await commandPayloadHash(input);
  const first = startSql(rpcSql({
    p_actor: input.actor,
    p_action: input.action,
    p_product_id: input.productId,
    p_field_key: input.fieldKey,
    p_value: input.value,
    p_expected_version: input.expectedVersion,
    p_idempotency_key: input.idempotencyKey,
    p_payload_hash: hash,
  }), 'RACE_GATE_REACHED');

  await Promise.race([
    first.gate,
    new Promise((_, reject) => setTimeout(() => reject(new Error('race gate timeout')), 5000)),
  ]);

  const db = postgresClient();
  assert.equal((await lookupCommandReplay(db.client, input, hash)).kind, 'new');
  const overlappingRetry = executeCommand(db.client, input);
  const firstResult = jsonResult(await first.completion);
  const retryResult = await overlappingRetry;

  assert.equal(firstResult.code, 'APPLIED');
  assert.equal(firstResult.version, 2);
  assert.equal(retryResult.code, 'APPLIED');
  assert.equal(retryResult.version, 2);
  assert.equal(retryResult.replayed, true);
  assert.equal(db.rpcCalls, 1, 'la write RPC del retry non deve essere ritentata');
  assert.equal(db.lookupCalls, 2, 'un lookup iniziale e un solo lookup post-conflict');
  assert.equal(sql(`SELECT concat_ws('|',
    (SELECT version FROM public.product_current_values WHERE field_key='nome_comune'),
    (SELECT count(*) FROM public.product_field_history WHERE field_key='nome_comune'),
    (SELECT count(*) FROM public.product_admin_command_log WHERE idempotency_key='race-replay-key'));
  `), '2|1|1');

  const differentFirst = {
    ...input,
    fieldKey: 'faq',
    value: [{ question: 'Q1?', answer: 'A1.' }],
    idempotencyKey: 'race-different-key',
  };
  const differentHash = await commandPayloadHash(differentFirst);
  const differentApply = startSql(rpcSql({
    p_actor: differentFirst.actor,
    p_action: differentFirst.action,
    p_product_id: differentFirst.productId,
    p_field_key: differentFirst.fieldKey,
    p_value: differentFirst.value,
    p_expected_version: differentFirst.expectedVersion,
    p_idempotency_key: differentFirst.idempotencyKey,
    p_payload_hash: differentHash,
  }), 'RACE_GATE_REACHED');
  await Promise.race([
    differentApply.gate,
    new Promise((_, reject) => setTimeout(() => reject(new Error('different payload race gate timeout')), 5000)),
  ]);

  const differentDb = postgresClient();
  const differentRetry = {
    ...differentFirst,
    value: [{ question: 'Q1 changed?', answer: 'A1 changed.' }],
  };
  assert.equal((await lookupCommandReplay(differentDb.client, differentRetry)).kind, 'new');
  const overlappingDifferent = executeCommand(differentDb.client, differentRetry);
  assert.equal(jsonResult(await differentApply.completion).code, 'APPLIED');
  const differentResult = await overlappingDifferent;
  assert.equal(differentResult.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(differentDb.rpcCalls, 1);
  assert.equal(differentDb.lookupCalls, 2);
  assert.equal(sql(`SELECT concat_ws('|',
    (SELECT version FROM public.product_current_values WHERE field_key='faq'),
    (SELECT count(*) FROM public.product_field_history WHERE field_key='faq'),
    (SELECT count(*) FROM public.product_admin_command_log WHERE idempotency_key='race-different-key'));
  `), '2|1|1');

  const stale = { ...input, idempotencyKey: 'new-stale-key' };
  assert.equal((await lookupCommandReplay(db.client, stale)).kind, 'new');
  const staleResult = await executeCommand(db.client, stale);
  assert.equal(staleResult.code, 'VERSION_CONFLICT');
  assert.equal(staleResult.currentVersion, 2);
  assert.equal(sql(`SELECT concat_ws('|',
    (SELECT version FROM public.product_current_values WHERE field_key='nome_comune'),
    (SELECT count(*) FROM public.product_field_history WHERE field_key='nome_comune'),
    (SELECT count(*) FROM public.product_admin_command_log WHERE field_key='nome_comune'));
  `), '2|1|1');

  console.log('PASS: first APPLIED; overlapping retry replayed=true; version/history/log 2|1|1.');
  console.log('PASS: different payload IDEMPOTENCY_CONFLICT; new stale key VERSION_CONFLICT.');
} finally {
  if (started) command('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop']);
  console.log(`Cluster arrestato; fixture sintetiche in ${temp}`);
}
