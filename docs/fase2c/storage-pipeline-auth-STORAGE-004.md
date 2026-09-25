# Fase 2C — STORAGE-004: autorizzazione pipeline CSV legacy

Data: 25 settembre 2026. Baseline: `9a66d2c0ba131c3101eb12851d0c4cff60a431bf`.
Branch: `codex/storage-pipeline-auth`.
Stato: correzione minima verificata offline, non distribuita e non mergiata.

## Esito sintetico

Il finding STORAGE-004 è confermato nelle tre Edge Function:
`csv-upload-url`, `woo-enrichment-pipeline` e `process-woo-job`. Tutte
costruivano un client `service_role` e potevano firmare upload, leggere o
scrivere Storage, creare/aggiornare job e, nel worker, avviare elaborazione e
AI prima di una verifica applicativa del ruolo Admin.

La patch aggiunge `await assertAdminRequest(req)` dopo il solo preflight CORS
e prima della lettura del body, della costruzione del client privilegiato e
di qualsiasi accesso a DB, Storage o gateway AI. In caso di errore Auth o
ruolo non Admin risponde `401` con messaggio generico e senza esporre dettagli.
Non cambia la logica della pipeline, non avvia job e non modifica dati.

## Evidenze e modello di minaccia

### Superfici privilegiate

| Funzione | Operazioni protette dalla patch | Credenziale interna invariata |
|---|---|---|
| `csv-upload-url` | firma URL di upload con `upsert` per `csv-pipeline` o `sync` | `service_role` |
| `woo-enrichment-pipeline` | download CSV per anteprima e INSERT in `pipeline_jobs` | `service_role` |
| `process-woo-job` | SELECT/UPDATE job, download/input, upload/output, URL firmati, eventuale AI | `service_role` |

Prima della patch il gateway, se configurato con verifica JWT, poteva
autenticare il token ma non verificava il ruolo Admin. Se `verify_jwt` fosse
disabilitato nel deploy, anche una richiesta anonima poteva raggiungere le
operazioni privilegiate. `supabase/config.toml` non contiene una sezione per
queste tre funzioni: lo stato effettivo del gateway live resta un gate di
preflight, non un fatto deducibile dal repository.

La difesa server-side è obbligatoria anche se la pagina è dietro
`AdminGuard`: la UI non è un confine di sicurezza e gli endpoint possono
essere chiamati direttamente. `assertAdminRequest` verifica il Bearer JWT
con `auth.getUser()` e poi interroga `user_roles` tramite service role,
richiedendo espressamente `role = admin`; non usa metadata utente editabili.

### Chiamanti e compatibilità

La ricerca nei file versionati e nella storia disponibile individua un solo
chiamante applicativo: `WooPipelinePanel`. Le tre chiamate usano
`supabase.functions.invoke`, quindi il client Supabase inoltra la sessione
attiva. Il pannello è montato in `AdminImport`, protetto da `AdminGuard`.
Non risultano cron, webhook, script, altre Edge Function o integrazioni
server-to-server che chiamino questi endpoint.

Di conseguenza non viene introdotto un bypass per service role o una seconda
credenziale machine-to-machine. Se Lovable rileva un chiamante esterno non
versionato, il rilascio deve fermarsi e il relativo contratto va progettato
esplicitamente; non è sicuro accettare una chiave di progetto o un header
libero come identità Admin.

Il contratto di successo è invariato. Cambia solo il comportamento dei
chiamanti non autorizzati, che ora ricevono `401`. `OPTIONS` continua a
rispondere senza autenticazione per il CORS preflight.

## Note per developer e designer

Per il developer:

- mantenere l'`await`: una Promise non attesa riaprirebbe la race già corretta
  in altre funzioni Admin;
- non spostare la verifica dopo `req.json()`, `createClient`, query, Storage o
  `fetch` AI;
- non trasformare la patch in cambio gateway, RLS o policy Storage;
- non aggiungere fallback `service_role` per i client senza sessione.

