
# Fix sorgente Catalogo DB — usare l'edge function invece di query diretta

## Causa

La tabella `product_sync_csv_products` ha RLS con sola policy `service_role`. Il client autenticato vede 0 righe (RLS le filtra silenziosamente, senza errore). Per questo `loadDbCatalogProducts` restituisce lista vuota anche con 1518 prodotti effettivi nel DB.

L'edge function `shopify-admin-proxy` espone già l'azione `list_db_products` che gira con service role e fa esattamente quello che serve.

## Modifica

In `src/admin/lib/dbCatalogSource.ts`:

- Sostituire la query Supabase diretta con una chiamata a `listDbProducts({ limit: 5000 })` da `aiWriterEngine.ts`.
- Mappare i record restituiti (`sku, title, handle, description, tags, seo_title, seo_description, image_urls`) nella shape `ShopifyAdminProduct`.
- Applicare il filtro `query` lato client (filter su title/handle/sku) dato che il proxy non lo supporta.
- Aggiornare `onProgress` per riflettere il count finale (singola chiamata).

Edge function — alzare il `limit` cap di `list_db_products` da 2000 a 10000 in `supabase/functions/shopify-admin-proxy/index.ts` (riga ~109) per supportare cataloghi grandi senza paginazione complessa lato client.

Nessuna modifica RLS richiesta: la tabella resta esposta solo a service_role, accesso mediato dall'edge function autenticata via `assertAdminRequest`.

## File toccati

- `src/admin/lib/dbCatalogSource.ts` — riscrittura: usa `listDbProducts` invece di `supabase.from(...)`.
- `supabase/functions/shopify-admin-proxy/index.ts` — alzare cap limit a 10000.
