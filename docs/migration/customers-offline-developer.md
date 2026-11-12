# Online Garden — preflight clienti offline (12 novembre 2026)

**Stato: preparazione tecnica, nessuna importazione autorizzata.** Questa procedura è separata dalle operazioni Admin, dalla PR #47 e dai gate runtime. Non interagisce con Supabase, Lovable, Shopify, Drive o servizi di marketing. Non richiede credenziali.

## Evidenza e limiti

Fonte: [PR #48 e audit storico](https://github.com/Rosin355/your-e-commerce-blueprint/pull/48), documento `docs/migration/legacy-customers-seo-2026-11-09.md` nella branch della PR. Il lavoro corrente parte dalla `main` remota `b5f3793`; nessun commit delle branch Admin o della PR #48 è necessario per eseguire il preflight.

L'audit documenta 5.453 account, 858 con ordini e una somma di 953 ordini. Il sottoinsieme di 1.108 righe contiene tutti gli 858 account con ordini, 248 clienti senza ordini e due utenze non cliente. Le metriche descrivono account ed un contatore storico, non ordini Shopify, clienti guest o consensi marketing.

**In questa preparazione non sono stati acquisiti né aperti file clienti privati.** Non sono disponibili in questa copia di lavoro un CSV minimizzato verificato e uno snapshot Shopify recente. Il report pubblicato è interamente sintetico: riproduce le dimensioni documentate, ma non prova la qualità dei dati reali né il numero finale da creare.

## Analisi degli script precedenti e decisione

| Script precedente | Rischio rilevato | Comportamento dopo questa PR |
| --- | --- | --- |
| `customers-convert.mjs` | Caricamento `.env`, CSV importabile generato implicitamente, nessuna coorte/ruolo/deduplica, `email` non supportata | Preflight senza rete, solo report aggregato; nessun file clienti |
| `customers-sync-shopify.mjs` | Write predefinita, lookup non verificato `first:1`, aggiornamento profili esistenti, email ed errori API nei log | Stesso preflight offline; client e mutazioni rimossi |

È una **rottura intenzionale della compatibilità operativa**: variabili `WOO_CUSTOMERS_CSV_PATH`, `SHOPIFY_*`, `CUSTOMER_SYNC_LIMIT` e `SHOPIFY_CUSTOMERS_CSV_OUTPUT` non sono lette. `--write`, `--apply`, `--execute`, flag sconosciuti e argomenti duplicati falliscono prima della lettura degli input. Senza input esplicito il comando fallisce, senza scrivere. Nessun flag sblocca le importazioni.

Il parser clienti è dedicato: non modifica `sync/lib/csv-utils.mjs` o le pipeline catalogo/prodotti. Non viene creato un payload PII recuperabile dal report. Il futuro esportatore/importatore dovrà essere implementato e revisionato separatamente.

## Contratto della copia di lavoro privata

Un operatore autorizzato deve preparare una **copia minimizzata**, esterna a qualsiasi checkout Git, dal foglio Drive corretto. Non scaricare o passare allo script la scheda originale con `user_pass`, `session_tokens` o altri segreti. Non usare il TAR troncato. Non includere il file nei log, allegati PR, CI o ticket.

CSV UTF-8, virgola, BOM opzionale, quoting CSV standard; intestazioni case-insensitive, univoche; larghezza costante. File regolari fino a 32 MiB, nessun symlink finale. Il parser rifiuta colonne sconosciute, duplicati, byte invalidi e quoting ambiguo. Non corregge silenziosamente input malformati. Il rifiuto di un file non è uno strumento per ripulire archivi con segreti: la minimizzazione deve avvenire **prima**.

| Campi ammessi | Regola |
| --- | --- |
| `ID` o `customer_id` | ID storico obbligatorio, intero positivo, univoco; mai nel report |
| `role` o `roles` | Obbligatorio; solo `customer` passa; `administrator`/`author` sempre esclusi anche insieme ad altri ruoli |
| `orders` | Obbligatorio, intero non negativo; selezione `> 0` |
| `email`, `user_email`, `billing_email` | Almeno una colonna; trim e lowercase; valori non vuoti multipli devono concordare |
| `first_name`, `last_name`, `billing_first_name`, `billing_last_name` | Opzionali; alias discordanti richiedono revisione, nessuna priorità arbitraria |
| `billing_phone` | Opzionale; E.164 esplicito, rimuove solo spazi/parentesi/punti/trattini; nessun prefisso nazionale dedotto |
| `billing_company`, `billing_address_1`, `billing_address_2`, `billing_city`, `billing_state`, `billing_country`, `billing_postcode` | Opzionali; se un indirizzo è presente servono via, città, paese ISO alpha-2 e CAP; per IT, CAP di 5 cifre e provincia eventuale di 2 lettere |

Non sono ammessi note libere, password, hash, token, sessioni, capacità WP, dati fiscali o consensi. Testo anagrafico massimo 255 caratteri, senza controlli o prefissi formula. La verifica indirizzi è **strutturale**, non certifica recapito, provincia effettiva o corrispondenza CAP/città; email sintatticamente valida non prova titolarità o deliverability. Non normalizzare punti/alias `+` o domini di provider per fondere persone diverse.

Le colonne reali della fonte vanno ancora verificate: non si presume che i nomi nel contratto coincidano con ogni scheda Drive. Ogni adattamento di schema va revisionato con fixture sintetiche.

### Regole di classificazione

1. Riconciliare righe con `orders > 0` e somma ordini con **858 e 953**, prima degli scarti; un mismatch blocca. Sono controlli aritmetici, non una certificazione della provenienza.
2. Escludere amministratori/autori, ruoli diversi e account senza ordini. Ruoli sconosciuti e mancanti richiedono review; nessuna seconda/terza coorte automatica.
3. Quarantena per ID invalido/duplicato, email invalida/discordante/duplicata, telefono invalido/duplicato o anagrafica incompleta/ambigua. Tutte le righe con la stessa email sono scartate dalla proposta: **nessun vincitore arbitrario**. Le collisioni includono anche le righe fuori coorte e lo staff per evitare aggiramenti. Non sommare gli ordini dei duplicati.
4. Se lo snapshot è valido, saltare i profili con email già presente; saltare anche i match per telefono. Non aggiornare nomi, indirizzi, tag o consensi esistenti. Le collisioni da risolvere richiedono review privata, non un merge automatico.
5. Senza snapshot valido, tutti i candidati rimangono `unmatchedAwaitingSnapshot`, mai `proposedNew`.
6. Marketing email, SMS e WhatsApp sempre disattivato per i nuovi profili. Nessun acquisto, ruolo, presenza email o selezione in Sheet2 vale come opt-in. Un eventuale consenso con prova esplicita, aggiornata e verificabile per canale richiederà un processo separato; questo preflight non offre override.

Gli `outcomes` sono categorie disgiunte e sommano alle righe sorgente; i `reasons` possono sovrapporsi sulla stessa riga. `proposedNew` significa solo proposta offline dopo controlli, mai creazione effettuata. Gli esclusi privilegiati/non acquirenti non sono errori da recuperare automaticamente. Eventuali esclusioni tra gli 858 devono essere spiegate nella review finale.

## Snapshot Shopify: solo file locale

Un responsabile deve ottenere con procedura separata e autorizzata l'export **completo** del negozio destinatario, senza filtri, e minimizzarlo nelle sole colonne `Email,Phone`. Conservare le righe senza email se hanno telefono; righe senza entrambi, telefoni/email invalidi o email duplicate rendono lo snapshot non verificato. Non usare lo snapshot prodotti di marzo come elenco clienti.

Accompagnarlo con un JSON privato con **esattamente** questi campi:

```json
{
  "schemaVersion": 1,
  "complete": true,
  "exportedAt": "2026-11-12T11:00:00Z",
  "rowCount": 0,
  "sha256": "<sha256 dei byte esatti del CSV minimizzato>",
  "shopDomain": "<negozio-destinatario>.myshopify.com"
}
```

I valori sopra sono uno schema, non uno snapshot utilizzabile. `rowCount` deve uguagliare le righe effettive; `sha256` deve essere un digest esadecimale valido. Sono accettate solo estrazioni di massimo 24 ore, con tolleranza futura di 5 minuti; `--shop` deve concordare esattamente con il dominio attestato. Il report non espone dominio, checksum, identificativi o percorsi. `complete: true`, conteggio e checksum sono attestazioni dell'operatore e controlli di integrità, **non provano da soli la completezza live**. L'operatore deve verificarla alla fonte; lo script non contatta Shopify. Uno snapshot vuoto è ammissibile solo se il negozio è stato verificato realmente privo di clienti.

## Esecuzione e test

Requisito: Node 22; nessuna installazione di pacchetti o credenziale. I percorsi sono esempi e devono puntare a file privati minimizzati.

```sh
# Fixture incorporata; non legge file clienti privati
npm run sync:customers:preflight -- --synthetic
npm run test:customers

# Dry-run reale senza snapshot: exit 2 e nessuna proposta nuova
node sync/customers-convert.mjs --input /archivio-privato/clienti-minimi.csv

# Confronto locale completo; produce solo report aggregato
node sync/customers-convert.mjs --dry-run \
  --input /archivio-privato/clienti-minimi.csv \
  --snapshot /archivio-privato/shopify-minimo.csv \
  --snapshot-metadata /archivio-privato/snapshot.json \
  --shop negozio-destinatario.myshopify.com \
  --report /archivio-privato/report-aggregato-nuovo.json
```

`--report` è facoltativo, scrive esclusivamente aggregati con permessi `0600` e apertura esclusiva: niente sovrascritture, neppure di input o symlink. Nessun file viene scritto per impostazione predefinita. Gli errori espongono solo codici fissi, mai percorsi, dati, messaggi del parser o stack. Exit **0** = controlli offline completi, **2** = report bloccato, **1** = input/argomenti/IO invalidi. `productionAuthorized` resta sempre `false`, anche con exit 0.

La CI dedicata esegue solo fixture e test con rete Node bloccata e nessun secret. Il report [sintetico versionato](customers-synthetic-dry-run.json) è riproducibile. Il guard di rete Node è una protezione aggiuntiva dei test, non un sandbox OS. Nessun test richiede servizi live.

## Verifica di questa preparazione

Eseguita localmente con Node `v22.22.3`, il 12/11/2026:

- `npm run test:customers`: **22 test PASS**, zero fallimenti; tutti sintetici, con rete Node bloccata anche nei sottoprocessi CLI.
- Casi coperti: forme 5.453/1.108/858 righe; coorte e contatori; ruoli; alias email; duplicati email/telefono/ID; dati e CSV invalidi; sicurezza/consensi; snapshot assente, obsoleto, alterato o di altro negozio; errori sanitizzati; flag write negati; output esclusivo `0600`.
- `node --check` sui sei moduli JavaScript nuovi/modificati: PASS.
- Rigenerazione del report sintetico e confronto byte per byte con `customers-synthetic-dry-run.json`: PASS.
- `git diff --check`: PASS. Nessuna modifica a frontend, backend, schema DB, file di segreti o dipendenze. Non è stato eseguito un collaudo runtime/live o un dry-run con dati reali.

## Procedura futura di importazione — non eseguibile da questa PR

1. Il proprietario approva finalità, campo minimo, destinatario, responsabilità, tempi di conservazione e campione tramite canale privato. Definire l'esperienza di accesso coerente con gli account Shopify attivi; nessuna password WP o invito inviato automaticamente.
2. Acquisire copia minimizzata e snapshot completo recente. Verificare origine, foglio, selezione, conteggi e corrispondenza della coorte; risolvere ogni blocco/quarantena senza modificare il contatore per far tornare i totali. Ripetere il preflight e approvare i conteggi finali, inclusi gli esclusi.
3. In **una nuova modifica revisionata**, implementare il generatore del CSV minimo o il writer create-only. Nessun ripristino del vecchio upsert. Se si usa CSV, verificare il modello Shopify vigente: `First Name`, `Last Name`, `Email`, `Phone`, campi `Default Address ...`, tre colonne marketing `no`. Niente note libere, ordini storici, totale speso, credenziali, hash o metadata WP.
4. Preparare un backup privato pre-import e un journal identificativo del lotto, con ID Shopify di ogni profilo effettivamente creato, origine approvata e risultato. Il solo tag lotto non basta come registro di rollback. Non pubblicare journal/CSV su GitHub.
5. Subito prima di ogni lotto ricontrollare live email e telefono e registrare i match: lo snapshot può diventare obsoleto durante il tempo di review. Una collisione deve causare skip/stop, mai update. Con CSV lasciare **deselezionata** la sovrascrittura dei profili esistenti. L'import CSV non offre una transazione o un controllo applicativo equivalente a un writer: valutarne i limiti prima dell'autorizzazione.
6. Il proprietario autorizza esplicitamente negozio, numero finale, campi, lotto pilota ridotto, finestra e rollback. L'approvazione/merge di questa PR non autorizza alcuna importazione. Preparare prima codice e file revisionabili; nessun consenso generico sostituisce questa decisione.
7. Dopo l'autorizzazione, eseguire il pilota; verificare profili creati, marketing disattivato, assenza di modifiche a preesistenti e di comunicazioni indesiderate. Fermarsi su ogni discrepanza. Proseguire per lotti solo dopo accettazione del pilota; riconciliare tentativi, creati, skip, errori e ID nel journal. Rerun con nuovo snapshot, senza ricreare profili già importati.

## Rollback e stop

**Oggi:** nessun dato remoto scritto, quindi nessun rollback dati necessario; eliminare solo file locali sintetici/di review secondo la conservazione concordata. Chiudere la PR o ritirare la branch se non approvata. Non ripristinare gli script legacy come scorciatoia: reintrodurrebbe le write implicite.

**In una futura migrazione:** fermare subito i lotti, conservare journal ed evidenze private, verificare il delta per ID. Eventuale eliminazione solo dei profili effettivamente creati da quel lotto, dopo verifica che non abbiano nuovi ordini, attività, associazioni o modifiche successive e previa autorizzazione puntuale. Non eliminare i preesistenti; se il profilo ha nuova attività, preferire correzione manuale concordata. Non fare restore globale o cancellazioni basate soltanto sul tag.

Un import non è atomicamente reversibile: email/inviti eventualmente inviati non si possono ritirare e nuove attività possono impedire la rimozione. Per questo i messaggi automatici devono essere valutati prima del pilota. Qualsiasi modifica accidentale a un preesistente richiede confronto col backup e ripristino selettivo, considerando le modifiche concorrenti; mai overwrite massivo come rollback. Testare il piano di recovery su dati sintetici prima di autorizzare il writer reale.

## Verifiche ancora necessarie

- CSV reale minimizzato, schema effettivo, provenienza e qualità ancora non verificati.
- Duplicati reali, recapiti, caratteri e consensi non determinabili dal report sintetico.
- Snapshot Shopify completo e recente assente; numero finale dei nuovi profili sconosciuto.
- Validazione strutturale non equivale a recapito corretto o verifica dell'identità.
- Futuro writer/esportatore, journal, campione privato e prova di rollback da realizzare e approvare.
- Nessun cambiamento a PR #47, Supabase/Lovable, Admin, configurazioni runtime o deploy.

Riferimento ufficiale verificato il 12/11/2026: [Shopify — importazione ed esportazione clienti](https://help.shopify.com/it/manual/customers/import-export-customers), incluse collisioni email/telefono, colonne del CSV, consenso per canale e limiti su ordini/password.
