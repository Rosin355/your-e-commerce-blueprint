# STORAGE-003 — Implementazione Smart Sync

Data: 26 settembre 2026. Base iniziale: `origin/main@fa87c83a`.
Commit applicativo: `d349590a63a221e994cf3db628d65b2bd1534e19`.
Merge commit: `2d8b993735ba1d2b84e4e16a833ddee5c6f03f9a`.
Stato: PR #12 mergiata; deploy e smoke live non eseguiti da Codex. Gate B
resta aperto e richiede il rilascio coordinato descritto in
`gate-b-release-STORAGE-003.md`.

## Esito

Smart Sync usa ora un file privato e univoco per job. L'ordine è vincolato sia
dal client sia dal server:

1. creazione record `product_sync_jobs`;
2. upload con `upsert:false` in
   `csv-pipeline/product-sync/jobs/<job-id>/input.csv`;
3. registrazione dell'esatto `source_path` in `report_json`;
4. invio dei batch ricavati dal `File` locale.

`product_sync_jobs.report_json` è il campo esistente scelto dal preflight;
non è stata aggiunta alcuna colonna o migration. Lo stato
`awaiting_upload` blocca i batch se l'upload o la registrazione falliscono.
I job legacy senza `source_state` continuano a funzionare senza backfill.

## Modifiche di sicurezza

- nessun upload CSV nel bucket pubblico `sync` e nessun fallback;
- `csv-upload-url` e `storage-signed-url` accettano `sync` solo per il
  prefisso valido `product-images/**`;
- il comportamento Admin e le policy esistenti di `csv-pipeline` restano
  invariati;
- le immagini prodotto pubbliche restano nello stesso bucket e percorso;
- il downloader CSV legacy è stato eliminato dopo la verifica di assenza di
  import/chiamanti nel repository;
- nessun URL firmato, contenuto CSV, token o dato privato è nel codice o nei
  documenti.

## Test e criteri

I test sintetici e offline coprono:

- sequenza job → upload → registrazione;
- path privato job-scoped e rifiuto di identificativi/percorso non validi;
- upload fallito: nessuna registrazione e nessun avanzamento all'import;
- gate server-side prima dei batch e registrazione idempotente;
- compatibilità dei job legacy;
- anon, non Admin, Admin, Promise auth pendente e rifiutata;
- firma/upload `sync/product-images/**` consentiti e percorsi CSV o traversali
  negati prima di Storage;
- assenza del vecchio CSV pubblico dai riferimenti runtime e rimozione del
  downloader legacy.

La tabella dei gate finali viene compilata prima del commit:

| Gate | Esito |
|---|---|
| `npm ci` | PASS, installazione da lockfile |
| test STORAGE-003 e autorizzazione | PASS |
| `deno check` funzioni interessate | PASS, 4 entry point |
| `npm run typecheck` | PASS |
| `npm run test:catalog` | PASS, 200/200 |
| `npm run build` | PASS, 1.908 moduli |
| `git diff --check` | PASS |

## Rollout: gate obbligatori

### Gate A — backup verificato

- congelare gli upload durante la finestra;
- copiare il solo CSV pubblico corrente in area privata autorizzata;
- verificare dimensione e SHA256 senza esporre contenuto, URL o metadata;
- non eliminare ancora l'originale.

Gate A è stato riportato da Lovable come completato e verificato nel documento
`gate-a-backup-STORAGE-003.md`. Codex non dispone dell'accesso al progetto
Supabase necessario per ripetere direttamente la lettura live.

### Gate B — deploy coordinato e smoke test

- distribuire insieme frontend e le Edge Functions modificate;
- verificare Admin: selezione locale, creazione job, upload privato,
  registrazione e dry-run sintetico esplicitamente autorizzato;
- verificare anon/non Admin negati sui CSV e immagini pubbliche invariate;
- verificare assenza di nuovi CSV in `sync` e osservabilità senza dati
  sensibili.

Il merge è completato, ma non equivale a un deploy. Codex non ha eseguito
deploy o smoke live perché il progetto non è accessibile al Supabase CLI
autenticato e Computer Use non dispone dei permessi necessari per Lovable.

### Gate C — eliminazione esplicita

Solo dopo A e B verdi, approvazione separata e verifica dei chiamanti:
eliminare esclusivamente il vecchio CSV dalla radice di `sync`. Verificare che
nel bucket pubblico restino soltanto gli asset previsti. STORAGE-003 rimane
aperto fino a questo gate.

## Rollback sicuro

- prima del gate C: sospendere Smart Sync e applicare un forward-fix; il
  backup privato e l'originale non ancora rimosso restano disponibili;
- dopo il gate C: ripristinare, se necessario, soltanto in `csv-pipeline`
  dalla copia privata verificata;
- non ripristinare mai upload, lettura o firma di CSV nel bucket pubblico
  `sync`;
- non modificare URL o policy delle immagini prodotto per compensare un
  problema del CSV.

## Stato per developer, designer e cliente

Per il developer, il contratto applicativo è esplicito e backward-compatible
per i job già esistenti. Per il designer, la selezione e il progresso restano
nel pannello; il messaggio chiarisce che il file è prima validato localmente.
Per il cliente, nessuna foto cambia URL e nessun dato live è stato toccato.
La riduzione del rischio diventa effettiva al deploy coordinato, ma la chiusura
richiede anche l'eliminazione controllata del vecchio CSV pubblico.
