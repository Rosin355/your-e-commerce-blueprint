## Diagnosi del problema "Cornus Florida Sunset"

Ho aperto il CSV: per quel prodotto le colonne `Product Metafield: custom.*` **sono popolate correttamente** (es. `nome_comune`, `short_intro`, `key_features` come JSON array). Quindi il file generato è OK.

Il problema è **l'importer CSV nativo di Shopify**: scarta silenziosamente le colonne metafield se anche una sola di queste condizioni non torna:

1. La definizione metafield non esiste in Shopify con esattamente `namespace.key` = `custom.nome_botanico` (probabilmente le tue definizioni hanno key diverse, perché nello screenshot vedo label tipo "Nome botanico" ma le key reali non sono visibili)
2. Il tipo tra parentesi non combacia esattamente (`single_line_text_field` vs `rich_text_field` ecc.)
3. I `multi_line_text_field` con newline grezzi a volte vengono troncati
4. I `list.*` richiedono JSON array (qui è OK)

Nessun errore in import, semplicemente i metafield non vengono scritti.

## Soluzione scelta: Bypass CSV per i metafield

Già esiste nel codice la funzione `publishReviewedDraft` → edge function `shopify-admin-proxy` action `publish_product_copy` che usa la mutation **`metafieldsSet`** dell'Admin API. Questa via:

- È **affidabile al 100%**: Shopify crea le definizioni se mancano o le riusa se esistono, indipendentemente da label/key in italiano
- Non dipende da come il cliente ha configurato le definizioni in Shopify
- Restituisce un report dettagliato (`MetafieldsReport`) di cosa è stato scritto/saltato

Quello che manca è chiarire al cliente quale bottone usare e togliere ambiguità nell'UI.

## Cosa cambia

### 1. CSV "Shopify-importabile" diventa CSV "solo prodotti"
File: `supabase/functions/export-shopify-native-csv/index.ts`

- Rimuovo tutte le colonne `Product Metafield: custom.*` dall'header e dalle righe
- Aggiungo un commento in cima al file (riga di intestazione `#`) che spiega: "Questo CSV importa solo titolo, descrizione, varianti, prezzo, immagini. I metafield vanno pubblicati con il bottone 'Pubblica su Shopify' nel pannello."
- Rinomino l'output da `shopify-products-native-*.csv` a `shopify-prodotti-base-*.csv` per ridurre la confusione

### 2. UI del pannello enrichment
File: `src/admin/components/ProductEnrichmentPanel.tsx`

- Aggiungo un **banner informativo blu** sopra il blocco azioni che spiega le due strade in 2 righe:
  - **"Pubblica su Shopify"** → testi + SEO + **metafield** (canale affidabile)
  - **"Scarica CSV base"** → solo prodotti senza metafield (per import massivo iniziale)
- Cambio la label del bottone CSV da "Scarica CSV Shopify importabile" a "Scarica CSV prodotti (senza metafield)"
- Aggiungo un tooltip al bottone CSV: "I metafield vanno pubblicati separatamente via API per garantirne l'arrivo in Shopify"

### 3. Nuovo bottone "Pubblica solo metafield"
File: `src/admin/hooks/useProductEnrichment.ts` + `ProductEnrichmentPanel.tsx`

Per i prodotti già esistenti su Shopify (importati prima via CSV) che non hanno i metafield, aggiungo un'azione:

- Nuova funzione `publishMetafieldsOnly(products)` nel hook
- Riusa `publishReviewedDraft` ma server-side modifico la action per supportare un flag `metafields_only: true` che salta `productUpdate` (body HTML / SEO) e fa SOLO `metafieldsSet`
- Bottone "Pubblica solo metafield (xN)" accanto a "Pubblica su Shopify"
- Stesso tracking persistente via `enrichment-run` con `mode: "publish_metafields_only"`

File: `supabase/functions/shopify-admin-proxy/index.ts`
- Estendo `publish_product_copy` per riconoscere `metafields_only` nel body e saltare la `productUpdate` mutation

## File toccati

- `supabase/functions/export-shopify-native-csv/index.ts` — rimuovo colonne metafield
- `supabase/functions/shopify-admin-proxy/index.ts` — flag `metafields_only` in `publish_product_copy`
- `src/admin/lib/aiWriterEngine.ts` — parametro opzionale `metafieldsOnly` in `publishReviewedDraft`
- `src/admin/hooks/useProductEnrichment.ts` — funzione `publishMetafieldsOnly`
- `src/admin/components/ProductEnrichmentPanel.tsx` — banner informativo, label bottoni, nuovo bottone

## Cosa NON tocco

- Logica AI di generazione (drafts, metafields, SEO)
- Storefront, PDP, checkout
- Schema DB (`product_enrichment_runs` resta com'è)
- Auth e admin whitelist

## Messaggio finale al cliente

Dopo l'implementazione il flusso consigliato sarà:

1. Importa una sola volta il CSV "prodotti base" in Shopify (crea titoli, varianti, prezzi, immagini)
2. Genera i metafield in Lovable col bottone "Genera tutto con AI"
3. Premi **"Pubblica su Shopify"** (o "Pubblica solo metafield" se i prodotti esistono già) → i 16 metafield arrivano via API, garantito