Per il designer/prodotto non sono richieste modifiche visuali. Alla scadenza
della sessione l'operazione deve terminare con l'errore esistente del pannello
e non deve mostrare un avanzamento fittizio. Un utente non Admin non dovrebbe
vedere la pagina; se raggiunge direttamente l'endpoint, la risposta resta
negata. Il flusso Admin resta: firma upload, upload diretto, dry-run o avvio
job, poi batch controllati dal browser.

## Test offline

`scripts/tests/storage-pipeline-auth.test.ts` esegue i tre handler reali in
una VM con Auth, DB e Storage sintetici. Non usa rete, dati live, URL reali,
job, import, Shopify o AI. Per ciascuna funzione verifica:

- `OPTIONS` senza accessi Auth/privilegiati;
- anonimo negato prima di DB/Storage;
- utente autenticato non Admin negato prima di DB/Storage;
- Admin ammesso al percorso applicativo già esistente;
- Promise Auth rifiutata: fail closed e nessun accesso privilegiato;
- Promise Auth pendente: handler non concluso e nessun accesso privilegiato
  fino alla risoluzione positiva.

Gate Codex eseguiti nel worktree isolato il 25 settembre 2026:

| Gate | Esito |
|---|---|
| test specifico STORAGE-004 | 18/18 PASS |
| `deno check` delle tre funzioni | PASS |
| `npm run test:catalog` | PASS, 190/190 (include i 18 test) |
| `npm run typecheck` | PASS |
| `npm run build` | PASS, 1.907 moduli |
| `git diff --check` | PASS |

Avvisi build preesistenti e non bloccanti: due classi Tailwind arbitrarie
ambigue e chunk principale superiore a 500 kB. `npm ci` ha installato 386
pacchetti senza modificare il lockfile; due dipendenze `@esbuild-kit` risultano
deprecate. Nessun avviso è stato introdotto da questa patch.

## Preflight Lovable e rollout

- [ ] Confermare che i file distribuiti corrispondano al commit candidato.
- [ ] Leggere la configurazione gateway effettiva delle tre funzioni; non
  cambiarla in questa fase e non considerarla sostitutiva del ruolo Admin.
- [ ] Confermare che non esistano chiamanti esterni/server-to-server non
  versionati, scheduler o webhook.
- [ ] Verificare che il frontend pubblicato invii una sessione utente valida
  tramite il client Supabase e che l'Admin di collaudo sia in `user_roles`.
- [ ] Assicurarsi che nessun job legacy sia in esecuzione durante il rilascio.
- [ ] Distribuire insieme le sole tre funzioni dal medesimo commit; nessuna
  migration o modifica a `_shared/admin-auth.ts` è necessaria.
- [ ] Smoke test con fixture non riservata: OPTIONS, anon, non Admin, Admin
  dry-run e Promise/errore simulato. Non eseguire modalità full, AI o import.
- [ ] Verificare che una richiesta negata non crei/aggiorni `pipeline_jobs`,
  non generi URL e non tocchi oggetti Storage.
- [ ] Non registrare JWT, URL firmati, path privati o contenuto CSV nei log.

## Rollback

Il rollback automatico alle versioni prive di autorizzazione è vietato,
perché riattiverebbe STORAGE-004. In caso di regressione dopo un rilascio
autorizzato:

1. sospendere l'accesso alle tre funzioni o fermare il flusso dalla UI;
2. applicare un forward-fix che mantenga `await assertAdminRequest` prima di
   ogni accesso privilegiato;
3. ripetere la matrice Auth e il dry-run con fixture;
4. non modificare DB, policy Storage, job o file per compensare un errore di
   autenticazione.

Non serve rollback dati: la patch non contiene SQL e non effettua scritture
durante installazione o test.

## Stato per il cliente

Il rischio di avvio o accesso non autorizzato alla pipeline è stato corretto
nel codice e coperto da test offline. La produzione non è stata modificata:
il rischio resta operativo finché Lovable non completa preflight, rilascio
coordinato e smoke test autorizzati. Separatamente, il bucket `sync` pubblico
espone potenzialmente i CSV operativi; la proposta STORAGE-003 è mantenuta in
una PR documentale indipendente per non confondere autorizzazione applicativa
e architettura Storage.
