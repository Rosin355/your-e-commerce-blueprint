# FASE 2B.4 — Deploy edge-first di product-admin-api

Data: 2026-09-24. Rollback candidato autorizzato dall'utente: `main@7858f6c` (opzione 1).
Non eseguiti: merge PR #4, pubblicazione frontend, migration, modifiche RPC, AI, import, Shopify sync, scritture sui prodotti.

## Preflight
- Anteprima: `build OK`. I due errori TypeScript erano preesistenti in `shopify-admin-proxy` e sono stati corretti con sole annotazioni di tipo.
- Blocco emergenziale: il secret `PRODUCT_ADMIN_WRITES_ENABLED` è presente e modificabile. Modalità attiva: `writesEnabled=true`, `writeMode=canary`, `canaryManualOnly=true`.
- Impronta pre-deploy (autenticata, read-only): campi senza `appliesTo`, `capabilities`, `sourceState`, `sourceSnapshotId`, `required`, `validationRules`. Simple/variable/variation mostrano 68 campi.
- Rollback candidato salvato: gli 8 file del progetto erano identici a `7858f6c` (`git diff` vuoto). Copia in sandbox più hash qui sotto.
- PR #4: aperta, non mergiata, HEAD `24b2b118`. I 9 file scaricati hanno blob SHA identici al tree GitHub del commit (9/9).

## Versioni
| file | rollback 7858f6c | distribuito 24b2b118 |
|---|---|---|
| auth.ts | 9e849435…9e38 | invariato |
| commands.ts | afc79add…5753 | invariato |
| permissions.ts | 9babf4b3…3361 | invariato |
| index.ts | 300a491c…1034 | 6dcb76d5…c421 |
| queries.ts | 00bd82ec…0906 | ec75ee63…babe |
| serializers.ts | 40db1a84…7b11 | d78d4bd3…a162 |
| types.ts | 753d73c4…e119 | 34c7a4df…60fd |
| validation.ts | 49e7993f…726f | afb40bfc…ddbc |
| capabilities.ts | assente | fe982af6…5171 |

Deploy: solo `product-admin-api`. Il primo tentativo è partito prima della copia dei file ed è risultato ancora la versione vecchia, rilevata dallo smoke test. Il secondo deploy ha distribuito la versione nuova, confermata dalla presenza dei nuovi campi.

## Smoke test post-deploy (read-only, autenticato)
- Catalogo: 2.706 prodotti (404 simple, 1.114 variable, 1.188 variation). Statistiche identiche al pre-deploy.
- OG_393883: 23 valori; i cinque manuali (ibridatore, colore_fiore, colore_foglia, curiosita, nome_comune) sono presenti con `locked=true`, `capabilities.canUpdate=false` e `updateBlockReason=current_value_locked`.
- Capability server-side: `title` risulta canUpdate; `price` è bloccato con `canary_field_not_allowed`; AI bloccata (`phase_2c`).
- applies_to: simple/variable mostrano 67 campi `both`. Variation mostra 68 campi (`both` + `variant`). Il campo solo-variante non compare più su simple/variable.
- sourceState: tutti `original_absent`, `sourceSnapshotId=null`, nessun errore. `baselineValue` è null sia prima che dopo, perché lo snapshot `normalized` non contiene chiavi di campo: non è una regressione.
- Compatibilità vecchio frontend: le chiavi di risposta sono un superset di quelle precedenti. L'Admin v2 attuale in anteprima carica lista e scheda OG_393883 senza errori (in console solo warning React preesistenti).
- Accesso non autorizzato: `product-admin-api` risponde 401 senza token e con token falso. `create-product-ai` e `get-customer-orders` rispondono 401. `shopify-admin-proxy` rifiuta con 500: comportamento preesistente già segnalato in 1B.3.

## Integrità dati (pre = post)
products 2.706 · current_values 24.466 · history 0 · command_log 0 · ai_suggestions 0 · publication_jobs 0 · source_snapshot_id valorizzati 0 · impronta valori `5472ad95bea493d4ff944bfcd8ff579f` identica.

Esito: nessuna regressione, rollback non eseguito.

## Rollback disponibile (limiti)
1. Emergenza: `PRODUCT_ADMIN_WRITES_ENABLED=false`.
2. Ripristino: rimettere gli 8 file di `7858f6c` con gli hash indicati sopra, eliminare `capabilities.ts` e ridistribuire solo `product-admin-api`.
3. Verifica: le risposte devono tornare prive di `appliesTo` e `sourceSnapshotId`, e simple/variable devono mostrare di nuovo 68 campi.

Limite: `7858f6c` è un candidato ricostruito dal repository, non una copia verificata del runtime precedente. Il suo comportamento coincide però con l'impronta pre-deploy registrata.

## Stato
- Il progetto contiene ora i file della funzione alla versione PR #4. Il frontend resta quello di `main` e non è stato pubblicato.
- La PR #4 resta aperta e non mergiata.
- Prossimo gate: approvazione separata per merge e pubblicazione del nuovo frontend.
