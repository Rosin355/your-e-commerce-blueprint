"""End-to-end sul solo cluster effimero locale, privo di dati e credenziali reali."""
import csv
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT/'supabase/migrations/20261127153041_woo_private_customer_archive.sql'
IMPORTER = ROOT/'sync/history/import-private-archive.py'
OWNER, MARCO, CLIENT = ['00000000-0000-4000-8000-%012d' % i for i in (1, 2, 3)]


class ArchiveTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.folder = Path(cls.temp.name)
        cluster = cls.folder/'pg'
        cls.pg = ['pg_ctl','-D',str(cluster)]
        subprocess.run(['initdb','-A','trust','-U','postgres','-E','UTF8','--no-locale','-D',cluster],
                       check=True,stdout=subprocess.DEVNULL)
        subprocess.run(cls.pg+['-l',str(cls.folder/'pg.log'),'-o',
                       f"-c listen_addresses='' -k '{cls.folder}'",'start','-w'],check=True,stdout=subprocess.DEVNULL)
        cls.addClassCleanup(cls.temp.cleanup)
        cls.addClassCleanup(subprocess.run,cls.pg+['stop','-m','fast','-w'],check=True,stdout=subprocess.DEVNULL)
        service = cls.folder/'service.conf'
        service.write_text(f'[fixture]\nhost={cls.folder}\ndbname=postgres\nuser=postgres\n')
        cls.env = {k:v for k,v in os.environ.items() if not k.startswith('PG')}
        cls.env.update(PGSERVICE='fixture',PGSERVICEFILE=str(service))
        cls.sql(f"""
            create role anon; create role authenticated; create role service_role;
            create schema auth; create type public.app_role as enum('admin','tech_admin','editor');
            create table auth.users(id uuid primary key, deleted_at timestamptz, banned_until timestamptz);
            create table auth.sessions(id uuid,user_id uuid,not_after timestamptz);
            insert into auth.users(id) values ('{OWNER}'),('{MARCO}'),('{CLIENT}');
            insert into auth.sessions(id,user_id) select id,id from auth.users;
            create table public.user_roles(user_id uuid,role public.app_role);
            create function auth.jwt() returns jsonb language sql stable as
              $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{{}}')::jsonb$$;
            create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
            create function auth.role() returns text language sql stable as $$select auth.jwt()->>'role'$$;
            insert into public.user_roles values ('{OWNER}','admin'),('{MARCO}','editor');
        """)
        cls.sql((ROOT/'drizzle/migrations/0019_restrict_role_checks_to_self_or_trusted_service.sql').read_text())
        cls.sql(MIGRATION.read_text())

    @classmethod
    def sql(cls,stmt,ok=True):
        p=subprocess.run(['psql','-XAtq','-v','ON_ERROR_STOP=1'],input=stmt,env=cls.env,
                         capture_output=True,text=True)
        if ok and p.returncode:
            raise AssertionError(p.stderr)
        if not ok:
            assert p.returncode and ('permission denied' in p.stderr or 'Accesso Admin richiesto' in p.stderr
                                     or 'Parametri archivio non validi' in p.stderr or 'audit offline' in p.stderr),p.stderr
        return p.stdout.strip()

    def call(self, who, action, args='',role='authenticated',ok=True,anonymous=False):
        claims=json.dumps(dict(sub=who,session_id=who,role=role,is_anonymous=anonymous))
        output=self.sql(f"""set role {role}; set request.jwt.claims='{claims}';
                             select public.woo_archive_read('{action}'{args});""",ok)
        return json.loads(output) if output and ok else None

    def test_full_cycle(self):
        path=self.folder/'source.csv'
        special = 'Città "Blu"\tA\nB\\C'
        def fixture(last='Demo'):
            with path.open('w',newline='') as f:
                w=csv.writer(f); w.writerow(['ID','roles','first_name','last_name','user_email','orders','user_pass','session_tokens'])
                for i in range(1,55):
                    w.writerow([i,'customer' if i<=53 else 'author','Nome',last if i==1 else special if i==53 else 'Demo',
                                f'demo{i}@example.invalid',int(i%2==1),'SECRET_FIXTURE','SECRET_FIXTURE'])
        def run_import():
            return subprocess.run([sys.executable,IMPORTER,path,'--apply','--expected-accounts','54',
                                   '--expected-customers','53','--expected-buyers','27','--expected-purchases','27'],
                                  env=self.env,capture_output=True,text=True)
        fixture()
        self.assertEqual(run_import().returncode,0)
        self.assertEqual(run_import().returncode,0)
        self.assertEqual(self.sql("select count(*) from woo_archive.audit where action='import'"),'1')
        fixture('Divergente')
        self.assertNotEqual(run_import().returncode,0)
        self.assertEqual(self.sql("select last_name from woo_archive.customers where woo_id=1"),'Demo')
        page=self.call(OWNER,'list')
        self.assertEqual((page['accounts'],page['buyers'],page['purchases'],len(page['rows'])),(53,27,27,50))
        self.assertEqual(self.call(OWNER,'list',",'','all',1")['rows'][0]['id'],'51')
        self.assertEqual(self.call(OWNER,'list',",'DEMO1@','with'")['total'],1)
        self.assertEqual(self.call(OWNER,'list',",'Nome Demo','without'")['total'],26)
        self.assertEqual(self.call(OWNER,'list',",'53'")['total'],1)
        self.assertEqual(self.call(OWNER,'detail',",p_id=>53")['last_name'],special)
        detail=self.call(OWNER,'detail',",p_id=>1")
        self.assertEqual(set(detail),{'id','first_name','last_name','email','purchases'})
        for action,args in [('list',''),('detail',',p_id=>1'),('export',",p_purpose=>'verifica_archivio'")]:
            for user in (MARCO, CLIENT):
                self.call(user,action,args,ok=False)
            self.call(None,action,args,role='anon',ok=False)
        self.call(OWNER,'list',ok=False,anonymous=True)
        self.sql(f"insert into woo_archive.page_admins(user_id,approval_ref) values ('{MARCO}','TEST')")
        self.assertEqual(self.call(MARCO,'detail',',p_id=>1'),detail)
        self.assertEqual(self.sql("select count(*) from woo_archive.audit where action='grant'"),'1')
        self.call(MARCO,'export',ok=False)
        export=self.call(MARCO,'export',",'','without',p_purpose=>'verifica_archivio'")
        self.assertEqual(len(export['rows']),26)
        self.assertEqual(self.call(MARCO,'export',",p_query=>'nessun risultato',p_purpose=>'verifica_archivio'")['rows'],[])
        self.assertEqual(self.sql(f"select quantity from woo_archive.audit where action='export' and quantity>0 and actor='{MARCO}'"),'26')
        self.sql(f"delete from woo_archive.page_admins where user_id='{MARCO}'")
        self.call(MARCO,'list',ok=False)
        # Percorso Admin globale, separato dal grant limitato alla pagina.
        self.sql(f"insert into public.user_roles values ('{MARCO}','admin')")
        for action,args in [('list',''),('detail',',p_id=>1'),
                            ('export',",p_purpose=>'verifica_archivio'")]:
            self.assertEqual(self.call(MARCO,action,args),self.call(OWNER,action,args))
        self.sql(f"delete from public.user_roles where user_id='{MARCO}' and role='admin'")
        self.assertEqual(self.sql(f"select role from public.user_roles where user_id='{MARCO}'"),'editor')
        self.call(MARCO,'export',",p_purpose=>'verifica_archivio'",ok=False)

        # Un ripristino sintetico misura il metodo, non certifica i backup del provider.
        dump=self.folder/'fixture.dump'
        subprocess.run(['pg_dump','-Fc','-f',dump],env=self.env,check=True)
        self.sql('create database archive_restore template template0')
        subprocess.run(['pg_restore','--exit-on-error','-d','archive_restore',dump],env=self.env,check=True)
        proof="""select count(*), sum(purchases) from woo_archive.customers;
                 select count(*) from woo_archive.audit;
                 select bool_and(relrowsecurity) from pg_class where relnamespace='woo_archive'::regnamespace
                       and relkind='r';
                 select has_table_privilege('authenticated','woo_archive.customers','select');
                 select has_function_privilege('anon',
                    'public.woo_archive_read(text,text,text,integer,bigint,text)','execute');"""
        restored=subprocess.run(['psql','-XAtq','-d','archive_restore','-v','ON_ERROR_STOP=1'],
                                input=proof,text=True,env=self.env,capture_output=True,check=True)
        self.assertEqual(restored.stdout.strip(),self.sql(proof))
        self.assertEqual(restored.stdout.strip().splitlines()[-3:],['t','f','f'])
        self.sql('set role authenticated; select * from woo_archive.customers',False)
        self.sql('set role authenticated; delete from woo_archive.audit',False)
        self.sql("""create function woo_archive.fail() returns trigger language plpgsql as
                   $$begin raise exception 'audit offline'; end$$;
                   create trigger fail before insert on woo_archive.audit for each row execute function woo_archive.fail()""")
        self.call(OWNER,'export',",p_purpose=>'verifica_archivio'",ok=False)
        self.sql(f"delete from auth.sessions where user_id='{OWNER}'")
        self.call(OWNER,'list',ok=False)
        self.assertNotIn('SECRET_FIXTURE',self.sql('select jsonb_agg(to_jsonb(c)) from woo_archive.customers c'))


    def test_staff_alignment(self):
        script=ROOT/'docs/migration/admin-clienti-operativo/parita-admin.proposta.sql'
        self.sql(f"""
            alter table auth.users add column email text, add column email_confirmed_at timestamptz;
            update auth.users set email=id::text||'@example.invalid',email_confirmed_at=now();
            insert into public.user_roles values ('{OWNER}','editor');
            create table public.admin_catalog_capabilities(user_id uuid primary key, enabled boolean,
                capabilities text[], field_keys text[],approved_reference text,updated_at timestamptz);
            create table public.admin_draft_ai_field_opt_ins(actor uuid,field_key text);
            insert into public.admin_catalog_capabilities
              select id,true,array['edit','sync','drafts','images','categories','prices','publish','ai'],
                array(select 'fixture_'||n from generate_series(1,17)n),'fixture',now()
              from auth.users where id in ('{OWNER}','{MARCO}');
            update public.admin_catalog_capabilities set field_keys=field_keys||
                array['product_archive','product_formats','product_gallery','product_unpublish','tags'] where user_id='{MARCO}';
            insert into public.admin_draft_ai_field_opt_ins select '{MARCO}',unnest(array['seo_title','seo_description','tags']);
        """)
        def exercise(apply=False,email=None):
            values=dict(owner_id=OWNER,staff_id=MARCO,owner_email=OWNER+'@example.invalid',
                        staff_email=email or MARCO+'@example.invalid',approval_ref='fixture-private')
            if apply: values['apply_change']='on'
            args=['psql','-Xq']
            for key,val in values.items(): args.extend(['-v',key+'='+val])
            return subprocess.run(args+['-f',str(script)],env=self.env,capture_output=True).returncode
        self.assertNotEqual(exercise(True,'different@example.invalid'),0)
        self.assertEqual(exercise(),0)
        self.assertEqual(self.sql(f"select count(*) from public.user_roles where user_id='{MARCO}' and role='admin'"),'0')
        self.assertEqual(exercise(True),0)
        self.assertEqual(self.sql(f"select cardinality(field_keys) from public.admin_catalog_capabilities where user_id='{MARCO}'"),'17')
        self.assertEqual(self.sql(f"select count(*) from public.admin_draft_ai_field_opt_ins where actor='{MARCO}'"),'0')
        self.assertNotEqual(exercise(True),0)

if __name__=='__main__':
    unittest.main()
