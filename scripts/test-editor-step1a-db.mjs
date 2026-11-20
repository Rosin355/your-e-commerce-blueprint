// Only a named isolated DB over a private socket; no cloud URL is accepted.
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { readFileSync, writeFileSync, cpSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const host=process.env.OG_TEST_PG_SOCKET, database=process.env.OG_TEST_PG_DATABASE, port=Number(process.env.OG_TEST_PG_PORT);
if ((!host?.startsWith('/private/tmp/og-editor-') && !(process.env.CI==='true' && host==='127.0.0.1')) || !/^og_admin_test_[a-z0-9_]+$/.test(database??'') || !Number.isInteger(port)) throw Error('ISOLATED_DATABASE_REQUIRED');
const sql=postgres({host,database,port,user:process.env.PGUSER ?? process.env.USER,max:2,prepare:false});
const migrationFolder=mkdtempSync(join(tmpdir(),'og-editor-path-a-'));
try {
 // The real installed generator, no cloud config/credentials: only a disposable SQL folder.
 cpSync('drizzle/migrations',migrationFolder,{recursive:true});
 const configPath=join(migrationFolder,'offline.config.cjs');
 writeFileSync(configPath,'module.exports = '+JSON.stringify({dialect:'postgresql',schema:resolve('drizzle/schema.ts'),out:relative(process.cwd(),migrationFolder)})+';');
 execFileSync(process.execPath,[resolve('node_modules/drizzle-kit/bin.cjs'),'generate','--custom','--name=offline_path_a_probe','--config='+configPath],{stdio:'pipe',env:{...process.env,NODE_OPTIONS:'--require '+resolve('ci/offline-network.cjs')}});
 const generatedJournal=JSON.parse(readFileSync(join(migrationFolder,'meta/_journal.json'),'utf8'));
 const probe=generatedJournal.entries.at(-1);
 assert.equal(probe.idx,19);assert.equal(probe.tag,'0019_offline_path_a_probe');
 assert.ok(probe.when>generatedJournal.entries.at(-2).when);
 assert.equal(existsSync(join(migrationFolder,'meta/0016_snapshot.json')),false);
 assert.equal(existsSync(join(migrationFolder,'meta/0017_snapshot.json')),false);
 const snapshot19=JSON.parse(readFileSync(join(migrationFolder,'meta/0019_snapshot.json'),'utf8'));
 const snapshot18=JSON.parse(readFileSync('drizzle/migrations/meta/0018_snapshot.json','utf8'));
 assert.equal(snapshot19.prevId,snapshot18.id);
 assert.equal(snapshot18.prevId,JSON.parse(readFileSync('drizzle/migrations/meta/0015_snapshot.json','utf8')).id);
 const probeComment='Synthetic Path A batch completed';
 writeFileSync(join(migrationFolder,probe.tag+'.sql'),"COMMENT ON TABLE public.admin_confirmed_ai_requests IS '"+probeComment+"';\n");
 for(const entry of generatedJournal.entries.filter(e=>[16,17,18].includes(e.idx))) assert.deepEqual(readFileSync(join(migrationFolder,entry.tag+'.sql')),readFileSync('drizzle/migrations/'+entry.tag+'.sql'));
 console.log('PASS Path A generator: official custom 0019 after checked-in 0018 with increasing when and snapshot, absent 0016/0017 snapshots accepted; canonical SQL unchanged.');
 await sql.begin(tx=>tx.unsafe(readFileSync('supabase/migrations/20260923155153_add_lossless_lineage_and_ai_versions.sql','utf8').replace(/^begin;$/m,'').replace(/^commit;$/m,'')));
 await sql.unsafe(readFileSync('supabase/migrations/20260930152426_harden_product_admin_ai_concurrency.sql','utf8'));
 const valuesBefore=await sql`select jsonb_agg(to_jsonb(v) order by id) as rows from public.product_current_values v`;
 const rolesBefore=await sql`select jsonb_agg(to_jsonb(r) order by user_id,role) as rows from public.user_roles r`;
 const before=await sql`select jsonb_agg(to_jsonb(c) order by user_id) as rows from public.admin_catalog_capabilities c`;
 const journal=JSON.parse(readFileSync('drizzle/migrations/meta/_journal.json','utf8'));
 assert.deepEqual(journal.entries.filter(e=>e.idx>=16).map(e=>e.tag),['0016_marco_editorial_missing_values','0017_admin_ai_confirmed_context','0018_step_m_path_a_guard']);
 await sql`create schema if not exists drizzle`;
 await sql`create table if not exists drizzle.__drizzle_migrations(id serial primary key,hash text not null,created_at bigint)`;
 await sql`insert into drizzle.__drizzle_migrations(hash,created_at) values('synthetic-baseline',${journal.entries.find(e=>e.idx===15).when})`;
 // Reproduce the observed broad table/function defaults on this isolated creator only.
 await sql.unsafe('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role,anon,authenticated');
 await sql.unsafe('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role,anon,authenticated');
 // A bad inherited default must abort BOTH pending migrations and their history.
 const priorFunction=(await sql`select prosrc from pg_proc where oid='public.admin_update_product_field(uuid,text,uuid,text,jsonb,integer,text,text,text)'::regprocedure`)[0].prosrc;
 await sql.unsafe('CREATE ROLE og_acl_m01_default_writer NOLOGIN');
 try {
  await sql.unsafe('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT UPDATE ON TABLES TO og_acl_m01_default_writer');
  await sql.unsafe('GRANT og_acl_m01_default_writer TO service_role');
  await assert.rejects(migrate(drizzle(sql),{migrationsFolder:migrationFolder}),error=>{
    let cause=error;while(cause.cause)cause=cause.cause;
    return cause.code==='42501' && /effective privileges/.test(cause.message);
  });
  assert.equal((await sql`select to_regclass('public.admin_confirmed_ai_requests') as table`)[0].table,null);
  assert.equal((await sql`select count(*)::int as n from drizzle.__drizzle_migrations`)[0].n,1);
  assert.equal((await sql`select prosrc from pg_proc where oid='public.admin_update_product_field(uuid,text,uuid,text,jsonb,integer,text,text,text)'::regprocedure`)[0].prosrc,priorFunction);
 } finally {
  await sql.unsafe('REVOKE og_acl_m01_default_writer FROM service_role');
  await sql.unsafe('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE UPDATE ON TABLES FROM og_acl_m01_default_writer');
  await sql.unsafe('DROP ROLE og_acl_m01_default_writer');
 }
 const defaultsBefore=await sql`select jsonb_agg(to_jsonb(d) order by oid) as rows from pg_default_acl d`;
 await migrate(drizzle(sql),{migrationsFolder:migrationFolder});
 await migrate(drizzle(sql),{migrationsFolder:migrationFolder}); // second invocation is a read-only replay
 const after=await sql`select jsonb_agg(to_jsonb(c) order by user_id) as rows from public.admin_catalog_capabilities c`;
 assert.deepEqual(after,before,'migration changed an account grant');
 assert.deepEqual(await sql`select jsonb_agg(to_jsonb(d) order by oid) as rows from pg_default_acl d`,defaultsBefore,'migration changed default privileges');
 assert.deepEqual(await sql`select jsonb_agg(to_jsonb(v) order by id) as rows from public.product_current_values v`,valuesBefore,'migration changed existing product values');
 assert.deepEqual(await sql`select jsonb_agg(to_jsonb(r) order by user_id,role) as rows from public.user_roles r`,rolesBefore,'migration changed a role');
 assert.equal((await sql`select count(*)::int as n from drizzle.__drizzle_migrations`)[0].n,5);
 assert.equal((await sql`select obj_description('public.admin_confirmed_ai_requests'::regclass) as comment`)[0].comment,probeComment);
 const batchHistory=await sql`select hash,created_at from drizzle.__drizzle_migrations order by created_at`;
 assert.deepEqual(batchHistory.slice(1).map(r=>Number(r.created_at)),generatedJournal.entries.filter(e=>e.idx>=16).map(e=>e.when));
 await migrate(drizzle(sql),{migrationsFolder:migrationFolder});
 assert.deepEqual(await sql`select hash,created_at from drizzle.__drizzle_migrations order by created_at`,batchHistory,'Path A replay changed history');
 assert.equal(batchHistory.at(-1).hash,createHash('sha256').update(readFileSync(join(migrationFolder,probe.tag+'.sql'))).digest('hex'));
 console.log('PASS Path A batch: 0016 -> 0017 -> 0018 -> generated 0019 atomic, ACL-failure rollback, four ordered hashes, replay unchanged, grants/roles/data preserved.');
 for(const entry of journal.entries.filter(e=>e.idx>=16)){
  const hash=createHash('sha256').update(readFileSync('drizzle/migrations/'+entry.tag+'.sql')).digest('hex');
  assert.equal((await sql`select hash from drizzle.__drizzle_migrations where created_at=${entry.when}`)[0].hash,hash);
 }

 await sql.unsafe(readFileSync('scripts/fixtures/editor-step1a.sql','utf8'));
 const migration17=readFileSync('drizzle/migrations/0017_admin_ai_confirmed_context.sql','utf8');
 const guards=[...migration17.matchAll(/DO \$journal_acl\$[\s\S]*?END \$journal_acl\$;/g)].map(m=>m[0]);
 assert.equal(guards.length,2);
 const owner=(await sql`select pg_get_userbyid(relowner) as owner from pg_class where oid='public.admin_confirmed_ai_requests'::regclass`)[0].owner;
 assert.equal(owner,(await sql`select current_user as role`)[0].role);assert.notEqual(owner,'service_role');
 for(const privilege of ['SELECT','INSERT']) assert.equal((await sql`select has_table_privilege('service_role','public.admin_confirmed_ai_requests',${privilege}) as allowed`)[0].allowed,true);
 for(const privilege of ['UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) assert.equal((await sql`select has_table_privilege('service_role','public.admin_confirmed_ai_requests',${privilege}) as allowed`)[0].allowed,false);
 if(Number((await sql`show server_version_num`)[0].server_version_num)>=170000) assert.equal((await sql`select has_table_privilege('service_role','public.admin_confirmed_ai_requests','MAINTAIN') as allowed`)[0].allowed,false);
 for(const role of ['anon','authenticated']) for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) assert.equal((await sql`select has_table_privilege(${role},'public.admin_confirmed_ai_requests',${privilege}) as allowed`)[0].allowed,false);
 // Exercise real DML permission checks, not just catalog privilege booleans.
 await sql.begin(async tx=>{
  await tx.unsafe('SET LOCAL ROLE service_role');
  await tx`select * from public.admin_confirmed_ai_requests limit 0`;
  await tx`insert into public.admin_confirmed_ai_requests(actor,request_key,field_key,context_hash) values('00000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','description',repeat('a',64))`;
  for(const statement of ['UPDATE public.admin_confirmed_ai_requests SET context_hash=context_hash','DELETE FROM public.admin_confirmed_ai_requests','TRUNCATE public.admin_confirmed_ai_requests']) await assert.rejects(tx.savepoint(sp=>sp.unsafe(statement)),e=>e.code==='42501');
 });
 // Ownership and inherited equivalent rights must fail the actual migration guards.
 await assert.rejects(sql.begin(async tx=>{await tx.unsafe('ALTER TABLE public.admin_confirmed_ai_requests OWNER TO service_role');await tx.unsafe(guards[0]);}),e=>e.code==='42501' && /owner\/service/.test(e.message));
 await assert.rejects(sql.begin(async tx=>{await tx.unsafe('CREATE ROLE og_acl_probe_writer NOLOGIN');await tx.unsafe('GRANT UPDATE,DELETE,TRUNCATE ON public.admin_confirmed_ai_requests TO og_acl_probe_writer');await tx.unsafe('GRANT og_acl_probe_writer TO service_role');await tx.unsafe('REVOKE ALL ON public.admin_confirmed_ai_requests FROM service_role');await tx.unsafe('GRANT SELECT,INSERT ON public.admin_confirmed_ai_requests TO service_role');await tx.unsafe(guards[1]);}),e=>e.code==='42501' && /effective privileges/.test(e.message));
 await assert.rejects(sql.begin(async tx=>{await tx.unsafe('CREATE ROLE og_acl_probe_setter NOLOGIN');await tx.unsafe('GRANT UPDATE ON public.admin_confirmed_ai_requests TO og_acl_probe_setter');await tx.unsafe('GRANT og_acl_probe_setter TO service_role WITH INHERIT FALSE, SET TRUE');await tx.unsafe(guards[1]);}),e=>e.code==='42501' && /effective privileges/.test(e.message));
 assert.equal((await sql`select pg_get_userbyid(relowner) as owner from pg_class where oid='public.admin_confirmed_ai_requests'::regclass`)[0].owner,owner);
 assert.equal((await sql`select count(*)::int as n from pg_roles where rolname='og_acl_probe_writer'`)[0].n,0);
 console.log('PASS M-01 OFFLINE ONLY: broad creator defaults normalized; SELECT/INSERT succeed; effective UPDATE/DELETE/TRUNCATE denied; owner and inherited writer paths rejected; probe roles/ownership rolled back. Live runner remains unattested.');

 const actor='00000000-0000-4000-8000-000000000001';
 // Concurrent reservations serialize per actor: exactly five admitted, no paid call.
 await sql`delete from public.admin_confirmed_ai_requests`;
 const grants=await Promise.all(Array.from({length:8},(_,i)=>sql.begin(async tx=>{await tx`set local role service_role`;return tx`select public.reserve_confirmed_ai_request(${actor},${`40000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`}::uuid,'description',repeat('a',64),'suggest_confirmed_field') as ok`;})));
 assert.equal(grants.filter(r=>r[0].ok).length,5);
 // Old and new flows must share the original five/minute budget in both directions.
 const oldReserve=()=>sql.begin(async tx=>{await tx`set local role service_role`;return tx`select public.reserve_product_ai_generation(${actor},'20000000-0000-4000-8000-000000000001','description',1) as result`;});
 assert.equal((await oldReserve())[0].result.code,'RATE_LIMITED');
 await sql`delete from public.admin_confirmed_ai_requests`;
 assert.equal((await oldReserve())[0].result.code,'RESERVED');
 assert.equal((await oldReserve())[0].result.code,'GENERATION_IN_PROGRESS');
 const mixed=await Promise.all(Array.from({length:8},(_,i)=>sql.begin(async tx=>{await tx`set local role service_role`;return tx`select public.reserve_confirmed_ai_request(${actor},${`50000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`}::uuid,'description',repeat('c',64),'suggest_confirmed_field') as ok`;})));
 assert.equal(mixed.filter(r=>r[0].ok).length,4);
 // Concurrent first insert of the same missing field: one winner, one VERSION_CONFLICT.
 const insert=key=>sql.begin(async tx=>{await tx`set local role service_role`;return tx`select public.admin_update_product_field(${actor},'update_field','20000000-0000-4000-8000-000000000002','description','"Prima bozza"'::jsonb,0,${key},repeat('b',64),null) as result`;});
 const results=await Promise.all([insert('concurrent-insert-a'),insert('concurrent-insert-b')]);
 assert.equal(results.filter(r=>r[0].result.ok===true).length,1);assert.equal(results.filter(r=>r[0].result.code==='VERSION_CONFLICT').length,1);
 console.log('PASS: official Drizzle migrations 0016/0017, grants unchanged, ACL/RLS, negative authorization, rollback/replay/version conflicts, 5/8 concurrent reservations, shared old/new five/minute budget, 1/2 concurrent first writes. No remote services.');
} finally {await sql.end();rmSync(migrationFolder,{recursive:true,force:true});}
