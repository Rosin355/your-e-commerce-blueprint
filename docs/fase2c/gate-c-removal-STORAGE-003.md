# STORAGE-003 — Gate C: preflight interrotto, rimozione non eseguita

Data: 26 settembre 2026. Baseline verificata: `origin/main`
`78ec85a894828647a48ccdb4e76389b17b370a84`.

## Esito sintetico

Gate C: **BLOCKED — NOT EXECUTED**.

Codex non ha eliminato alcun oggetto e non ha modificato bucket, policy,
database, immagini, job o prodotti. `sync/shopify-ready.csv` è ancora
pubblicamente accessibile. STORAGE-003 resta **OPEN**.

Il blocco non dipende da una divergenza dell'origine: le verifiche pubbliche
eseguite direttamente da Codex confermano byte e SHA-256 approvati nel Gate A.
Manca invece un canale amministrativo utilizzabile per ripetere, subito prima
della cancellazione, i controlli obbligatori su backup, manifest e job.

## Evidenze già approvate

Le seguenti evidenze sono **riferite dal Gate A/Gate B Lovable**, non
rieseguite in questa attività con privilegi amministrativi:

- backup privato:
  `csv-pipeline/backups/storage-003/20260926/shopify-ready.csv`;
- dimensione backup: 1.336.246 byte;
- SHA-256 backup:
  `3d17f74d475721da2ba43384e0cf96b6964cb07a973b7966a4a26bd02d2b7925`;
- manifest privato presente e coerente;
- inventario precedente di `sync`: un CSV in radice e sei immagini PNG sotto
  `product-images/`;
- invarianti precedenti: 2.706 prodotti, 24.466 current values e 36 job;
- nessun job nuovo o attivo al termine del Gate B; quattro record
  `processing` erano già stati classificati come orfani storici.

## Verifiche eseguite direttamente da Codex

| Controllo | Esito | Gate |
|---|---:|---|
| Lettura pubblica dell'origine | HTTP 200 | PASS |
| Dimensione origine | 1.336.246 byte | PASS |
| SHA-256 origine | identico al Gate A | PASS |
| Accesso pubblico anonimo al percorso del backup privato | HTTP 400 | PASS |
| Accesso Admin al progetto tramite CLI già autenticata | HTTP 403, privilegi insufficienti | BLOCK |
| Accesso al dashboard Supabase del progetto | autenticazione separata richiesta | BLOCK |
| Rilettura Admin del backup e del manifest | non disponibile | NOT RUN |
| Verifica live di assenza job/import in corso | non disponibile | NOT RUN |
| Eliminazione del solo oggetto autorizzato | non eseguita | NOT RUN |

La sessione Admin dell'applicazione è valida, ma l'interfaccia applicativa non
espone una capability di eliminazione Storage né una vista che permetta di
rieseguire tutti i controlli amministrativi richiesti. La CLI Supabase
autenticata non ha accesso al progetto target. Non sono stati estratti o
registrati token, contenuti CSV o URL firmati.

## Inventario Storage dopo l'intervento

Non essendoci stato alcun intervento, l'inventario resta quello verificato al
Gate B:

- `sync/shopify-ready.csv`: ancora presente e pubblico;
- `sync/product-images/**`: sei immagini pubbliche, non modificate;
- backup e manifest sotto `csv-pipeline/backups/storage-003/20260926/`:
  invariati secondo l'ultima evidenza amministrativa Gate B; il percorso
  pubblico anonimo del backup continua a essere negato.

## Verifica del vecchio percorso di upload

La revisione runtime già distribuita al Gate B limita le capability delle due
funzioni di firma/upload a `sync/product-images/**`. Smart Sync usa
`csv-pipeline/product-sync/jobs/<job-id>/input.csv`, registra `source_path` e
abilita i batch solo dopo l'upload. Il codice versionato non contiene quindi
un percorso attivo che debba ricreare `sync/shopify-ready.csv`.

Questa verifica del contratto applicativo non sostituisce il controllo live
dei log e degli eventuali job durante la finestra Gate C.

## Azione necessaria per sbloccare Gate C

Ripetere il Gate C tramite Lovable/Supabase con un'identità che abbia accesso
amministrativo al progetto:

1. rileggere backup e manifest, verificando 1.336.246 byte e SHA-256 approvato;
2. confermare accesso anonimo negato e assenza di job/import in corso;
3. confrontare nuovamente origine e backup;
4. eliminare con API Storage esclusivamente l'oggetto
   `sync/shopify-ready.csv`, senza ricorsione;
5. verificare risposta non accessibile dell'origine e controllare un eventuale
   residuo CDN senza eliminare altri file;
6. verificare sei immagini pubbliche, backup Admin leggibile/anonimo negato e
   invarianti 2.706 / 24.466 / 36;
7. registrare l'evidenza amministrativa nel presente documento e marcare
   `STORAGE-003 CLOSED` solo se tutti i controlli sono positivi.

## Rollback sicuro

Poiché la cancellazione non è stata eseguita, non serve alcun rollback. Dopo
una futura rimozione autorizzata, un ripristino deve avvenire esclusivamente
dal backup privato verificato e solo con una nuova autorizzazione esplicita;
non va riattivato il vecchio writer pubblico.

## Stato cliente

Il passaggio applicativo al deposito CSV privato è completato, ma il vecchio
CSV pubblico non è stato rimosso in questa attività perché mancava l'accesso
amministrativo necessario a verificare il backup e lo stato dei job subito
prima dell'operazione. Nessun dato è stato perso o modificato. STORAGE-003 non
è ancora chiuso.
