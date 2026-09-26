# STORAGE-003 — Gate A: backup privato di sync/shopify-ready.csv

Data: 26 settembre 2026, 12:39 UTC. PR #12 aperta, non mergiata.
Autorizzato solo il backup. Nessuna eliminazione, merge, deploy, modifica di
DB, bucket o policy, nessun job, import, AI o Shopify.

## Verifica dell'origine
- `sync/shopify-ready.csv` esiste (1 oggetto), 1.336.246 byte, ultima modifica
  2026-05-30 11:50 UTC: **invariato rispetto al preflight**.
- SHA-256 origine: `3d17f74d475721da2ba43384e0cf96b6964cb07a973b7966a4a26bd02d2b7925`.
- `csv-pipeline`: `public = false`; policy SELECT/INSERT/DELETE solo
  `authenticated` + ruolo admin (preflight, invariate).
- Nessun backup preesistente sotto `backups/storage-003/`.

## Copia
- Metodo: sessione Admin (JWT dell'unico utente Admin), download autenticato
  e upload con `x-upsert: false` (nessuna sovrascrittura possibile).
- Percorso privato: `csv-pipeline/backups/storage-003/20260926/`
  - `shopify-ready.csv` — 1.336.246 byte
  - `manifest.json` — 271 byte (origine, byte, SHA-256, data, metodo)
- Distinto dal namespace job `product-sync/jobs/`.
- Copie temporanee locali eliminate; nessun contenuto, token o URL firmato
  stampato o salvato.

## Verifiche
| Controllo | Esito |
|---|---|
| Rilettura Admin della copia | 200, 1.336.246 byte, SHA-256 identico |
| Anonimo (chiave pubblica) su endpoint autenticato | 400 negato |
| Anonimo su endpoint pubblico | 400 negato |
| Nuovo upload sullo stesso percorso | 400 respinto (no overwrite) |

## Invarianti
Bucket `sync` 7 oggetti (CSV originale + 6 png) invariato; products 2.706;
current values 24.466; product_sync_jobs 36. Nessuna modifica a bucket o policy.

## Stato
Gate A **superato**. Il CSV pubblico è ancora presente: l'esposizione resta
attiva fino al Gate C. Prossimi: merge/deploy PR #12 + smoke test (Gate B),
poi eliminazione dell'originale (Gate C), ognuno con approvazione separata.

## Per il cliente
Abbiamo fatto una copia di sicurezza privata del file di catalogo, identica
all'originale e leggibile solo dall'Admin. Il file pubblico non è ancora
stato cancellato.
