-- Local isolated PostgreSQL only. Minimal Supabase auth plumbing, not production auth.
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF; END $$;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT null::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role', true), '') $$;
CREATE TYPE public.app_role AS ENUM('admin','tech_admin','editor','publisher','user','moderator');
CREATE TABLE public.user_roles(user_id uuid REFERENCES auth.users(id),role public.app_role);
CREATE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
GRANT USAGE ON SCHEMA public,auth TO service_role,authenticated,anon;
GRANT SELECT ON public.user_roles TO service_role;
