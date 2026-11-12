# Aggiornamento in sola lettura — 12 novembre 2026

Su tre ordini già esistenti del 5–6 novembre, Shopify registra **tre eventi `mail_sent` con messaggio di conferma ordine**. Questo è un riscontro positivo dell’invio registrato dalla piattaforma, non della ricezione in casella. I messaggi sono stati classificati in memoria e soltanto l’esito sanitizzato è conservato nella [release evidence](seo/evidence/release-2026-11-12.json); nessun destinatario, ID ordine o URL firmato è copiato nel repository.

Ricerca mirata nella Gmail collegata: zero risultati, che non prova un guasto né l’assenza delle notifiche nelle caselle cliente/staff. Ricezione effettiva cliente/staff, mittente autenticato, contenuto template, spedizione/tracking restano non verificati. Nessun ordine, email o notifica di test creati; nessun destinatario, mittente o DNS modificato. Le procedure storiche sotto richiedono un consenso separato prima di generare ordini/invii e non sono attività eseguite in questa chiusura.

---

# Audit notifiche email Shopify — 31 ottobre 2026

**STATO: DOCUMENTATO; configurazione e consegna NON LIVE VERIFIED.** A fine sessione si è resa disponibile una connessione Admin autorizzata: confermati store, valuta, lingua principale e modello account. Il pannello delle notifiche, i template, il mittente autenticato e i destinatari staff non sono stati verificati. Nessuna email, ordine, modifica mittente, DNS o dominio effettuata. Il trasferimento del dominio resta un vincolo operativo.

