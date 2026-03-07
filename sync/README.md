# Sync Pipelines (External to Lovable Frontend)

Questi script vivono fuori dal runtime frontend e sono compatibili con Lovable:
- il frontend continua a leggere Shopify come source of truth
- nessun segreto esposto client-side
- import/sync interamente nel folder `sync/`

## Pipeline principale: Woo CSV -> Shopify Draft CSV + AI enrichment

Script:
- `npm run sync:woo:draft-csv:dry-run`
- `npm run sync:woo:draft-csv`

Input:
- WooCommerce export CSV (`WOO_PRODUCTS_CSV_PATH`)
- Shopify template CSV (`SHOPIFY_TEMPLATE_CSV_PATH`)

Output in `sync/out/`:
- `shopify-products-draft-import.csv`
- `shopify-products-draft-import.warnings.csv`
- `shopify-products-draft-import.errors.csv`
- `shopify-products-draft-import.report.json`

Comportamento:
1. Parsing CSV robusto (UTF-8 BOM, multiline HTML, quote escaping)
2. Mapping Woo (header italiani) -> template Shopify (57 colonne)
3. Enrichment AI per prodotto (mode `mock|http|disabled`)
4. Fallback sicuro al testo sorgente se AI fallisce
5. Output forzato in draft:
   - `Published on online store = FALSE`
   - `Status = Draft`
6. Report warning/error + JSON summary

## Enrichment AI adapter

Modulo: `sync/lib/ai-product-enricher.mjs`

Modalità:
- `AI_ENRICH_MODE=mock` (default, test locale)
- `AI_ENRICH_MODE=http` (POST su endpoint interno)
- `AI_ENRICH_MODE=disabled` (pass-through)

Variabili:
- `AI_ENRICH_ENDPOINT`
- `AI_ENRICH_API_KEY`
- `AI_ENRICH_TIMEOUT_MS`
- `AI_ENRICH_CONCURRENCY`

## Push opzionale dei draft su Shopify Admin API

Script:
- `npm run sync:woo:push-drafts:dry-run`
- `npm run sync:woo:push-drafts`

Funzione:
- legge il CSV draft reviewed
- cerca prodotto esistente per SKU, fallback handle
- crea/aggiorna via Admin GraphQL
- default status `DRAFT` (pubblica solo se `SHOPIFY_PUBLISH_ON_CREATE=true`)

Note:
- script indipendente dal frontend
- throttle configurabile (`SHOPIFY_PUSH_DELAY_MS`)

## Config rapida (`sync/.env`)

Minimo per draft CSV:
- `WOO_PRODUCTS_CSV_PATH=...`
- `SHOPIFY_TEMPLATE_CSV_PATH=...`
- `SHOPIFY_OUTPUT_CSV_PATH=sync/out/shopify-products-draft-import.csv`
- `ALLOW_ZERO_PRICE=false`
- `ALLOW_MISSING_SKU=true`
- `DEFAULT_VENDOR=Online Garden`

Minimo per push Shopify:
- `SHOPIFY_ADMIN_SHOP=...`
- `SHOPIFY_ADMIN_API_VERSION=2025-10`
- `SHOPIFY_ADMIN_ACCESS_TOKEN=...`

## Script legacy (compatibilità)

- `npm run sync:woo-to-shopify`
- `npm run sync:woo-to-shopify:dry-run`

Il file `sync/woocommerce-to-shopify-template.mjs` ora delega alla nuova pipeline draft CSV.
