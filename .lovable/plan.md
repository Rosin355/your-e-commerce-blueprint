
# Migrare le letture prodotti su Storefront API

## Contesto

L'errore `Shopify 403: [API] This action requires merchant approval for read_products scope.` arriva dall'**Admin API** (non dal Storefront). Il token `shpat_` mostrato nell'allegato è il *Private Storefront Access Token* del canale Headless, valido solo per l'**API Storefront** (`/api/2025-07/graphql.json`), non per l'Admin API (`/admin/api/.../graphql.json`) usata oggi dalla edge function `shopify-admin-proxy`.

## Avviso importante (da leggere prima di approvare)

Il proxy `shopify-admin-proxy` oggi gestisce **15+ azioni**, di cui solo 3 sono letture prodotti:

- **Letture** (migrabili a Storefront API): `list_products`, `get_product`, `search_product`, `search_product_by_sku_or_handle`
- **Scritture e operazioni admin-only** (NON migrabili — la Storefront API non le supporta): `create_product`, `update_product`, `save_enriched_draft`, `publish_product_copy`, `setProductCustomMetafields`, `list_shopify_metafield_definitions`, `search_customer`, `create_customer`, `update_customer`, `list_drafts`, ecc.

Quindi questa migrazione fa funzionare **"Carica prodotti"** ma **non** sblocca: pubblicare arricchimenti, aggiornare SEO/metafields, gestire clienti, leggere le definizioni dei metafield. Per quelle operazioni resta obbligatorio sistemare il token Admin API (Custom App con scope corretti).

## Cosa cambia

### 1. Aggiungere helper Storefront nel proxy
In `supabase/functions/shopify-admin-proxy/index.ts`:
- Nuova funzione `shopifyStorefrontFetch(query, variables)` che POSTA su `https://{domain}/api/2025-07/graphql.json` con header `X-Shopify-Storefront-Access-Token: SHOPIFY_HEADLESS_PRIVATE_TOKEN` (segreto già presente).
- Nuova `listProductsStorefront({ status, limit, cursor })` che usa il GraphQL `products(first, after, query)`. Nota: la Storefront API restituisce solo prodotti **pubblicati sul canale Headless** e non espone `status=DRAFT/ARCHIVED` → il filtro per status diventa una no-op (documentato in risposta).
- Nuova `getProductStorefront(id|handle)` con query `productByHandle` o `product(id)`.

### 2. Switch nel `case` esistente
- `list_products` → chiama `listProductsStorefront` (fallback ad Admin se `SHOPIFY_HEADLESS_PRIVATE_TOKEN` non c'è).
- `get_product`, `search_product`, `search_product_by_sku_or_handle` → idem, con query Storefront equivalenti (`title:` / `handle:` filtri).
- Le altre azioni restano invariate sull'Admin API.

### 3. Risposta uniforme
Mantenere lo stesso shape JSON che il frontend (`ProductEnrichmentPanel.tsx`, `aiWriterEngine.ts`) già consuma: array di prodotti con `id`, `title`, `handle`, `images`, `variants`, `status` (forzato a `"ACTIVE"` per i risultati Storefront).

### 4. Nessuna modifica al frontend
Il client continua a chiamare `shopify-admin-proxy` con `action: "list_products"`. Tutto il cambio è server-side.

## Dettagli tecnici

- Dominio: usa la costante già hardcoded `ecom-blueprint-gen-6ud1s.myshopify.com`.
- Secret: `SHOPIFY_HEADLESS_PRIVATE_TOKEN` (già configurato, vedi `<secrets>`).
- Versione API: `2025-07`.
- Paginazione: la Storefront API usa cursori (`endCursor`, `hasNextPage`) invece di `page_info`; adatto la firma di `listProducts` per restituire `nextCursor` ma resto retrocompatibile col conteggio attuale.
- Gestione errori: se la query restituisce `errors[]`, faccio throw con il messaggio di Shopify (resta visibile come oggi nei log della edge function).

## Test consigliato dopo deploy

1. Admin → Arricchimento → Shopify Admin → **Carica prodotti** → deve mostrare la lista.
2. Verifica conteggio confrontandolo col canale Headless.
3. Tentativo di pubblicare un arricchimento → fallirà con 403 finché non si sistema il token Admin (atteso — vedi avviso).

## Fuori scope

- Sistemazione del token Admin API / scope della Custom App (resta da fare separatamente quando si vorranno usare le funzioni di scrittura).
- Rimozione dei secret stale (`SHOPIFY_ONLINE_ACCESS_TOKEN:user:...`).
