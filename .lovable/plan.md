
# Fix tab Arricchimento — leggere dal Catalogo DB

## Causa del problema

Nella pagina `/admin/import`:

- Tab **Catalogo DB** → importa nella tabella Supabase `product_sync_csv_products` (i tuoi 460 prodotti vivono qui).
- Tab **Arricchimento** → il bottone "Carica" chiama `listShopifyProducts()` che interroga **Shopify Admin API** via edge function `shopify-admin-proxy`.

Le due tab leggono da fonti diverse. I 460 prodotti del CSV non sono ancora su Shopify, quindi la lista resta vuota. In più, eventuali errori del proxy vengono inghiottiti da un `toast.error` generico, dando l'impressione che "non succeda nulla".

## Cosa fare

1. **Aggiungere una sorgente "Catalogo DB" al pannello Arricchimento**
   - In `ProductEnrichmentPanel.tsx` (ModeAPanel) aggiungere un selettore "Sorgente" con due opzioni: `Catalogo DB (locale)` e `Shopify Admin`.
   - Default: **Catalogo DB**, dato che il flusso naturale è importa → arricchisci → esporta/sincronizza.

2. **Caricare i prodotti dalla DB**
   - Riusare la query già usata altrove: `supabase.from('product_sync_csv_products').select(...)` filtrando `parent_sku is null` (solo prodotti padre) e con paginazione `range()` per superare il limite 1000 di PostgREST.
   - Mappare ogni record DB nella shape `ShopifyAdminProduct` minima richiesta dal pannello: `id` (hash da sku), `handle`, `title`, `tags`, `body_html` da `description`, `image.src` dal primo `image_urls`, `variants` con `sku/price`. Così il resto della UI (analyzeAll, generateAll, draft preview) continua a funzionare senza modifiche.

3. **Adattare le azioni di pubblicazione**
   - "Genera tutti" continua a funzionare (è solo Lovable AI, non tocca Shopify).
   - "Pubblica su Shopify" deve restare disabilitato in modalità DB (i prodotti DB non hanno `productId` Shopify). Mostrare invece il bottone "Scarica CSV arricchito" che già esiste in `productEnrichmentEngine.downloadBatchCsvSnippet`, così l'utente può importarlo in Shopify.

4. **Migliorare la diagnostica del bottone "Carica"**
   - Sostituire il `catch` mute con `toast.error(e.message)` e log in console per evitare future regressioni "non succede nulla".
   - Mostrare un messaggio esplicito quando la sorgente non restituisce prodotti (es. "Nessun prodotto trovato nel Catalogo DB. Vai prima nella tab Catalogo DB.").

## File coinvolti

- `src/admin/components/ProductEnrichmentPanel.tsx` — selettore sorgente, branch caricamento, gating bottone Pubblica.
- `src/admin/hooks/useProductEnrichment.ts` — nessuna modifica strutturale; eventualmente estendere `publishAll` con una guard `if (!productId) skip`.
- Nuovo helper `src/admin/lib/dbCatalogSource.ts` — `loadDbCatalogProducts()` che restituisce `ShopifyAdminProduct[]` mappati dalla tabella locale.

## Note tecniche

- La paginazione DB va fatta in batch di 1000 con `range(from, to)` finché `data.length < 1000`.
- Il mapping `id` può essere un numero deterministico da `sku` (es. hash) solo come chiave React; non viene usato per chiamate Shopify in modalità DB.
- Nessuna modifica alle edge function richiesta.
