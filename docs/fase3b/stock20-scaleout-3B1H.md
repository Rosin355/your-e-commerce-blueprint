# Fase 3B.1H — Scale-out stock-20, batch 002–013 (report cumulativo)

Procedura per ogni batch: gate EXECUTE assente → sostituzione manifest → DRY_RUN → un solo EXECUTE → rimozione gate → verifica DRY_RUN (ALREADY_AT_TARGET).
Target totale: 287 item (002–012 da 25, 013 da 12). Lista SHA-256 `42518c43a4fb9d50c4c131e9ba20342d98973848737052182bbd86718cc62917`.
Esclusi: tutti i 25 item del batch 001 (già fatti), OG_152965-01 e gli altri SKU in denylist.

| Batch | DRY_RUN | EXECUTE (UPDATED/FAILED/RECOVERY) | Verifica a 20 | Stato |
|---|---|---|---|---|
| 002 | 25 SET_AVAILABLE_20, 0 errori | 25 / 0 / 0 | 25/25 | PASS |
| 003 | 25 SET_AVAILABLE_20, 0 errori | 25 / 0 / 0 | 25/25 (dopo ripristino funzione) | PASS |
| 004 | 25 SET_AVAILABLE_20, 0 errori | 25 / 0 / 0 | 25/25 | PASS |
| 005 | 25 SET_AVAILABLE_20, 0 errori, ID manifest = file approvato | 25 / 0 / 0 | 25/25 | PASS |
| 006 | 25 SET_AVAILABLE_20, 0 errori, ID = file approvato | 25 / 0 / 0 | 25/25 | PASS |
| 007 | 25 SET_AVAILABLE_20, 0 errori, ID = file approvato | 25 / 0 / 0 | 25/25 | PASS |
| 008 | 25 SET_AVAILABLE_20, 0 errori, ID = file approvato | 25 / 0 / 0 | 25/25 | PASS |
| 009 | 25 SET_AVAILABLE_20, 0 errori, ID = file approvato | 25 / 0 / 0 | 25/25 | PASS |
| 010 | — | — | — | IN ATTESA: contiene OG_758263-01/-02 (famiglia di OG_758263 in denylist strutturale); serve conferma |
| 011–013 | — | — | — | NON ESEGUITI |

Sessione 005: funzione presente e funzionante (verifica read-only pre-lotto 004: 25 ALREADY_AT_TARGET), nessun redeploy necessario.

## Incidente: funzione non trovata
Dopo l'EXECUTE del batch 003, una richiesta di verifica in sola lettura ha restituito `NOT_FOUND` (funzione non presente in esecuzione); nessuna scrittura coinvolta.
Il codice della funzione è identico alla revisione approvata `916b679` (diff vuoto). È stata ridistribuita la stessa revisione, senza modifiche. La verifica del batch 003 è poi passata.

## Controlli a campione nel negozio (dopo il 004)
6 prodotti dei batch 002–004 risultano acquistabili; prezzi uguali al manifest; immagini invariate.

## Stato
- Gate EXECUTE presente: NO
- Scritture non correlate: 0 (nessuna modifica a prodotti, varianti, prezzi, contenuti, immagini, pubblicazione, database, AI o Smart Sync)
- Totale cumulativo 002–004: 75 UPDATED, 0 FAILED, 0 SKIPPED, 0 RECOVERY, 75/75 verificati a 20.
