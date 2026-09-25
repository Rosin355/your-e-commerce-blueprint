#!/usr/bin/env node
// PostgreSQL reale, cluster effimero, solo socket Unix privato e fixture sintetiche.
// Non legge .env, non accetta URL DB e non si collega a servizi esterni.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temp = mkdtempSync(join(tmpdir(), 'og-legacy-security-'));
const dataDir = join(temp, 'data');
const socket = join(temp, 'socket');
mkdirSync(socket, { mode: 0o700 });
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('PG')));
const psqlArgs = ['-X', '-h', socket, '-p', '55439', '-U', 'postgres', '-d', 'postgres',
  '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-A', '-t'];
const migration = readFileSync(join(root, 'supabase/migrations/20260611195412_a1b0efb5-e810-4558-ae48-ff1e6ea33e07.sql'), 'utf8');
const proposal = readFileSync(join(root, 'supabase/migrations/20260925075756_restrict_legacy_enrichment_access.sql'), 'utf8');
const preflight = readFileSync(join(root, 'docs/fase2c/legacy-enrichment-security-preflight.sql'), 'utf8');
const body = proposal.replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, '');
const tables = ['product_enrichment_runs', 'product_enrichment_run_items'];
const runId = '00000000-0000-4000-8000-000000000001';
let checks = 0;
let started = false;
function command(bin, args, input) {
  const result = spawnSync(bin, args, { cwd: root, env, input, encoding: 'utf8', timeout: 60000 });
  if (result.error) throw result.error;
  return result;
}
function sql(input, failure) {
  const result = command('psql', psqlArgs, input);
  if (failure) {
    assert.notEqual(result.status, 0, 'query doveva fallire');
    assert.match(result.stderr, failure);
  } else {
    assert.equal(result.status, 0, result.stderr);
  }
  return result.stdout.trim();
}
function test(name, fn) {
  fn(); checks++; console.log(`PASS ${checks}: ${name}`);
}
function asRole(role, query, failure, claims = '{}') {
  return sql(`BEGIN; SET LOCAL ROLE ${role};
    SELECT set_config('request.jwt.claims', '${claims}', true);
    ${query}; ROLLBACK;`, failure);
}
function insert(t) {
  return t === tables[0]
    ? `INSERT INTO public.${t}(initiated_by) VALUES ('fixture@example.invalid') RETURNING id`
    : `INSERT INTO public.${t}(run_id,sku) VALUES ('${runId}','SYNTH-NEW') RETURNING id`;
}
function digest() {
  return sql(`SELECT md5(jsonb_build_array(
    (SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM public.product_enrichment_runs r),
    (SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM public.product_enrichment_run_items i),
    (SELECT jsonb_agg(to_jsonb(s)) FROM public.security_unrelated_fixture s))::text);`);
}
function securityState() {
  return sql(`SELECT jsonb_build_array(
    (SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname) FROM pg_policies p WHERE tablename IN ('${tables.join("','")}')),
    (SELECT jsonb_agg(jsonb_build_array(relname,relacl::text,relrowsecurity) ORDER BY relname) FROM pg_class WHERE relname IN ('${tables.join("','")}'))
  );`);
}
function shape() {
  return sql(`SELECT jsonb_build_array(
    (SELECT jsonb_agg(jsonb_build_array(attrelid,attname,atttypid,attnotnull,atthasdef) ORDER BY attrelid,attnum) FROM pg_attribute WHERE attrelid IN ('public.${tables[0]}'::regclass,'public.${tables[1]}'::regclass) AND attnum>0),
    (SELECT jsonb_agg(pg_get_constraintdef(oid) ORDER BY oid) FROM pg_constraint WHERE conrelid IN ('public.${tables[0]}'::regclass,'public.${tables[1]}'::regclass)),
    (SELECT jsonb_agg(pg_get_triggerdef(oid) ORDER BY oid) FROM pg_trigger WHERE tgrelid IN ('public.${tables[0]}'::regclass,'public.${tables[1]}'::regclass)),
    (SELECT jsonb_agg(indexdef ORDER BY indexname) FROM pg_indexes WHERE tablename IN ('${tables.join("','")}'))
  );`);
}

