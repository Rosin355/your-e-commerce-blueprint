# Online Garden — rischi, test e go/no-go autenticazione

**16 novembre 2026.** Allegato alla [decisione architetturale B](customers-auth-architecture-2026-11-16.md). Audit statico al commit `e09930f21d178c27b162908d1ac01f2c7ca2e754`; nessun test login o accesso a servizi/dati cliente effettuato. “Da eseguire” non equivale a PASS. Le mitigazioni sono requisiti per una futura PR runtime.

## Matrice rischi e accettazione

| ID / gravità | Riscontro o rischio | Verifica futura con dati controllati | Criterio di accettazione / owner |
| --- | --- | --- | --- |
| R1 Alta | Callback Shopify apre account protetto da Supabase; possibile persona diversa | Customer Shopify A, sessione staff/Supabase B, e caso senza Supabase | `/account` mostra solo A; sessione staff B intatta; nessun fallback d'identità — developer |
| R2 Alta | Ordini via Admin email/telefono; prefisso dedotto e filtro permissivo per email assente | Fixture: ordine senza customer.email, telefono condiviso/editato, email non confermata, ricerca speciale | Nessun dato attribuito per telefono/email non provata; percorso pubblico customer-scoped; bridge non riattivabile dal rollback — security |
| R3 Alta | AdminLogin accetta admin, backend V2 ammette altri ruoli | Login diretto e recovery di admin, tech_admin, editor, publisher; utente normale | Accessi/azioni coerenti con RBAC esistente; niente nuovi privilegi; gate read-only invariati — owner Admin |
| R4 Alta | Nonce non controllato; ID token e callback parziale non gestiti | State/nonce mancanti o errati, issuer/audience/scadenza errati, replay, callback duplicato, profilo nullo | Rifiuto sicuro, sessione parziale rimossa, URL ripulito, nessun successo apparente — security |
| R5 Alta | Token browser e errori grezzi; possibile cattura da analytics | Ispezione log/toast/telemetria con sentinelle sintetiche; review XSS/CSP e dipendenze | Zero token, body, recapiti o parametri OAuth nei log; rischio browser accettato formalmente — security |
| R6 Alta | Store non idratato; refresh precedente conservato; expiry ignorata | Reload, nuova tab/chiusura, storage negato/corrotto, scadenza, refresh concorrenti, rotazione, revoca/401 | Nessun dato prima di validazione; nessun token riutilizzato tra identità; una sola operazione refresh; ritorno al login controllato — developer |
| R7 Alta | Logout incompleto e sessioni indipendenti | Logout cliente/staff separati, timeout IdP, back button, multi-tab, richiesta pendente | Cache/dati rimossi; uscita remota non confermata dichiarata; nessuna contaminazione fra utenti o perdita sessione staff — developer |
| R8 Alta | Checkout attuale privo di buyer identity; URL precedente riutilizzabile | Guest, cliente A, token refresh, logout, cliente B, checkout URL emesso prima del logout | Identità checkout coerente con scelta utente; niente riuso locale del carrello/URL autenticato A; lifecycle remoto documentato e accettato — Shopify/developer |
| R9 Media | Discovery/API hardcoded e configurazione ignota | Discovery OIDC/API separati, host errato, endpoint assente, tipo client errato, scope/versione non supportati | Schema/host/client verificati; NO-GO se contratto incompatibile; nessun URL costruito per tentativi — developer |
| R10 Alta | Cache/richieste in volo tra due account; alcuni errori diventano lista vuota | Cambio rapido A→B, risposta lenta di A, API 401/403/429/5xx, oltre 20 ordini/righe | Dati solo dell'identità corrente, errori distinti da vuoto, paginazione completa o limiti espliciti — developer |
| R11 Alta | Primo accesso può creare cliente e attivare app/Flow | Ambiente autorizzato, casella controllata nuova, account esistente, ispezione automazioni e code | Solo effetti espressamente autorizzati; marketing non attivato dall'integrazione; comunicazioni inattese = stop — Shopify |
| R12 Alta | Doppioni per email cambiata/condivisa o profilo phone-only | Profili sintetici senza email, telefoni nazionali/condivisi, recapiti alternativi, collisione A/B | Nessun merge o collegamento legacy automatico; assistenza senza enumerazione di account — dati/UX |
| R13 Media | Desktop/mobile divergenti; callback torna alla pagina sbagliata | Tastiera, mobile, focus, deep link ammesso, link esterno malevolo, cancel/timeout OTP | Un ingresso cliente coerente, destinazioni locali allowlist, errore comprensibile, nessuna promessa password/storico — designer |
| R14 Alta | Dismissione Supabase pubblico può interrompere utenti/recovery e staff | Link recovery già emesso, sessione preesistente, registrazione API diretta, audit dipendenze UUID | Nessuna cancellazione dati/ruoli; ingresso staff funzionante prima del cambio; policy signup e retention approvate separatamente — owner/developer |
| R15 Alta | Rollback UI non annulla profili, ordini o comunicazioni | Simulazione fallimento dopo primo login e prima/dopo checkout | Stato manutenzione sicuro, guest/staff controllati, journal operativo privato; nessuna promessa di rollback dati — release owner |

