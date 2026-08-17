# F5 — Contratto API `product-admin-api`

Endpoint unico: `POST /functions/v1/product-admin-api`
Header obbligatorio: `Authorization: Bearer <JWT Supabase>`
Body: `{ "action": "<azione in whitelist>", ...parametri }`

Nessuna azione accetta nomi tabella, SQL, nomi colonna arbitrari, ruoli o permessi dichiarati dal client.
Ogni azione non presente in whitelist → `VALIDATION_ERROR`.

## Azioni read

| Azione | Parametri | Risposta |
|---|---|---|
| `list_products` | `search`, `sku`, `gtin`, `entityType`, `reviewRequired`, `publishBlocked`, `cursor`, `pageSize` (max 50, default 25) | `{ items[], nextCursor }` — solo riepilogo, mai i 24.466 current values |
| `get_product` | `productId` | `{ product, sections[], history[] }` |
| `get_field_definitions` | – | `{ definitions[] }` (68 definizioni) |
| `get_product_history` | `productId` | `{ history[] }` (max 200, desc) |
| `get_source_baseline` | `productId` | `{ baseline }` — snapshot immutabile in sola lettura |
| `validate_field_update` | `productId`, `fieldKey`, `targetAction`, `value`, `expectedVersion`, `confirm` | `{ valid, code, message, currentVersion }` — nessuna scrittura |

### Riepilogo prodotto (`list_products`)
`productId`, `sku`, `title`, `entityType`, `parentProductId`, `mainImage`, `categoryEffective`,
`reviewPendingCount`, `blockedCount`, `contentStatus`, `shopifyStatus` (tradotto), `updatedAt`, `valuesVersionSum`.

### Dettaglio prodotto (`get_product`)
Sezioni nell'ordine: Informazioni principali · Contenuti · Dati botanici · Categorie · Prezzi ·
Inventario e spedizione · Immagini · SEO · Stato Shopify · Altri dati importati · Sistema.

Per ogni campo: `key`, `label`, `group`, `editorType`, `dataType`, `value`, `baselineValue`, `origin`,
`reviewStatus`, `publishBlocked`, `protectedOnReimport`, `aiAllowed`, `manualOnly`, `publishable`,
`editable`, `locked`, `version`, `helpText`.

## Azioni command

Tutte richiedono `productId`, `fieldKey`, `expectedVersion`, `idempotencyKey` (min 8 caratteri).

| Azione | Semantica |
|---|---|
| `update_field` | nuovo valore manuale → `value_origin=manual`, `review_status=approved`, `publish_blocked=false`, `protected_on_reimport=true`, `version+1`, history obbligatoria. Stringa vuota rifiutata. Valore identico → `NO_CHANGE` senza history e senza incremento versione. |
| `clear_field` | svuotamento esplicito con `confirm: true`; vietato sui campi `required`; valore precedente conservato in history. |
| `confirm_legacy_value` | solo su `legacy_unverified`: stesso valore, `approved`, `publish_blocked=false`, `reviewed_by/at`, `version+1`. |
| `reject_legacy_value` | solo su `legacy_unverified`: valore conservato, `rejected`, `publish_blocked=true`. |

Nessun command genera proposte AI, pubblica, tocca Shopify, inventario, categorie o immagini.

## Errori

`UNAUTHENTICATED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 · `FIELD_NOT_EDITABLE` 422 ·
`VALIDATION_ERROR` 422 · `VERSION_CONFLICT` 409 · `IDEMPOTENCY_CONFLICT` 409 ·
`REVIEW_STATE_INVALID` 409 · `NO_CHANGE` 200 · `WRITES_DISABLED` 503 · `INTERNAL_ERROR` 500.

Le risposte non contengono query, stack trace, token, service role key, payload Shopify o dettagli Postgres.
I log tecnici sono redatti (`actor` troncato, nessun payload).

## Feature flag

`PRODUCT_ADMIN_WRITES_ENABLED` (server-side, mai dal client). Default `false`:
le letture e `validate_field_update` funzionano, ogni command restituisce `WRITES_DISABLED` senza toccare il database.
