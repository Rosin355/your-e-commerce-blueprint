## Il problema

Oggi sotto "Genera e pubblica" hai 3 pulsanti CSV che fanno cose diverse e nessuno produce un file che Shopify accetta davvero:

1. **Scarica CSV arricchimento** → CSV solo con i metafield generati dall'AI, colonne non-Shopify (`Care Guide - Light`, `Key Benefits`...). Da qui il banner giallo: serve per fare merge, non per importare.
2. **Export Shopify-compatible update CSV** → in realtà NON scarica niente: apre un file picker che ti chiede di caricare un export Shopify originale e poi fa il merge con le bozze. Se non carichi un file, "non salva".
3. La edge function `export-complete-products-csv` esiste ma genera lo stesso schema custom non-Shopify, **senza Option1/Option2 per le varianti**, quindi all'import in Shopify le varianti vengono perse o il file viene rifiutato.

Il risultato per il cliente: nessun modo di avere un CSV stabile, completo e re-importabile in Shopify se la pubblicazione diretta API ha problemi.

## Obiettivo

Un **unico pulsante "Scarica CSV Shopify (importabile)"** che produce un CSV conforme allo schema ufficiale di Shopify Product Import, con varianti raggruppate per Handle e con i 16 metafield `custom.*` come colonne native. Quel file deve poter essere caricato così com'è in Shopify Admin → Products → Import.

## Cosa farò

### 1. Nuova edge function `export-shopify-native-csv`
Genera un CSV con le colonne esatte che Shopify accetta in import nativo:

```
Handle, Title, Body (HTML), Vendor, Product Category, Type, Tags, Published,
Option1 Name, Option1 Value, Option2 Name, Option2 Value, Option3 Name, Option3 Value,
Variant SKU, Variant Grams, Variant Inventory Tracker, Variant Inventory Qty,
Variant Inventory Policy, Variant Fulfillment Service, Variant Price,
Variant Compare At Price, Variant Requires Shipping, Variant Taxable, Variant Barcode,
Image Src, Image Position, Image Alt Text, Gift Card,
SEO Title, SEO Description,
Variant Weight Unit, Variant Tax Code, Cost per item, Included / Italy,
Status,
Product.Metafields.custom.nome_botanico,
Product.Metafields.custom.nome_comune,
Product.Metafields.custom.short_intro,
Product.Metafields.custom.promo_text,
Product.Metafields.custom.key_features,
Product.Metafields.custom.special_bullets,
Product.Metafields.custom.care_info,
Product.Metafields.custom.come_prendersene_cura,
Product.Metafields.custom.conosci_meglio_la_tua_pianta,
Product.Metafields.custom.difficolta_di_coltivazione,
Product.Metafields.custom.origini_e_habitat,
Product.Metafields.custom.periodo_di_fioritura,
Product.Metafields.custom.periodo_di_messa_a_dimora,
Product.Metafields.custom.periodo_di_raccolta,
Product.Metafields.custom.periodo_ottimale_di_potatura,
Product.Metafields.custom.titolo_sezione_faq
```

Regole di scrittura (compatibili Shopify):
- Le righe sono ordinate per `Handle`. Per ogni Handle:
  1. **Riga padre/prima variante**: tutti i campi prodotto + 1ª variante + 1ª immagine + metafield `custom.*`.
  2. **Righe varianti successive**: solo `Handle`, colonne Variant* (Option1/2 Value diversi), Image Src lasciato vuoto. Niente Body/SEO/metafield ripetuti (Shopify li ignora se duplicati).
  3. **Righe immagini extra**: solo `Handle`, `Image Src`, `Image Position`, `Image Alt Text`.
