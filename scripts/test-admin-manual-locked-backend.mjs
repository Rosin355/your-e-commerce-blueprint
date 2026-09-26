#!/usr/bin/env node
// PostgreSQL reale e isolato: fixture sintetiche, TCP disabilitato, nessun .env/live DB.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temp = mkdtempSync(join(tmpdir(), 'og-admin-manual-locked-'));
const dataDir = join(temp, 'data');
const socket = join(temp, 'socket');
mkdirSync(socket, { mode: 0o700 });
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PG')));
const psqlArgs = ['-X', '-h', socket, '-p', '55441', '-U', 'postgres', '-d', 'postgres',
  '-v', 'ON_ERROR_STOP=1', '-A', '-t', '-q'];
const migration = readFileSync(
  join(root, 'supabase/migrations/20260926150609_allow_admin_manual_locked_field_edits.sql'),
  'utf8',
);
const adminId = '00000000-0000-4000-8000-000000000001';
const techId = '00000000-0000-4000-8000-000000000002';
const editorId = '00000000-0000-4000-8000-000000000003';
const productId = '10000000-0000-4000-8000-000000000001';
let checks = 0;
let started = false;

function command(bin, args, input) {
  const result = spawnSync(bin, args, { cwd: root, env, input, encoding: 'utf8', timeout: 60000 });
  if (result.error) throw result.error;
  return result;
}

function sql(input, expectedFailure) {
  const result = command('psql', psqlArgs, input);
  if (expectedFailure) {
    assert.notEqual(result.status, 0, 'la query doveva fallire');
    assert.match(result.stderr, expectedFailure);
  } else {
    assert.equal(result.status, 0, result.stderr);
  }
  return result.stdout.trim();
}

function test(name, fn) {
  fn();
  checks += 1;
  console.log(`PASS ${checks}: ${name}`);
}

function rpc({ actor = adminId, action = 'update_field', field = 'nome_comune', value = '"Nuovo nome"',
  version = 1, key = 'request-0001', hash = 'hash-0001' } = {}) {
  return JSON.parse(sql(`SET ROLE service_role;
    SELECT public.admin_update_product_field(
      '${actor}', '${action}', '${productId}', '${field}', '${value}'::jsonb,
      ${version}, '${key}', '${hash}', 'Fixture Admin'
    ); RESET ROLE;`));
}

