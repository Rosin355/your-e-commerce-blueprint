# STORAGE-003 — Gate B: merge completato, rilascio coordinato pendente

Data: 26 settembre 2026.

## Stato verificato

- PR #12: **MERGED** il 26 settembre 2026 alle 13:01:20 UTC;
- commit applicativo approvato:
  `d349590a63a221e994cf3db628d65b2bd1534e19`;
- merge commit:
  `2d8b993735ba1d2b84e4e16a833ddee5c6f03f9a`;
- base immediatamente precedente: `6416582212787ff94c2ea07df008d470ff7487ff`;
- i due commit Lovable successivi alla precedente baseline aggiungevano solo
  `gate-a-backup-STORAGE-003.md`: nessuna sovrapposizione runtime;
- check GitGuardian della PR: PASS;
- nessuna migration inclusa nella PR.

Il merge è una verifica Git, non una prova di deploy. Codex non ha pubblicato
frontend o Edge Functions e non ha effettuato operazioni su DB, Storage,
bucket, policy, job, import, AI o Shopify.

## Evidenze Gate A

Verifica riferita da Lovable e accettata come Gate A PASS:

- backup privato sotto il namespace autorizzato
  `csv-pipeline/backups/storage-003/20260926/`;
- copia riletta con sessione Admin: 1.336.246 byte e SHA-256 coincidente con
  l'origine;
- accesso anonimo negato;
- originale pubblico ancora presente e non eliminato;
- invarianti riportati: 2.706 prodotti, 24.466 current values e 36 job.

Codex ha verificato il documento versionato su `main`, ma non ha ripetuto la
lettura live: il Supabase CLI autenticato non vede il progetto configurato
`iekwvvihjwghosqdxrdi` e Computer Use non dispone dei permessi Lovable. Non
sono stati scaricati contenuti, creati URL firmati o esposti token.

## Contratto e incompatibilità temporanea

La revisione deve essere distribuita come unità coordinata:

1. `start-product-sync` crea il job con `source_state=awaiting_upload`;
2. il frontend carica il CSV nel bucket privato, path
   `product-sync/jobs/<job-id>/input.csv`;
3. il frontend invoca `process-product-sync` con `register_source`;
4. solo lo stato `registered` abilita i batch del nuovo job;
5. i job legacy senza `source_state` restano compatibili.

Deploy parziali non ammessi:

- `start-product-sync` nuovo + frontend vecchio: il vecchio client non
  registra il path e i batch ricevono HTTP 409;
- frontend nuovo + `process-product-sync` vecchio: `register_source` non è
  riconosciuta e può essere trattata come batch vuoto;
- il solo `process-product-sync` nuovo è backward-compatible, ma non chiude
  STORAGE-003 e il frontend vecchio continuerebbe a scrivere il CSV pubblico.

## Release candidate

Tutti i file devono provenire dal merge commit `2d8b9937`. Entry point Edge:

| Componente | SHA-256 sorgente candidato |
|---|---|
| `start-product-sync/index.ts` | `38b3ec962f2f03079f8b790ed1a05e4b5554992dfda2e6ce99c989fb9d2e014b` |
| `process-product-sync/index.ts` | `3f245254ca6e9f4b109fc6d64b4138a39a4e5b30a73ceef8fa3dbe250a6a0c19` |
| `csv-upload-url/index.ts` | `d753133de35e05353f742f6d1e500d630b177bad581a0734c88057ee02ebd93a` |
| `storage-signed-url/index.ts` | `609dea88f6d82ee6573d838e7517433888cb7f8c477548522a7199a6da09e25d` |

Le versioni effettivamente distribuite non sono state osservate da Codex e
non devono essere dichiarate finché Lovable non restituisce ID/versione e
timestamp del deploy per ciascuna funzione e revisione frontend pubblicata.

## Gate tecnici eseguiti da Codex

