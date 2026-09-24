-- FASE 1A.6 — additive differential only.
-- Reuse public.products and the five existing lossless tables.
-- Intentionally no data changes, foreign keys, indexes, constraints, RLS,
-- policies, grants, triggers, or product_catalog_entities table.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
begin
  if to_regclass('public.products') is null
    or to_regclass('public.product_import_batches') is null
    or to_regclass('public.product_source_snapshots') is null
    or to_regclass('public.product_current_values') is null
    or to_regclass('public.product_ai_suggestions') is null
    or to_regclass('public.product_field_history') is null then
    raise exception 'Lossless live schema prerequisites are missing';
  end if;

  if to_regclass('public.product_catalog_entities') is not null then
    raise exception 'Unexpected product_catalog_entities table; review schema drift';
  end if;
end
$$;

alter table public.product_current_values
  add column if not exists source_snapshot_id uuid;

alter table public.product_ai_suggestions
  add column if not exists base_version integer,
  add column if not exists prompt_version text;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_current_values'
      and column_name = 'source_snapshot_id'
      and udt_name = 'uuid'
      and is_nullable = 'YES'
  ) then
    raise exception 'Unexpected definition for product_current_values.source_snapshot_id';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_ai_suggestions'
      and column_name = 'base_version'
      and udt_name = 'int4'
      and is_nullable = 'YES'
  ) then
    raise exception 'Unexpected definition for product_ai_suggestions.base_version';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_ai_suggestions'
      and column_name = 'prompt_version'
      and udt_name = 'text'
      and is_nullable = 'YES'
  ) then
    raise exception 'Unexpected definition for product_ai_suggestions.prompt_version';
  end if;
end
$$;

commit;