try {
  let result = command('initdb', ['-D', dataDir, '-U', 'postgres', '--auth=trust', '--no-locale']);
  assert.equal(result.status, 0, result.stderr);
  result = command('pg_ctl', ['-D', dataDir, '-l', join(temp, 'postgres.log'), '-o',
    `-k ${socket} -h '' -p 55441`, '-w', 'start']);
  assert.equal(result.status, 0, result.stderr);
  started = true;
  console.log(`Cluster PostgreSQL isolato: ${temp}`);

  sql(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE TYPE public.app_role AS ENUM ('admin','tech_admin','editor','publisher','user');
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE TABLE public.user_roles (
      user_id uuid NOT NULL REFERENCES auth.users(id),
      role public.app_role NOT NULL,
      PRIMARY KEY (user_id, role)
    );
    CREATE TABLE public.products (
      id uuid PRIMARY KEY,
      sku text NOT NULL UNIQUE,
      entity_type text NOT NULL CHECK (entity_type IN ('simple','variable','variation')),
      parent_product_id uuid REFERENCES public.products(id),
      legacy_source text NOT NULL DEFAULT 'manuale',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.product_field_definitions (
      key text PRIMARY KEY,
      label text NOT NULL,
      field_group text NOT NULL,
      editor_type text NOT NULL,
      data_type text NOT NULL,
      visible boolean NOT NULL DEFAULT true,
      editable boolean NOT NULL DEFAULT true,
      ai_allowed boolean NOT NULL DEFAULT false,
      manual_only boolean NOT NULL DEFAULT false,
      publishable boolean NOT NULL DEFAULT true,
      required boolean NOT NULL DEFAULT false,
      protected_on_reimport boolean NOT NULL DEFAULT true,
      applies_to text NOT NULL DEFAULT 'both',
      sort_order integer NOT NULL DEFAULT 0,
      help_text text,
      validation_rules jsonb NOT NULL DEFAULT '{}',
      review_policy text NOT NULL DEFAULT 'none'
    );
    CREATE TABLE public.product_current_values (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      sku text NOT NULL,
      parent_sku text,
      entity_type text NOT NULL DEFAULT 'product',
      field_key text NOT NULL REFERENCES public.product_field_definitions(key),
      value_text text,
      value_json jsonb,
      value_number numeric,
      origin text NOT NULL DEFAULT 'import',
      source_batch_id uuid,
      source_snapshot_id uuid,
      is_locked boolean NOT NULL DEFAULT false,
      publish_state text NOT NULL DEFAULT 'draft',
      published_at timestamptz,
      updated_by uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      product_id uuid NOT NULL REFERENCES public.products(id),
      value_origin text NOT NULL DEFAULT 'system_migration',
      review_status text NOT NULL DEFAULT 'review_required',
      publish_blocked boolean NOT NULL DEFAULT true,
      reviewed_by uuid,
      reviewed_at timestamptz,
      protected_on_reimport boolean NOT NULL DEFAULT true,
      version integer NOT NULL DEFAULT 1 CHECK (version > 0),
      UNIQUE (sku, field_key),
      UNIQUE (product_id, field_key)
    );
    CREATE TABLE public.product_field_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      sku text NOT NULL,
      entity_type text NOT NULL,
      field_key text NOT NULL,
      previous_value jsonb,
      new_value jsonb,
      change_type text NOT NULL,
      actor uuid,
      actor_label text,
      batch_id uuid,
      job_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      product_id uuid NOT NULL REFERENCES public.products(id),
      previous_origin text,
      new_origin text,
      previous_review_status text,
      new_review_status text,
      previous_version integer,
      new_version integer,
      request_key text
    );
    CREATE TABLE public.product_admin_command_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      actor uuid NOT NULL,
      idempotency_key text NOT NULL,
      action text NOT NULL,
      payload_hash text NOT NULL,
      product_id uuid,
      field_key text,
      result_json jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (actor, idempotency_key)
    );
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT SELECT ON public.products, public.product_field_definitions,
      public.product_current_values, public.product_field_history TO authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.product_current_values ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.product_field_history ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.product_admin_command_log ENABLE ROW LEVEL SECURITY;
    INSERT INTO auth.users(id) VALUES ('${adminId}'),('${techId}'),('${editorId}');
    INSERT INTO public.user_roles(user_id,role) VALUES
      ('${adminId}','admin'),('${techId}','tech_admin'),('${editorId}','editor');
    INSERT INTO public.products(id,sku,entity_type) VALUES ('${productId}','SYNTH-MANUAL','simple');
    INSERT INTO public.product_field_definitions
      (key,label,field_group,editor_type,data_type,manual_only,ai_allowed,protected_on_reimport,applies_to)
    VALUES
      ('nome_comune','Nome comune','botanical','text','text',true,false,true,'product'),
      ('ibridatore','Ibridatore','botanical','text','text',true,false,true,'product'),
      ('faq','FAQ','content','json','json',true,false,true,'product'),
      ('title','Titolo','main','text','text',false,true,true,'product'),
      ('sku','SKU','system','text','text',false,false,true,'both');
    INSERT INTO public.product_current_values
      (product_id,sku,entity_type,field_key,value_text,origin,is_locked,value_origin,
       review_status,publish_blocked,protected_on_reimport,source_batch_id,source_snapshot_id,version)
    VALUES
      ('${productId}','SYNTH-MANUAL','product','nome_comune','Nome precedente','manual',true,'manual',
       'approved',false,true,'20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',1),
      ('${productId}','SYNTH-MANUAL','product','title','Titolo protetto','import',true,'source_csv',
       'approved',false,true,NULL,NULL,1),
      ('${productId}','SYNTH-MANUAL','product','faq','Legacy: domanda e risposta non strutturate','manual',true,'manual',
       'approved',false,true,NULL,NULL,1);
    ${migration}
  `);

  const tableShape = sql(`SELECT md5(string_agg(
    table_name||'|'||column_name||'|'||data_type||'|'||is_nullable,
    E'\n' ORDER BY table_name,ordinal_position))
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name IN ('products','product_current_values','product_field_history');`);

  test('RPC invocabile solo dal service_role', () => {
    sql(`SET ROLE anon; SELECT public.admin_update_product_field('${adminId}','update_field','${productId}',
      'nome_comune','"x"',1,'anon-key-1','anon-hash',NULL);`, /permission denied/);
    sql(`SET ROLE authenticated; SELECT public.admin_update_product_field('${adminId}','update_field','${productId}',
      'nome_comune','"x"',1,'user-key-1','user-hash',NULL);`, /permission denied/);
    assert.equal(sql(`SELECT has_function_privilege('service_role',
      'public.admin_update_product_field(uuid,text,uuid,text,jsonb,integer,text,text,text)','EXECUTE');`), 't');
  });

  test('Admin modifica manual_only locked conservando lock e riferimenti originali', () => {
    const applied = rpc();
    assert.equal(applied.code, 'APPLIED');
    assert.equal(applied.version, 2);
    assert.equal(sql(`SELECT value_text||'|'||version||'|'||is_locked||'|'||source_batch_id||'|'||source_snapshot_id
      FROM public.product_current_values WHERE product_id='${productId}' AND field_key='nome_comune';`),
      'Nuovo nome|2|true|20000000-0000-4000-8000-000000000001|30000000-0000-4000-8000-000000000001');
    assert.equal(sql(`SELECT count(*) FROM public.product_field_history WHERE field_key='nome_comune'
      AND previous_version=1 AND new_version=2 AND previous_value='"Nome precedente"'::jsonb
      AND new_value='"Nuovo nome"'::jsonb;`), '1');
  });

  test('retry idempotente non duplica storico né versione', () => {
    const replay = rpc();
    assert.equal(replay.replayed, true);
    assert.equal(replay.version, 2);
    assert.equal(sql(`SELECT count(*) FROM public.product_field_history WHERE field_key='nome_comune';`), '1');
    assert.equal(rpc({ key: 'request-0001', hash: 'different-hash' }).code, 'IDEMPOTENCY_CONFLICT');
  });

  test('non Admin respinto su manual_only locked', () => {
    const denied = rpc({ actor: editorId, version: 2, key: 'editor-key-1', hash: 'editor-hash' });
    assert.equal(denied.code, 'FIELD_NOT_EDITABLE');
    assert.equal(sql(`SELECT version FROM public.product_current_values WHERE field_key='nome_comune';`), '2');
  });

  test('campi locked non manuali e azioni AI/import restano bloccati', () => {
    assert.equal(rpc({ field: 'title', key: 'title-key-1', hash: 'title-hash' }).code, 'FIELD_NOT_EDITABLE');
    assert.equal(rpc({ action: 'ai_accepted', version: 2, key: 'ai-key-0001', hash: 'ai-hash' }).code, 'VALIDATION_ERROR');
    assert.equal(rpc({ action: 'import', version: 2, key: 'import-key1', hash: 'import-hash' }).code, 'VALIDATION_ERROR');
    assert.equal(sql(`SELECT value_text||'|'||version||'|'||is_locked FROM public.product_current_values
      WHERE field_key='title';`), 'Titolo protetto|1|true');
  });

  test('creazione mancante richiede Admin ed expectedVersion zero', () => {
    assert.equal(rpc({ actor: editorId, field: 'ibridatore', version: 0,
      key: 'editor-create', hash: 'editor-create-hash' }).code, 'FIELD_NOT_EDITABLE');
    assert.equal(rpc({ field: 'ibridatore', version: 1,
      key: 'wrong-version', hash: 'wrong-version-hash' }).code, 'VERSION_CONFLICT');
    const created = rpc({ actor: techId, field: 'ibridatore', version: 0,
      key: 'tech-create-1', hash: 'tech-create-hash', value: '"Fixture ibridatore"' });
    assert.equal(created.created, true);
    assert.equal(created.version, 1);
    assert.equal(sql(`SELECT concat_ws('|',is_locked,protected_on_reimport,(source_snapshot_id IS NULL),version)
      FROM public.product_current_values WHERE field_key='ibridatore';`), 't|t|t|1');
    assert.equal(sql(`SELECT concat_ws('|',previous_version,new_version,(previous_value IS NULL))
      FROM public.product_field_history WHERE field_key='ibridatore';`), '0|1|t');
  });

  test('conflitto expectedVersion non sovrascrive', () => {
    const before = sql(`SELECT value_text||'|'||version FROM public.product_current_values WHERE field_key='nome_comune';`);
    const history = sql(`SELECT count(*) FROM public.product_field_history WHERE field_key='nome_comune';`);
    const conflict = rpc({ version: 1, key: 'stale-key-01', hash: 'stale-hash' });
    assert.equal(conflict.code, 'VERSION_CONFLICT');
    assert.equal(conflict.currentVersion, 2);
    assert.equal(sql(`SELECT value_text||'|'||version FROM public.product_current_values WHERE field_key='nome_comune';`), before);
    assert.equal(sql(`SELECT count(*) FROM public.product_field_history WHERE field_key='nome_comune';`), history);
  });

  test('FAQ canonica sostituisce legacy opaco senza perdere lo storico', () => {
    const faq = rpc({ field: 'faq', version: 1, key: 'faq-key-0001', hash: 'faq-hash',
      value: '[{"question":"Domanda?","answer":"Risposta."}]' });
    assert.equal(faq.code, 'APPLIED');
    assert.equal(sql(`SELECT jsonb_typeof(value_json)||'|'||is_locked FROM public.product_current_values
      WHERE field_key='faq';`), 'array|true');
    assert.equal(sql(`SELECT previous_value='"Legacy: domanda e risposta non strutturate"'::jsonb
      AND new_value='[{"question":"Domanda?","answer":"Risposta."}]'::jsonb
      FROM public.product_field_history WHERE field_key='faq';`), 't');
  });

  test('errore nello storico provoca rollback transazionale completo', () => {
    sql(`CREATE FUNCTION public.fail_history_fixture() RETURNS trigger LANGUAGE plpgsql AS
      $$BEGIN IF NEW.request_key='force-rollback' THEN RAISE EXCEPTION 'fixture history failure'; END IF; RETURN NEW; END$$;
      CREATE TRIGGER fail_history_fixture BEFORE INSERT ON public.product_field_history
      FOR EACH ROW EXECUTE FUNCTION public.fail_history_fixture();`);
    const before = sql(`SELECT value_text||'|'||version FROM public.product_current_values WHERE field_key='nome_comune';`);
    sql(`SET ROLE service_role; SELECT public.admin_update_product_field(
      '${adminId}','update_field','${productId}','nome_comune','"Rollback candidate"',2,
      'force-rollback','rollback-hash','Fixture Admin');`, /fixture history failure/);
    assert.equal(sql(`SELECT value_text||'|'||version FROM public.product_current_values WHERE field_key='nome_comune';`), before);
    assert.equal(sql(`SELECT count(*) FROM public.product_admin_command_log WHERE idempotency_key='force-rollback';`), '0');
  });

  test('migration idempotente e privilegi invariati', () => {
    sql(migration);
    assert.equal(sql(`SELECT has_function_privilege('anon',
      'public.admin_update_product_field(uuid,text,uuid,text,jsonb,integer,text,text,text)','EXECUTE');`), 'f');
    assert.equal(sql(`SELECT has_function_privilege('authenticated',
      'public.admin_update_product_field(uuid,text,uuid,text,jsonb,integer,text,text,text)','EXECUTE');`), 'f');
    assert.equal(sql(`SELECT md5(string_agg(
      table_name||'|'||column_name||'|'||data_type||'|'||is_nullable,
      E'\n' ORDER BY table_name,ordinal_position))
      FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name IN ('products','product_current_values','product_field_history');`), tableShape);
  });

  console.log(`PASS: ${checks} verifiche PostgreSQL; nessun accesso live.`);
} finally {
  if (started) {
    const result = command('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop']);
    if (result.status !== 0) throw new Error(`Arresto cluster fallito: ${result.stderr}`);
  }
  console.log(`Cluster arrestato; fixture sintetiche in ${temp}`);
}
