create table if not exists public.product_sync_csv_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  title text,
  description text,
  price numeric(12, 2),
  compare_at_price numeric(12, 2),
  barcode text,
  weight_grams integer,
  inventory_quantity integer,
  tags jsonb not null default '[]'::jsonb,
  product_category text,
  product_category_id text,
  image_urls jsonb not null default '[]'::jsonb,
  source_file text,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_sync_csv_products_sku_key unique (sku)
);

create index if not exists idx_product_sync_csv_products_imported_at
  on public.product_sync_csv_products (imported_at desc);

create index if not exists idx_product_sync_csv_products_source_file
  on public.product_sync_csv_products (source_file);

create or replace function public.touch_product_sync_csv_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_product_sync_csv_products_updated_at on public.product_sync_csv_products;
create trigger trg_touch_product_sync_csv_products_updated_at
before update on public.product_sync_csv_products
for each row
execute function public.touch_product_sync_csv_products_updated_at();

alter table public.product_sync_csv_products enable row level security;
