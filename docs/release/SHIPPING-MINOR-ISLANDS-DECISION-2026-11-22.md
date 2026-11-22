# Online Garden — decisione commerciale definitiva isole minori (22 novembre 2026)

**Aggiornamento della verifica Dev.** La home di *Online Garden Shipping Test* nega l’accesso all’identità disponibile. Il Dev non figura come PreviewStore accessibile dal connettore corrente e su Grow manca la lettura delle personalizzazioni. Restano da verificare due opzioni già prezzate e acquistabili, una sola visibile alla destinazione corretta, wallet e gestione di frazioni/CAP condivisi secondo la lista contrattuale del vettore. Esito **BLOCKED**, costo sostenuto **0 €**. [Risultati e condizioni di attivazione](FINAL-COMMERCIAL-CLOSEOUT-2026-11-22.md#a-spedizioni)

## Esito del 22 novembre · 69 preventivi veri e copertura parziale

Tre carrelli ospite con una Rosa Jasmina da 18,50 € (A), una Dalia Purple Queen da 5,00 € (B) e i due articoli insieme da 23,50 € (misto). Verificata l’appartenenza della variante B all’elenco di 161 ID della PR #45 e l’assenza della variante A dallo stesso elenco. Usati Storefront Cart e indirizzi di prova senza recapiti, sostituendo l’indirizzo a ogni lettura. Nessuna chiamata di creazione ordine. Per questi tre subtotali i valori attesi Italia sono 8,90 / 5,90 / 11,90 €, quelli speciali 9,60 / 6,90 / 12,50 €. Le classi e le soglie restano quelle approvate nel seguito.

| Gruppo e coppie CAP/località campionate | Zone attese | Riscontro API A/B/misto |
|---|---|---|
| Portoferraio 57037, Lido di Venezia 30126, Pellestrina 30126, Capri 80073, Ischia 80077, Procida 80079, Ponza 04027, Ventotene 04031, Isole Tremiti 71051 | Speciale | **27/27 difformi**, tariffa Italia |
| Lipari 98055 (Eolie), Favignana 91023 (Egadi), Lampedusa 92031, Pantelleria 91017 | Speciale | 12/12 corrispondenti |
| Livorno 57123, Mestre 30171 (terraferma veneziana), Napoli 80133, Latina 04100, Foggia 71121 | Italia | 15/15 corrispondenti |
| Messina 98122, Trapani 91100, Agrigento 92100, Palermo 90133, Cagliari 09124 | Speciale del mercato regionale | 15/15 corrispondenti. Le città siciliane e sarde sono controlli regionali e seguono la speciale |

**Checkout ospitato.** Nove letture stabilizzate su Portoferraio, Livorno e Lipari, con CAP, città e provincia controllati nel modulo e una sola opzione Standard. Portoferraio riproduce l’errore nelle tre composizioni, Livorno applica le tre tariffe ordinarie e Lipari le tre speciali. Gli altri sessanta casi sono preventivi del motore Shopify.

**Fonte geografica.** Il PDF pubblico di Poste Italiane fornisce abbinamenti CAP/località per il proprio servizio. SHA-256 del documento acquisito `fdb2024b551adfebd669697c46686a73d493f2058e8efce162a64411732d7189`. Alcune sigle della tabella sono distretti operativi differenti dalla provincia amministrativa (es. Ventotene e Tremiti). Per il checkout usare le province LT e FG. La Municipalità di Venezia conferma Lido e Pellestrina nello stesso comune. Il campione comprende località e arcipelaghi rappresentativi, senza estendere il risultato alle altre frazioni. Per il file operativo servono versione corrente del vettore/servizio concordato, eccezioni per strada nei CAP condivisi, alias documentati, località non servite e data di efficacia. Evitare l’inclusione delle località montane per il solo fatto che compaiono nel PDF del vettore. [Poste Italiane](https://business.poste.it/business/files/1476629075287/Elenco-CAP-Localita-Disagiate.pdf) · [Aggiornamenti CAP](https://www.poste.it/cap/) · [Comune di Venezia](https://www.comune.venezia.it/content/lido-pellestrina) · [Comune di Ventotene](https://comune.ventotene.lt.it/)

**Verifica ripetibile.** Il file di riferimento conserva CAP come testo, valuta, subtotali, conteggio opzioni, importi attesi e rilevati in centesimi. Dalla radice eseguire `python3 scripts/qa/check-island-quotes.py` sullo stato corrente oppure passare il CSV ricavato dal candidato. Zero equivale a tutte le 69 corrispondenze sul campione. L’esito iniziale è 1 per le 27 anomalie note. Un file incompleto non supera il controllo. Conservare in privato gli eventuali riferimenti ai carrelli. Rieseguita anche la suite di regole del ramo approvato con 295 casi superati, inclusi estremi delle fasce, composizione del carrello e gestione delle destinazioni. [Matrice e preventivi](evidence/shipping-islands-2026-11-22.csv) · [Regole di riferimento](https://github.com/Rosin355/your-e-commerce-blueprint/blob/b6ac09b/shipping/rules.mjs)

### Capacità disponibili e configurazione proposta

Piano Shopify **Grow**, non Plus. Markets gestisce le spedizioni e i sottomercati provinciali. Carrier services 0 su pagina completa, app Sendcloud installata. `shopifyFunctions` non ha restituito funzioni visibili alla connessione. L’elenco delle delivery customizations richiede uno scope assente. Serve una lettura amministrativa delle personalizzazioni realmente attive. La fatturazione annuale e l’abilitazione CCS non sono dimostrate dal nome Grow. Nessuna risorsa, sottoscrizione o tariffa creata.

| Soluzione | Esito |
|---|---|
| Markets, zone e consegna locale | Il criterio Markets disponibile per la destinazione italiana arriva alla provincia. La consegna locale per CAP è una modalità distinta, legata a sede e disponibilità. Non sostituisce il servizio nazionale del corriere né garantisce che sparisca la tariffa ordinaria. [Zone Shopify](https://help.shopify.com/en/manual/fulfillment/setup/shipping-rates/setting-up-shipping-rates) · [Consegna locale](https://help.shopify.com/en/manual/fulfillment/setup/delivery-methods/local-delivery) |
| Function proprietaria | Delivery Customization può nascondere, rinominare, riordinare metodi già quotati. Non imposta importi. Le app custom con Functions richiedono Plus. Lo sconto spedizione riduce il prezzo e non implementa la maggiorazione. [Operazioni ammesse](https://shopify.dev/docs/api/functions/latest/delivery-customization) · [Disponibilità per piano](https://shopify.dev/docs/apps/build/functions) |
| Opzioni native prezzate + selettore pubblico compatibile con Grow | Candidato da provare su ambiente di test già disponibile. Per Italy predisporre due opzioni a valore con identità distinguibili, una ordinaria e una speciale, replicando fasce e gruppi A/B approvati. Sicilia/Sardegna mantengono la loro singola Standard. Un selettore applica country IT, provincia, CAP e località normalizzata e nasconde l’opzione incompatibile. Per l’utente deve rimanere un solo prezzo. «DS Hide Payment Hide Shipping» è esposta come gratuita e indica criteri ZIP/indirizzo. L’effettiva combinazione CAP + località, i limiti di regole, l’identificazione stabile delle opzioni Markets e il comportamento express richiedono una prova. Il prezzo della scheda non certifica l’idoneità. Nessuna installazione autorizzata o eseguita. [Scheda App Store](https://apps.shopify.com/ds-shipping-payment-hide-sort) |
| Sendcloud o callback CCS | Le shipping rules Sendcloud possono associare un metodo checkout a un servizio logistico. L’installazione non prova il calcolo al checkout. Un fornitore CCS potrebbe quotare un unico importo usando l’indirizzo e le varianti, solo dopo verifica della disponibilità Grow, dei costi contrattuali, dei dati effettivamente forniti (incluse promozioni e gruppi), tempi di risposta e fallback. Grow può includere CCS con annualità o con supplemento. Nessuna variazione di piano prevista. [Shopify CCS](https://help.shopify.com/en/manual/fulfillment/setup/shipping-rates/third-party-carrier-calculated-shipping/index) · [Sendcloud](https://support.sendcloud.com/hc/en-us/articles/360049346772-Setting-up-shipping-methods-in-Shopify) |

**Decisione tecnica.** Non è dimostrata una soluzione esclusivamente nativa a costo incrementale nullo per tutte le località. Provare prima il selettore già installato se l’Admin ne dimostra l’esistenza e l’idoneità. In sua assenza, solo dimostrazione isolata della soluzione a due opzioni, senza autorizzare costi o permessi sul negozio live. Prima del rilascio verificare CAP condiviso con nome del comune anziché frazione, alias, indirizzo incompleto/accelerato, più gruppi di consegna, sconti e tutte le soglie ±0,01 €, Italia e mercati esteri. Per un indirizzo ambiguo fermare l’estensione e documentare la risoluzione concordata. Un filtro per nome libero o un valore di default italiano non costituiscono copertura completa.

**Attivazione e rollback.** Esportare privatamente Markets, gruppi, opzioni, condizioni, ordini di priorità, personalizzazioni attive e lista B. Approvare lista/versione, costo zero, ambito e risultati di prova. Coordinare attivazione dei due metodi e selettore senza finestra con entrambi acquistabili. Se la soluzione non può farlo in sicurezza, sospendere il rilascio. Verificare almeno un checkout per ogni zona e composizione con una sola opzione, poi l’intera matrice e i casi ambigui. In caso di tariffa errata, doppia o mancante ripristinare lo snapshot delle opzioni originali e la configurazione del selettore coordinatamente. Controllare preventivi in Italia, Sicilia/Sardegna, estero e rientro dei 161 ID invariati. `SHIPPING_MINOR_ISLANDS` resta aperto.

## Decisione commerciale originaria

**Fonte:** conferma esplicita comunicata dal responsabile il 22 novembre 2026, riferita alla decisione di Marco. **Stato decisione commerciale: APPROVATA. Stato applicazione tecnica sulle isole minori: NON ANCORA ATTESTATA.** Non confondere i due stati.

## Regola approvata, senza nuovi importi

Le **isole minori italiane e le località insulari/disagiate documentate** devono applicare **esattamente le stesse tabelle «Isole e zone disagiate» già configurate e approvate per Sicilia e Sardegna**, rispettando entrambe le classi logistiche:

- **Classe A** (piante ordinarie, prodotti voluminosi/sconosciuti, carrelli misti): carrello **0–18,99 € → 9,60 €; 19–79,99 € → 12,50 €; 80–149,99 € → 14,90 €; 150–249,99 € → 17,50 €; 250–499,99 € → 36,00 €; da 500 € → 54,00 €**.
- **Classe B** (solo bulbi e succulente/grasse con approvazione): **0–49,99 € → 6,90 €; 50–149,99 € → 8,90 €; da 150 € → 9,50 €**.
- **Nessuna gratuità**; tariffe A e B non si sommano e i carrelli misti ereditano A.
- La classe B è gestita tramite elenco varianti esplicito, non tramite tag o parole del titolo; preservare ID e policy live.
- **Non estendere** il supplemento a intere province continentali miste (per esempio LI, VE, NA) per includere un'isola e non introdurre un supplemento per tutto il Sud Italia.

Esempi già citati nella matrice originale: **Elba, Lido di Venezia, Pellestrina, Capri, Ischia, Procida, Eolie, Egadi, Ponza, Tremiti, Lampedusa, Pantelleria**. La **lista operativa esaustiva dei CAP/località e delle eventuali «zone disagiate» continentali resta da acquisire da fonte attendibile**: gli esempi non sono una tabella CAP pronta per produzione.

## Stato tecnico e limiti verificati

1. La lettura Shopify Admin GraphQL del 22/11/2026 conferma che il mercato **Italy** e il mercato **Sicilia e Sardegna — Isole** sono ACTIVE e presentano le tabelle A/B corrette, nessuna gratuità.
2. La PR [#45](https://github.com/Rosin355/your-e-commerce-blueprint/pull/45) registra sei checkout positivi (5 novembre), compresi Palermo/Cagliari. La PR rimane Draft/non merged ma l'attivazione di Shopify Markets è confermata in readback.
3. Shopify Markets per area/provincia **non è stato dimostrato sufficiente** a distinguere le isole minori dal resto della provincia. **Non dichiarare l'intervento completato al checkout delle isole minori senza una soluzione CAP/località verificata.**
4. Nessuna app nuova, spesa ricorrente, cambio dominio, modifica del carrello frontend, scrittura di tariffe o nuova policy di spedizione viene autorizzata implicitamente da questa registrazione.
5. Il connettore corrente non ha lo scope `read_delivery_customizations`. Accertare con accesso autorizzato quali customizzazioni siano operative; non scegliere un workaround che nasconda opzioni e impedisca l'acquisto.

## Criteri di chiusura tecnica

- Verificare disponibilità tecnica e costi della soluzione selettiva per CAP/località su piano Shopify e checkout nativo, mantenendo il listino A/B esistente e la compatibilità con Sendcloud.
- Ottenere lista ufficiale destinazioni, inclusi CAP/località ambigui, con copertura minima per Elba, Lido/Pellestrina, Capri/Ischia, Eolie e altri casi pertinenti; aggiungere test di non-regressione per **Livorno città, Venezia città, Napoli città**.
- Eseguire un test con carrello A, B e misto su territorio speciale e ordinario, includendo confini delle fasce e un preventivo checkout senza pagamento. Evidenziare ogni destinazione non distinguibile/servita.
- Rileggere Shopify post-eventuale autorizzazione, registrare codice/configurazione e rollback. Soltanto dopo marcare `SHIPPING_MINOR_ISLANDS=PASS`.

## Impatto SAL

La decisione commerciale «quale tariffa usare» è **CHIUSA**. La distribuzione tecnica sulle isole minori resta **PENDING_TECHNICAL_IMPLEMENTATION_AND_QA**, senza incremento SAL arbitrario. Le altre tariffe A/B live sono preservate.

Fonti: [matrice approvata PR #45](https://github.com/Rosin355/your-e-commerce-blueprint/blob/b6ac09b2059cff561ee36ec8ee331da4363cca4a/docs/SHIPPING-RATE-MATRIX.md) · [tariffe live aggiornate](SHIPPING-LIVE-RATES-2026-11-22.md).
