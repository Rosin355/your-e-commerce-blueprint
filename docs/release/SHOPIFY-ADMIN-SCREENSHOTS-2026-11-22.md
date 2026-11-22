# Online Garden — riscontro pannelli Shopify da screenshot (22 novembre 2026, ore ~21:57 CET)

**Fonte:** cinque screenshot inviati dal responsabile del progetto, screenshot di schermate amministrative Shopify. Sono evidenze visive del pannello, **non** un nuovo test automatico di checkout, rete o backend. Nessuna impostazione commerciale è stata modificata in questa verifica.

## Spedizioni / Mercati

- Pannello **Impostazioni → Spedizione e consegna → Opzioni di spedizione** mostra **2 mercati**: `Italy` e `Sicilia e Sardegna — Isole`, ciascuno con `Standard`.
- Messaggio del pannello: «La spedizione è stata spostata su Mercati»; questa notifica indica cambio di posizione UI, **non variazione dei prezzi**.
- Schermata **Italy**: attivo, include Italia; nel menu di spedizione risulta **1 opzione di spedizione attiva, Standard**. All'interno della Standard si leggono gruppi: `OG Logistica A — Ordinaria e sconosciuti` **€8,90–€54,00** e `OG Logistica B — Bulbi e succulente approvati` **€5,90–€8,90**, basati sull'importo dell'ordine. Non sono quindi due metodi distinti già disponibili come opzioni finali al checkout. **Non aggiungere opzioni senza collaudo Dev e autorizzazione**.
- In alto appare «1 app potrebbe richiedere l'aggiornamento dell'accesso ai dati»: l'app e lo scope **non sono identificati** dalla schermata; non attribuirlo automaticamente alle spedizioni e non concedere accessi indiscriminati.
- Non si vede il mercato Sicilia/Sardegna aperto nel dettaglio in questi screenshot. Non trarre nuove conclusioni sulle sue regole da tali immagini.
- **Rimane** l'ultima misura pubblica di 42/69 corretti e 27 difformità nelle nove località insulari (tre carrelli ciascuna); niente è cambiato qui.

## Privacy dei clienti

- `Informativa sulla privacy`: **Automatizzato**, pubblicata nel negozio online.
- `Banner dei cookie`: **Automatizzato, visibile in Italia**. Il responsabile conferma: banner attivo.
- `Pagina di opt-out per la condivisione dei dati`: **Automatizzato**, indicata «Non richiesto per le aree geografiche in cui vendi».
- `Shopify Network Intelligence`: **Abilitata**, descrizione Shopify sul miglioramento dei prodotti, targeting e personalizzazione. Questa impostazione va inclusa nella mappa dei trattamenti e nel riesame di privacy: **non decidere la base giuridica né la conformità dal solo stato UI**.
- `Posizione di hosting dell'archivio dati`: **Unione Europea** (impostazione mostrata, non prova che tutti i servizi e trasferimenti siano confinati in UE).
- Le scelte marketing email/SMS e double opt-in sono presenti come sezioni, ma gli stati interni **non sono visibili**.

## Informative

- `Informativa sulla privacy`: **Automatizzata, Pubblicato**.
- `Informativa su resi e rimborsi`, `Termini e condizioni del servizio`, `Informativa sulle spedizioni`, `Informazioni di contatto` (contrassegnate **Obbligatoria**), `Informativa legale`: **Nessuna informativa impostata**.
- `Regole di reso e annullamento`: **Nessuna regola impostata**. Non confondere questa sezione con la policy sui resi.
- **Non pubblicare** bozza r3 senza integrazione dati e approvazione di Marco; priorità particolare a contatti pubblici e condizioni legali.

## Eventi cliente

- Pannello `Eventi cliente → Pixel` mostra stato vuoto e inviti ad aggiungere pixel personalizzati/app. **Nessun pixel visibile nel pannello mostrato.** Questo non prova l'assenza di script esterni, servizi Lovable, pixel lato tema, Shopify Customer Events non rappresentati o richieste di rete.
- La prova precedente di evento Lovable HTTP 202 prima del consenso resta un gap aperto; il banner Shopify attivo **non dimostra** che sopprima l'evento esterno Lovable.

## Azione consigliata

1. In **Privacy dei clienti → Banner dei cookie**, aprire dettaglio in sola lettura e registrare regioni, comportamento del rifiuto, controllo delle preferenze e testo/link.
2. Nella scheda **Shopify Network Intelligence**, identificare finalità e impostazioni effettive prima di decidere se disattivarla o mantenere una base privacy adeguata.
3. In **Informative**, acquisire dati commerciali mancanti e approvare r3; non pubblicare testi incompleti.
4. In shipping non modificare Standard o A/B sul negozio live; serve accesso al negozio Dev per collaudo della selezione insulare a costo zero.

**SAL** originaria invariata: 57,75%. Questo documento registra nuove evidenze di impostazione, non chiusure produttive.

## Dettaglio banner cookie — screenshot aggiuntivi 22/11, ore ~22:03 CET

Schermata `Privacy dei clienti → Banner dei cookie` fornita dal responsabile:

