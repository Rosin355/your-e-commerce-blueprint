# Online Garden — decisione architetturale sull'autenticazione clienti

**16 novembre 2026 — audit documentale; proposta B da approvare, implementazione e produzione NO-GO.** Raccomandazione: Shopify Customer Accounts come unica autenticazione pubblica dei clienti; Supabase Auth conservato per Admin e operatori. Nessun collegamento automatico fra le due identità. Il pilota create-only resta una procedura eccezionale subordinata a un requisito commerciale dimostrato.

## Perimetro ed evidenze

Analizzato il [codice remoto della PR #54](https://github.com/Rosin355/your-e-commerce-blueprint/tree/e09930f21d178c27b162908d1ac01f2c7ca2e754) al commit **`e09930f21d178c27b162908d1ac01f2c7ca2e754`**, dopo aggiornamento fast-forward della copia isolata. Le modifiche preesistenti nel workspace principale sono state preservate. Base della PR: `codex/customers-offline-preflight`, PR #53 al commit `6d6cd5d6905931f0e83168d54dcf08e148912aab`. Nessuna modifica alla #53, al codice runtime, ai test, ai workflow o ai gate Admin.

Riletti [precheck](customers-live-precheck-2026-11-13.md), [report reale](customers-real-email-only-preflight-2026-11-13.md), [aggregati originali](customers-real-email-only-preflight-2026-11-13.json), piano pilota e aggiornamenti developer/cliente/UX. I risultati restano **849 candidati alla review, 7 quarantene, 1 match email**; `proposedNew=0`, `productionAuthorized=false`. Non è stato ripetuto il preflight né letto alcun input privato. I 12 profili Shopify del 13 novembre non sono un conteggio live corrente.

L'audit prova ciò che è scritto nel repository, non ciò che è distribuito o configurato sui servizi. Non sono stati letti utenti, segreti, impostazioni live, automazioni o consensi; nessun login, OTP, mutation, importazione, deploy o comunicazione. Le vulnerabilità potenziali sotto sono inferenze statiche, non incidenti dimostrati. Le verifiche di accettazione sono nella [matrice rischi e test](customers-auth-risk-test-matrix.md).

## Flussi attuali ricostruiti

```text
Header desktop -> AccountButton -> useAuth (Supabase) -> /auth oppure /account
Header mobile -------------------------------> /auth (link fisso)

/auth -> email/password -> Supabase Auth -> auth.users
         registrazione -> trigger handle_new_user -> profiles
         reset password -> /reset-password -> Supabase updateUser
         sessione esistente/login riuscito -> home
/account -> richiede useAuth/Supabase -> profiles dell'UUID Supabase
          -> Edge get-customer-orders -> Admin API Shopify, ricerca email
                                     -> fallback telefono, con +39 dedotto
         nessuna sessione Supabase -> /auth
         logout -> Supabase signOut(local) -> home

Shopify OAuth: startLogin definito, nessun chiamante trovato nel frontend
/account/callback -> code/PKCE -> token Shopify -> customerStore
                  -> query profilo Shopify -> /account
                     [qui il controllo torna a Supabase: identità scollegate]

Carrello Zustand -> localStorage (articoli) -> cartCreate(lines soltanto)
                  -> checkoutUrl -> checkout nativo Shopify
                     [buyerIdentity non associata dal codice]

/admin e strumenti legacy -> useAuth/Supabase -> AdminLogin
                           -> ruoli server in user_roles -> API Admin/RLS
```

### Registrazione, profilo e sessione Supabase

`src/pages/Auth.tsx` usa `signInWithPassword` tramite `useAuth` e propone registrazione con nome/cognome e telefono. `src/hooks/useAuth.tsx:69` invia soltanto nome/cognome nei metadati: **il telefono raccolto non viene inoltrato**. Il trigger nella migrazione `20260407205602_47109853-2cf1-4373-aa08-14e4a0cc2618.sql:126` crea `profiles`, non clienti Shopify. Non è stato trovato un collegamento Shopify nel percorso di signup esaminato. Conferma email, recapito effettivo e policy del servizio non sono verificati dal solo testo dell'interfaccia.

`useAuth.tsx:24` ascolta gli eventi, `:36` ripristina la sessione e `:48` verifica il solo ruolo `admin`. `src/integrations/supabase/client.ts:12` abilita persistenza e refresh; `previewAuthStorage.ts` usa localStorage fuori dai preview riconosciuti e un broker verso l'editor nei preview supportati. Non sostituire questo meccanismo durante la separazione dei login. Il logout `scope: local` non effettua logout Shopify. Il reset resta Supabase (`ResetPassword.tsx`): conservarne la compatibilità per gli operatori e i link già emessi.

`Account.tsx:41` protegge la pagina tramite Supabase, poi legge il profilo dell'utente e invoca gli ordini in parallelo (`:52`). Il profilo è visualizzato, non modificato dalla pagina. Il caricamento non cancella esplicitamente richieste precedenti al cambio utente; errori non gestiti possono diventare una lista vuota e il messaggio “nessun ordine”. Questo non prova che gli ordini siano assenti.

### Ordini: confine d'identità da correggere prima del rollout

`supabase/functions/get-customer-orders/index.ts:80` valida l'utente tramite `getUser()`, ma recupera dati con privilegi Admin cercando l'email, non mediante una sessione Customer Account. Se non trova ordini usa `profiles.phone` (`:98`) e aggiunge automaticamente `+39` quando manca il prefisso (`:103`). Le policy versionate consentono al titolare di aggiornare il proprio profilo: **il numero non è una prova di possesso o di identità**.

Il filtro `mapOrder` (`:35`) scarta email cliente diverse soltanto se presenti; un ordine senza `customer.email` non viene scartato per quel controllo. La combinazione con il fallback telefonico è un **rischio elevato di attribuzione indebita dei dati**, da verificare su fixture e ambiente controllato, mai cercando ordini di persone reali. Non risulta una verifica esplicita `email_confirmed_at` nell'handler; non si può dedurre dal codice la configurazione di conferma email del servizio. Inoltre sono letti al massimo 20 ordini e 20 righe per ordine senza paginazione, ed è loggata una porzione dell'email (`:86`).

Decisione progettuale: sostituire questo percorso pubblico con query customer-scoped e dismettere l'accesso pubblico al bridge Admin dopo la transizione. Il fallback telefonico non fa parte dell'architettura raccomandata. La correzione richiederà una PR runtime separata; nessuna modifica è stata effettuata qui. Non ripristinare il bridge come scorciatoia di rollback.

### Shopify: integrazione presente ma non collegata al login pubblico

La ricerca dei call site in `src` trova `startLogin`, refresh e logout definiti in `src/lib/shopify-customer-auth.ts`, ma nessun loro utilizzo nel flusso pubblico; `customerStore` è utilizzato dal callback. Anche `hydrate()` non ha chiamanti. Non è quindi corretto presentare questo scaffolding come un login Shopify già funzionante in produzione.

Problemi verificabili:

- `AccountCallback.tsx:22` salva i token prima del profilo; in errore non pulisce la sessione parziale. Anche senza `data.customer` può mostrare successo e navigare a `/account` (`:36`). Un utente Supabase diverso potrebbe quindi vedere il proprio account Supabase, non quello appena autenticato su Shopify.
- `shopify-customer-auth.ts:21` confonde i due discovery document: il successo OIDC evita di leggere la configurazione API; la query ripiega su un URL hardcoded `2025-07` (`:179`). Endpoint/versione effettivi vanno rivalidati, non presunti dal fallback.
- State e PKCE sono controllati (`:100`); il nonce generato viene rimosso senza confronto e l'ID token non entra nel ciclo di sessione. Il logout (`:202`) non fornisce `id_token_hint`, non pulisce lo store/expiry e dipende dal successo iniziale della discovery.
- `customerStore.ts:41` conserva il vecchio refresh token se la nuova risposta non lo contiene; `isLoggedIn` considera solo la presenza dell'access token. Il profilo non include un ID Shopify stabile; persistenza in sessionStorage senza una reinizializzazione collegata al ciclo applicativo.
- Errori grezzi del token endpoint e GraphQL possono raggiungere console/toast (`shopify-customer-auth.ts:132`, `AccountCallback.tsx:39`): vietare body, token e dati personali nei log della futura implementazione.

`supabase/functions/shopify-oauth-exchange/index.ts` è un altro flusso: scambia un codice sull'endpoint **Admin OAuth**. Non è il callback clienti e non deve essere riutilizzato come login o proxy di token customer. Il suo isolamento, controllo del dominio e autorizzazione meritano una review di sicurezza separata; non sono stati verificati il deployment o l'accesso effettivo a tale funzione.

### Carrello, checkout e Admin

`cartStore.ts` persiste soltanto gli articoli sotto `shopify-cart`. `shopify-checkout.ts:14` crea il carrello Storefront con `lines`, senza buyer identity; `CartDrawer.tsx:39` porta al checkout nativo. La sessione del browser sul dominio Shopify può avere un proprio stato: il codice non garantisce che corrisponda a Supabase o a `customerStore`. Non attribuire il checkout a un cliente in base alla sola email.

Supabase Auth **serve anche il personale**: `AdminGuard`, `AdminV2Guard`, `AdminLogin`, `AdminLayout`, `AdminShell`, `AdminRuntimeDiagnostics`, `AdminImport`, `AiWriterPanel`, `ProductEnrichmentPanel`, `ProductSyncPanel` e `useAdminData`. `adminApi.ts:217` usa il token Supabase; `_shared/admin-v2-auth.ts` valida l'utente e carica i ruoli dal database. `_shared/admin-v2-permissions.ts` riconosce `admin`, `tech_admin`, `editor`, `publisher`, con permessi distinti; il percorso legacy resta admin-only. Non dedurre autorizzazioni da metadati modificabili dal cliente o dal suo profilo Shopify.

**Rischio di lockout:** `AdminLogin.tsx:39` ammette solo `admin` e disconnette gli altri, mentre Admin V2 accetta anche gli altri ruoli autorizzati. Il login pubblico può attualmente fornire a questi operatori la sessione necessaria. Rimuoverlo prima di predisporre e provare l'ingresso staff bloccherebbe parte delle utenze. Nessuna assegnazione di nuovi ruoli è proposta.

`useAdminContext` separa la cache per UUID, ma altre query Admin hanno chiavi condivise. Logout/cambio operatore e richieste in volo vanno provati; l'isolamento delle cache non sostituisce i controlli server. Conservare UUID, RLS, audit trail, limiti read-only e gate operativi. Il catalogo può continuare a usare Supabase: “Auth solo staff” non significa eliminare Supabase dal progetto.

## Verifica documentazione ufficiale, 16 novembre 2026

| Fonte primaria consultata | Riscontro utile alla decisione |
| --- | --- |
| [Shopify Customer accounts](https://help.shopify.com/en/manual/customers/customer-accounts) | Accesso con codice email a sei cifre; una nuova email può creare un profilo al primo accesso. Un profilo esistente usa la propria email. Non è una migrazione WooCommerce. Provider d'identità esterno disponibile con Shopify Plus; piano del negozio non verificato. |
| [Customer Account API: getting started](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/getting-started) | API per il cliente autenticato, utilizzabile da un client HTTP headless. Richiede configurazione Customer Accounts e client del canale Headless/Hydrogen; origini, callback e logout da registrare. React non richiede una riscrittura in Hydrogen. |
| [Customer Account API, riferimento 2026-10](https://shopify.dev/docs/api/customer/2026-10) | OAuth authorization code; PKCE per client pubblico. Discovery OIDC e API distinte; GraphQL in `graphql_api`. Nonce restituito nell'ID token; logout con `id_token_hint`. Refresh disponibile ai client storefront configurati sul negozio, non a tutti i client app: identificarne il tipo prima dell'implementazione. |
| [Autenticazione nel checkout](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/checkout-authentication) | Buyer identity sul carrello e sessione Customer Accounts con `sso=silent` sono percorsi differenti. Il secondo non ripiega sul primo quando la sessione scade. |
| [Gestione carrello Storefront](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage) | Un customer access token valido può associare il cliente al carrello; le richieste server richiedono attenzione al buyer IP. L'email da sola non è il token. |
| [Supabase signout](https://supabase.com/docs/guides/auth/signout), [sessioni](https://supabase.com/docs/guides/auth/sessions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | Logout locale distinto da globale; i token già emessi hanno una scadenza. Autenticazione e autorizzazione sono separate; non usare user metadata modificabili come ruoli. |

Consultato anche il [changelog Supabase](https://supabase.com/changelog.md); nessun aggiornamento di librerie/configurazioni fa parte dell'audit. Il progetto dichiara `@supabase/supabase-js ^2.98.0`: la compatibilità futura richiederà test sulla versione effettiva del lockfile. Le pagine Shopify sono aggiornabili: il riferimento consultato indica 2026-10, non certifica lo schema dell'URL 2025-07 presente nel codice. I riscontri documentali non attestano le impostazioni del negozio Online Garden.

## Confronto delle tre strategie

| Criterio | A — precreare Shopify, Supabase pubblico | B — Shopify clienti, Supabase staff | C — Supabase pubblico, identità sincronizzate |
| --- | --- | --- | --- |
| Esperienza | Due registrazioni/sessioni da spiegare; import non risolve `/account` | Un percorso cliente passwordless e staff separato | Login iniziale invariato, ma collegamento/verifica aggiuntivi |
| Checkout | Disallineamento attuale rimane | Identità cliente trasmessa esplicitamente al carrello | Serve un vero meccanismo di federazione/token; sync anagrafico non basta |
| Recupero storico | Precarica dati approvati, non password/ordini o login Supabase | Ritorno volontario; arricchimento storico solo separato | Richiede legame verificato fra due ID e fonte legacy |
| Duplicati | Rischio di nuove righe inutili e phone-only irrisolto | Niente import massivo; restano email cambiate/condivise e phone-only | Conflitti, riassegnazioni e correzioni bidirezionali |
| Admin | Apparentemente invariato, ma con pubblico e staff accoppiati | Va isolato l'ingresso staff prima del cambio pubblico; RBAC conservato | Ingresso invariato, nuove responsabilità nel backend |
| Sicurezza | Bridge Admin per ordini e doppia identità restano da correggere | Dati customer-scoped; necessario completare correttamente OAuth/sessioni | Più confini, token e privilegi; mapping email non sufficiente |
| Manutenzione | Writer più due percorsi auth, senza risolvere la causa | Un'autorità per i clienti; integrazione React/checkout da presidiare | Registry identità, retry, webhook, conflitti, audit e disaccoppiamento |
| Tempi/rischio | Basso solo per precaricare email; alto lavoro residuo sull'accesso | Medio, concentrato in sessione, staff, ordini e checkout | Alto, con dipendenze di piattaforma e sincronizzazione continua |

Stima di pianificazione, non promessa di consegna: B richiede almeno quattro pacchetti (isolamento staff; OAuth/sessione; area cliente/checkout; collaudo/rollout), ciascuno con review. A aggiunge comunque il writer senza eliminare questi problemi; C aggiunge una piattaforma di collegamento identità. Non è attendibile fissare giorni o una data prima di verificare configurazione Shopify, ambiente di test e competenze disponibili. Nessuna evidenza di requisito aziendale giustifica oggi C o la precreazione di massa A.

## Architettura raccomandata B

```text
Cliente -> /auth React -> Shopify Customer Accounts (email + codice richiesto)
                       -> OAuth code + PKCE -> /account/callback
                       -> provider cliente Shopify -> /account
                                                   -> Customer Account API
                                                      profilo/ordini propri
        -> carrello -> buyerIdentity con token cliente valido -> checkout Shopify

Operatore -> ingresso staff dedicato -> Supabase Auth -> user_roles/RLS/API Admin
             nessuna dipendenza dalla sessione cliente Shopify

Archivio Woo -> review privata separata; nessun provisioning automatico
```

**Scelta tecnica proposta:** mantenere React SPA e adottare un client pubblico Customer Account del canale Headless, con Authorization Code + PKCE. Non introdurre ora un secondo database d'identità o un BFF soltanto per imitare quello esistente. Il client ID è configurazione pubblica, mai un client secret nel browser. L'approvazione richiede accettazione esplicita del rischio token nel browser e verifica XSS/CSP/dipendenze: se non accettabile, fermare l'implementazione e rivedere il trasporto di sessione con una decisione dedicata, senza ripiegare silenziosamente su C.

Contratto applicativo proposto, da implementare/testare separatamente:

1. Provider customer indipendente da `useAuth`, con stati guest, authorizing, restoring, authenticated, refreshing, error. Confermare il profilo e il suo **Shopify customer ID stabile** prima di dichiarare successo. Email/telefono sono attributi, mai chiavi di autorizzazione o equivalenti dell'UUID Supabase.
2. Una sola transazione OAuth pendente per tab; state, verifier e nonce casuali, monouso, con TTL; validazione OIDC di issuer/audience/scadenza/nonce tramite libreria revisionata. Callback ripetuto, errore o profilo nullo invalidano la transazione e lo stato parziale. Return URL solo locale e ammesso; rimuovere code/state dall'URL e impedire che analytics/error tracking li raccolgano.
3. Token in memoria e, per il ripristino nella stessa tab, sessionStorage con durata limitata; niente localStorage persistente per i token customer. Non è una protezione da XSS. Ripristino bloccante prima di mostrare dati, validazione scadenze, refresh single-flight, gestione della rotazione senza riutilizzare token di una precedente identità. La chiusura della tab può richiedere una nuova autorizzazione; non promettere sessioni React di 365 giorni.
4. Discovery separata, schema validato e gestione esplicita di errori/versione. Configurazione del client storefront e disponibilità refresh da verificare; risposta incompatibile = stop controllato, nessuna conservazione del vecchio token. Query profilo/ordini paginate e autorizzate dal token customer, mai da email inviata al backend Admin. In prima release profilo in sola lettura; eventuali modifiche tramite area Shopify verificata, senza duplicare i dati in `profiles`.
5. Logout cliente: cancellare dati/cache/operazioni pendenti e buyer identity locale; completare l'uscita sull'IdP con ID token e URI ammesso. Se la rete fallisce, mostrare che l'uscita remota non è confermata e non ripristinare automaticamente dati privati. Non terminare la sessione staff. Il logout staff opera solo su Supabase e sulle cache Admin.
6. Checkout scelto: **buyer identity sul carrello**, per mantenere l'identità della sessione React esplicita; niente `sso=silent` aggiunto come fallback. Aggiornare l'associazione quando cambia il token e ottenere il checkout URL al momento dell'azione. Su logout/cambio persona invalidare cart ID e checkout URL associati; gli articoli possono restare anonimi. Non riutilizzare URL autenticati della persona precedente; i link già emessi richiedono una verifica specifica di lifecycle, senza prometterne revoca automatica. Guest checkout resta disponibile secondo le impostazioni approvate.

Questi requisiti sono una proposta di progetto, non capacità già presenti né configurazioni applicate. Nessun evento di accesso deve attivare consensi o una sincronizzazione legacy. L'OTP volontario è previsto nel flusso futuro; questa attività non ne invia.

## File e dipendenze per una futura PR di implementazione

| Area | File/componenti identificati | Intervento futuro e confine |
| --- | --- | --- |
| Routing e ingressi | `src/App.tsx`, `pages/Auth.tsx`, `Account.tsx`, `AccountCallback.tsx`, `components/AccountButton.tsx`, `components/storefront/HomeHeaderOverlay.tsx` | Separare route/provider pubblici e staff; stesso comportamento desktop/mobile; callback va alla sessione Shopify |
| Sessione customer | `src/lib/shopify-customer-auth.ts`, `src/stores/customerStore.ts`, nuovo provider dedicato | Completare discovery, OIDC, ripristino, refresh, ID stabile, logout e redazione errori; query validate contro schema scelto |
| Ordini/profilo | `Account.tsx`, query in `shopify-customer-auth.ts`, `supabase/functions/get-customer-orders/index.ts` | Dati customer-scoped, paginazione, errori distinti dal vuoto; dismettere bridge pubblico Admin |
| Carrello/checkout | `src/stores/cartStore.ts`, `src/lib/shopify-checkout.ts`, `src/lib/shopify.ts`, `src/components/CartDrawer.tsx` | Buyer identity e ciclo del token/cart URL; guest e cambio utente collaudati |
| Staff da preservare | `src/hooks/useAuth.tsx`, `src/integrations/supabase/client.ts`, `previewAuthStorage.ts`, `pages/ResetPassword.tsx`, `admin/components/AdminLogin.tsx`, `admin/AdminGuard.tsx`, `adminv2/AdminV2Guard.tsx` | Ingresso staff autonomo e recovery; tutti i ruoli già ammessi, senza estendere privilegi o eliminare utenti |
| Dipendenze Admin da regressione | `AdminLayout`, `AdminShell`, `AdminRuntimeDiagnostics`, `AdminImport`, `AiWriterPanel`, `ProductEnrichmentPanel`, `ProductSyncPanel`, `adminv2/hooks/useAdminData.ts`, `adminv2/lib/adminApi.ts` | Conservare UUID, validazione server, cache isolate e operatività esistente |
| Backend/permessi invarianti | `_shared/admin-auth.ts`, `_shared/admin-v2-auth.ts`, `_shared/admin-v2-permissions.ts`, `product-admin-api/auth.ts`, migrazioni `profiles`/`user_roles`, policy e gate runtime | Nessun token Shopify accettato come Supabase/staff; niente cambi RBAC, RLS o gate per risolvere il login |

La funzione `shopify-oauth-exchange` non è parte del provider customer. Modifiche alle impostazioni di signup Supabase, redirect, client Shopify e automazioni richiederanno un piano/configurazione separato: nascondere un form non chiude da solo la registrazione via API. Non disabilitare globalmente Supabase né cancellare gli utenti pubblici esistenti; inventario minimizzato e retention da autorizzare prima di qualsiasi dismissione dei loro dati.

## Rollout e rollback proposti

1. **Decisione e readiness:** owner approva B, UX e rischio della SPA; responsabile Shopify verifica tipo account, canale/client, dominio, callback/origini/logout, disponibilità dati API e automazioni, senza usare clienti reali come prova. Inventario staff e recovery, ambiente dedicato e indirizzi controllati autorizzati. Fino ad allora NO-GO.
2. **Separazione staff prima del pubblico:** predisporre ingresso autonomo sotto `/admin` (eventuale `/admin/login` è una nuova route, oggi non esiste) e recovery compatibile. Provare ruoli admin/tech_admin/editor/publisher secondo permessi correnti, rifiuto utenti customer, token scaduto e cambio operatore. Non togliere `/auth` Supabase prima che questo gate passi.
3. **Implementazione dedicata:** provider Shopify, ordini e checkout; test unitari/integrazione sintetici, redazione log e review sicurezza. Contratto staff congelato; nessun writer legacy richiesto. Prevedere controllo di rollout customer distinto dai gate operativi Admin.
4. **Collaudo autorizzato:** identità di prova controllate, nuove ed esistenti, comprese collisioni e caso senza email. OTP e creazione al primo accesso sono effetti reali: consenso operativo separato anche in test. Nessuna importazione o impersonificazione dei 849. Criteri e prove nella matrice.
5. **Canary e diffusione:** dopo autorizzazione di rilascio separata, abilitazione iniziale alle identità controllate, verifica frontend/callback/checkout/staff e solo poi apertura pubblica. Metriche aggregate senza token, email, ID cliente, query string o payload; stop immediato su identità errata, regressione staff, comunicazioni inattese o dati esposti.

Rollback: arrestare il rollout customer e disabilitare i nuovi ingressi/callback con stato neutro di indisponibilità; conservare navigazione e guest checkout se sicuri e l'ingresso staff già isolato. Un percorso Shopify ospitato è un'opzione di continuità **solo se già configurato e collaudato**, non un redirect inventato durante l'incidente. Riportare componenti alla versione validata senza riaprire il bridge ordini insicuro o usare Supabase come fallback automatico per utenti Shopify. Pulire sessione/cache/buyer identity per la nuova area, verificare vecchi checkout URL e richieste in volo. Profili già creati, ordini e comunicazioni non sono annullati dal rollback UI; niente cancellazioni o merge automatici. Riconciliazione privata e autorizzazione specifica per eventuale recupero dati.

## Effetto sul recupero WooCommerce e sul pilota #54

- **849:** candidati alla review di dati legacy, non una coda di creazione. Con B possono iniziare volontariamente il percorso pubblico, senza importarli prima. Il controllo della casella attuale non dimostra da solo la proprietà dello storico WooCommerce; nessun ordine, saldo, consenso o attributo legacy viene attribuito automaticamente.
- **7 quarantene:** restano escluse da trasferimenti/pilota legacy (sei somiglianze telefoniche interne e un telefono malformato). Non sono un divieto di normale registrazione pubblica. Qualunque richiesta di collegamento allo storico resta in assistenza privata, senza riscrivere telefoni, dedurre prefissi o unire profili.
- **1 match Shopify:** non ricreare; il futuro accesso utilizza l'identità Shopify corretta dopo autenticazione. Email cambiata o condivisa richiede review, non assegnazione automatica dello storico.
- **Profilo senza email osservato:** non assumere che il nuovo login email lo riconosca. Un'altra email può produrre una seconda anagrafica della stessa persona. Prima di collegare o precaricare dati servono riscontri privati e supporto; nessun completamento/merge automatico.
- **953 ordini WooCommerce:** restano fuori Shopify; l'area ordini mostrerà soltanto ciò che il cliente autenticato è autorizzato a vedere su Shopify. Non promettere recupero dello storico per effetto dell'accesso. Author/administrator restano esclusi dalla migrazione e non acquisiscono ruoli staff per equivalenza legacy.

Il [piano create-only del 15 novembre](customers-pilot-plan-2026-11-15.md) resta documentato, **sospeso come percorso predefinito**. Riprenderlo solo con un requisito specifico di pre-provisioning non soddisfatto dal login volontario, e tutte le sue verifiche/approvazioni. Il prossimo pilota raccomandato verifica l'autenticazione con identità controllate; non è il lotto di cinque clienti storici. I 18 test del modello create-only restano utili a quel contratto ma non provano OAuth, UX, checkout o configurazione reale.

## Decisioni richieste prima di implementare

Owner: approvare B e il cambio del percorso clienti; stabilire se esiste una ragione residua per precreare profili. Developer/security: approvare client pubblico SPA, gestione token e piano di mitigazione XSS, isolamento staff e dismissione bridge ordini. Responsabile Shopify: verificare fattibilità/configurazione con account di test e automazioni. Designer: approvare UX, recupero casella, stati d'errore e assenza dello storico Woo. Responsabile dati: retention degli utenti Supabase esistenti e processo privato per quarantene/phone-only.

Successivamente servono autorizzazioni distinte per implementazione, configurazioni dei servizi, collaudo con effetti di test e rollout. **L'approvazione di questo documento o della PR non autorizza alcuna scrittura, comunicazione, importazione o deploy.**
