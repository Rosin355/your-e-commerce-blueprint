# Storico: SANDBOX BLOCKED — development store inizialmente non disponibile

**Superato dalla nuova autorizzazione alla creazione:** [store Dev ora creato; blocco corrente verifica identità Shopify per Intuitive](../development-store/README.md). Le osservazioni sotto restano il preflight precedente.

**3 novembre 2026, preflight concluso alle 13:23:42 UTC (14:23:42 Europe/Rome).** Continuazione PR #45 da `66ce71b`. L'autorizzazione al collaudo gratuito e reversibile in sandbox è ricevuta; non deve essere richiesta nuovamente. Produzione, acquisti, trial a conversione automatica, merge e deploy restano esclusi.

## Blocco preciso ed evidenza

La sessione browser autorizzata accede alla **Dev Dashboard dell'organizzazione Online Garden `213529043`**. Nella pagina [Negozi](https://dev.shopify.com/dashboard/213529043/stores), senza filtri, la tabella mostra **«Nessun negozio per ora»** e «Collega un negozio per iniziare a visualizzarlo qui nel tuo portfolio». Quindi non è identificato un development store isolato utilizzabile nell'organizzazione autorizzata. Questo non dimostra l'assenza di negozi in altre organizzazioni; negozi estranei non sono stati riutilizzati per il test.

Il link Crea negozio è visibile ma non è stato seguito: l'utente ha chiesto esplicitamente di fermarsi se manca un development store. La presenza del link non certifica permessi di creazione, gratuità di CCS o entitlement Grow. [Osservazione UI circoscritta](sandbox-access-observation.txt) · [Rapporto strutturato](sandbox-preflight.json).

## Capacità gratuite e costi effettivi

| Elemento | Evidenza disponibile | Esito nel collaudo |
|---|---|---|
| Development store isolato | Nessuno visibile nel portfolio Online Garden accessibile | **Mancante**; nessuna creazione |
| Accesso Dev Dashboard | Sessione autenticata e pagina Negozi leggibile | Disponibile; non equivale ad accesso a uno store di test |
| Intuitive sandbox | Il fornitore documenta sandbox gratuita senza scadenza, separata dal trial | Non installata; nessun piano o trial attivato |
| CCS gratuito con entitlement Grow | Il fornitore richiede CCS anche in sandbox | **Non verificato**, nessuno store su cui controllarlo |
| Mercati sul development store | Shopify richiede la preview alla creazione per questa prova | **Non verificato**, nessuno store target |
| Spesa e impegni | Nessun acquisto, sottoscrizione o modifica fatturazione | **0,00 € sostenuti; nessun nuovo impegno ricorrente** |

La [FAQ Intuitive](https://knowledge.intuitiveshipping.com/faq-page) distingue sandbox illimitata dal trial che parte selezionando un piano. Non è stato selezionato alcun piano; non si usa un trial come soluzione alla mancanza di ambiente. La [guida development store Shopify](https://shopify.dev/docs/apps/build/stores/development-stores) consente di scegliere Grow ma non prova CCS gratuito per questo account: per app di terzi vanno inoltre verificate le modalità gratuite rese disponibili dal fornitore. La [guida Mercati](https://shopify.dev/docs/apps/build/orders-fulfillment/market-driven-shipping/upgrade-your-app) richiede la preview al momento della creazione; non è una capacità da dare per acquisita su un dev store qualsiasi.

## Test checkout richiesti

| Caso | Risultato |
|---|---|
| Soli bulbi/grasse → B | **NON ESEGUITO: ambiente mancante** |
| Bulbo + arbusto → una sola A sul totale | **NON ESEGUITO: ambiente mancante** |
| Soglie esatte delle tabelle A/B | **NON ESEGUITO: ambiente mancante** |
| Sicilia/Sardegna, solo configurazione sperimentale | **NON ESEGUITO: ambiente mancante** |
| CAP sintetici confinati al test | **NON ESEGUITO: ambiente mancante** |
| Grow + Mercati + CCS effettivo | **NON ESEGUITO: ambiente mancante** |
| Nessuna interferenza con Sendcloud, prova completa | **NON ESEGUITO: ambiente mancante** |

**Zero prove checkout, zero configurazioni Intuitive, zero nuovi ordini.** Le precedenti 325 prove locali shipping / 668 Node restano una verifica software storica: non sono state usate per assegnare PASS al collaudo. Il blocco riguarda i prerequisiti, non un malfunzionamento dimostrato dell'app. Sicilia e Sardegna rimangono candidate senza effetto operativo; nessun CAP o esclusione aggiunti. Sendcloud non è stata aperta o modificata; l'assenza di interventi non viene presentata come test di integrazione superato.

## Rollback

Nessun rollback Shopify/Intuitive/Sendcloud necessario: non sono stati creati store, installazioni, dati, tariffe, trial o abbonamenti. Nessuna configurazione live è stata salvata. L'unica modifica persistente di questo intervento è la documentazione Git, annullabile con revert del relativo commit. Non ripristinare il vecchio profilo shipping sul negozio reale.

Quando l'ambiente sarà disponibile, prima di configurarlo registrare dominio/ID, natura dev, entitlement Grow, preview Mercati, CCS gratuito e sandbox senza piano selezionato, poi acquisire il backup della configurazione di test. L'eventuale ripristino riguarderà esclusivamente tariffe/app/fixture create in quell'ambiente; nessuna sincronizzazione con produzione e nessun collegamento al Sendcloud reale.

**Singola decisione successiva:** rendere disponibile un development store isolato e autorizzato nell'organizzazione Online Garden, con entitlement equivalente Grow e Mercati, su cui verificare CCS gratuito prima dell'installazione Intuitive. L'autorizzazione al collaudo già concessa rimane valida; non è richiesto un abbonamento.
