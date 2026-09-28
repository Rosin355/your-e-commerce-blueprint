# STORAGE-003 — Gate C: rimozione del CSV pubblico

Data: 26 settembre 2026, ~15:00 UTC. Gate A e B superati; Gate C autorizzato.
Nessun deploy, modifica DB/bucket/policy, import, AI o Shopify sync.

## Tracciabilità delle verifiche

Il primo preflight Codex aveva confermato direttamente dimensione e SHA-256
dell'origine e il diniego anonimo sul backup, ma si era correttamente fermato
prima della cancellazione perché la CLI disponibile non aveva privilegi sul
progetto. Le successive verifiche amministrative, la cancellazione e i test
post-intervento riportati sotto sono stati eseguiti tramite la sessione Admin
autorizzata e registrati da Lovable. Nessuna verifica riferita viene presentata
come eseguita direttamente da Codex.

## Controlli pre-cancellazione (sessione Admin)
| Controllo | Esito |
|---|---|
| Backup `csv-pipeline/backups/storage-003/20260926/shopify-ready.csv` | 200, 1.336.246 byte, SHA-256 `3d17f74d…2b7925` = approvato |
| `manifest.json` | 200, SHA-256 e dimensione coincidenti |
| Originale `sync/shopify-ready.csv` | 200, 1.336.246 byte, SHA-256 identico al backup |
| Backup via anonimo | 400 negato |
| Job | nessun job nuovo (0 nelle ultime 24h); ultimo aggiornamento sync job 2026-05-30. Restano i 5 product_sync_jobs e 1 pipeline_job orfani di marzo in pending/processing, già documentati, senza processi né cron che li riprendano |

Controlli ripetuti nello stesso script immediatamente prima della delete,
con blocco automatico se hash o esistenza non corrispondevano.

## Cancellazione
Storage API `DELETE /storage/v1/object/sync` con il solo prefisso esatto
`shopify-ready.csv` (nessun SQL, nessuna ricorsione). Risposta 200, un solo
oggetto rimosso: `shopify-ready.csv`.

## Verifiche post-cancellazione
| Controllo | Esito |
|---|---|
| Originale via endpoint pubblico | 400 (non più accessibile) |
| Originale via endpoint autenticato Admin | 400 (inesistente) |
| Backup privato | 200, SHA-256 e dimensione invariati; anonimo 400 |
| Bucket `sync` | 6 oggetti, tutti in `product-images/`, 0 CSV |
| Sei immagini pubbliche | 200 ciascuna |
| Catalogo e job | products 2.706, current values 24.466, product_sync_jobs 36, pipeline_jobs 1: invariati |

Nessun contenuto, token o URL firmato stampato o salvato; file temporanei eliminati.

## Stato finale
Gate C **superato**. STORAGE-003 **chiuso**: `sync` contiene solo le immagini
prodotto pubbliche; il CSV esiste solo come copia privata Admin-only.
Rollback dati: eventuale ripristino solo in `csv-pipeline` dalla copia verificata,
mai nel bucket pubblico.

## Per il cliente
Il file di catalogo pubblico è stato cancellato. Resta una copia di sicurezza
privata, identica e leggibile solo dall'Admin. Le foto prodotto funzionano come prima.