## Piano del collaudo controllato — non eseguito

Usare un negozio/ambiente di test approvato e caselle possedute dal team, con dati inventati. Nessun account fra i 849 viene selezionato. Il piano autorizzativo deve indicare effetti consentiti: creazioni al primo accesso, OTP alle sole caselle di prova, eventuali ordini di test e relativa pulizia. Non basta chiamare il test “read-only”. Log e artefatti CI continuano a escludere token e dati identificativi, anche quando di prova; mapping delle identità conservato privatamente.

| Identità controllata | Scopo |
| --- | --- |
| T1, cliente Shopify già esistente | Accesso allo stesso profilo e ordini propri; nessuna duplicazione |
| T2, email nuova posseduta dal team | Creazione al primo accesso e campi/consensi effettivi; solo dopo autorizzazione |
| T3, cliente distinto con ordini di test | Isolamento T1/T3, cambio sessione, cache, refresh e checkout |
| T4, profilo senza email e telefono controllato | Gestione assistita e collisioni; nessun auto-completamento o merge |
| S, operatori di prova per ciascun ruolo vigente | Accesso Admin, recovery e privilegi; non convertire un customer in operatore |

Prima: prove sintetiche offline di stato e contratti, schema delle query e sicurezza. Poi: integrazione con OTP e flussi reali solo nel perimetro autorizzato. Infine: rehearsal del rollback e osservazione aggregata delle automazioni. Non inviare comunicazioni a clienti reali per dimostrare il funzionamento. Non copiare ordini, nomi o telefoni reali nelle fixture.

## Gate go/no-go

| Gate | Evidenza richiesta | Stato al 16 novembre |
| --- | --- | --- |
| G0 Decisione | Owner approva B, SPA pubblica, limiti storico e pilota create-only eccezionale | **APERTO** |
| G1 Configurazione | Tipo account, negozio/client, permessi, callback/origini/logout, versione/query, automazioni e test store verificati | **NON VERIFICATO LIVE** |
| G2 Staff | Tutti i ruoli/recovery e cache collaudati; nessun cambiamento ai gate operativi | **DA IMPLEMENTARE/PROVARE** |
| G3 Sicurezza cliente | R1–R10 risolti, review OAuth/XSS/log e ritiro bridge ordini | **NO-GO** sul codice attuale |
| G4 UX/dati | R11–R14 provati; assistenza phone-only/quarantene, marketing e retention approvati | **APERTO** |
| G5 Rilascio | Test autorizzati PASS, rehearsal rollback, owner/monitoraggio/finestra e autorizzazione specifica | **NON AUTORIZZATO** |

Un gate ignoto o fallito impedisce l'avanzamento dipendente. CI verde non chiude G0–G5. La decisione di non precreare clienti non richiede la review immediata di tutti i 849, ma qualsiasi futuro trasferimento di dati deve superare la review individuale. I sette restano esclusi dal pilota legacy, non bloccati dal normale login pubblico.

## Verifiche eseguibili in questa PR documentale

- Lettura statica di route, call site, storage, funzioni e policy versionate; confronto con fonti ufficiali. Non certifica il deployment.
- Controllo link locali, diff limitato a documentazione, assenza di file/dati privati e invariabilità del report reale. Nessuna modifica a implementazione/test/workflow.
- Regressioni **già esistenti**: `node --require ./ci/offline-network.cjs --test sync/tests/customer-preflight.test.mjs sync/tests/customer-pilot-contract.test.mjs`, rete Node bloccata, dati sintetici. Questi test non esercitano l'autenticazione raccomandata.
- CI pertinente: `Customers pilot plan contracts`, già configurata per la base #53. I workflow limitati a `main` non sono una prova dell'autenticazione su questa PR. Esito del commit registrato nella descrizione della PR; nessun check non eseguito viene indicato come superato.

**Eseguito localmente il 16 novembre:** 64/64 test esistenti PASS (46 preflight + 18 modello pilota), zero fallimenti/skipped, con rete Node bloccata. `git diff --check` superato; 36 link locali nei sei documenti validi; modifiche limitate ai sei Markdown previsti; report reale Markdown/JSON e precheck invariati byte per byte. Nessun test di autenticazione live eseguito: G0–G5 restano aperti.
