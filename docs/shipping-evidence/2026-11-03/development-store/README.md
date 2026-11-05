# Development store creato — SANDBOX BLOCKED su verifica identità Shopify

**3 novembre 2026 · PR #45 · continuazione da `25eae28`.** L'utente ha autorizzato esplicitamente la creazione gratuita del Dev e le operazioni di test isolate. Il precedente blocco «store mancante» è risolto; il nuovo blocco impedisce l'installazione Intuitive. Nessun risultato locale sostituisce il checkout.

## Ambiente effettivamente creato

| Caratteristica | Riscontro |
|---|---|
| Nome | **Online Garden Shipping Test** |
| ID negozio | **111269380421** (`gid://shopify/Shop/111269380421`) |
| Dominio | `online-garden-shipping-test.myshopify.com` |
| Organizzazione | Online Garden, `213529043` |
| Tipo | **Development**, non Client Transfer; la UI dichiara non trasferibile perché creato per test |
| Piano | **Grow simulato**, confermato nella Dev Dashboard e nella pagina Piano |
| Paese / valuta | **Italia / EUR**, verificati nelle impostazioni Generali |
| Preview | **Market-driven shipping and ship & pickup in one order**, selezionata alla creazione e confermata nelle impostazioni |
| Mercato Italia | `119681515845`; la UI spedizioni conferma lo spostamento su Mercati |
| Demo data | Generazione disattivata: nessun catalogo, cliente o ordine dimostrativo precaricato |
| Costi effettivi | **0,00 €**, nessun piano pagante, abbonamento, trial o add-on attivato |

