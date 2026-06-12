
# Piano implementazione

## 1. Filtro prodotti: Draft + Active (no archived)

**`src/admin/components/ProductEnrichmentPanel.tsx`**
- Default `statusFilter`: da `"active"` a `"active,draft"`.
- Nel `Select` aggiungo l'opzione "Active + Draft" come prima scelta (default), mantengo "Solo active", "Solo draft", "Tutti".
- Mostro accanto al titolo di ogni prodotto in lista un piccolo badge `ACTIVE` (verde) o `DRAFT` (grigio), per chiarezza visiva.

**`supabase/functions/shopify-admin-proxy/index.ts` — funzione `listProducts`**
- Quando `status` contiene una virgola (es. `"active,draft"`), faccio 2 fetch sequenziali a Shopify REST (`status=active` poi `status=draft`) e unisco i risultati, perché l'endpoint REST non accetta lista. Mantengo il limite totale richiesto.
- Quando `status="any"`: passo `status=any` direttamente (Shopify lo supporta).
- Il fallback Storefront viene saltato per qualunque status diverso da `active` (già così).

## 2. Pubblicazione idempotente (no doppioni, sovrascrive)

Il flusso attuale **già** usa `productUpdate` (Admin GraphQL) con l'ID prodotto esistente: tecnicamente non crea duplicati. Il rischio di "doppione" può però apparire se:
- il prodotto è stato caricato via CSV e poi rigenerato in Lovable senza riallineare l'ID Shopify nel DB locale.

**`src/admin/hooks/useProductEnrichment.ts` + `src/admin/lib/aiWriterEngine.ts`**
- Prima di `publishReviewedDraft`/`publishMetafieldsOnly`, se l'oggetto `ShopifyAdminProduct` ha `sku` ma `id` mancante o sospetto (es. id locale non Shopify), risolvo l'ID reale via lookup per `handle` (preferito, unico in Shopify) usando una nuova action `resolve_product_by_handle` nel proxy.
- Logica:
  1. Se `id` numerico Shopify presente → usa quello (UPDATE).
  2. Altrimenti lookup per `handle` → trovato? UPDATE su quell'ID.
  3. Non trovato? Mostra errore esplicito "prodotto non esistente su Shopify, importa prima il CSV base" (NON creiamo automaticamente per evitare di rompere il flusso CSV).

**`supabase/functions/shopify-admin-proxy/index.ts`**
- Nuova action `resolve_product_by_handle`: GET `products.json?handle=<handle>&fields=id,handle,status` (REST), restituisce `{ id, status }` o `null`.
- Per `metafieldsSet` il comportamento è già upsert (sovrascrive il valore esistente per la stessa coppia namespace+key) — nessuna modifica necessaria, ma aggiungo un log esplicito per ogni metafield: `[written|overwritten|skipped]`.

## 3. Estensione AI ai 3 metafield mancanti

I 3 nuovi campi: `faq_prodotto`, `attributi_prodotto`, `long_description`.

**`src/admin/types/productEnrichment.ts`**
- Aggiungo a `ShopifyMetafieldKey`, `ALL_METAFIELD_KEYS`, `METAFIELD_LABELS`, `CSV_COLUMN_TO_KEY`, `AI_GENERATED_KEYS`.
- I tre nuovi entrano tutti in `AI_GENERATED_KEYS` (non sono dati fattuali come date).

**`supabase/functions/shopify-admin-proxy/index.ts` — mappa `METAFIELD_TYPES`**
- `faq_prodotto` → tipo `list.single_line_text_field` (formato classico Shopify per FAQ accordion). Verifico col bottone "Verifica su Shopify" che il tipo coincida; se nel tuo store è `rich_text_field`, useremo il tipo live (la logica `effectiveType` già esiste).
- `attributi_prodotto` → `list.single_line_text_field` (es. `["Resistente al freddo", "Sempreverde", "Fioritura primaverile"]`).
- `long_description` → `multi_line_text_field` (HTML/markdown semplice).

**Prompt AI — `supabase/functions/shopify-admin-proxy/index.ts` (o file dove vive il prompt copy)**
- Estendo lo schema JSON richiesto al modello aggiungendo i 3 campi:
  - `faq_prodotto`: array di 4-6 oggetti `{ "domanda": "...", "risposta": "..." }` serializzati come JSON string nell'array
  - `attributi_prodotto`: array di 5-8 stringhe brevi (max 40 char ciascuna), attributi distintivi
  - `long_description`: testo lungo 400-700 parole, struttura: introduzione → caratteristiche → cura → consigli d'uso
- Aggiungo regole di qualità: min length per ogni campo per evitare output vuoti (problema osservato su `origini_e_habitat`).

**`src/admin/components/ProductEnrichmentPanel.tsx` — sezione review draft**
- Mostro i 3 nuovi campi nell'editor di anteprima così il cliente può rivederli/modificarli prima della pubblicazione.

## 4. Aggiornamento UI informativa

**`ProductEnrichmentPanel.tsx`** — banner blu già esistente:
- Aggiorno il conteggio: "16 metafield" → "19 metafield".
- Tolgo dal disclaimer la nota sui "campi ignorati" perché ora sono tutti gestiti.

---

## File toccati

- `src/admin/types/productEnrichment.ts` — 3 nuovi metafield key
- `src/admin/components/ProductEnrichmentPanel.tsx` — filtro default, badge status, editor per nuovi campi, conteggi
- `src/admin/hooks/useProductEnrichment.ts` — resolve-by-handle prima di publish
- `src/admin/lib/aiWriterEngine.ts` — opzione resolve, gestione nuovi campi
- `supabase/functions/shopify-admin-proxy/index.ts` — `listProducts` multi-status, action `resolve_product_by_handle`, mappa `METAFIELD_TYPES` estesa, prompt AI esteso, log overwrite
- `src/components/storefront/pdpMetafields.ts` (opzionale) — esporre `long_description` nella PDP se non già visibile

## Cosa NON tocco

- Schema DB
- Auth / admin whitelist
- Storefront salvo per leggere i nuovi metafield se utile
- Logica CSV export (rimane senza metafield, come deciso prima)

## Risultato atteso

- Selezionando "Active + Draft" vedi e pubblichi metafield su entrambi gli stati.
- Ripubblicare lo stesso prodotto **sovrascrive** i valori (nessun doppione perché Shopify usa namespace+key come chiave univoca, e il prodotto è risolto per handle).
- Dopo la generazione AI, tutti e 19 i metafield gestiti hanno un valore (anche `faq_prodotto`, `attributi_prodotto`, `long_description`). Quelli "manuali" (date fioritura/raccolta/potatura, nome botanico) restano vuoti per design, il cliente li compila a mano in Shopify.
