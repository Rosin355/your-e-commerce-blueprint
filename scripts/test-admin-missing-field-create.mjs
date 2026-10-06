#!/usr/bin/env node
// PostgreSQL reale e isolato: nessun .env, rete, DB live o chiamata Shopify.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sequentialSource = readFileSync(join(root, 'scripts/test-admin-manual-locked-backend.mjs'), 'utf8');
const fixture = sequentialSource.match(/  sql\(`([\s\S]*?)\n    \$\{migration\}\n  `\);/);
assert.ok(fixture, 'fixture PostgreSQL Admin non trovata');

const manualMigration = readFileSync(
  join(root, 'supabase/migrations/20260926150609_allow_admin_manual_locked_field_edits.sql'),
  'utf8',
);
const syncMigration = readFileSync(
  join(root, 'supabase/migrations/20261006143000_admin_client_safe_field_sync.sql'),
  'utf8',
);
const missingMigration = readFileSync(
  join(root, 'supabase/migrations/20261006170000_admin_missing_field_creation.sql'),
  'utf8',
);

const adminId = '00000000-0000-4000-8000-000000000001';
const techId = '00000000-0000-4000-8000-000000000002';
const editorId = '00000000-0000-4000-8000-000000000003';
const noRoleId = '00000000-0000-4000-8000-000000000004';
const productId = '10000000-0000-4000-8000-000000000001';
const setup = fixture[1]
  .replaceAll('${adminId}', adminId)
  .replaceAll('${techId}', techId)
  .replaceAll('${editorId}', editorId)
  .replaceAll('${productId}', productId);

const temp = mkdtempSync(join(tmpdir(), 'og-admin-missing-create-'));
const dataDir = join(temp, 'data');
const socket = join(temp, 'socket');
mkdirSync(socket, { mode: 0o700 });
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PG')));
const psqlArgs = ['-X', '-h', socket, '-p', '55445', '-U', 'postgres', '-d', 'postgres',
  '-v', 'ON_ERROR_STOP=1', '-A', '-t', '-q'];
let started = false;
let checks = 0;

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

function rpcSql({
  actor = adminId,
  field,
  value,
  version = 0,
  key,
  hash = `${key}-hash`,
}) {
  return `SET ROLE service_role;
    SELECT public.admin_update_product_field(
      ${quote(actor)}, 'update_field', ${quote(productId)}, ${quote(field)},
      ${quote(JSON.stringify(value))}::jsonb, ${version}, ${quote(key)},
      ${quote(hash)}, 'Fixture Admin'
    ); RESET ROLE;`;
}

function rpc(input) {
  return JSON.parse(sql(rpcSql(input)));
}

function startRpc(input) {
  const child = spawn('psql', psqlArgs, { cwd: root, env });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.stdin.end(rpcSql(input));
  return new Promise((resolveCompletion, rejectCompletion) => {
    child.on('error', rejectCompletion);
    child.on('close', (status) => {
      if (status !== 0) rejectCompletion(new Error(stderr));
      else resolveCompletion(JSON.parse(stdout.trim()));
    });
  });
}

function test(name, fn) {
  fn();
  checks += 1;
  console.log(`PASS ${checks}: ${name}`);
}