[Identità dalla Dev Dashboard](store-identity-ax.txt) · [Italia, EUR e preview](general-capabilities.txt) · [Rapporto strutturato](result.json). [Guida Shopify ai Dev](https://shopify.dev/docs/apps/build/stores/development-stores): questi ambienti simulano i piani e non sono negozi produttivi; il risultato di un Dev non prova l'entitlement live.

## Quattro prodotti fittizi creati e riletti

| Fixture | ID prodotto | SKU | Prezzo test | Atteso, non ancora verificato nel checkout |
|---|---|---|---:|---|
| Bulbo fittizio | `16337677287749` | `OG-QA-BULB` | 15,00 € | B se solo |
| Pianta grassa fittizia | `16337678958917` | `OG-QA-SUCCULENT` | 45,00 € | B se sola o con bulbi |
| Arbusto fittizio | `16337681416517` | `OG-QA-SHRUB` | 30,00 € | A, anche con bulbi |
| Prodotto non classificato | `16337683349829` | `OG-QA-UNKNOWN` | 10,00 € | Fallback A |

Tutti fisici, peso inventato 0,1 kg, scorte non monitorate per evitare che il magazzino blocchi i futuri test. Nessun metafield logistico o regola app è stato creato. Le eventuali categorie assegnate automaticamente da Shopify **non sono classificazione logistica approvata**: il futuro test deve usare gli SKU espliciti. Nessun prodotto reale copiato. [Elenco riletto](fixtures-list.txt), evidenze individuali `product-*.txt`.

Il tentativo iniziale di caricamento file non è stato completato perché mancavano i permessi di controllo della finestra locale. Non è stato importato alcun CSV; il dialogo è stato chiuso e le quattro fixture sono state create con i moduli Admin del solo Dev. Nessuna duplicazione.

## Blocco Intuitive: verifica identità richiesta da Shopify

La pagina ufficiale App Store identifica come target **Online Garden Shipping Test** e presenta Sandbox gratuita. L'installazione apre il percorso del solo Dev e Shopify mostra **«Verifica dell'identità richiesta»**: l'utente o il proprietario dell'organizzazione deve verificarla per installare app di terze parti su un development store. Il pulsante **Installa è disabilitato**. Nessun tentativo di aggiramento, verifica identità avviata, documento personale gestito o piano scelto.

[Messaggio UI](intuitive-install-blocker.txt) · [Screenshot del blocco](screenshots/05-intuitive-identity-required.png) · [Elenco App Dev vuoto](dev-apps-empty.txt). La [FAQ Intuitive](https://knowledge.intuitiveshipping.com/faq-page) documenta sandbox gratuita senza scadenza, distinta dall'attivazione del trial tramite scelta di un piano; questa modalità **non è stata raggiunta nell'app**.

L'installazione e l'utilizzo gratuito non sono quindi certificati: Intuitive **non installata**, tabelle A/B **non configurate**. Non si può attribuire il blocco a un errore del motore tariffario.

## CCS: evidenze Dev e live rigorosamente separate

| Ambiente | Evidenza effettiva | Conclusione |
|---|---|---|
| **Dev Grow** | Account corrieri offre **Collega account corriere** e apre FedEx/UPS, senza richiesta di upgrade | Capacità esposta nell'interfaccia; nessun account collegato. Registrazione del servizio Intuitive e restituzione tariffe **non provate**: gratuità funzionale completa CCS ancora da confermare. |
| **Online Garden live Grow** | Lettura separata: Account corrieri mostra **Abilita tariffe calcolate di terze parti al check-out** e **Effettua l'upgrade del tuo piano** | **CCS non abilitato secondo la UI osservata**; nessun comando di attivazione/upgrade premuto. Non dedotto da zero carrier services. |

[Screenshot CCS Dev](screenshots/04-dev-carrier-access.png) · [Osservazione Dev](carrier-access-ax.txt) · [Screenshot CCS live, sola lettura](screenshots/07-live-ccs-not-enabled-readonly.png) · [Osservazione live](live-ccs-readonly.txt) · [Grow live](live-plan-readonly.txt).

La pagina live Piano conferma Grow e visualizza 74,00 € EUR al mese, ma questo **non certifica il ciclo di fatturazione**. Il connettore di sola lettura usa ancora il nome storico “Shopify”; per il piano corrente si usa l'etichetta Grow della UI. Lo schema `ShopFeatures` letto non espone un flag CCS utilizzabile per risolvere l'entitlement; non sono state inventate query.

La [documentazione ufficiale Shopify](https://help.shopify.com/en/manual/fulfillment/setup/shipping-rates/third-party-carrier-calculated-shipping/carrier-accounts) ammette CCS su **Grow con supplemento oppure incluso con fatturazione annuale**. Il link UI propone Advanced, ma non dimostra che l'upgrade sia l'unica alternativa. L'importo specifico dell'add-on e il ciclo dell'account non sono stati quotati/verificati: nessuna attivazione, acquisto o modifica fatturazione. Nessuna compatibilità produttiva confermata da questo Dev.

## Checkout: esiti richiesti

| Caso | Esito |
|---|---|
| Solo bulbi → B | **NON ESEGUITO: installazione bloccata** |
| Bulbo + arbusto → una sola A sul totale | **NON ESEGUITO: installazione bloccata** |
| Bulbi + pianta grassa → B | **NON ESEGUITO: installazione bloccata** |
| Soglie esatte A/B | **NON ESEGUITO: installazione bloccata** |
| Sicilia/Sardegna e CAP sintetici | **NON ESEGUITO: installazione bloccata** |
| Nessuna somma di tariffe | **NON ESEGUITO: installazione bloccata** |

**Zero checkout A/B, zero screenshot checkout, zero ordini o pagamenti.** Le otto schermate archiviate dimostrano ambiente, opzioni, prodotti e blocchi, non esiti di spedizione. Sicilia/Sardegna restano candidate per produzione; nessuna mappa CAP o esclusione introdotta. Il codice locale e i suoi vecchi test non sono stati utilizzati come prova di checkout.

## Isolamento, ripristino e prosecuzione

Nessun collegamento Sendcloud nel Dev: elenco App vuoto e nessuna credenziale reale utilizzata. Sendcloud live non aperta né modificata. Nessuna scrittura su Shopify produzione, profili reali, PR #42, secret o pagamenti; nessun merge/deploy. Non è stata introdotta alcuna configurazione app da annullare.

Il Dev e le quattro fixture rimangono disponibili per riprendere il collaudo. Se si abbandona la prova, archiviare reversibilmente solo questi quattro ID nel solo Dev; non ripristinare profili live e non eliminare permanentemente lo store come rollback automatico. Il revert della documentazione Git **non rimuove le risorse Shopify create**. Non si cancellano dati o store in questo intervento.

**Sblocco necessario:** l'utente o il proprietario dell'organizzazione completa la verifica identità richiesta da Shopify nella pagina di installazione Dev lasciata aperta. Poi riprendere l'autorizzazione sandbox già concessa: prima confermare sandbox senza piano/trial, CCS gratuito e risposta app; successivamente configurare le tabelle e produrre screenshot checkout. Nessuna ulteriore autorizzazione produttiva è implicita.

## Screenshot originali

- [01 — modulo Dev, Grow, preview Mercati](screenshots/01-dev-create-grow-markets.png)
- [02 — identità, ID e tipo Development](screenshots/02-dev-store-identity.png)
- [03 — piano Grow del development store](screenshots/03-dev-grow-plan.png)
- [04 — selezione carrier disponibile nel Dev](screenshots/04-dev-carrier-access.png)
- [05 — installazione bloccata dalla verifica identità](screenshots/05-intuitive-identity-required.png)
- [06 — quattro fixture effettive](screenshots/06-four-fictional-products.png)
- [07 — CCS live da abilitare, lettura soltanto](screenshots/07-live-ccs-not-enabled-readonly.png)
- [08 — nessuna app installata nel Dev](screenshots/08-dev-no-apps-installed.png)

[Sommario SHA-256 delle evidenze](manifest.json). **Esito: SANDBOX BLOCKED.**