| Controllo | Esito |
|---|---|
| `npm ci` | PASS, 386 pacchetti dal lockfile |
| `deno check` dei quattro entry point | PASS |
| `npm run typecheck` | PASS |
| `npm run test:catalog` | PASS, 200/200 |
| flusso sintetico isolato | PASS: ordine, errore upload, legacy e auth |
| `npm run build` | PASS, 1.908 moduli |
| `git diff --check` | PASS |

Avvisi non bloccanti e preesistenti: due pacchetti `@esbuild-kit` deprecati,
due classi Tailwind ambigue e chunk principale oltre 500 kB.

## Procedura Lovable esatta

### 1. Apertura finestra di manutenzione

- comunicare all'unico Admin di non aprire o usare Smart Sync;
- chiudere eventuali sessioni già aperte sul pannello;
- eseguire una lettura di `product_sync_jobs` e confermare che nessun job sia
  stato aggiornato durante la finestra. Gli stati pending/processing storici
  già censiti sono orfani: un timestamp recente o un contatore che cambia è
  invece un gate di stop;
- registrare conteggi di catalogo e job, senza contenuti CSV.

### 2. Deploy coordinato, con manutenzione ancora attiva

1. selezionare in Lovable il commit `2d8b9937`;
2. distribuire `process-product-sync` con i moduli condivisi dello stesso
   commit;
3. distribuire `start-product-sync` con `job-repo.ts` e i tipi dello stesso
   commit;
4. distribuire `csv-upload-url` e `storage-signed-url`;
5. pubblicare immediatamente il frontend dal medesimo commit;
6. registrare ID/versione, timestamp e hash effettivo di ogni artefatto;
7. non riaprire Smart Sync tra un passaggio e il successivo.

L'ordine riduce il rischio, ma la sicurezza deriva dalla finestra di
manutenzione: nessun deploy intermedio è considerato operativo.

### 3. Smoke test senza import

- login Admin e apertura del pannello Smart Sync, senza premere Avvia;
- verifica che una normale immagine prodotto pubblica continui a caricarsi;
- richiesta Admin a `storage-signed-url` o `csv-upload-url` per un percorso
  CSV nel bucket `sync`: atteso 403, nessuna capability e nessun oggetto;
- rilettura Admin dei soli metadati/hash del backup privato e confronto con il
  manifest Gate A; richiesta anonima allo stesso oggetto: accesso negato;
- conferma che `sync` contenga ancora l'originale e le immagini previste, ma
  nessun nuovo CSV;
- conferma che catalogo, current values e numero/stato dei job siano invariati;
- controllo log delle quattro funzioni: nessun errore nuovo;
- nessun nuovo job di collaudo e nessun CSV cliente o sintetico caricato live.

Solo dopo tutti gli smoke test verdi si chiude la manutenzione e Gate B può
essere marcato PASS.

## Rollback sicuro

In caso di errore mantenere Smart Sync in manutenzione e preferire un
forward-fix dalla revisione `2d8b9937`. Non ripristinare mai upload o firma di
CSV nel bucket pubblico `sync`.

Se un rollback tecnico è inevitabile:

1. mantenere il pannello non utilizzabile;
2. ripristinare frontend, `start-product-sync` e `process-product-sync` come
   set coordinato dalla revisione precedente `6416582`;
3. non riaprire Smart Sync, perché quel frontend contiene il vecchio writer
   pubblico;
4. mantenere, se compatibile, le restrizioni nuove di `csv-upload-url` e
   `storage-signed-url`;
5. applicare un forward-fix e ripetere l'intero Gate B.

Il backup privato e l'originale pubblico non devono essere modificati durante
questo rollback.

## Stato Gate B e Gate C

Gate B: **MERGE PASS; DEPLOY/SMOKE PENDING**.

Gate C: **NON AUTORIZZATO**. Non eliminare l'originale pubblico finché Gate B
non è stato verificato e approvato separatamente.
