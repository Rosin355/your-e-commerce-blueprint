# Fase 2C — Audit e correzione proposta storage-signed-url

Data: 25 settembre 2026. Baseline: `dd3bcf7101aa4207837b7012e08659af79394ddd`.
Branch indipendente: `codex/storage-signed-url-security`.
Stato: proposta verificata offline, non distribuita; approvazione e preflight
Lovable necessari prima del rilascio. Nessuna dipendenza dalla PR documentale #7.

## Sintesi e confini delle evidenze

Confermato nel codice un bypass dell'autorizzazione agli oggetti Storage:
la funzione usa `service_role` per firmare bucket e percorso scelti dal
richiedente, senza autenticazione applicativa o controllo delle policy.
La correzione elimina il client privilegiato, verifica il JWT tramite Auth
e delega la decisione sull'oggetto alle policy Storage usando lo stesso JWT.
Non impone Admin a tutti gli usi: preserva i non Admin ammessi dalle policy.

Codex ha esaminato solo file versionati, documentazione ufficiale e fixture
sintetiche. Nessuna richiesta alla funzione live, nessun download/listing di
Storage, nessuna generazione di URL reali, nessun accesso ai backup privati.
Policy effettive, gateway e chiamanti esterni non sono certificati da questi
test: i gate live sotto restano aperti. Non dichiarare risolta la vulnerabilità
in produzione prima del rilascio autorizzato e del relativo collaudo.

## Finding prioritari

### STORAGE-001 — Alta: firma arbitraria con credenziali privilegiate

Evidenza baseline: `supabase/functions/storage-signed-url/index.ts:10–24`:
`req.json()` fornisce `bucket`, `path`, `expiresIn`; `createClient` riceve
`SUPABASE_SERVICE_ROLE_KEY`; `.from(bucket).createSignedUrl(path, ttl)` viene
eseguito senza `auth.getUser` o controllo oggetto. Il commento READ-ONLY non
elimina l'impatto: emettere un URL delega una capacità di lettura privata.

Impatto: un chiamante che superi il gateway può ottenere lettura temporanea
di oggetti noti o indovinabili anche fuori dai propri permessi, in qualunque
bucket accessibile al service role. Non serve assumere l'accesso anonimo al
gateway per dimostrare il difetto applicativo: anche un JWT non Admin non
viene autorizzato sull'oggetto. Nessuno sfruttamento live è stato tentato.

`supabase/config.toml:1–12` non contiene una sezione per questa funzione:
non è lecito dedurne lo stato effettivo di `verify_jwt` nel deploy. Un gateway
che verifica il JWT autentica ma non sostituisce l'autorizzazione all'oggetto.

Correzione in questa PR, `storage-signed-url/index.ts:24–66`: JWT verificato
con `await getUser(token)`, chiave anon/publishable e Authorization utente,
mai service role. Firma sullo stesso client per applicare le SELECT policy
al bucket/percorso esatto; nessun fallback privilegiato se il servizio nega.

### STORAGE-002 — Media: durata e informazioni restituite non minimizzate

Evidenza baseline: stesso file, righe 21 e 26–29: TTL fino a 86.400 secondi,
conversione permissiva `Number(expiresIn)` ed errori SDK/eccezioni restituiti
testualmente. Nessun `Cache-Control` specifico sulla risposta contenente URL.
Non è stata osservata una fuga effettiva nei log: la funzione non usa console.

La proposta conserva il default di un'ora e `download: true`, limita il TTL
a 60–3.600 secondi, richiede un intero positivo e sanitizza gli errori.
Risposte JSON con `Cache-Control: private, no-store`; nessun log di JWT,
percorso, URL o errori upstream. File assente e rifiuto Storage hanno la
stessa risposta 404 per non distinguere l'esistenza di oggetti inaccessibili.

### STORAGE-003 — Alta potenziale, separata: bucket sync pubblico

Evidenza: `supabase/migrations/20260311162908_4722081e-de83-44cb-802c-93af49fc2514.sql:1`
imposta `sync.public = true`; righe 3–6 aggiungono una policy per
`product-images/`. `src/admin/lib/productSyncEngine.ts:306–316` usa lo stesso
bucket per il CSV di sincronizzazione. Nei bucket pubblici il download
pubblico non è limitato dalla SELECT policy a quella sola sottocartella.

Impatto condizionale: se il flag pubblico e contenuti non destinati alla
pubblicazione sono presenti live, i relativi oggetti sono pubblicamente
raggiungibili conoscendone il percorso, indipendentemente da questa funzione.
Non sono stati controllati contenuti o URL. Verificare metadati del bucket e
classificazione dei dati tramite canale autorizzato. Eventuale separazione
asset pubblici/documenti privati richiede un task e approvazione dedicati;
non cambiare il flag indiscriminatamente, perché potrebbe rompere le immagini.

### STORAGE-004 — Alta, separata: altri percorsi privilegiati della pipeline

Nel codice versionato non sono visibili controlli applicativi JWT/ruolo in:

