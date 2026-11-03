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

**Vincolo cliente recepito: Sendcloud resta la piattaforma logistica; il corriere verrà scelto successivamente dal cliente. Nessun nuovo servizio o abbonamento è autorizzato.** La tariffa pagata dall'acquirente è il listino commerciale A/B, indipendente dal costo di acquisto della spedizione presso il futuro corriere.

L'architettura separa due responsabilità: Shopify deve applicare realmente il prezzo A/B al checkout; Sendcloud deve ricevere gli ordini e gestire la spedizione successiva. Il meccanismo di prezzo checkout resta **NON RISOLTO sul piano attuale**, perché l'app Sendcloud standard non dimostra quella capacità e il percorso Dynamic Checkout documentato richiede Shopify Plus. Non si sostituisce Shopify con un checkout Lovable.

Il template locale conserva 18 combinazioni (A: 6 × 2; B: 3 × 2) con condizioni native `TOTAL_PRICE`. È ora marcato **CONDITIONAL_REFERENCE_TEMPLATE_NOT_SELECTED_FOR_DEPLOYMENT**: non è una configurazione Sendcloud pronta né una scelta di acquisto di un selettore esterno. `deploymentCandidate=null` nel piano generato impedisce di presentarlo come rilascio scelto.

Rimangono invarianti: B solo con tutte le varianti fisiche approvate bulbi/grasse; una riga ordinaria o sconosciuta impone A; intero totale rilevante Shopify; nessuna somma; una sola tariffa; CAP/località solo da mappa approvata; ambito IT e nessuna variazione alle zone estere. I costi del corriere e le Shipping Rules post-ordine non possono sostituire questo contratto.

