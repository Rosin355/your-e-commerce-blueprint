# Online Garden — piano esecutivo di rilascio sicurezza (finale)

Base: `28372c3` + correzione payload Admin proxy (questo commit). Nessun deploy, permesso o Publish eseguito.

## 1. Gli 8 Critical della scansione approfondita
| Finding | Funzione | Stato nel codice |
|---|---|---|
| 18ee86d5 cancellazione arricchimento | ai-enrich-products | Corretto in 28372c3 (Admin prima di tutto) |
| bd174a35 sovrascrittura SEO | ai-enrich-products | Corretto in 28372c3 (stessa causa) |
| 1a2944db creazione collezioni | setup-collections | Corretto in 28372c3 |
| 8f542b5c appartenenza collezioni | setup-collections | Corretto in 28372c3 (stesso guard su ogni richiesta) |
| 5a9278d4 prezzi senza await | update-product-prices | Corretto in 28372c3 |
| ad1d7f29 sostituzione immagini | generate-product-images | Corretto in 28372c3 |
| baf8660f deviazione collegamento Shopify | shopify-oauth-exchange | Corretto in 28372c3 |
| cbddb259_f327 campi cliente arbitrari | shopify-admin-proxy | **Era ancora presente**: corretto ora con elenco campi ammessi (anche creazione cliente e prodotto, 2 Warning) |

Tutti richiedono deploy: la produzione esegue ancora le versioni vecchie.

## 2. Funzioni da distribuire (10, nessun'altra)
ai-enrich-products, export-complete-products-csv, export-enriched-csv, export-shopify-native-csv,
generate-product-images, inspect-woo-source-csv, setup-collections, shopify-oauth-exchange,
update-product-prices, shopify-admin-proxy.
Dipendenze `_shared` incluse automaticamente: legacy-admin-access.ts, admin-auth.ts, admin-proxy-payloads.ts, shopify-admin-client.ts e relative importazioni.
Esclusi: product-admin-api, product-admin-ai, get-customer-orders, frontend.

## 3. get-customer-orders
Verificato oggi in produzione: risponde **410** (ritirata). Il sito online (`index-DosIxhkd.js`) non la richiama. Accesso clienti tramite Shopify Customer Accounts invariato. Nessuna azione necessaria.

## 4. SQL ruoli (unica modifica permessi)
File `docs/security-prepared/role-check-self-only.sql`: `has_role` restituisce dati solo per il proprio account; chiamate server senza utente invariate.
Dipendenze verificate live: 27 policy (public + storage) usano tutte `auth.uid()`; nessuna chiamata dal codice con UUID di terzi. Le funzioni Admin V2 (Marco/admin) leggono `user_roles` direttamente: non coinvolte. Chiude 5 Warning (has_role, can_edit/can_publish/can_manage_taxonomy).

## 5. Checkout
Riprovato oggi senza pagare, in anteprima e su onlinegarden.it: apertura del checkout Shopify riuscita. Il blocco precedente non si ripresenta; probabile causa il prodotto di prova non disponibile/temporaneo. Nessuna regressione nel codice del checkout.

## 6. Publish e versione servita
Dominio serve `index-DosIxhkd.js`, diverso da `index-CMoOo4zb.js` del Publish editor: è stato quindi completato un Publish più recente. Lo stato del job `e75abdfd…` non è leggibile con gli strumenti disponibili.

## 6b. Dipendenze (8 avvisi)
- react-router-dom 6.30.3: 5 moderate, correggibili restando sulla 6 (aggiornamento minore a 6.30.5 o successiva). Proposto nel rilascio, con build e prova navigazione.
- zod 3.25.76: correzione solo nella 4 (cambio maggiore, incompatibile). Non aggiornato; rischio limitato ai pannelli Admin.
- ws tramite client Cloud: nessuna versione corretta disponibile per il client; da riprendere quando esce.

## 7. Procedura (un solo intervento, dopo approvazione)
1. Checkout pulito sul commit approvato, test: `node --import tsx --test scripts/tests/admin-proxy-payloads.test.ts scripts/tests/security-legacy-endpoints.test.ts`.
2. Deploy delle 10 funzioni. Verifica per ciascuna: OPTIONS 200, senza login 401, con utente non Admin 403. Nessuna chiamata che modifica dati.
3. Admin: lettura lista/dettaglio prodotti con sessione Admin; import clienti solo in anteprima dati (dry run).
4. Applicazione SQL ruoli. Verifica: Admin vede Admin V2, Marco come editor legge prodotti/categorie, immagini pubbliche visibili, proprio ruolo vero, ruolo altrui falso.
5. Storefront: home, catalogo, PDP, carrello, apertura checkout senza pagare.
6. Nuova scansione rapida + approfondita.
7. Publish frontend solo se serve (le correzioni sono tutte lato server).

Rollback: funzioni → redeploy della stessa funzione da `e3c4e46` (baseline); SQL → ricreare `has_role` dal corpo originale (incluso nel file). Nessun dato toccato, quindi nessun ripristino dati.

