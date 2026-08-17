# F5 — Report di chiusura (API Admin sicura)

Data: 2026-08-17 · Nessuna mutation Shopify · Nessuna AI · Nessuna pubblicazione · Nessun import.

## Checkpoint repository
- `git status` pulito: nessuna modifica pendente, la fondazione F3/F4 era già registrata nel repository gestito dalla piattaforma.
- Nessun CSV, backup, dump, secret o file temporaneo presente nell'albero: i backup restano fuori dal repo, in `/mnt/documents/backups/`.
- Nessun push eseguito (il versionamento è gestito internamente dalla piattaforma: i comandi git di scrittura non sono disponibili all'agente).
- Typecheck e test disponibili eseguiti prima e dopo le modifiche: verdi.

## File creati
```
supabase/functions/product-admin-api/
├── index.ts          router, whitelist azioni, gestione errori
├── auth.ts           JWT verificato + ruoli server-side
├── permissions.ts    autorizzazione per azione (modulo puro)
├── validation.ts     campi protetti, tipi, clear esplicito, no-op (modulo puro)
├── queries.ts        letture: lista, dettaglio, definitions, baseline, history
├── commands.ts       feature flag, hash payload, chiamata alla funzione atomica
├── serializers.ts    sezioni UI, riepiloghi, mapping errori (modulo puro)
└── types.ts          tipi condivisi
scripts/tests/product-admin-api.test.ts
docs/fase5/{api-contract,security-model,runtime-test-report,rollback,fase5-report}.md
```
`shopify-admin-proxy` non è stato esteso né deployato.

## Migration additiva F5.1
- `product_current_values.version` (NOT NULL, default 1, CHECK > 0) — optimistic concurrency.
- `product_field_history`: `previous_origin`, `new_origin`, `previous_review_status`, `new_review_status`,
  `previous_version`, `new_version`, `request_key`; nuovi `change_type`:
  `manual_update`, `explicit_clear`, `confirm_legacy`, `reject_legacy`.
- `product_admin_command_log` (idempotenza): RLS senza policy, grant al solo `service_role`.
- `admin_update_product_field(...)`: SECURITY DEFINER, `search_path = ''`, EXECUTE solo `service_role`.
- REVOKE delle scritture dirette ad `authenticated` su prodotti, current values, storico, snapshot, batch, publication jobs.
  `product_publication_jobs` **non** è stato riusato per l'idempotenza.

## Esiti
- Test unitari: 12/12 verdi.
- Test SQL: verifiche statiche verdi; i test transazionali di UPDATE **non eseguibili** dal canale SQL disponibile.
- Runtime read: verde su tutti i casi (auth, lista, paginazione, ricerca, dettaglio, baseline, definitions, history, validate).
- Command runtime: tutti bloccati da `WRITES_DISABLED`.
- 0 UPDATE, 0 righe di storico, 0 righe nel command log, 0 chiamate Shopify.
- Inventario, categorie, immagini e storefront invariati.

## Warning e rischi
1. Le scritture restano disabilitate: l'abilitazione richiede prima i test transazionali su canale privilegiato.
2. `get_product` restituisce ancora il JSON grezzo per i campi `json/array`: la futura UI dovrà usare editor strutturati.
3. La ricerca `ilike` andrà sostituita da un indice full-text se il catalogo cresce oltre le decine di migliaia di righe.

## Stato finale
```
F5 API READ = GO
F5 API WRITE IMPLEMENTED = YES
F5 API WRITE ENABLED = NO
SHOPIFY = UNCHANGED
```
