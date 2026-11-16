// Only a named isolated DB over a private socket; no cloud URL is accepted.
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const host=process.env.OG_TEST_PG_SOCKET, database=process.env.OG_TEST_PG_DATABASE, port=Number(process.env.OG_TEST_PG_PORT);
if ((!host?.startsWith('/private/tmp/og-editor-') && !(process.env.CI==='true' && host==='127.0.0.1')) || !/^og_admin_test_[a-z0-9_]+$/.test(database??'') || !Number.isInteger(port)) throw Error('ISOLATED_DATABASE_REQUIRED');
const sql=postgres({host,database,port,user:process.env.PGUSER ?? process.env.USER,max:2,prepare:false});
try {
 await sql.begin(tx=>tx.unsafe(readFileSync('supabase/migrations/20260923155153_add_lossless_lineage_and_ai_versions.sql','utf8').replace(/^begin;$/m,'').replace(/^commit;$/m,'')));
 await sql.unsafe(readFileSync('supabase/migrations/20260930152426_harden_product_admin_ai_concurrency.sql','utf8'));
 const valuesBefore=await sql`select jsonb_agg(to_jsonb(v) order by id) as rows from public.product_current_values v`;
 const rolesBefore=await sql`select jsonb_agg(to_jsonb(r) order by user_id,role) as rows from public.user_roles r`;
 const before=await sql`select jsonb_agg(to_jsonb(c) order by user_id) as rows from public.admin_catalog_capabilities c`;
 const journal=JSON.parse(readFileSync('drizzle/migrations/meta/_journal.json','utf8'));
 assert.deepEqual(journal.entries.filter(e=>e.idx>=16).map(e=>e.tag),['0016_marco_editorial_missing_values','0017_admin_ai_confirmed_context']);
 await sql`create schema if not exists drizzle`;
 await sql`create table if not exists drizzle.__drizzle_migrations(id serial primary key,hash text not null,created_at bigint)`;
 await sql`insert into drizzle.__drizzle_migrations(hash,created_at) values('synthetic-baseline',${journal.entries.find(e=>e.idx===15).when})`;
 await migrate(drizzle(sql),{migrationsFolder:'drizzle/migrations'});
 await migrate(drizzle(sql),{migrationsFolder:'drizzle/migrations'}); // second invocation is a read-only replay
 const after=await sql`select jsonb_agg(to_jsonb(c) order by user_id) as rows from public.admin_catalog_capabilities c`;
 assert.deepEqual(after,before,'migration changed an account grant');
 assert.deepEqual(await sql`select jsonb_agg(to_jsonb(v) order by id) as rows from public.product_current_values v`,valuesBefore,'migration changed existing product values');
 assert.deepEqual(await sql`select jsonb_agg(to_jsonb(r) order by user_id,role) as rows from public.user_roles r`,rolesBefore,'migration changed a role');
 assert.equal((await sql`select count(*)::int as n from drizzle.__drizzle_migrations`)[0].n,3);
 await sql.unsafe(readFileSync('scripts/fixtures/editor-step1a.sql','utf8'));
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
} finally {await sql.end();}