## Autorizzazioni richieste (unica richiesta)
A. Deploy delle 10 funzioni elencate. B. Applicazione dell'SQL ruoli. C. Aggiornamento minore react-router-dom 6.30.x. D. Publish frontend (necessario solo se approvi C).


## Revisione indipendente del piano — 21 novembre 2026 (NON una autorizzazione)

**Blocco da correggere prima di B:** il file `docs/security-prepared/role-check-self-only.sql` contiene il predicato

```sql
(auth.uid() IS NULL OR auth.uid() = _user_id)
```

In un contesto non autenticato Supabase `auth.uid()` è **NULL**, quindi questa espressione concede il ramo positivo anche quando il richiedente non è un utente loggato. Se `public.has_role` resta eseguibile da `anon`/`PUBLIC` (possibile per una funzione `SECURITY DEFINER` nello schema esposto), l'utente anonimo può interrogare un ruolo relativo a un UUID arbitrario. Ciò **contraddice** lo scopo «self-only». Il caso `NULL` non distingue un servizio fidato da un chiamante anonimo.

**Richiesta di modifica:** riscrivere la policy/funzione con distinzione verificabile fra utente autenticato che interroga il proprio UUID, service role esplicitamente autorizzato e anonimo senza identità. Inventariare e verificare grant EXECUTE su `PUBLIC`, `anon`, `authenticated`, `service_role`; non fare REVOKE indiscriminati che rompano le 27 policy RLS/Storage esistenti. Necessario test reale (con identità sintetiche e senza dati privati): anon = DENY, autenticato altro UUID = DENY, autenticato proprio UUID = risultato corretto, chiamata servizio autorizzata = comportamento documentato, Marco editor / Admin V2 / immagini pubbliche invariati. **B NO-GO nella formulazione SQL attuale.**

**Dipendenza C:** non installare `react-router-dom@6.30.5`, perché l'advisory GHSA-jjmj-jmhj-qwj2 lo include tra le versioni vulnerabili. Rimanendo su v6 usare **almeno 6.30.6** per questo advisory e verificare nell'effettivo lockfile le versioni di `react-router`/`react-router-dom` oltre agli altri advisory non necessariamente risolti dalla patch. Eseguire build, navigazione, account, Admin e checkout prima di D; non passare a v7 senza progetto dedicato.

**Sequenza di approvazione:** A (10 funzioni) e C (bump compatibile) sono candidabili a rilascio condizionato con backup e gate mirati; **B deve prima essere riprogettato e riesaminato**, D soltanto dopo le prove funzionali e la verifica dei rilievi. Questo addendum non autorizza in alcun modo deployment, migration, modifica permessi o Publish.

