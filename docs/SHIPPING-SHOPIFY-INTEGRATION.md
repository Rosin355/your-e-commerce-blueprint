# Integrazione tariffe Shopify — audit, architettura e rilascio

**3 novembre 2026 — PREPARAZIONE LOCALE; SHOPIFY NON SINCRONIZZATO; RILASCIO BLOCCATO.** Branch `codex/shopify-shipping-rates`, base `origin/main@8ad26ba66e8c3b49987544934bbcc8c1a0915aa0`. Worktree separato da modifiche locali e PR #42. Nessun deploy, ordine, addebito, mutation Shopify, modifica checkout applicativo, pagamento, flag o componente Admin V2.

## Audit Admin API

Store verificato per ID `102600966484`: Online Garden, dominio permanente `ecom-blueprint-gen-6ud1s.myshopify.com`, valuta EUR, piano **Grow**, `shopifyPlus=false`, `partnerDevelopment=false`. `taxesIncluded=true`, `taxShipping=false`; fuso store `America/New_York`. Il rilascio si coordina in Europe/Rome senza cambiare queste impostazioni.

Un solo profilo **Profilo generale**, ID `139796676948`, versione **1**; un gruppo `142245462356`, una sede `117678014804`, nessuna sede non assegnata. Tutte le 1.392 varianti risultano associate a questo profilo; il contatore aggregato restituisce solo `500 / AT_LEAST`, quindi non è stato usato come conteggio completo. Il campo `coversAllItems=false` nell'istantanea iniziale non indica da solo varianti mancanti: le associazioni sono state verificate separatamente.

| Zona attuale | Condizione | Prezzo | ID metodo |
|---|---|---:|---|
| Italia `682687136084` | 0–54,99 € inclusi | 7,00 € | `1265953046868` |
| Italia | Da 55 € | 0,00 € | `1265953014100` |
| UE `682687168852`, 26 paesi | Da 0 € | 14,99 € | `1265953079636` |
| Internazionale `682687201620`, 14 paesi | Da 0 € | 19,99 € | `1265953112404` |

Profili, sedi, zone, metodi, condizioni e criteri monetari sono stati letti includendo regole attive/inattive e controllando la paginazione. I quattro metodi letti sono attivi; nessuna distinzione A/B o isole/CAP. [Backup profilo e condizioni](shipping-evidence/2026-11-03/profile.json), [copertura varianti](shipping-evidence/2026-11-03/variants-profile-coverage.json).

App installate: Flow, Lovable, Messaging, OnlineGardenPerplexity, OnlineGardenInventoryOttobre, Shopify ChatGPT MCP App, **Sendcloud**. Nessun carrier service registrato. Sendcloud ha accesso shipping, ma l'installazione non dimostra che stia calcolando le tariffe al checkout. Non sono accessibili attraverso questi strumenti le sue impostazioni interne o il suo abbonamento. Le regole Sendcloud di spedizione post-ordine non equivalgono a regole di prezzo checkout. [Evidenza app](shipping-evidence/2026-11-03/apps.json), [carrier](shipping-evidence/2026-11-03/carriers.json), [documentazione Sendcloud](https://support.sendcloud.com/hc/en-us/articles/360024966852-Shopify-Integration).

`deliveryCustomizations` restituisce **Access denied: read_delivery_customizations**. Non si dichiara quindi che non esistano personalizzazioni. L'audit deve essere completato con accesso autorizzato o verifica amministrativa prima del rilascio. [Errore registrato](shipping-evidence/2026-11-03/customs.json).

## Architettura raccomandata

Il frontend esistente crea il carrello Storefront API e usa il `checkoutUrl` Shopify: nessuna modifica necessaria. Il pacchetto `shipping/` è un riferimento offline per test e generazione della configurazione; **non è un rate provider installato**, non viene importato dallo storefront e non può modificare il prezzo di un checkout reale.

Proposta prioritaria: **un solo profilo generale, 18 tariffe native per prezzo e un'app pubblica di Delivery Customization che lasci una sola opzione corretta**.

1. Le 18 regole rappresentano A: 6 fasce × 2 aree, B: 3 fasce × 2 aree. Le condizioni `TOTAL_PRICE` restano gestite da Shopify. Massimi inclusivi al centesimo; ultima fascia illimitata.
2. L'app sceglie B soltanto se **tutte** le varianti fisiche hanno una classe ridotta approvata; altrimenti A. Seleziona inoltre standard/speciale da geografia approvata. Non somma i costi e non usa prezzi di singoli sottocarrelli.
3. Shopify propone le fasce coerenti col proprio totale; l'app nasconde le altre combinazioni di classe e area e rinomina l'unica opzione visibile «Spedizione standard» oppure «Spedizione isole e zone disagiate».
4. Il filtro opera solo su destinazione IT e sui codici `OG-*` previsti. Nessuna selezione per semplice importo, nome generico «Standard» o dato fornito dal browser. UE/internazionale restano esclusi dal diff.
5. Sconosciuti → A. CAP non risolvibile, geografia non approvata, gruppo multiplo o prodotto non consegnabile richiedono gestione esplicita e test, senza selezione arbitraria della tariffa più economica.

