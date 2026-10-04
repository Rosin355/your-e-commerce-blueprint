-- 3B.4: estende il ledger privato esistente con la prova durevole SET_ACTIVE.
-- Migration code-only: non applicata da Codex.
alter table public.shopify_creation_ledger
  add column if not exists applied_at timestamptz;

alter table public.shopify_creation_ledger
  drop constraint if exists shopify_creation_ledger_operation_check;

alter table public.shopify_creation_ledger
  add constraint shopify_creation_ledger_operation_check check (operation in (
    'CREATE_PARENT',
    'CREATE_OPTIONS',
    'CREATE_VARIANT',
    'ATTACH_MEDIA',
    'CONFIGURE_INVENTORY',
    'SET_ACTIVE'
  ));

alter table public.shopify_creation_ledger
  drop constraint if exists shopify_creation_ledger_status_check;

alter table public.shopify_creation_ledger
  add constraint shopify_creation_ledger_status_check check (status in (
    'RESERVED',
    'APPLIED',
    'RECONCILED',
    'VERIFIED',
    'FAILED'
  ));

comment on column public.shopify_creation_ledger.applied_at is
  'Timestamp della mutation Shopify confermata; VERIFIED richiede anche verified_at.';
