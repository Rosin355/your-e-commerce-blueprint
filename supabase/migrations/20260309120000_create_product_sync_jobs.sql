create extension if not exists pgcrypto;

create table if not exists public.product_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  mode text not null default 'sync' check (mode in ('sync', 'ai_content', 'ai_images', 'integrity')),
  total_products integer not null default 0,
  updated_products integer not null default 0,
  unchanged_products integer not null default 0,
  failed_products integer not null default 0,
  report_json jsonb not null default '{}'::jsonb,
  initiated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_product_sync_jobs_status_created_at
  on public.product_sync_jobs (status, created_at desc);

create or replace function public.touch_product_sync_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_product_sync_jobs_updated_at on public.product_sync_jobs;
create trigger trg_touch_product_sync_jobs_updated_at
before update on public.product_sync_jobs
for each row
execute function public.touch_product_sync_jobs_updated_at();

alter table public.product_sync_jobs enable row level security;
