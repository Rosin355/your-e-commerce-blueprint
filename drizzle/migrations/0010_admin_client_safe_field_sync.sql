-- see supabase/migrations/20261006143000_admin_client_safe_field_sync.sql
ALTER TABLE public.product_current_values
  ADD COLUMN IF NOT EXISTS shopify_verified_value jsonb,
  ADD COLUMN IF NOT EXISTS shopify_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS shopify_sync_error_code text,
  ADD COLUMN IF NOT EXISTS shopify_sync_error_message text;