Il precedente contratto generico di selezione resta soltanto come alternativa di riferimento non selezionata. Una [Delivery Customization](https://shopify.dev/docs/api/functions/2026-01/delivery-customization) potrebbe selezionare tariffe native, ma ciò non significa che Sendcloud standard implementi il contratto. Non si assume l'equivalenza fra un subtotal Storefront e `TOTAL_PRICE`.

**Carrelli misti:** il contratto locale è testato, ma l'esecuzione nel checkout non è ancora provata. Due profili tradizionali sono esclusi perché [Shopify può combinarne e sommarne le tariffe](https://help.shopify.com/en/manual/fulfillment/setup/shipping-rates/setting-up-shipping-rates). Un unico profilo evita quel meccanismo, ma non elimina automaticamente gruppi di consegna distinti: sedi, disponibilità, fulfillment e delivery group devono essere verificati nei carrelli reali. Una risposta carrier per gruppo non garantirebbe da sola una singola tariffa globale.

Shopify sta introducendo [Shipping options by market](https://help.shopify.com/en/manual/fulfillment/setup/shipping-options/understanding-shipping-options-by-market), in early access per alcuni store: alcune regole native applicano il massimo invece della somma. Non ne è dimostrata disponibilità/attivazione per questo store né la copertura CAP richiesta; non si assume questa capacità e non viene proposta una migrazione automatica.

## Piano, app e costi

Una Function in una **custom app** non può essere attivata su Grow come se il negozio fosse Plus. [Vincolo Shopify](https://shopify.dev/docs/api/admin-graphql/latest/enums/DeliveryCustomizationErrorCode). Non viene preparata una custom app non distribuibile per questo piano.

La proposta precedente di un'app aggiuntiva come prima scelta è **superata dal chiarimento del cliente**. Nessuna app esterna viene selezionata o installata; nessun upgrade Shopify/Sendcloud viene attivato. Il piano e il costo dell'account Sendcloud non sono verificati: non si introduce un preventivo basato su supposizioni.

La [guida ufficiale Sendcloud per Shopify Dynamic Checkout](https://support.sendcloud.com/hc/en-us/articles/27525573677201-Shopify-Plus-Dynamic-checkout-app) indica Shopify Plus e account Sendcloud idoneo fra i prerequisiti. Grow non soddisfa il requisito Shopify. Le [Shipping Rules](https://support.sendcloud.com/hc/en-gb/articles/10274470454292-Create-your-shipping-rules) agiscono dopo l'importazione ordine; le [Checkout Rules](https://support.sendcloud.com/hc/en-gb/articles/18580048370705-Checkout-rules) richiedono invece Checkout API/Dynamic Checkout. La documentazione generica di quest'ultima non prova la disponibilità nel plugin Shopify standard. [Audit Sendcloud dettagliato](SHIPPING-SENDCLOUD-AUDIT.md).

Un eventuale provider CCS richiederebbe anche verifica dell'abilitazione Grow, base sconti e carrello completo. Non è una soluzione selezionata né un'autorizzazione a creare un servizio esterno. Prima di proporre un costo aggiuntivo occorre dimostrare il divario funzionale residuo e confrontare una configurazione completa con le capacità già disponibili. L'incompatibilità del percorso Dynamic Checkout documentato è dimostrata; una soluzione alternativa completa senza cambi di piano non è ancora dimostrata.

## Diff operativo previsto, non eseguito

[Piano JSON completo](shipping-evidence/2026-11-03/release-plan.json), generato con `npm run shipping:prepare`.

| Oggetto | Stato attuale | Modifica proposta |
|---|---|---|
| Profilo/gruppo/sede | Generale unico | Stessi ID e struttura |
| Zona Italia | Unica, tutte le province attuali | Stessa zona; distinzione CAP nell'app |
| Metodi Italia `1265953014100`, `1265953046868` | Gratis da 55 €, 7 € sotto soglia | Disattivare, conservare per rollback |
| Tariffe Italia A/B | Assenti | Template di 18 metodi; non selezionato per il rilascio |
| Piattaforma logistica | Sendcloud installata | Conservare Sendcloud; connessione interna da verificare |
| Prezzo checkout | Meccanismo nuovo non risolto su Grow | Nessuna nuova app/servizio/upgrade autorizzato |
| Definizione variante | Chiave nuova assente | Creare `logistics.shipping_class` condivisa con app, previa verifica assenza |
| Valori variante | Non approvati | Attualmente **0 scritture**; elenco definitivo solo dopo approvazioni |
| Geografia | Nessuna lista ufficiale | **Pending**, nessun CAP inventato |
| UE/internazionale, prezzi prodotto, categorie, pagamenti, frontend/Admin V2 | Stato esistente | Nessuna modifica prevista |

Il payload completo di esempio è validato contro lo schema Admin **2026-01**, insieme alle mutation e query riutilizzabili. La versione richiesta storicamente dal progetto `2025-07` non è più supportata dal toolkit; non viene modificata globalmente. Il connettore non espone l'header della versione realmente eseguita: la validazione 2026-01 non certifica quell'header. L'istantanea iniziale contiene anche `coversAllItems`, esposto dallo schema live del connettore ma assente nel validatore 2026-01: la query riutilizzabile lo omette e la copertura viene provata dalle associazioni variante/profilo.

Questo **non è ancora il diff finale autorizzabile**: mancano elenco prodotti approvati, mappa geografica, connessione Sendcloud verificata e un meccanismo checkout completo compatibile col piano effettivo, oltre alle prove. Il nome del futuro corriere non è un requisito per progettare le tabelle A/B e non viene richiesto nuovamente.

## Sincronizzazione controllata dopo chiusura dei blocchi

1. Completare geografia, approvazioni SKU/variante e audit delle personalizzazioni; verificare capacità/piano app. Preparare e provare l'intera matrice in staging autorizzato, senza ordini o pagamenti. Nessuna modifica live per costruire i dati di test.
2. Rileggere istantanee di profili, condizioni, associazioni, nuove chiavi e configurazione app; confrontare semanticamente il profilo con il backup e verificarne versione, valute e ID. Il fingerprint è un controllo locale, **non** un lock/API compare-and-swap sul profilo. Se cambia qualcosa, rigenerare il diff e fermare il piano precedente.
3. Presentare **una sola richiesta esplicita di autorizzazione live** con diff definitivo, scritture variante, CAP, app/costo, staging QA, tempi e rollback. Fino a quel momento nessuna mutation o installazione in produzione.
4. Dopo autorizzazione, creare definizione e valori approvati senza sovrascritture, controllando `userErrors`, digest e read-back a ogni batch. Applicare le regole app con ambito IT e verificare che non interferiscano con quelle correnti. Non rendere disponibili nuove tariffe senza il selettore completo.
5. Applicare soltanto il payload definitivo del percorso scelto e approvato. Se verrà confermato il template nativo, prevedere il cambio del profilo con disattivazione dei due metodi precedenti e creazione dei 18 nuovi metodi. Non si assume una transazione distribuita fra integrazione e Shopify: sequenza, intervalli di incoerenza e recupero devono essere provati in staging. Se non si ottiene una sequenza sicura, il rilascio rimane bloccato.
6. Rileggere tutti i prezzi/soglie/ID, controllare esattamente un'opzione per ogni prova nativa e completare smoke senza pagamento: B puro, misto A, sconosciuto A, standard/speciale, sconti e quantità. Verificare anche assenza delle vecchie opzioni Italia e conservazione di UE/internazionale.
7. Solo con read-back e checkout nativi conformi aggiornare lo stato a sincronizzato/verificato. Registrare ID creati, digest, configurazione app e prove senza dati cliente o URL checkout sensibili.

Il codice di preparazione **non contiene un esecutore live né una modalità `--apply`**. Le mutation sono disponibili per gli strumenti Shopify dopo autorizzazione; la configurazione privata dell'app richiede le sue capacità/UI. Non viene promesso un sync puramente Admin API di impostazioni che appartengono a un fornitore esterno.

## Backup e rollback

Il rollback delle 18 regole descritto sotto riguarda esclusivamente quel template condizionale, se in futuro selezionato e autorizzato. Attualmente non è stato effettuato alcun cambio da annullare; il rollback definitivo dipenderà dal percorso checkout dimostrato.

Le evidenze conservano il profilo precedente con sedi, paesi/province, tutti i quattro metodi e condizioni, app/scopes, catalogo logistico e copertura. Sono un backup dello **scope letto**, non dell'intero negozio né delle impostazioni interne Sendcloud. Il rilascio richiede un backup fresco; le letture di oggi non vengono considerate eterne.

In caso di errore: fermare ulteriori scritture; riattivare i due vecchi metodi Italia e disattivare i 18 nuovi tramite gli **ID restituiti dall'operazione autorizzata**, senza cancellare per nome e senza modificare le zone estere. Ripristinare in modo coordinato il selettore app, che deve lasciare disponibili le tariffe legacy solo nel rollback verificato. Confermare il ripristino di 7 € / gratuità da 55 € come ritorno temporaneo alla configurazione precedente, non come tariffe approvate dal cliente.

I metafield aggiunti si rimuovono solo se creati da questa release e ancora uguali ai valori/digest registrati; nessuna cancellazione delle categorie o dei valori precedenti. La nuova definizione si elimina soltanto se vuota e priva di altri utilizzatori. Conservare gli identificatori e le evidenze; ripetere smoke senza pagamento. Un'app disabilitata o rimossa potrebbe lasciare visibili combinazioni tariffarie improprie: serve il rollback coordinato, non il solo spegnimento dell'app.

## Gate aperti

Geografia approvata; classificazione validata; integrazione Sendcloud verificata; meccanismo checkout completo e compatibile con il piano approvato; lettura `deliveryCustomizations`; base sconti; gruppo unico; staging; backup fresco; diff definitivo autorizzato. Nessuna dipendenza architetturale dal nome di un corriere. [Registro gate](../shipping/release-gates.pending.json). **Non implementato nel checkout live.**
