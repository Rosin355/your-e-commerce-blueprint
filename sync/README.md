# Product Sync (Old Site -> Shopify)

Script esterno al frontend Lovable per importare/sincronizzare prodotti dal vecchio sito verso Shopify Admin API.

Obiettivo:
- non modificare il frontend Lovable
- usare Shopify come source of truth del nuovo sito
- gestire import iniziale + sync temporaneo one-way

## Come funziona

1. Legge prodotti dal vecchio sito (preferibilmente WooCommerce REST API).
2. Mappa i dati in formato Shopify (product + variants + media + metafield base).
3. Crea/aggiorna prodotti in Shopify Admin API.
4. Scrive log sintetici in console (ok, skip, error).

## Requisiti

- Node.js 18+ (fetch nativo)
- Accesso API al vecchio sito (`wc/v3`) oppure endpoint equivalente
- Token Shopify Admin API con permessi prodotti (`write_products`, `read_products`)

## Setup

1. Copia `sync/.env.example` in `sync/.env`
2. Compila le credenziali

## Esecuzione

Dry-run (consigliato):

```bash
npm run sync:products:dry-run
```

Sync reale:

```bash
npm run sync:products
```

## Modalità CSV (WooCommerce export)

Se non hai API WooCommerce, usa direttamente il file export CSV:

1. Imposta `WOO_CSV_PATH` in `sync/.env` con path assoluto del CSV
2. Esegui dry-run:

```bash
npm run sync:csv:dry-run
```

3. Esegui sync reale:

```bash
npm run sync:csv
```

Note CSV:
- supporta bene prodotti `simple` e `variable` come base product
- le righe `variation` (figlie) sono al momento ignorate nel mapping automatico
- aggiunge sempre i tag tecnici `woo-import` e `legacy-onlinegarden-products`
- per un catalogo da 1400+ prodotti è consigliato un primo test con limite:
  - `SYNC_LIMIT=20 npm run sync:csv:dry-run`

## Woo CSV -> Shopify Template CSV (import-safe)

Questo flusso converte un export WooCommerce (anche in italiano) nel template CSV Shopify
e prova ad arricchire Description/SEO/alt con i contenuti già pubblicati su Shopify.

Config in `sync/.env`:
- `WOO_PRODUCTS_CSV_PATH=/path/wc-product-export.csv`
- `SHOPIFY_TEMPLATE_CSV_PATH=/path/product_template.csv`
- `SHOPIFY_OUTPUT_CSV_PATH=sync/out/shopify-products-import.csv`
- `SHOPIFY_ADMIN_SHOP=...`
- `SHOPIFY_ADMIN_API_VERSION=2025-07`
- `SHOPIFY_ADMIN_ACCESS_TOKEN=...` (necessario per overlay AI da Shopify)
- opzionale `WOO_PRODUCTS_LIMIT=100`

Dry-run:

```bash
npm run sync:woo-to-shopify:dry-run
```

Run completo:

```bash
npm run sync:woo-to-shopify
```

Output:
- `shopify-products-import.csv`
- `shopify-products-import.warnings.csv`
- `shopify-products-import.errors.csv`
- `shopify-products-import.report.json`

## Clienti CSV (Woo -> Shopify import file)

Se hai un CSV clienti (come `onlinegardecustomer.csv`) puoi convertirlo nel formato import Shopify:

1. Imposta in `sync/.env`:
   - `WOO_CUSTOMERS_CSV_PATH=/path/al/file-clienti.csv`
   - `SHOPIFY_CUSTOMERS_CSV_OUTPUT=sync/out/shopify-customers-import.csv`
2. Esegui:

```bash
npm run sync:customers:convert
```

Lo script:
- legge clienti Woo/WordPress
- scarta righe senza email valida
- esclude campi sensibili (password hash, session tokens, ecc.)
- genera un CSV importabile in Shopify

## Clienti CSV -> Shopify API (sync diretto)

Se vuoi evitare import manuale CSV su Shopify, puoi sincronizzare direttamente via Admin API:

1. In `sync/.env` imposta:
   - `WOO_CUSTOMERS_CSV_PATH=/path/onlinegardecustomer.csv`
   - `SHOPIFY_ADMIN_SHOP=your-shop.myshopify.com`
   - `SHOPIFY_ADMIN_API_VERSION=2025-07`
   - `SHOPIFY_ADMIN_ACCESS_TOKEN=...`
   - opzionale: `CUSTOMER_SYNC_LIMIT=20` per test
2. Dry-run:

```bash
npm run sync:customers:shopify:dry-run
```

3. Sync reale:

```bash
npm run sync:customers:shopify
```

Comportamento:
- upsert per email (se esiste aggiorna, altrimenti crea)
- nessun campo sensibile importato
- log finale con conteggi created/updated/failed

## Note progettuali

- Matching prodotti: usa `SKU` quando disponibile; fallback su `handle`.
- Per minimizzare rischi, lo script aggiorna solo i campi mappati.
- La parte immagini/metafield è predisposta ma potrebbe richiedere tuning sulla struttura dati reale di `onlinegarden.it`.

## Compatibilità Lovable

Totale: lo script vive fuori dal runtime del frontend. Il progetto React/Vite continua a leggere da Shopify Storefront API come oggi.
