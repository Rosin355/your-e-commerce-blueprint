# Area clienti Online Garden · verbale del 21 novembre 2026

Collaudo eseguito dalla baseline `4f67bf8`. La [PR #64](https://github.com/Rosin355/your-e-commerce-blueprint/pull/64) registra il commit di integrazione e gli esiti della CI. La versione pubblica di riferimento proviene dal [rilascio ca9050d](../admin-v2/RELEASE-REPORT.md#registro-di-produzione) con Admin V2 `admin-delivery-20261121-r2`.

## Funzione consegnata e riscontri

| Controllo sull’area clienti | Esito | Evidenza |
| --- | --- | --- |
| 1. Configurazione e ingresso | PASS configurazione e ingresso pubblico | La configurazione Shopify risponde NEW_CUSTOMER_ACCOUNTS, collegamenti visibili e checkout senza login obbligatorio. La destinazione configurata corrisponde al negozio. /auth e /account raggiungono il modulo email Shopify con HTTP 200. |
| 2. Pulsanti e ritorno al negozio | PASS | Chromium a 1440 e 390 px e Safari macOS hanno raggiunto il modulo Shopify dal pulsante Account e sono rientrati in negozio. Su Safari nel simulatore iPhone 17 con iOS 26.3.1 due esecuzioni consecutive sul dominio pubblico hanno aperto il modulo e sono tornate alla vetrina con un tocco su Indietro. In una prima prova automatizzata il rientro non era stato rilevato. Il percorso pubblico è stato mantenuto. |
| 3. Ordini propri e dettaglio | PASS con prova pregressa del responsabile | Le schermate già fornite mostrano un ordine Shopify del profilo autenticato, i suoi articoli e il totale. La prova copre quel profilo e quell’acquisto. [Verbale originario](../release/SAL-2026-11-21.md#aggiornamento-21-novembre-2026--collaudo-cliente-autenticato-e-rilascio). |
| 4. Separazione e privacy del percorso | PASS | /admin mantiene l’ingresso personale staff. Il percorso clienti ospitato usa Shopify. Durante la prova dal pulsante sono state osservate zero richieste di autenticazione staff e zero chiamate alla Edge legacy. Il sorgente legacy risponde 410 senza corpo; una HEAD anonima senza parametri alla route di produzione restituisce 410. Le prove sintetiche controllano errori sanitizzati, stato staff e output del preflight. |
| 5. Carrello e checkout | PASS | Dal sito pubblico una Dalia Purple Queen è stata aggiunta a un carrello ospite. Checkout Shopify raggiunto con articolo e prezzo di 5,00 €. Zero ordini, zero pagamenti. |
| 6. OTP e scadenza della sessione ospitata | PENDING_CONTROLLED_IDENTITY_TEST | Il form è stato osservato. Per attestare consegna del codice, accesso successivo e nuova autenticazione dopo scadenza occorre la sessione controllata del titolare. Nessun codice inviato dal collaudo. |
| 7. Logout e cambio account | PENDING_CONTROLLED_IDENTITY_TEST | Logout, pulizia e accesso successivo verificati su fixture della SPA opzionale. La sequenza ospitata richiede due identità autorizzate distinte. |
| 8. Isolamento fra due clienti reali | PENDING_CONTROLLED_IDENTITY_TEST | Le fixture A e B hanno ordini e sessioni distinti. Per il riscontro live servono due profili controllati con ordini propri riconoscibili. |

La configurazione non prevede un lookup per email dal browser. Il percorso predefinito demanda identità e ordini a Shopify. La SPA opzionale è disabilitata. Qualora abilitata, usa il contesto customer autenticato, controlla l’identità al rinnovo e limita la persistenza al proprio namespace. Il codice di checkout non dipende da Supabase Auth. La verifica dei log ha riguardato il sorgente applicativo e sentinelle sintetiche, senza consultare log privati del provider.

## Test e ripetibilità

- Typecheck e build Vite. Suite customer-auth di 28 test su credenziali sintetiche. Comprende logout e nuovo accesso A/B nella stessa scheda, scadenza, risposte tardive, gestione dei rifiuti di sessione durante la paginazione e ripresa dopo un errore temporaneo.
- Due test Playwright con destinazione Shopify simulata per i pulsanti desktop e mobile e ritorno al negozio. Le verifiche pubbliche con Shopify e il test Safari iOS sono distinti dai mock.
- 73 test offline su preflight, output sanitizzato, contratto pilota e recupero storico. Il comando sintetico email-only termina con il codice di revisione 2 e dichiara zero richieste, scritture e file personali.
- Nella SPA opzionale la prima prova ha riprodotto tre regressioni equivalenti. Se la richiesta della pagina successiva riceveva HTTP 401/403 o un’identità diversa, il profilo precedente rimaneva visualizzato. La correzione rimuove la sessione cliente quando l’accesso viene revocato. In caso di guasto temporaneo il cliente può riprovare.

## Come chiudere l’accettazione

Usare due profili di collaudo distinti, già autorizzati, ciascuno con un ordine conosciuto. I titolari inseriscono personalmente i codici nella pagina Shopify. Ciascuno controlla il proprio elenco e apre il dettaglio del proprio ordine. Dopo Esci, riaprire l’area dalla stessa scheda, effettuare il secondo accesso e controllare che le precedenti informazioni non ricompaiano. Ripetere il rientro dopo una scadenza reale. Registrare solo data, browser ed esiti. Il responsabile registra l’accettazione dopo la prova. Nessuna consultazione di ordini di clienti estranei.

La SAL di collaudo dell’area clienti è **62,5%**. Cinque controlli su otto hanno un riscontro sufficiente per il perimetro indicato. I tre controlli con identità restano aperti. Il responsabile ha documentato la consultazione del proprio ordine. L’accettazione finale dell’intero percorso è da registrare. La SAL generale mantiene il metodo e i pesi del progetto. [Guida per Marco](CLIENT-GUIDE.md) · [Piano di riconciliazione](MIGRATION-READINESS.md) · [SAL ponderata](../release/SAL-2026-11-21.md).

## Rilascio e rollback

La correzione applicativa riguarda esclusivamente la paginazione del client OAuth SPA opzionale, disattivato in produzione. L’ingresso pubblico continua a usare l’account Shopify ospitato. Il rilascio della correzione può avvenire con la prossima pubblicazione del frontend e deve precedere qualsiasi attivazione della SPA. Per questo collaudo non è necessario un nuovo Publish. La produzione verificata serve `/assets/index-DSQ4UzGV.js` con SHA-256 `4f603cd21fdfae105489a165b8986bfea2b3a636f73585cfe21d85ef7c73e0fa` e marker staff `admin-delivery-20261121-r2`. Nessun deploy Edge o SQL.

In caso di regressione della futura pubblicazione, ripristinare la precedente versione frontend verificata tramite la cronologia del progetto e verificare di nuovo ingresso clienti, staff e checkout. Per annullare il solo fix nel codice, applicare un revert mirato sul main corrente e ripetere i test cliente. Non è stato necessario un rollback operativo.
