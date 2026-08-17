-- =====================================================================
-- FASE 3 · MIGRATION 1/2 — Estensione additiva dell'enum app_role
-- NON APPLICATA. Da eseguire PRIMA di 002 e in una transazione separata:
-- Postgres non consente di usare un nuovo valore di enum nella stessa
-- transazione in cui viene aggiunto.
-- =====================================================================
-- Nessuna tabella esistente viene modificata: si aggiungono soltanto
-- valori all'enum public.app_role (operazione additiva e non distruttiva).

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'publisher';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tech_admin';

-- Nota rollback: Postgres non supporta la rimozione di un valore di enum.
-- Il rollback consiste nel non assegnare mai i nuovi ruoli in user_roles
-- (i valori inutilizzati sono inerti). Vedi rollback-f3.sql.