try {
  command('initdb', ['-D', dataDir, '-U', 'postgres', '--auth=trust', '--no-locale']);
  command('pg_ctl', ['-D', dataDir, '-l', join(temp, 'postgres.log'), '-o',
    `-k ${socket} -h '' -p 55445`, '-w', 'start']);
  started = true;
  console.log(`Cluster PostgreSQL isolato: ${temp}`);

  sql(setup);
  sql(`
    INSERT INTO auth.users(id) VALUES ('${noRoleId}');
    INSERT INTO public.product_field_definitions
      (key,label,field_group,editor_type,data_type,manual_only,ai_allowed,
       protected_on_reimport,applies_to,validation_rules,shopify_mapping)
    VALUES
      ('periodo_di_fioritura','Periodo fioritura','botanical','multiselect','array',false,false,true,'product',
       '{"enum":["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"]}',
       '{"type":"metafield","namespace":"custom","key":"periodo_di_fioritura"}'),
      ('periodo_di_messa_a_dimora','Periodo messa a dimora','botanical','multiselect','array',false,false,true,'product',
       '{}','{"type":"metafield","namespace":"custom","key":"periodo_di_messa_a_dimora"}'),
      ('periodo_di_raccolta','Periodo raccolta','botanical','multiselect','array',false,false,true,'product',
       '{}','{"type":"metafield","namespace":"custom","key":"periodo_di_raccolta"}'),
      ('periodo_ottimale_di_potatura','Periodo potatura','botanical','multiselect','array',false,false,true,'product',
       '{}','{"type":"metafield","namespace":"custom","key":"periodo_ottimale_di_potatura"}'),
      ('difficolta_di_coltivazione','Difficolta','botanical','select','text',false,false,true,'product',
       '{"enum":["Facile","Media","Difficile"]}',
       '{"type":"metafield","namespace":"custom","key":"difficolta_di_coltivazione"}'),
      ('description','Descrizione','content','textarea','text',false,true,true,'product','{}',
       '{"type":"core","field":"descriptionHtml"}');
    ${manualMigration}
    ${syncMigration}
    ${missingMigration}
  `);

  test('missing periodo_di_fioritura crea string[] versione 1 e PENDING_SYNC', () => {
    const created = rpc({
      field: 'periodo_di_fioritura',
      value: ['Marzo', 'Aprile'],
      key: 'create-flowering',
    });
    assert.equal(created.code, 'APPLIED');
    assert.equal(created.created, true);
    assert.equal(created.version, 1);
    assert.equal(created.syncState, 'PENDING_SYNC');
    assert.deepEqual(created.value, ['Marzo', 'Aprile']);
    assert.equal(sql(`SELECT concat_ws('|',jsonb_typeof(value_json),value_json::text,version,
      publish_state,is_locked) FROM public.product_current_values
      WHERE product_id='${productId}' AND field_key='periodo_di_fioritura';`),
    'array|["Marzo", "Aprile"]|1|pending_publish|f');
    assert.equal(sql(`SELECT count(*) FROM public.product_field_history
      WHERE field_key='periodo_di_fioritura' AND previous_version=0 AND new_version=1
        AND previous_value IS NULL;`), '1');
  });

  test('mese non valido, duplicato, fuori ordine e sintassi Shopify raw sono rifiutati', () => {
    assert.equal(rpc({ field: 'periodo_di_messa_a_dimora', value: [],
      key: 'empty-month-create' }).code, 'VALIDATION_ERROR');
    assert.equal(rpc({ field: 'periodo_di_messa_a_dimora', value: ['Marzo', 'Primavera'],
      key: 'invalid-month-1' }).code, 'VALIDATION_ERROR');
    assert.equal(rpc({ field: 'periodo_di_messa_a_dimora', value: ['Marzo', 'Marzo'],
      key: 'duplicate-month' }).code, 'VALIDATION_ERROR');
    assert.equal(rpc({ field: 'periodo_di_messa_a_dimora', value: ['Aprile', 'Marzo'],
      key: 'unordered-month' }).code, 'VALIDATION_ERROR');
    assert.equal(rpc({ field: 'periodo_di_messa_a_dimora', value: '["Marzo"]',
      key: 'raw-shopify-month' }).code, 'VALIDATION_ERROR');
    assert.equal(sql(`SELECT count(*) FROM public.product_current_values
      WHERE field_key='periodo_di_messa_a_dimora';`), '0');
  });

  test('array stagionale vuoto è rifiutato anche su una riga esistente', () => {
    const rejected = rpc({ field: 'periodo_di_fioritura', value: [], version: 1,
      key: 'empty-month-update' });
    assert.equal(rejected.code, 'VALIDATION_ERROR');
    assert.equal(sql(`SELECT value_json::text||'|'||version FROM public.product_current_values
      WHERE field_key='periodo_di_fioritura';`), '["Marzo", "Aprile"]|1');
  });

  test('difficolta mancante accetta solo Facile, Media o Difficile', () => {
    assert.equal(rpc({ field: 'difficolta_di_coltivazione', value: 'Esperto',
      key: 'invalid-difficulty' }).code, 'VALIDATION_ERROR');
    const created = rpc({ field: 'difficolta_di_coltivazione', value: 'Media',
      key: 'create-difficulty' });
    assert.equal(created.code, 'APPLIED');
    assert.equal(created.version, 1);
    assert.equal(created.syncState, 'PENDING_SYNC');
    assert.equal(sql(`SELECT value_text||'|'||version||'|'||publish_state
      FROM public.product_current_values WHERE field_key='difficolta_di_coltivazione';`),
    'Media|1|pending_publish');
  });

  test('non allowlisted e attore senza ruolo restano FIELD_NOT_EDITABLE', () => {
    assert.equal(rpc({ field: 'description', value: 'Nuova descrizione',
      key: 'blocked-description' }).code, 'FIELD_NOT_EDITABLE');
    assert.equal(rpc({ actor: noRoleId, field: 'periodo_ottimale_di_potatura', value: ['Marzo'],
      key: 'blocked-no-role' }).code, 'FIELD_NOT_EDITABLE');
  });

  test('editor autorizzato può creare soltanto una chiave esplicitamente allowlisted', () => {
    const created = rpc({ actor: editorId, field: 'periodo_di_messa_a_dimora',
      value: ['Ottobre', 'Novembre'], key: 'editor-seasonal' });
    assert.equal(created.code, 'APPLIED');
    assert.equal(created.version, 1);
    assert.equal(rpc({ actor: editorId, field: 'description', value: 'Tentativo',
      key: 'editor-description' }).code, 'FIELD_NOT_EDITABLE');
  });

  test('riga esistente con expectedVersion zero restituisce VERSION_CONFLICT', () => {
    const conflict = rpc({ field: 'periodo_di_fioritura', value: ['Maggio'],
      key: 'existing-version-zero' });
    assert.equal(conflict.code, 'VERSION_CONFLICT');
    assert.equal(conflict.currentVersion, 1);
    assert.equal(sql(`SELECT value_json::text FROM public.product_current_values
      WHERE field_key='periodo_di_fioritura';`), '["Marzo", "Aprile"]');
  });

  test('creazione manual_only resta riservata ad Admin e Tech Admin', () => {
    assert.equal(rpc({ actor: editorId, field: 'ibridatore', value: 'Editor',
      key: 'manual-editor-denied' }).code, 'FIELD_NOT_EDITABLE');
    const created = rpc({ actor: techId, field: 'ibridatore', value: 'Ibridatore fixture',
      key: 'manual-tech-create' });
    assert.equal(created.code, 'APPLIED');
    assert.equal(sql(`SELECT concat_ws('|',is_locked,protected_on_reimport,version)
      FROM public.product_current_values WHERE field_key='ibridatore';`), 't|t|1');
  });

  const concurrent = await Promise.all([
    startRpc({ actor: adminId, field: 'periodo_di_raccolta', value: ['Giugno'],
      key: 'race-create-admin' }),
    startRpc({ actor: techId, field: 'periodo_di_raccolta', value: ['Giugno'],
      key: 'race-create-tech' }),
  ]);
  test('due first-create concorrenti producono una sola riga e una sola history', () => {
    assert.deepEqual(concurrent.map((result) => result.code).sort(), ['APPLIED', 'VERSION_CONFLICT']);
    assert.equal(sql(`SELECT count(*) FROM public.product_current_values
      WHERE field_key='periodo_di_raccolta';`), '1');
    assert.equal(sql(`SELECT count(*) FROM public.product_field_history
      WHERE field_key='periodo_di_raccolta';`), '1');
    assert.equal(sql(`SELECT version FROM public.product_current_values
      WHERE field_key='periodo_di_raccolta';`), '1');
  });

  test('migration forward-only e privilegi della RPC restano idempotenti', () => {
    sql(missingMigration);
    assert.equal(sql(`SELECT has_function_privilege('anon',
      'public.admin_update_product_field(uuid,text,uuid,text,jsonb,integer,text,text,text)','EXECUTE');`), 'f');
    assert.equal(sql(`SELECT has_function_privilege('authenticated',
      'public.admin_update_product_field(uuid,text,uuid,text,jsonb,integer,text,text,text)','EXECUTE');`), 'f');
    assert.equal(sql(`SELECT has_function_privilege('service_role',
      'public.admin_update_product_field(uuid,text,uuid,text,jsonb,integer,text,text,text)','EXECUTE');`), 't');
  });

  console.log(`PASS: ${checks} verifiche PostgreSQL; nessun accesso live o Shopify.`);
} finally {
  if (started) command('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop']);
  console.log(`Cluster arrestato; fixture sintetiche in ${temp}`);
}