Il checkout rimane Shopify nativo. Shopify fornisce notifiche cliente e staff basate sugli eventi; non è stato introdotto alcun servizio email duplicato in React/Supabase. [Documentazione ufficiale notifiche](https://help.shopify.com/en/manual/fulfillment/setup/notifications).

## Checklist esatta in pannello, solo lettura

Aprire **Shopify Admin → Impostazioni → Notifiche**. Registrare stato e anomalie in un documento privato sanificato; non copiare indirizzi cliente, URL ordine con token o credenziali nel repository.

| Verifica | Percorso / controllo | Evidenza da raccogliere | Esito attuale |
| --- | --- | --- | --- |
| Conferma ordine | Notifiche → Notifiche cliente → conferma ordine | Anteprima oggetto/corpo, riepilogo, logo, link stato ordine | Non verificato |
| Pagamento | Notifiche cliente → notifiche ordine/pagamento disponibili nello store | Distinguere conferma ordine, ricevuta/pagamento pendente e metodo realmente usato; non assumere una seconda email per ogni pagamento | Non verificato |
| Conferma spedizione | Notifiche cliente → conferma spedizione | Template e contenuti per fulfillment, non solo esistenza della voce | Non verificato |
| Aggiornamento tracking | Notifiche cliente → aggiornamento spedizione | Corriere, link e variabili; dipende dall'evento effettivo | Non verificato |
| Annullamento / rimborso | Notifiche cliente → ordine annullato / rimborso ordine | Oggetto, importi, lingua e condizioni della notifica | Non verificato |
| Nuovo ordine staff | Notifiche → Notifiche staff → destinatari e ambito | Destinatario previsto attivo e ambito canale/località; consultare senza salvare | Non verificato |
| Account cliente | Impostazioni → Account cliente; quindi template account in Notifiche | Nuovi account confermati via API; verificare template applicabili | Configurazione account verificata, email no |
| Mittente | Notifiche → Email mittente | Stato verificato/autenticato, warning, coerenza marchio; nessuna modifica | Non verificato |
| Lingua e branding | Anteprima dei singoli template, personalizzazione comune | Italiano in oggetto e corpo, logo e colori approvati, testi non obsoleti | Non verificato |
| Stato ordine | Anteprima conferma e successivamente email di test autorizzata | Destinazione corretta e visualizzazione Safari/mobile; non pubblicare il link firmato | Non verificato |

Per le notifiche staff, la pagina permette di consultare i destinatari e le notifiche loro assegnate. Non usare **Invia notifica di test** durante questo audit. [Guida staff](https://help.shopify.com/en/manual/fulfillment/setup/notifications/staff-notifications).

Conferme spedizione, tracking, annullamenti e rimborsi possono dipendere anche dalla scelta di notificare durante l'operazione. Verificare questa condizione nel futuro test autorizzato: la presenza di un template non dimostra che l'evento abbia inviato l'email. [Guida notifiche cliente](https://help.shopify.com/en/manual/fulfillment/setup/notifications/customer-notifications).

I nuovi account cliente possono usare un codice monouso via email; gli account legacy hanno un flusso diverso. Verificare quale modello Shopify è effettivamente attivo e distinguerlo dall'accesso Supabase dell'Admin Online Garden. Non dedurre dal frontend che i due account siano unificati. [Account cliente Shopify](https://help.shopify.com/en/manual/customers/customer-accounts).

Un template già personalizzato può non seguire automaticamente il cambio lingua del tema: controllare oggetto e corpo di ciascun evento in italiano. La personalizzazione comune consente logo/colori; nessuna modifica effettuata. [Template e lingua](https://help.shopify.com/en/manual/fulfillment/setup/notifications/customizing-notification-template).

Durante il trasferimento dominio annotare solamente gli avvisi sul mittente. Un'eventuale autenticazione del dominio va pianificata separatamente quando il provider DNS è stabile e autorizzato. Non cambiare record, mittente o risposte. [Configurazione email ufficiale](https://help.shopify.com/en/manual/intro-to-shopify/initial-setup/setup-your-email).

## Procedura di consegna reale, da autorizzare separatamente

1. Ottenere autorizzazione scritta per finestra, destinatari test cliente/staff, prodotto canary e metodo sandbox. Confermare assenza di addebiti reali e procedure di ripristino con il responsabile Shopify; non attivare autonomamente la modalità test su un negozio commerciale.
2. Registrare configurazione iniziale in lettura. Eseguire un ordine di test nel checkout Shopify autorizzato, da Safari desktop e da un dispositivo iOS reale; controllare anche Android/Chrome se usato dal cliente.
3. Correlare timestamp/evento Shopify, identificativo ordine sanificato e ricezione effettiva nelle due caselle concordate. Verificare Inbox/Spam, mittente/reply-to, oggetto italiano, importi, logo, immagini e link stato ordine.
4. Solo se inclusi nell'autorizzazione, simulare fulfillment/tracking, annullamento e rimborso sandbox e verificare ogni evento atteso. Non confondere un ordine annullato con uno rimborsato né promettere un messaggio non previsto dal metodo di pagamento.
5. Ripetere solo i casi falliti dopo diagnosi; verificare che non arrivino notifiche duplicate da app/automazioni. Conservare prove sanificate in archivio riservato.
6. Il responsabile verifica il ritorno alla configurazione operativa e firma l'esito. Finché manca una ricevuta effettiva correlata agli eventi, mantenere il gate email aperto.

**Criterio PASS:** cliente e staff ricevono gli eventi concordati, contenuti e link corretti, nessun duplicato e nessun addebito reale. Un'anteprima o un test template isolato non è prova end-to-end.


## Addendum live read-only, fine sessione

Store corretto confermato: Online Garden, `ecom-blueprint-gen-6ud1s.myshopify.com`, valuta EUR. `shopLocales`: italiano principale e pubblicato. Account Shopify: `NEW_CUSTOMER_ACCOUNTS`, facoltativi; link login visibili, login al checkout non obbligatorio. Questo verifica il modello account e la lingua dello store, **non** lingua effettiva dei template personalizzati, mittente, destinatari staff o recapito dei codici/email. Lo schema GraphQL consultato non ha fornito un percorso di lettura dei template delle notifiche native; resta necessaria la checklist nel pannello.

[Evidenza sanificata e query](admin-v2-evidence/2026-10-31/shopify-read-only-summary.json). Nessuna query a clienti/ordini, nessun valore di credenziale conservato, nessuna mutation.
