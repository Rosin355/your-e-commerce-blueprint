-- Private, server-only transport for approved Shopify creation manifests.
-- The Edge Function uses the service role, which bypasses Storage RLS. No
-- browser/client policy is required or allowed for this bucket.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'shopify-create-manifests',
  'shopify-create-manifests',
  false,
  5242880,
  array['application/json']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Deny client access to Shopify create manifests"
  on storage.objects;

create policy "Deny client access to Shopify create manifests"
on storage.objects
as restrictive
for all
to anon, authenticated
using (bucket_id <> 'shopify-create-manifests')
with check (bucket_id <> 'shopify-create-manifests');