- `csv-upload-url/index.ts:13–45`: firma upload con service role su due bucket;
- `woo-enrichment-pipeline/index.ts:13–36`: scarica un percorso ricevuto nel
  body in modalità dry-run; il resto dell'handler crea un job;
- `process-woo-job/index.ts:473–525`: legge/processa un job e il suo input
  tramite service role; righe 802–819 firmano output e conservano gli URL
  nel report del job.

Non sono dipendenze di `storage-signed-url`, ma canali adiacenti sugli stessi
bucket; restano invariati. Il gateway e i deploy effettivi non sono verificati.
La sola correzione STORAGE-001 non mette in sicurezza l'intera pipeline.
Richiesto audit separato di autorizzazioni e ownership prima di dichiarare
chiuso il perimetro Storage. Nessuna di queste funzioni è stata invocata.

## Ruoli, bucket, percorsi e accesso tra utenti

Le policy versionate sono la fonte del modello, non il nome della UI:

| Canale/risorsa | Regola osservata | Comportamento proposto |
|---|---|---|
| Richiesta senza JWT utente valido | nessun bisogno anonimo diretto documentato | 401 prima di Storage |
| `csv-pipeline`, qualsiasi percorso canonico | SELECT per authenticated con `has_role(auth.uid(), 'admin')` | decide Storage, con JWT utente |
| `sync`, percorsi generici | SELECT Admin | stesso controllo RLS, nessun service fallback |
| `sync/product-images/…` | policy SELECT pubblica | utente verificato non Admin ammesso dalla policy |
| Altri bucket | nessun uso di questo endpoint dimostrato | 403 per allowlist, anche per Admin |
| Percorso ambiguo/traversal | nessun contratto legittimo dimostrato | 400 prima della firma |
| Oggetto assente o non leggibile | nessun permesso derivabile dal solo nome | 404 generico dal risultato Storage |

Riferimenti policy: migration `20260414135729_2f5400b1-c7c9-4593-a849-de4e05086f9b.sql:15–20,45–50`;
eccezione immagini nella migration `20260311162908…:3–6`.
`has_role` legge `user_roles`, non metadata editabili: definizione in
`20260407205602_47109853-2cf1-4373-aa08-14e4a0cc2618.sql:45`; permessi di
esecuzione authenticated/service in `20260817090940_d407b2c0-2fff-41f3-af18-dbb52956dcd9.sql:4–6`.
Non sono modificati helper, ruoli o policy.

Non esiste nelle policy osservate una separazione per proprietario tra Admin:
l'accesso trasversale degli Admin è intenzionale nel modello corrente.
Un normale utente non ottiene accesso ai CSV propri o altrui solo perché il
percorso contiene il suo ID. Non vengono inventate nuove convenzioni di
ownership. Eventuali policy di ownership live aggiuntive saranno applicate
da Storage ma richiedono preflight. Un utente Supabase Auth anonimo, se
abilitato, ha un JWT authenticated: valgono le sue effettive policy, non un
ruolo Admin implicito. Le sole chiavi anon/service senza JWT utente non sono
credenziali valide per questo endpoint nella proposta.

## Chiamanti legittimi e compatibilità

La ricerca di `storage-signed-url` nei file tracciati non trova invocazioni
dirette in frontend, script o altre Edge Functions. Il report di rilascio
PR #5 segnala l'endpoint come finding; l'uso amministrativo esterno per export
deve essere confermato da Lovable prima del deploy, senza emettere URL privati.

`WooPipelinePanel.tsx:82,113,166,324–327` usa altre tre funzioni pipeline e
gli URL già salvati nei report: non chiama questo endpoint. La firma output
di `process-woo-job` e le immagini pubbliche di `generate-product-images`
sono percorsi separati e non modificati. Nessuna modifica frontend richiesta.

Contratto mantenuto in caso di successo: `{ ok, signedUrl, expiresIn }`,
richiesta POST `{ bucket, path, expiresIn? }`, download come allegato.
Modifiche intenzionali da validare sui chiamanti esterni:

- solo POST; OPTIONS CORS resta disponibile senza autenticazione;
- JWT utente obbligatorio e verificato; non basta una chiave di progetto;
- bucket ammessi `csv-pipeline` e `sync`, già usati dai flussi versionati;
- path da 1 a 1.024 caratteri, non trasformato: rifiutati slash iniziale/finale,
  segmenti vuoti, `.`/`..`, backslash, percent-encoding, query/fragment,
  controlli e whitespace iniziale/finale; non normalizzare verso un altro file;
- `expiresIn` numerico intero positivo: stringhe/null non vengono più convertiti;
  massimo effettivo un'ora invece di un giorno;
- errori 401/403/400/404/500 generici, nessun dettaglio backend restituito.

Se esistono usi autorizzati esterni non coperti, fermare il rilascio e definire
il relativo contratto: non introdurre un fallback service role.

## Log, URL e durata

