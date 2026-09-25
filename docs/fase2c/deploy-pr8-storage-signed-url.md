# Deploy PR #8 — storage-signed-url (2026-09-25)

## Gate
- PR #8 aperta, non mergiata, HEAD 3282b9e53d6f6643d058dfb653ab4807a1ff7dce (invariato dal preflight).
- index.ts copiato dal commit: blob 2617af8e = GitHub. Unica dipendenza locale `_shared/cors.ts`, non toccata dalla PR. Nessun conflitto con main.
- Policy storage.objects (md5 6e60b7b9…), bucket (csv-pipeline privato, sync pubblico), 15 oggetti: identici prima e dopo.

## Deploy
Distribuita solo storage-signed-url. Nessuna modifica a database, policy, bucket, frontend o altre funzioni.

## Smoke test (nessun URL, token o percorso privato stampato/salvato)
| Caso | Esito |
|---|---|
| Nessun header / sola chiave pubblica / JWT falso | 401, prima di Storage |
| OPTIONS | 200, CORS `*` |
| GET | 405 |
| Admin, bucket non ammesso | 403 |
| Admin, path `../x`, `/a`, `a//b`, `%2e%2e/x`, `a/` | 400 |
| Admin, fixture inesistente | 404 generico |
| Admin, immagine già pubblica `sync/product-images` | 200, URL presente (non mostrato), expiresIn 3600 |
| Admin, expiresIn 99999 | limitato a 3600 |
| Admin, expiresIn non valido | 400 |
Tutte le risposte JSON: `Cache-Control: private, no-store`.
- getUser e firma col JWT utente (niente service role): verificati nel codice e nei test PR (62/62). Utente non Admin: non disponibile dal vivo, coperto dai test PR.
- Log: solo boot/shutdown, nessun token, percorso o URL.

## Invarianti
products 2.706, current values 24.466, product_sync_jobs 36, oggetti storage 15.

## Rollback
Nessun ritorno automatico alla versione vulnerabile (blob 556669f9). In emergenza: correzione in avanti o eliminazione della funzione (nessun chiamante applicativo).

## Stato
PR #8 distribuita, ancora aperta: il merge allineerà main con file identico. Restano aperti STORAGE-003 (bucket sync pubblico) e STORAGE-004 (csv-upload-url, woo-enrichment-pipeline, process-woo-job).