- `Usa impostazioni automatiche`: **ON**; il pannello riporta «Il banner dei cookie è visibile in Italia».
- Anteprima del banner in italiano: «Consenso ai cookie», informazioni su finalità di personalizzazione/annunci/analisi, link Privacy, pulsanti **Accetta**, **Declina**, **Gestisci le preferenze**; selettore colori **Chiaro**; posizionamento **Inferiore al centro**.
- `Mostra banner dei cookie nel check-out`: **OFF** (toggle grigio), con messaggio Shopify che segnala possibile impatto sulla conversione in caso di abilitazione.
- Non è stata fotografata la scheda `Preferenze cookie`, né una prova della visualizzazione live sullo storefront React personalizzato `onlinegarden.it`, né il comportamento effettivo rifiuto/revoca o di Shopify Customer Privacy API.
- Il banner Shopify governa i servizi gestiti da Shopify; l'evento Lovable precedentemente osservato HTTP 202 prima del consenso **non risulta coperto** da questa schermata. Shopify documenta che script/pixel esterni possono richiedere gating di consenso specifico. Per gli storefront custom/headless la trasmissione del consenso richiede integrazione e test della Customer Privacy API. Non dichiarare conforme l'intero sito dal solo pannello.
- **Azione successiva senza modifica live:** navigare su `https://onlinegarden.it` in browser pulito/privato, osservare presenza del banner, aprire `Preferenze`, provare `Declina` e verificare persistenza e possibilità di modifica; poi provare il checkout ospite senza pagamento, distinguendo consenso Shopify e tracciamento Lovable. Valutare l'interruttore checkout in base al comportamento effettivo e alle esigenze legali, evitando di attivarlo alla cieca.

Fonti: [Shopify Customer Privacy settings](https://help.shopify.com/it/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings), [Shopify Customer Privacy API](https://shopify.dev/docs/api/customer-privacy).

## Prova reale del responsabile — vetrina in navigazione privata, 22/11/2026

**Nuova evidenza manuale:** aprendo `https://onlinegarden.it` in finestra privata, il responsabile **non vede comparire alcun banner cookie**. La schermata Admin Shopify lo mostra invece impostato in automatico e visibile in Italia. Non è stata rilevata da questa prova la regione IP stimata dal browser né ispezionato il pannello Network; sono quindi possibili ulteriori fattori regionali/tecnici da verificare, ma il difetto di integrazione resta concreto per la sessione descritta.

**Controllo del codice della vetrina React/Vite su repository/Lovable (22/11):** `index.html`, `src/main.tsx`, `src/App.tsx` non caricano né montano Shopify privacy banner, `privacyBanner.loadBanner`, Customer Privacy API né alcun componente esplicito di consenso. La mancanza in questi entrypoint, pur non essendo un inventario esaustivo di ogni bundle di terzi, è coerente con la mancata visualizzazione sul frontend personalizzato. Il testo Shopify della policy resta linkato, ma non sostituisce un consenso effettivo.

**Riferimento ufficiale:** [Shopify Customer Privacy API](https://shopify.dev/docs/api/customer-privacy#installation-on-a-custom-storefront). Per custom storefront utilizzare asset ufficiale `storefront-banner.js` oppure Customer Privacy API con parametri `headlessStorefront`, `checkoutRootDomain`, `storefrontRootDomain`, `storefrontAccessToken`, CSP coerente e logica `shouldShowBanner`, senza duplicazioni. Shopify chiarisce che frontend e checkout su root domain differenti non possono condividere cookie di consenso automaticamente; verificare il vero dominio checkout e la gestione della scelta prima di dichiararla persistente. Le scelte devono essere registrate solo dopo azione effettiva dell'utente, non con consenso implicito all'avvio. Il banner Shopify governa principalmente i trattamenti Shopify: script Lovable iniettato prima di React deve essere spento alla fonte o impedito prima del caricamento, non tramite un componente React tardivo.

**Priorità: alta, `COOKIE_BANNER_STOREFRONT_MISSING` = CONFIRMED_BY_USER, `PRECONSENT_TRACKING` = OBSERVED_IN_QA, `CONSENT_END_TO_END` = BLOCKED.** Nessuna impostazione è stata modificata. La SAL ufficiale resta 57,75%.

**Prossima azione mirata:** singola PR di integrazione con banner Shopify/API ufficiale nella SPA, con link permanente «Preferenze cookie»; distinguere scelta marketing/analytics/preferenze, rifiuto, revoca, persistenza, error handling e accessibilità. Nel medesimo rilascio, previa autorizzazione in finestra Lovable, disattivare la sola Visitor Analytics finché non esiste un gate pre-caricamento affidabile; preservare Project monitoring e checkout essenziale. Eseguire QA in un browser pulito geograficamente in Italia, anche Safari iOS; verificare dominio checkout e preferenze in checkout, poi testare carrello/account/Admin e network zero eventi opzionali prima della scelta. Pubblicare soltanto con test e approvazione release. Non introdurre CMP a pagamento a priori.