L'endpoint non aggiunge log applicativi. Non sono stati letti log live; non
sono noti retention/redaction del gateway o eventuali proxy che registrino
body/risposte. Prima del rilascio verificare che Authorization, query token e
signedUrl non vengano acquisiti da log/analytics. Per auditing usare solo
eventi aggregati e identificatori non sensibili con policy di retention.

Il limite di un'ora riguarda questa funzione, non tutte le API Storage.
Un utente con SELECT diretto può richiedere link tramite SDK; gli URL già
emessi non vengono revocati da questa patch o dal logout. La documentazione
Supabase specifica che la rotazione delle chiavi Auth non invalida gli URL
Storage già firmati. Gestire eventuale incidente separatamente con Lovable,
senza cancellazioni o rotazioni automatiche.

## Test e limiti

`scripts/tests/storage-signed-url-security.test.ts` carica il vero handler e
il modulo CORS tramite VM, con Auth/Storage mockati, rete non disponibile e
valori esclusivamente sintetici. Il mock verifica chiave pubblica, JWT
coerente tra Auth e Storage e assenza assoluta di uso della service key.
La matrice policy è simulata: non è un test del servizio Storage o del DB live.

Casi: token assente/invalido, utente non autorizzato, Admin autorizzato e
Admin negato da policy, non Admin ammesso alle immagini, metadata falsificati,
utenti concorrenti senza client condiviso, bucket/path vietati, file assente,
TTL e payload invalidi, Promise Auth pendenti/rifiutate, autorizzazione Storage
pendente/rifiutata, configurazione mancante, nessun log o errore sensibile.

Risultati Codex del 25 settembre 2026:

| Gate | Esito |
|---|---|
| `npm ci` in worktree isolato | PASS, 386 pacchetti; lockfile invariato |
| Suite specifica Storage | PASS, 62/62 |
| `deno check supabase/functions/storage-signed-url/index.ts` | PASS |
| `npm run typecheck` | PASS |
| `npm run test:catalog` | PASS, 172/172 (110 esistenti + 62 Storage) |
| `npm run build` | PASS, 1.907 moduli |
| `git diff --check` | PASS |

Avvisi preesistenti non bloccanti: dipendenze esbuild-kit deprecate, classi
Tailwind arbitrarie ambigue e bundle >500 kB. Il primo check Deno della
baseline ha richiesto il download delle dipendenze pubbliche fuori dal
sandbox per un limite DNS; il check successivo è passato senza modifiche
di versione. Nessuna connessione al progetto Supabase in questi test.

File della PR: questa analisi, il solo handler `storage-signed-url/index.ts`
e i test offline. Nessuna modifica a CORS condiviso, helper auth, funzioni
PR #6, `product-admin-api`, frontend, SQL, journal o dipendenze npm.

## Checklist Lovable e rollback

- [ ] Confrontare head PR e main prima di approvazione; nessun merge automatico.
- [ ] Confermare i chiamanti esterni e il contratto ristretto senza produrre
  URL di backup o leggere oggetti privati.
- [ ] Verificare via canale autorizzato i soli metadati dei due bucket,
  policy `storage.objects`, ACL, definizione/permessi `has_role` e gateway.
  Fermarsi su policy permissive/drift, o su bucket privati non censiti.
- [ ] Verificare chiave anon/publishable configurata e inoltro del JWT utente.
  Non cambiare `verify_jwt` per aggirare problemi di compatibilità.
- [ ] Collaudare in staging con fixture non riservate la matrice Admin/non
  Admin/anon, accesso tra utenti, policy negate e durata; non riportare token
  o URL reali nei documenti/PR. Nessun collaudo su backup privati.
- [ ] Rivedere logging/redaction e gestire separatamente URL già emessi.
- [ ] Rilascio della sola funzione esclusivamente dopo approvazione separata;
  niente migration, cambio bucket o deploy automatico da questa PR.
- [ ] Aprire decisione separata per STORAGE-003 e STORAGE-004, senza avviare job.

Rollback: non ripristinare automaticamente la versione con service role e
firma arbitraria. In caso di incompatibilità sospendere il rilascio; dopo
un eventuale deploy autorizzato preferire una correzione che mantenga JWT e
RLS, oppure sospendere l'endpoint con approvazione operativa. Nessun rollback
DB è necessario perché non sono previsti cambiamenti DB.

## Fonti e metodo

Skill Git, security-best-practices, Supabase e native-data-fetching usate per
separazione dei branch, autorizzazione server-side, errori chiusi e verifica
asincrona. Nessuna guida specifica Deno nella skill sicurezza: comportamento
Auth/Storage verificato nelle fonti ufficiali Supabase. Changelog consultato
il 25 settembre; nessun cambiamento applicabile richiede una nuova migration.

- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Bucket pubblici e privati](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Verifica utente getUser](https://supabase.com/docs/reference/javascript/auth-getuser)
- [Firma URL](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurl)
- [Durata e revoca degli URL](https://supabase.com/docs/guides/storage/serving/downloads)
