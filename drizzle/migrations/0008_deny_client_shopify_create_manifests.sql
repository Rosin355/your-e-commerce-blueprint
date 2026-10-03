drop policy if exists "Deny client access to Shopify create manifests"
  on storage.objects;

create policy "Deny client access to Shopify create manifests"
on storage.objects
as restrictive
for all
to anon, authenticated
using (bucket_id <> 'shopify-create-manifests')
with check (bucket_id <> 'shopify-create-manifests');