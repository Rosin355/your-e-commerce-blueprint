# F5 — Report test (unitari, SQL, runtime)

Data: 2026-08-17 · Feature flag `PRODUCT_ADMIN_WRITES_ENABLED = false` per tutta la durata dei test.

## A. Test unitari — 12/12 verdi

`node --import tsx --test scripts/tests/product-admin-api.test.ts`

| Test | Esito |
|---|---|
| whitelist azioni e classificazione read/command | ok |
| permessi: anon, `user`, `publisher`, `publisher+editor`, `editor`, `admin`, `tech_admin` | ok |
| campi protetti (sku, inventario, stato Shopify, `editable=false`) + `manual_only` resta editabile | ok |
| tipizzazione text/number/array/boolean + `maxLength` | ok |
| stringa vuota rifiutata (serve `clear_field`) | ok |
| no-op → `NO_CHANGE` | ok |
| `expectedVersion` obbligatorio | ok |
| clear esplicito: conferma richiesta, campo `required` rifiutato | ok |
| review legacy: solo su `legacy_unverified`, confirm e reject | ok |
| serializzazione errori: mapping HTTP e assenza dati sensibili | ok |
| serializzazione sezioni + riepilogo lista | ok |
| page size limitata (max 50) | ok |

## B. Test SQL transazionali

Verifiche statiche eseguite sul database live (sola lettura):

| Check | Esito |
|---|---|
| colonna `version` presente, `NOT NULL DEFAULT 1`, CHECK `> 0` | verde |
| 24.466 current values tutti a `version = 1` | verde |
| storico esteso (origini, review status, versioni, `request_key`) e nuovi `change_type` | verde |
| funzione `SECURITY DEFINER` con `search_path = ''` | verde |
| `EXECUTE` solo a `service_role` | verde |
| grant di scrittura revocati a `authenticated`, letture intatte | verde |
| `product_admin_command_log` con RLS e senza policy | verde |

**Non eseguiti a runtime**: UPDATE atomico + history, rollback su errore, versione errata, doppia idempotency key,
clear di campo required, campo protetto, confirm/reject legacy applicati.
Motivo: il canale SQL disponibile in questo ambiente non possiede né `UPDATE` sulle tabelle F4 né `EXECUTE`
sulla funzione (privilegio riservato a `service_role`). La logica è verificata staticamente e coperta dai test unitari.
**Conseguenza: NO-GO all'abilitazione delle scritture finché questi test non vengono eseguiti da canale privilegiato.**

## C. Runtime con scritture disabilitate

| Caso | Esito |
|---|---|
| token assente | `401 UNAUTHENTICATED` |
| token non valido | `401 UNAUTHENTICATED` |
| azione sconosciuta | `422 VALIDATION_ERROR` |
| login valido + `list_products` | `200`, riepiloghi corretti |
| paginazione cursor (`cursor=OG_111433`) | `200`, pagina successiva coerente |
| ricerca SKU `OG_393883` | `200`, 2 risultati (parent + variation) |
| ricerca testuale "Buddleja" | `200`, 3 risultati |
| filtro `reviewRequired` | `200`, conteggi review > 0 |
| `get_field_definitions` | `200`, 68 definizioni |
| `get_product` | `200`, 11 sezioni (10/14/12/3/2/6/2/4/9/1/5 campi) |
| `get_source_baseline` | `200`, snapshot immutabile |
| `get_product_history` | `200`, storico vuoto |
| `validate_field_update` (title) | `200 VALID` |
| `validate_field_update` (sku) | `FIELD_NOT_EDITABLE` |
| `update_field` | `503 WRITES_DISABLED` |
| `clear_field` | `503 WRITES_DISABLED` |
| `confirm_legacy_value` | `503 WRITES_DISABLED` |
| `expectedVersion` errato | `409 VERSION_CONFLICT` |

## Conferme finali

- UPDATE reali eseguiti a runtime: **0** (`product_current_values` invariata, tutte `version = 1`).
- Righe di storico create: **0** (`product_field_history` = 0).
- Righe in `product_admin_command_log`: **0**.
- Chiamate Shopify: **0** — la funzione non importa alcun modulo Shopify.
- Inventario, categorie, immagini, storefront: invariati.