**Fonti esterne:** [Supabase `auth.uid()` e RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase Security Definer accessibile anonimamente](https://supabase.com/docs/guides/observability/advisors?lint=0029_authenticated_security_definer_function_executable), [React Router advisory 6.30.6](https://github.com/advisories/GHSA-jjmj-jmhj-qwj2).

## Esecuzione 21/11/2026
- **A eseguita**: 10 funzioni distribuite (più un secondo deploy di shopify-admin-proxy per filtro sku/handle). Tutte: OPTIONS 200; senza login 401 (proxy: rifiuto con 500 storico); chiave pubblica 401/403. Admin reale: lettura proxy 200, product-admin-api 200; update_customer con ID manipolato rifiutato prima di Shopify. Nessun dato modificato. Test 102/102.
- **B corretta, NON applicata**: condizione fidata ora `auth.uid()=_user_id` oppure service role oppure sessione postgres. Verifica claims simulati: anon false, proprio ruolo true, ruolo altrui false, service role true, senza claim false. In attesa di approvazione.
- **C eseguita**: react-router-dom 6.30.6 (router 1.23.4), lockfile aggiornato, build OK. Navigazione home/collezione/PDP/indietro, account (Shopify login), Admin dashboard: OK, nessun errore pagina.
- **D non eseguito**: attende approvazione B.
- Deep scan (base e5482ff): 0 Critical sulle 7 funzioni legacy; rilievi proxy corretti e marcati risolti. Aperti: 5 Warning ruoli (chiusi da B), log clienti storici (Warning, già risolto nel codice), Info Storage intenzionale; zod 4 e ws senza correzione compatibile.


## Decisione di rilascio B → D (21 novembre 2026, ore 12:27 CET)

**Stato riferito da Lovable:** A eseguita (10 Edge Functions; `shopify-admin-proxy` ridistribuita dopo fix successivo; anonimo rifiutato ma risposta HTTP 500 anomala ancora da considerare per un miglioramento), C eseguita (`react-router-dom` 6.30.6, build/navigazione PASS). B corretta ma **non applicata**, D **non pubblicata** al momento di questa nota. Deep scan del codice completo va ripetuta dopo il rilascio.

Il file [SQL aggiornato](docs/security-prepared/role-check-self-only.sql) usa controllo self `(auth.uid() = _user_id) IS TRUE`, claim `service_role` e ruolo di sessione tecnico `postgres`, sostituendo il precedente `auth.uid() IS NULL` non sicuro. La revisione della logica è avvenuta su file sorgente; le prove simulate di Lovable non equivalgono a collaudo di produzione.

**Decisione consigliata al titolare:** approvare l'opzione «Sì, applica B e pubblica», **nel preciso ordine B → smoke post-B su ruoli Admin/Marco/RLS/Storage/storefront → D soltanto se PASS → post-publish login/account/checkout → nuova deep scan**. In caso di fallimento fermarsi e applicare il rollback previsto. Questa nota non attiva il controllo UI e non attesta l'approvazione già effettuata né modifiche al database.

**Stato dei dati:** migrazione WooCommerce ancora `BLOCKED_SOURCE_UNAVAILABLE`, 0/953 ordini trasferiti; SAL 58% finché non c'è prova del Publish.

## B applicata; D fermata — 21 novembre 2026

- Autorizzazione esplicita ricevuta: «Sì, applica B e pubblica», condizionata ai controlli.
- Applicato byte-per-byte l'SQL approvato con runner nativo: `0019_restrict_role_checks_to_self_or_trusted_service.sql`. Read-back conferma il nuovo corpo di `has_role`; ACL dei quattro helper identiche.
- Invariati 3 ruoli, entrambi i grant editoriali e tutte le policy public/storage: digest ruoli `b3a46a74f681172f8439422d95fe17e8`, capability `9f44f2c16fb2de907f94f4922bcb9c3a`, policy `b4b12a7a93a5eaa8dee833ea6ffa2f38`, identici prima/dopo.
- Admin con sessione autorizzata: contesto admin/editor, elenco e dettaglio prodotti 200; RPC proprio admin/editor e helper edit/publish/taxonomy true; lettura RLS dei campi presente. Nessuna richiesta automatica di scrittura osservata; nessun errore pagina.
- La sessione tecnica read-only non ha EXECUTE su `has_role`: prove tramite claims simulati non eseguibili e non considerate PASS. Nessun grant aggiunto. Sessione Marco non disponibile: invarianti e codice verificati, suo collaudo autenticato non attestato.
- Home, catalogo (9 link prodotto), PDP, aggiunta al carrello PASS. **Checkout non PASS**: permane «Creazione checkout…», nessuna navigazione dopo 45 secondi, nessun alert. Non attribuito alla migration: il flusso Shopify non usa `has_role`.
- Scan rapido post-B: nessun Critical/Warning, un Info Storage già noto. **Publish NON richiesto**, nessun rollback, deploy o modifica Shopify. Recupero SQL disponibile nel file approvato ma richiede decisione prima dell'esecuzione; per il blocco checkout serve diagnosi mirata, non un ripristino dati.
- Test live conservati in `scripts/tests/role-check-live.test.ts`: **4/4 PASS** (Admin proprio ruolo, ruolo editor altrui negato, anonimo senza EXECUTE, helper edit Admin preservato). I 5 finding sui ruoli segnati risolti dopo questi controlli. Restano Warning log clienti storici e Info Storage; scansione approfondita finale da completare.

## Stato sicurezza e rilascio — 21 novembre 2026 (esito riferito dal collaudo Lovable)

**Fonte:** esito operativo incollato dal responsabile; questa nota registra la dichiarazione e non equivale a interrogazione autonoma del database o del checkout. La modifica ai ruoli **B** risulta applicata in produzione con **4/4 verifiche PASS**, senza variazioni dichiarate ai permessi di Marco; il Publish **D** risulta fermato. Deep scan terminato con **0 Critical**, ma su uno snapshot precedente all'ultimo salvataggio: serve un secondo controllo sul commit corrente.

Avvisi residui riportati:
- Admin modifica prodotti: payload inoltrato a Shopify contiene campi ulteriori rispetto a quelli consentiti; confermare se finding ancora applicabile e usare allowlist server-side per la specifica operazione senza cambiare campi commerciali.
- Log della sincronizzazione clienti: possibile presenza di email in chiaro; correggere sanificazione e ridurre logging, senza pubblicare recapiti o riscrivere alla cieca log storici.
- Informativo immagini pubbliche: comportamento intenzionale per i prodotti; non rendere privato il bucket pubblico.

**Blocco reale del Publish:** checkout che rimane su `Creazione checkout…` dopo l'ultima sessione; checkout precedentemente aperto su preview e dominio live. Una correlazione temporale con il change B **non dimostra causalità**. Diagnostica separata su carrello, variant ID/availability, Storefront `cartCreate`, risposta GraphQL, timeout e redirect; riprodurre almeno con un prodotto vendibile senza completare ordini o pagamenti. Segnalare differenza fra test preview e dominio live senza introdurre modifiche checkout non correlate.

**Decisione consigliata:** autorizzare **solo correzioni nel sorgente** dei due avvisi confermati e diagnosi/fix minimo del checkout in anteprima, lasciando deploy backend/SQL/Publish separati e non eseguiti senza gate dedicati. Concludere in un unico report con causa del blocco checkout, test mirati, elenco file toccati, residual warning e criteri GO/NO-GO. Conservare lo stato clienti Shopify, Admin staff e migrazione storica `0/953`; SAL stimata **58%** senza certificazione Publish.

