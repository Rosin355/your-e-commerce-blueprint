-- Fase 3B.2: ledger privato per rendere riproducibili e non duplicabili le
-- creazioni Shopify. Nessun endpoint Data API pubblico deve poterlo scrivere.
create table if not exists public.shopify_creation_ledger (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null,
  internal_sku text not null,
  operation text not null check (operation in (
    'CREATE_PARENT',
    'CREATE_OPTIONS',
    'CREATE_VARIANT',
    'ATTACH_MEDIA',
    'CONFIGURE_INVENTORY'
  )),
  request_key text not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  shopify_product_id text,
  shopify_variant_id text,
  status text not null check (status in ('RESERVED', 'APPLIED', 'RECONCILED', 'FAILED')),
  result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint shopify_creation_ledger_request_key_unique unique (request_key),
  constraint shopify_creation_ledger_batch_operation_unique
    unique (batch_id, internal_sku, operation)
);

create index if not exists idx_shopify_creation_ledger_batch_status
  on public.shopify_creation_ledger (batch_id, status, created_at);

alter table public.shopify_creation_ledger enable row level security;

revoke all on table public.shopify_creation_ledger from public;
revoke all on table public.shopify_creation_ledger from anon;
revoke all on table public.shopify_creation_ledger from authenticated;
grant select, insert, update on table public.shopify_creation_ledger to service_role;

comment on table public.shopify_creation_ledger is
  'Private server-side idempotency ledger for approved Shopify product creation batches.';