- Variant raggruppate per `parent_sku`: tutte le righe con lo stesso `parent_sku` (o stesso `handle`) finiscono sotto lo stesso Handle.
- Option1 Name / Value: se i prodotti hanno una sola variante senza option, scriviamo `Title` / `Default Title` (richiesto da Shopify).
- `Status` = `draft` o `active` (configurabile via query param `?status=draft|active`, default `draft` per sicurezza).
- `Published` = `TRUE` solo se status `active`.
- Tipi metafield `list.*`: serializzati come JSON array (formato richiesto dall'import Shopify), gli altri come testo.
- Sorgente dati: `product_sync_csv_products` (catalogo + AI già salvata in `ai_enrichment_json` e `metafields`).

Filtri:
- `?only_complete=1` (default) → esporta solo righe con immagine, titolo, prezzo > 0 e SEO popolata (come fa già `isComplete`).
- `?only_complete=0` → esporta tutto, utile per ottenere il file completo del catalogo anche con campi parziali.

### 2. UI ProductEnrichmentPanel — semplificazione
- Sostituisco i 3 pulsanti CSV attuali con **2 pulsanti chiari**:
  - **"Scarica CSV Shopify (importabile)"** → chiama la nuova edge function, scarica direttamente. È il caso d'uso "pubblicazione manuale come backup".
  - **"Scarica CSV solo arricchimento (merge)"** → l'attuale `downloadBatchCsvSnippet`, rinominato per dire chiaramente che serve solo se vuoi fare merge manuale con un export Shopify già esistente.
- Il flusso "Export Shopify-compatible update CSV" (upload + merge) lo sposto in una sezione collassata **"Avanzato: merge con export Shopify esistente"** così resta disponibile ma non confonde.
- Riscrivo il banner giallo: ora dice che il CSV Shopify nativo (nuovo pulsante) è auto-sufficiente e include varianti + metafield, e che l'altro CSV serve solo per merge.

### 3. Documentazione inline
- Sotto al nuovo pulsante, riga breve: "File pronto per Shopify Admin → Products → Import. Include varianti, immagini multiple, SEO e i 16 metafield custom. Stato prodotti: bozza (modificabile via parametro)."
- Tooltip che spiega quali prodotti vengono inclusi (solo completi) e come includerli tutti.

### 4. Verifica end-to-end
- Scarico il CSV su un sottoinsieme di 5 prodotti con varianti (es. Bulbo di Dalia, Iris Germanica).
- Apertura del CSV: verifico che righe variante e righe immagine siano nel formato Shopify (no duplicazione body/SEO).
- Import test in Shopify Admin: il file deve essere accettato senza errori di colonna o variant mismatch.

## Dettagli tecnici

File toccati:
- **nuovo**: `supabase/functions/export-shopify-native-csv/index.ts`
- `supabase/functions/_shared/` — eventuale helper per costruire la riga Shopify e gestire `list.*` metafield (riuso `METAFIELD_TYPES` lato client come riferimento, ma per l'export tengo tutto self-contained nella function).
- `src/admin/components/ProductEnrichmentPanel.tsx` — sostituzione UI dei 3 pulsanti CSV con i 2 nuovi + sezione "Avanzato" collassata. Aggiunta funzione `downloadShopifyNativeCsv()` che fa fetch della edge function e triggera il download.
- `src/admin/lib/aiWriterEngine.ts` — piccolo wrapper `fetchShopifyNativeCsv(params)`.

Cosa NON tocco:
- Pubblicazione API (`shopify-admin-proxy`, `metafieldsSet`, retry, debug) — la roadmap precedente resta valida.
- Logica di generazione AI, prompt, stili di scrittura.
- Storefront, checkout, PDP.
- `product_ai_drafts`.

## Verifica

1. Click su **"Scarica CSV Shopify (importabile)"**: parte il download di `shopify-products-native-YYYY-MM-DD.csv`.
2. Apro il CSV in un editor: prima colonna `Handle`, presenti Option1 Name/Value, varianti raggruppate, colonne `Product.Metafields.custom.*` popolate.
3. In Shopify Admin → Products → Import il file viene accettato; un dry run mostra "X prodotti aggiornati / Y nuovi" senza errori di colonna.
4. Apro un prodotto importato in Shopify: vedo le varianti, le immagini multiple e i metafield `custom.*` valorizzati.