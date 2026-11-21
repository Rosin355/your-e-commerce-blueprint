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
