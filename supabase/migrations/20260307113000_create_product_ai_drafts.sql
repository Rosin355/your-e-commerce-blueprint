create extension if not exists pgcrypto;

create table if not exists public.product_ai_drafts (
  id uuid primary key default gen_random_uuid(),
  shopify_product_id text not null,
  handle text,
  seed_style text,
  language text not null default 'it',
  facts_json jsonb not null default '{}'::jsonb,
  copy_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved', 'published', 'error')),
  created_by text,
  error text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_ai_drafts_product_created_at
  on public.product_ai_drafts (shopify_product_id, created_at desc);