try {
  let r = command('initdb', ['-D', dataDir, '-U', 'postgres', '--auth=trust', '--no-locale']);
  assert.equal(r.status, 0, r.stderr);
  r = command('pg_ctl', ['-D', dataDir, '-l', join(temp, 'postgres.log'), '-o',
    `-k ${socket} -h '' -p 55439`, '-w', 'start']);
  assert.equal(r.status, 0, r.stderr); started = true;
  console.log(`Cluster isolato: ${temp}`);
  console.log(sql('SELECT version();'));
  sql(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE ROLE legacy_reader NOLOGIN;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS
    $$BEGIN NEW.updated_at = now(); RETURN NEW; END$$;
    ${migration}
    CREATE TABLE public.security_unrelated_fixture(id int PRIMARY KEY, marker text);
    INSERT INTO public.security_unrelated_fixture VALUES (1,'unrelated unchanged');
    INSERT INTO public.product_enrichment_runs(id,initiated_by) VALUES ('${runId}','fixture@example.invalid');
    INSERT INTO public.product_enrichment_run_items(run_id,sku,metafields_report)
      VALUES ('${runId}','SYNTH-LEGACY','{"legacy":"preserve"}');`);
  const originalData = digest();
  const originalShape = shape();
  const originalSecurity = securityState();
  test('preflight read-only valido sulla baseline', () => sql(preflight));
  for (const t of tables) {
    test(`baseline authenticated SELECT/INSERT/UPDATE aperti: ${t}`, () => {
      assert.match(asRole('authenticated', `SELECT count(*) FROM public.${t}`), /\n1\n/);
      asRole('authenticated', insert(t));
      assert.match(asRole('authenticated', `UPDATE public.${t} SET status='baseline'`), /UPDATE 1/);
    });
    test(`baseline DELETE negato da RLS: ${t}`, () =>
      assert.match(asRole('authenticated', `DELETE FROM public.${t}`), /DELETE 0/));
  }
  test('rollback transazionale ripristina policy, ACL e dati', () => {
    sql(`BEGIN; ${body} ROLLBACK;`);
    assert.equal(securityState(), originalSecurity); assert.equal(digest(), originalData);
  });
  test('applicazione proposta e idempotenza', () => {
    sql(proposal); const hardened = securityState(); sql(proposal);
    assert.equal(securityState(), hardened);
  });
  test('dati, JSON legacy, colonne, FK, indici e trigger invariati', () => {
    assert.equal(digest(), originalData); assert.equal(shape(), originalShape);
  });
  test('preflight read-only valido dopo hardening', () => sql(preflight));
  test('RLS attiva, zero policy client e privilegi service_role conservati', () => {
    assert.equal(sql(`SELECT count(*) FROM pg_policies WHERE tablename IN ('${tables.join("','")}');`), '0');
    for (const t of tables) {
      assert.equal(sql(`SELECT relrowsecurity FROM pg_class WHERE oid='public.${t}'::regclass;`), 't');
      for (const p of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) {
        assert.equal(sql(`SELECT has_table_privilege('service_role','public.${t}','${p}');`), 't');
        for (const role of ['anon','authenticated'])
          assert.equal(sql(`SELECT has_table_privilege('${role}','public.${t}','${p}');`), 'f');
      }
    }
  });
  for (const [label, role, claims] of [
    ['anon','anon','{}'], ['utente','authenticated','{"role":"authenticated"}'],
    ['Admin diretto','authenticated','{"role":"authenticated","app_metadata":{"role":"admin"}}'],
    ['claim admin falsificato','authenticated','{"user_metadata":{"role":"admin"}}']
  ]) for (const t of tables) {
    for (const [op,q] of Object.entries({ SELECT:`SELECT * FROM public.${t}`, INSERT:insert(t),
      UPDATE:`UPDATE public.${t} SET status='unauthorized'`, DELETE:`DELETE FROM public.${t}` }))
      test(`${label}: ${op} ${t} negato 42501`, () => asRole(role,q,/42501/,claims));
  }
  for (const t of tables) {
    for (const [op,q] of Object.entries({ SELECT:`SELECT * FROM public.${t}`, INSERT:insert(t),
      UPDATE:`UPDATE public.${t} SET status='allowed'`, DELETE:`DELETE FROM public.${t}` }))
      test(`service_role: ${op} ${t} consentito`, () => {
        const output = asRole('service_role',q);
        if (op === 'UPDATE' || op === 'DELETE') assert.match(output,new RegExp(`${op} 1`));
      });
    test(`RLS default-deny anche con grant reintrodotti: ${t}`, () => {
      const prefix=`BEGIN; GRANT SELECT,INSERT,UPDATE,DELETE ON public.${t} TO authenticated; SET LOCAL ROLE authenticated;`;
      assert.match(sql(`${prefix} SELECT count(*) FROM public.${t}; UPDATE public.${t} SET status='no'; DELETE FROM public.${t}; ROLLBACK;`), /0\nUPDATE 0\nDELETE 0/);
      sql(`${prefix} ${insert(t)}; ROLLBACK;`, /42501/);
    });
  }
  test('workflow SQL run start/update_item/counters/finish/read conservato', () => {
    asRole('service_role', `
      INSERT INTO public.product_enrichment_runs(id,initiated_by,total)
        VALUES ('00000000-0000-4000-8000-000000000002','workflow@example.invalid',1);
      INSERT INTO public.product_enrichment_run_items(run_id,sku)
        VALUES ('00000000-0000-4000-8000-000000000002','SYNTH-WORKFLOW');
      UPDATE public.product_enrichment_run_items SET status='done',metafields_report='{"fixture":true}'
        WHERE sku='SYNTH-WORKFLOW';
      UPDATE public.product_enrichment_runs SET done=1,status='completed'
        WHERE id='00000000-0000-4000-8000-000000000002';
      DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM public.product_enrichment_runs WHERE done=1 AND status='completed')
        THEN RAISE EXCEPTION 'workflow fallito'; END IF; END$$;
      DELETE FROM public.product_enrichment_runs WHERE id='00000000-0000-4000-8000-000000000002';
      DO $$BEGIN IF EXISTS(SELECT 1 FROM public.product_enrichment_run_items WHERE sku='SYNTH-WORKFLOW')
        THEN RAISE EXCEPTION 'cascade fallita'; END IF; END$$`);
  });
  test('vincoli UNIQUE e FK ancora applicati a service_role', () => {
    asRole('service_role', `INSERT INTO public.product_enrichment_run_items(run_id,sku) VALUES ('${runId}','SYNTH-LEGACY')`, /23505/);
    asRole('service_role', `INSERT INTO public.product_enrichment_run_items(run_id,sku) VALUES ('00000000-0000-4000-8000-000000000099','SYNTH-ORPHAN')`, /23503/);
  });
  for (const [name, drift] of [
    ['policy sconosciuta', `CREATE POLICY unexpected ON public.product_enrichment_runs FOR SELECT TO authenticated USING(true);`],
    ['policy nota modificata', `CREATE POLICY "Authenticated can read enrichment runs" ON public.product_enrichment_runs FOR SELECT TO authenticated USING(false);`],
    ['ACL colonna', `GRANT SELECT (notes) ON public.product_enrichment_runs TO authenticated;`],
    ['grant ereditato', `GRANT SELECT ON public.product_enrichment_runs TO legacy_reader; GRANT legacy_reader TO authenticated;`],
    ['service senza UPDATE', `REVOKE UPDATE ON public.product_enrichment_runs FROM service_role;`],
    ['service dipende da PUBLIC', `REVOKE UPDATE ON public.product_enrichment_runs FROM service_role; GRANT UPDATE ON public.product_enrichment_runs TO PUBLIC;`],
    ['service senza BYPASSRLS', `ALTER ROLE service_role NOBYPASSRLS;`],
    ['RLS disabilitata', `ALTER TABLE public.product_enrichment_runs DISABLE ROW LEVEL SECURITY;`]
  ]) test(`drift ${name}: abort atomico`, () => {
    const before=securityState();
    sql(`BEGIN; ${drift} ${body} COMMIT;`, /STOP:/);
    assert.equal(securityState(),before); assert.equal(digest(),originalData);
  });
  test('PUBLIC/anon grant accidentali rimossi', () => {
    sql(`BEGIN; GRANT ALL ON public.product_enrichment_runs TO PUBLIC,anon; ${body}
      DO $$BEGIN IF has_table_privilege('anon','public.product_enrichment_runs','SELECT')
        THEN RAISE EXCEPTION 'grant residuo'; END IF; END$$; ROLLBACK;`);
  });
  // Esegue il vero helper auth con Supabase mockato, senza rete o token reali.
  const authSource=readFileSync(join(root,'supabase/functions/_shared/admin-auth.ts'),'utf8')
    .replace(/^import .*createClient.*;\s*$/m,'');
  const compiled=ts.transpileModule(authSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  for (const scenario of [
    {name:'header assente',header:null,allowed:false},
    {name:'JWT invalido',header:'Bearer synthetic-invalid',invalid:true,allowed:false},
    {name:'authenticated senza admin',header:'Bearer synthetic-user',allowed:false},
    {name:'errore lookup ruolo',header:'Bearer synthetic-error',lookupError:true,allowed:false},
    {name:'Admin da user_roles',header:'Bearer synthetic-admin',admin:true,allowed:true}
  ]) {
    let lookup=false;
    const context={exports:{},Deno:{env:{get:()=> 'synthetic'}},createClient:()=>({
      auth:{getUser:async()=>({data:{user:scenario.invalid?null:{id:'fixture-user',email:'fixture@example.invalid',user_metadata:{role:'admin'}}},error:scenario.invalid?new Error('invalid'):null})},
      from:(table)=>{lookup=true;assert.equal(table,'user_roles'); const q={select:()=>q,
        eq:(key,value)=>{if(key==='role')assert.equal(value,'admin');if(key==='user_id')assert.equal(value,'fixture-user');return q;},
        maybeSingle:async()=>({data:scenario.admin?{role:'admin'}:null,error:scenario.lookupError?new Error('lookup'):null})};return q;}
    })};
    vm.runInNewContext(compiled,context);
    const request={headers:{get:()=>scenario.header}};
    if(scenario.allowed) assert.equal(await context.exports.assertAdminRequest(request),'fixture@example.invalid');
    else await assert.rejects(context.exports.assertAdminRequest(request));
    if(!scenario.header || scenario.invalid)assert.equal(lookup,false);
    checks++;console.log(`PASS ${checks}: auth reale con mock offline: ${scenario.name}`);
  }
  assert.equal(digest(),originalData);
  console.log(`PASS: ${checks} verifiche; nessun accesso live, dati sintetici invariati.`);
} finally {
  if(started) {
    const r=command('pg_ctl',['-D',dataDir,'-m','fast','-w','stop']);
    if(r.status!==0)throw new Error(`Arresto cluster fallito: ${r.stderr}`);
  }
  console.log(`Artefatti sintetici conservati in ${temp}; cluster arrestato.`);
}
