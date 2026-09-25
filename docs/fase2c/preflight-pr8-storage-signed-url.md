# Preflight PR #8 — storage-signed-url (2026-09-25)

Solo letture. Nessun deploy, merge, migration, import, AI o Shopify sync. Nessun URL firmato reale generato.

## PR e codice
- PR #8 aperta, HEAD 3282b9e53d6f6643d058dfb653ab4807a1ff7dce, base dd3bcf7 = HEAD Lovable (merge PR #5). 3 file: index.ts (+59/-16), test (+250), audit doc (+242).
- index.ts attuale: blob 556669f9, SHA256 d37f13a0…0c4. PR: blob 2617af8e (uguale a GitHub), SHA256 4933c1bd…39d.
- Test PR eseguiti offline (bun): 62/62 verdi.

## Storage live
| Bucket | Pubblico | Oggetti (cartella) |
|---|---|---|
| csv-pipeline | no | backups 6, jobs 2 |
| sync | **sì** | product-images 6, shopify-ready.csv 1 (radice) |

Policy su storage.objects: csv-pipeline SELECT/INSERT/DELETE solo Admin (`has_role`); sync SELECT/INSERT/UPDATE/DELETE Admin; sync ALL service_role; SELECT pubblica su `sync/product-images/*`. Nessun altro bucket. Corrispondono alla tabella dell'audit PR.

Rischio separato (STORAGE-003, confermato): `sync` è pubblico, quindi `shopify-ready.csv` è scaricabile da chiunque conosca il percorso, indipendentemente da questa funzione. Fuori scopo PR #8.

## Chiamanti
- Nessuna invocazione nel frontend, negli script o in altre Edge Function. Unico uso noto: amministrativo/manuale (download backup nelle fasi 2C.0).
- Ruoli: 1 utente, Admin. Nessun non Admin legittimo esistente; l'unico accesso non Admin previsto dalle policy è `sync/product-images/*` (già pubblico), preservato dalla PR.

## Gateway, JWT, CORS
- Nessuna sezione in config.toml; prova live: senza alcun header la richiesta arriva alla funzione (400 applicativo) ⇒ verify_jwt effettivo **false**. La PR fa la verifica in-function (`getUser(token)`), quindi è compatibile.
- Firma con client anon/publishable + JWT utente: la firma passa dalle policy SELECT, csv-pipeline e sync firmabili solo da Admin. Compatibile con le policy live.
- CORS: OPTIONS 200 invariato (header da `_shared/cors.ts`, non modificato).

## Versione distribuita e comportamento (impronta)
Bundle non scaricabile; riferimento = file in main dd3bcf7 (blob 556669f9). Risposte registrate con percorsi inesistenti:
| Richiesta | Risposta |
|---|---|
| nessun header | 400 |
| chiave anon, bucket inesistente | 400 `Object not found` |
| chiave anon, csv-pipeline percorso inesistente | 400 `Object not found` |
| OPTIONS | 200 |

**Vulnerabilità attiva confermata**: con la sola chiave pubblica la richiesta raggiunge la firma con service_role (lo Storage risponde, nessun 401). Chi conosce un percorso dei backup privati potrebbe ottenerne un link. Non tentato su oggetti reali.

## Rollback (senza riattivare la vulnerabilità)
- Il ripristino di blob 556669f9 riaprirebbe la falla: **vietato automaticamente**, solo con approvazione esplicita.
- Rollback sicuro in emergenza: forward-fix, oppure disattivare la funzione (delete Edge Function storage-signed-url), nessun chiamante applicativo dipende da essa. Il download dei backup resta possibile con accesso amministrativo al DB/storage.

## Smoke test post-deploy (preparati, non eseguiti)
Solo percorsi fittizi o la risposta senza campo `signedUrl` stampato (loggare solo `ok` e presenza URL).
1. OPTIONS → 200.
2. Nessun header / chiave anon come Bearer / token falso → 401, nessuna chiamata Storage.
3. GET → 405.
4. Admin, bucket `backups-x` o `public` → 403.
5. Admin, path `../x`, `/a`, `a//b`, `%2e` → 400.
6. Admin, `csv-pipeline/preflight/does-not-exist.txt` → 404 generico.
7. Admin, oggetto reale → 200 con `ok:true`, URL presente ma non stampato né salvato; `expiresIn` 3600, `expiresIn:99999` → 3600, `Cache-Control: private, no-store`.
8. Non Admin: nessun utente disponibile (crearlo = scrittura); coperto dai test PR (policy negata su csv-pipeline/sync, ammesso product-images). Con approvazione: utente di test temporaneo.
9. Log: nessun JWT/percorso/URL.
10. Invarianti: 2.706 prodotti, 24.466 valori, 36 job, oggetti storage invariati.

## Esito
**PR #8 pronta per il deploy** della sola storage-signed-url: codice identico a GitHub, 62/62 test, compatibile con policy, gateway e CORS, nessun chiamante da adeguare. Restano fuori scopo: bucket sync pubblico (STORAGE-003) e csv-upload-url / woo-enrichment-pipeline / process-woo-job senza controllo Admin (STORAGE-004).

Dati invariati: products 2.706, current values 24.466.