Una [Delivery Customization può nascondere, ordinare e rinominare opzioni](https://shopify.dev/docs/api/functions/2026-01/delivery-customization), non creare un prezzo. Il prezzo viene quindi dalle regole native; l'app esegue soltanto la selezione. Questo preserva la base effettiva Shopify per sconti, imposte e arrotondamenti. Non assumiamo che un subtotal Storefront o una somma di `price × quantity` equivalga automaticamente alla base `TOTAL_PRICE`.

**Carrelli misti:** il contratto locale è testato, ma l'esecuzione nel checkout non è ancora provata. Due profili tradizionali sono esclusi perché [Shopify può combinarne e sommarne le tariffe](https://help.shopify.com/en/manual/fulfillment/setup/shipping-rates/setting-up-shipping-rates). Un unico profilo evita quel meccanismo, ma non elimina automaticamente gruppi di consegna distinti: sedi, disponibilità, fulfillment e delivery group devono essere verificati nei carrelli reali. Una risposta carrier per gruppo non garantirebbe da sola una singola tariffa globale.

Shopify sta introducendo [Shipping options by market](https://help.shopify.com/en/manual/fulfillment/setup/shipping-options/understanding-shipping-options-by-market), in early access per alcuni store: alcune regole native applicano il massimo invece della somma. Non ne è dimostrata disponibilità/attivazione per questo store né la copertura CAP richiesta; non si assume questa capacità e non viene proposta una migrazione automatica.

## Piano, app e costi

Una Function in una **custom app** non può essere attivata su Grow come se il negozio fosse Plus. [Vincolo Shopify](https://shopify.dev/docs/api/admin-graphql/latest/enums/DeliveryCustomizationErrorCode). Non viene preparata una custom app non distribuibile per questo piano.

Candidato documentato: **ShipX — Shipping Rates & Rules**, nella modalità Delivery Customization senza CCS. La documentazione del fornitore descrive condizioni prodotto/SKU e CAP e selezione delle opzioni esistenti. Il prezzo pubblicato Starter è **9,99 USD/mese**, Smart **19,99 USD/mese**; piano minimo, limiti, quantificatori su tutte le righe, variante/metafield o allowlist SKU, CAP + località e comportamento con gruppi multipli devono essere verificati prima di scegliere l'abbonamento. Nessuna installazione, spesa o messaggio al fornitore è stato effettuato. [Scheda e prezzi](https://apps.shopify.com/shipping-rates), [condizioni SKU](https://shipx.helpkit.so/delivery-customization-without-ccs-api/8jJcSMAS3Pn4ZqTxMFmBTV/product-based-delivery-customization/8jJcSMAS3PBTRMnKR86ju8), [modalità senza CCS](https://www.logbase.io/blog/shopify-shipping-based-on-zip-code).

L'idoneità del candidato è una **raccomandazione da dimostrare**, non una certificazione basata sulla scheda commerciale. Se il quantificatore universale o la granularità geografica non sono supportati, non si attivano le 18 tariffe: si prepara una soluzione alternativa compatibile e un nuovo diff concreto. Le regole dichiarative nell'app non sono gestibili automaticamente dalle generiche Admin API Shopify: la sincronizzazione comprende impostazioni app da esportare e verificare separatamente.

Un eventuale rate provider via **Carrier Calculated Shipping** richiede verifica dell'abilitazione: su Grow è disponibile con maggiorazione mensile o fatturazione annuale, secondo [Shopify](https://help.shopify.com/en/manual/fulfillment/setup/shipping-rates/third-party-carrier-calculated-shipping/carrier-accounts). La modalità raccomandata senza CCS evita questa dipendenza. L'importo dell'eventuale maggiorazione Shopify non è certificato dai dati disponibili e non è incluso in un preventivo. Il provider dovrebbe inoltre dimostrare base sconti e carrello completo: non basta sommare i prezzi ricevuti nel callback.

## Diff operativo previsto, non eseguito

[Piano JSON completo](shipping-evidence/2026-11-03/release-plan.json), generato con `npm run shipping:prepare`.

| Oggetto | Stato attuale | Modifica proposta |
|---|---|---|
| Profilo/gruppo/sede | Generale unico | Stessi ID e struttura |
| Zona Italia | Unica, tutte le province attuali | Stessa zona; distinzione CAP nell'app |
| Metodi Italia `1265953014100`, `1265953046868` | Gratis da 55 €, 7 € sotto soglia | Disattivare, conservare per rollback |
| Tariffe Italia A/B | Assenti | Creare 18 metodi con prezzi e soglie esatte nel payload |
| App selettore | Nessuna scelta/configurazione verificata | Installazione/configurazione separata ancora da definire e approvare |
| Definizione variante | Chiave nuova assente | Creare `logistics.shipping_class` condivisa con app, previa verifica assenza |
| Valori variante | Non approvati | Attualmente **0 scritture**; elenco definitivo solo dopo approvazioni |
| Geografia | Nessuna lista ufficiale | **Pending**, nessun CAP inventato |
| UE/internazionale, prezzi prodotto, categorie, pagamenti, frontend/Admin V2 | Stato esistente | Nessuna modifica prevista |

Il payload completo di esempio è validato contro lo schema Admin **2026-01**, insieme alle mutation e query riutilizzabili. La versione richiesta storicamente dal progetto `2025-07` non è più supportata dal toolkit; non viene modificata globalmente. Il connettore non espone l'header della versione realmente eseguita: la validazione 2026-01 non certifica quell'header. L'istantanea iniziale contiene anche `coversAllItems`, esposto dallo schema live del connettore ma assente nel validatore 2026-01: la query riutilizzabile lo omette e la copertura viene provata dalle associazioni variante/profilo.

Questo **non è ancora il diff finale autorizzabile**: mancano elenco prodotti approvati, CAP, esportazione delle regole app, costo/piano confermato e prove checkout. Non viene chiesta un'autorizzazione generica o parziale.

## Sincronizzazione controllata dopo chiusura dei blocchi

1. Completare geografia, approvazioni SKU/variante e audit delle personalizzazioni; verificare capacità/piano app. Preparare e provare l'intera matrice in staging autorizzato, senza ordini o pagamenti. Nessuna modifica live per costruire i dati di test.
2. Rileggere istantanee di profili, condizioni, associazioni, nuove chiavi e configurazione app; confrontare semanticamente il profilo con il backup e verificarne versione, valute e ID. Il fingerprint è un controllo locale, **non** un lock/API compare-and-swap sul profilo. Se cambia qualcosa, rigenerare il diff e fermare il piano precedente.
3. Presentare **una sola richiesta esplicita di autorizzazione live** con diff definitivo, scritture variante, CAP, app/costo, staging QA, tempi e rollback. Fino a quel momento nessuna mutation o installazione in produzione.
4. Dopo autorizzazione, creare definizione e valori approvati senza sovrascritture, controllando `userErrors`, digest e read-back a ogni batch. Applicare le regole app con ambito IT e verificare che non interferiscano con quelle correnti. Non rendere disponibili nuove tariffe senza il selettore completo.
5. Effettuare il cambio tariffario del profilo in un'unica richiesta pianificata: disattivazione dei due metodi precedenti e creazione dei 18 nuovi metodi. Non si assume una transazione distribuita fra app e Shopify: sequenza app/profilo, eventuale intervallo di incoerenza e recupero devono essere provati in staging. Se non si ottiene una sequenza sicura, il rilascio rimane bloccato.
6. Rileggere tutti i prezzi/soglie/ID, controllare esattamente un'opzione per ogni prova nativa e completare smoke senza pagamento: B puro, misto A, sconosciuto A, standard/speciale, sconti e quantità. Verificare anche assenza delle vecchie opzioni Italia e conservazione di UE/internazionale.
7. Solo con read-back e checkout nativi conformi aggiornare lo stato a sincronizzato/verificato. Registrare ID creati, digest, configurazione app e prove senza dati cliente o URL checkout sensibili.

Il codice di preparazione **non contiene un esecutore live né una modalità `--apply`**. Le mutation sono disponibili per gli strumenti Shopify dopo autorizzazione; la configurazione privata dell'app richiede le sue capacità/UI. Non viene promesso un sync puramente Admin API di impostazioni che appartengono a un fornitore esterno.

## Backup e rollback

Le evidenze conservano il profilo precedente con sedi, paesi/province, tutti i quattro metodi e condizioni, app/scopes, catalogo logistico e copertura. Sono un backup dello **scope letto**, non dell'intero negozio né delle impostazioni interne Sendcloud. Il rilascio richiede un backup fresco; le letture di oggi non vengono considerate eterne.

In caso di errore: fermare ulteriori scritture; riattivare i due vecchi metodi Italia e disattivare i 18 nuovi tramite gli **ID restituiti dall'operazione autorizzata**, senza cancellare per nome e senza modificare le zone estere. Ripristinare in modo coordinato il selettore app, che deve lasciare disponibili le tariffe legacy solo nel rollback verificato. Confermare il ripristino di 7 € / gratuità da 55 € come ritorno temporaneo alla configurazione precedente, non come tariffe approvate dal cliente.

I metafield aggiunti si rimuovono solo se creati da questa release e ancora uguali ai valori/digest registrati; nessuna cancellazione delle categorie o dei valori precedenti. La nuova definizione si elimina soltanto se vuota e priva di altri utilizzatori. Conservare gli identificatori e le evidenze; ripetere smoke senza pagamento. Un'app disabilitata o rimossa potrebbe lasciare visibili combinazioni tariffarie improprie: serve il rollback coordinato, non il solo spegnimento dell'app.

## Gate aperti

Geografia approvata; classificazione validata; app selezionata e provata; lettura `deliveryCustomizations`; base sconti verificata; gruppo unico provato; matrice staging; backup fresco; diff definitivo autorizzato. [Registro gate](../shipping/release-gates.pending.json). **Non implementato nel checkout live.**
