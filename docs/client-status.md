## Rettifica prioritaria — 22 novembre 2026: rilettura *Shopify Markets* A+B

**LA PRECEDENTE CONCLUSIONE «7 € sotto 55 € / spedizione gratuita da 55 € su tutta Italia» NON DESCRIVE IL LISTINO COMMERCIALE A+B.** Era una lettura isolata di `deliveryProfiles` (profilo generale), senza controllare le definizioni `markets.delivery.shipping.optionDefinitions`. Non usare i 7 €/0 € come tariffa commerciale certificata dei carrelli Online Garden.

### Stato LIVE verificato direttamente via Admin GraphQL (sola lettura, 22/11)
- `markets`: **Italy ACTIVE** e **Sicilia e Sardegna — Isole ACTIVE**, `shipping.isEnabled=true`, ognuno con una `DeliveryValueBasedOptionDefinition` **Standard attiva**, `freeDeliveryMinimumValue=null`. I `rateGroups` sono condizionati dalle collezioni `og-logistica-a-fallback` (A) e `og-logistica-b-approvati` (B). Paginazione di metodi, gruppi e fasce completata.
- Tariffe A **Italia**: 0–18,99 € → **8,90 €**; 19–79,99 → **11,90 €**; 80–149,99 → **12,50 €**; 150–249,99 → **17,50 €**; 250–499,99 → **36 €**; ≥500 → **54 €**.
- Tariffe A **Sicilia/Sardegna**: stesse fasce → **9,60 € / 12,50 € / 14,90 € / 17,50 € / 36 € / 54 €**.
- Tariffe B (solo bulbi/grasse approvati) **Italia**: 0–49,99 € → **5,90 €**; 50–149,99 → **7,90 €**; ≥150 → **8,90 €**.
- Tariffe B **Sicilia/Sardegna**: stesse fasce → **6,90 € / 8,90 € / 9,50 €**.
- Nessuna spedizione gratuita nelle definizioni Markets A/B; carrello misto A+B segue A, secondo la politica commerciale approvata, già collaudata live il 5 novembre. Questa rilettura API non è un nuovo checkout per tutti gli scenari.

**Origine decisionale:** [PR #45](https://github.com/Rosin355/your-e-commerce-blueprint/pull/45), Draft e non merged, ma il suo report documenta la **configurazione LIVE effettuata il 5 novembre** e sei checkout superati. [Matrice completa, ramo release b6ac09b](https://github.com/Rosin355/your-e-commerce-blueprint/blob/b6ac09b2059cff561ee36ec8ee331da4363cca4a/docs/SHIPPING-RATE-MATRIX.md). La mancata integrazione della PR non implica che le modifiche configurative Shopify siano state annullate: ora la lettura live Markets conferma gli scaglioni A+B.

**Unico gap del requisito geografico:** applicazione automatica della fascia «Isole e zone disagiate» alle **isole minori in province miste** (Elba, Lido di Venezia, Pellestrina ecc.) non verificata; nessuna deroga al supplemento è autorizzata e nessun CAP/filtro inventato. Eventuali personalizzazioni `deliveryCustomizations` non leggibili con lo scope corrente. Nessuna modifica Shopify è stata eseguita da questa rettifica.

### Distinzione fra le due superfici API

`deliveryProfiles` mostra tuttora 7 €/gratis Italia e 14,99 €/19,99 € estero nel **profilo generale**. Questo dato è reale ma non esaurisce la configurazione del checkout: Shopify Markets ha una **definizione di spedizione attiva A+B** per i mercati italiani. La priorità/tariffa finale in un carrello specifico può essere attestata solo da checkout o con API di calcolo; non dedurre la tariffa italiana effettiva dal solo profilo generale.

---


## Aggiornamento tariffe spedizione — 22 novembre 2026 (lettura Shopify live)

Il profilo Shopify generale oggi prevede **Italia: 7,00 € fino a 54,99 €, gratuita da 55,00 €**; **UE: 14,99 €** e **altri paesi configurati: 19,99 €**. Non emerge una tariffa specifica per isole italiane, ma la verifica completa non è conclusa: il connettore non ha lo scope per leggere le personalizzazioni di consegna e mancano prove finale checkout per i CAP delle isole minori. Il precedente collaudo Roma 8,90 € è storico e non va presentato come tariffa attuale. Le tariffe contrattuali per isole minori devono essere definite e approvate dal cliente prima di modificare Shopify. [Verbale tariffe live](release/SHIPPING-LIVE-RATES-2026-11-22.md). SAL originale invariata al 58%.

## Stato aggiornato per il cliente — 21 novembre 2026

## Area clienti · cosa può fare il cliente

Account apre Shopify dal computer e dal telefono. Il cliente può consultare gli ordini del nuovo negozio associati al suo profilo. Rimangono aperte le prove di uscita, rientro e separazione su due profili controllati. Lo storico WooCommerce resta a 0/953. [Guida per Marco](customers/CLIENT-GUIDE.md) · [Riscontri e limiti](customers/FINAL-ACCEPTANCE.md).

## Consegna del pannello prodotti · 21 novembre 2026

La versione aggiornata del pannello è pubblicata. Il collaudo ha verificato direttamente una bozza salvata nel gestionale e una diversa bozza su Shopify fuori vendita. Categorie, foto e formati sono descritti nella [guida cliente](admin-v2/CLIENT-GUIDE.md). Il checkout Shopify si è aperto con articolo e prezzo attesi. Resta da registrare la prima prova personale di Marco, incluso l’eventuale accesso Shopify per intervenire sulla galleria di un prodotto esistente. [Accettazione](admin-v2/FINAL-ACCEPTANCE.md) · [Rilascio sul sito](admin-v2/RELEASE-REPORT.md).

La nuova area clienti Shopify e il percorso verso il checkout risultano online, verificati fino alla schermata Shopify senza completare pagamenti. Il lavoro di sicurezza su accesso, funzioni amministrative e filtri dei campi prodotto è stato distribuito secondo il report tecnico; una nuova scansione approfondita non segnala criticità. Rimane un avviso su email nei log attribuito a un vecchio file (le righe non esistono più nel programma attuale): lo archiviamo come rilievo non applicabile alla versione corrente, preservandone le evidenze senza presumere che eventuali vecchi log siano stati cancellati. La libreria pubblica delle immagini dei prodotti rimane intenzionalmente accessibile. **Da completare:** collaudo finale del pannello Admin con Marco e le attività commerciali/DNS ancora pendenti. Lo storico WooCommerce non è importato perché le singole transazioni non sono disponibili. [Relazione tecnica](security-checkout-fix-2026-11-21.md) · [SAL](release/SAL-2026-11-21.md).

## Verifica checkout e sicurezza — 21 novembre 2026

Il checkout Shopify è stato nuovamente verificato su sito pubblico e anteprima fino alla pagina di pagamento, senza completare acquisti. È disponibile una correzione per il checkout nel riquadro di anteprima Lovable. La protezione aggiuntiva sui campi prodotto dell'Admin è pronta nel codice ma deve ancora essere distribuita e collaudata; il Publish della versione più recente non è stato eseguito in questa fase. I controlli automatizzati disponibili non mostrano nuove regressioni, con cinque file test non eseguibili nel runner Node. Il recupero delle 953 transazioni del precedente sito rimane impossibile senza una fonte integra, perciò non sono state importate. [Report tecnico](security-checkout-fix-2026-11-21.md) · [SAL](release/SAL-2026-11-21.md).

## Aggiornamento 21 novembre — verifica area clienti Shopify

L'accesso a un profilo Shopify e la consultazione di un ordine Shopify già esistente sono stati **verificati attraverso schermate fornite dal responsabile**. Il sito in anteprima aveva già superato navigazione, prodotti e carrello. La PR #61 è integrata; **il nuovo Publish è stato richiesto ma non ancora verificato come disponibile su onlinegarden.it**. Resta aperta una verifica dedicata per accesso e recupero dell'operatore staff. Lo storico WooCommerce non è stato importato, perché i dettagli dei 953 ordini non sono disponibili. La SAL rimane **58%**. [Dettagli del rilascio](release/SAL-2026-11-21.md).

# Online Garden — stato per il cliente

## Area personale al 21 novembre 2026

**Il nuovo accesso Shopify è pronto in anteprima. Il rilascio sul negozio pubblico è sospeso.** Il pulsante account su computer e telefono apre la pagina Shopify di Online Garden. In anteprima abbiamo provato anche la navigazione, il carrello e l’apertura del checkout senza acquistare. Sul sito pubblico rimane il login precedente. Per pubblicare manca il collaudo con un cliente di prova e un operatore abilitato, ciascuno con accesso alla propria casella.

L’area Shopify permette l’accesso volontario con codice email. Gli acquisti WooCommerce del vecchio sito restano indisponibili. I dati privati contengono i conteggi, il negozio precedente è inaccessibile e il backup recuperabile è privo del database ordini. **0 clienti storici creati, 0 associati, 0 ordini importati su 953.** Fra i 857 acquirenti storici con ruolo customer, 848 sono candidati alla verifica, 8 richiedono esame manuale e una corrispondenza email è ancora da confermare. Nessun invito inviato.

**SAL stimata sull’ambito originario: 58%.** [Registro dei controlli e decisione sul rilascio](release/SAL-2026-11-21.md) · [Riepilogo della migrazione](migration/woocommerce-history-2026-11-20.md).

Aggiornamento: 2 ottobre 2026

## Stato go-live aggiornato

Backend Admin e interfaccia Admin V2 sono ora pronti per il go-live. Sono passati anche il primo inserimento di un campo manuale assente, il replay sicuro delle richieste e il QA finale dell'interfaccia. Il valore `colore_fiore = "viola"` su `OG_365676` resta intenzionalmente come dato editoriale corretto.

Restano i controlli commerciali: catalogo Shopify/storefront, varianti, prezzi, immagini, spedizioni, checkout, email ordine, mobile e un ordine end-to-end controllato. La modalità `canary` resta attiva fino alla decisione finale di pubblicazione.

La funzione richiesta “Migliora con AI” è stata implementata e il database è
stato predisposto con privilegi minimi verificati. **Non è ancora online**: il
primo tentativo di pubblicazione delle funzioni si è fermato prima della
distribuzione per un problema tecnico di packaging tra moduli. La correzione
2D.6 organizza il codice condiviso in modo compatibile con pacchetti separati,
senza modificare prodotti, chiamare AI o coinvolgere Shopify.

## QA commerciale Shopify — esito

Il pannello Admin è pronto, ma il negozio non è ancora pronto per il lancio commerciale. Il QA ha trovato quattro blocchi principali: quasi tutto il catalogo Shopify risulta esaurito (458 prodotti su 461), soltanto 461 prodotti risultano pubblicati rispetto ai 2.706 del catalogo interno, i tre prodotti acquistabili non hanno immagini e le spedizioni per l'Italia non sono ancora state verificate.

Prezzi e carrello sono risultati coerenti; il checkout Shopify si apre correttamente. Prima del go-live servono quindi giacenze reali, decisione sul catalogo da pubblicare, immagini, verifica spedizioni, correzione mobile e un ordine di prova completo.

## Diagnosi commerciale 3B

La diagnosi ha confermato che il blocco principale non si risolve semplicemente attivando i prodotti: le quantità disponibili non hanno oggi una fonte operativa completa da sincronizzare. Shopify deve restare il registro delle giacenze effettive, ma prima serve stabilire quale gestionale/feed alimenta quantità, tracking e location per ogni SKU.

È stato inoltre confermato che l'attuale catalogo Shopify deriva da sincronizzazioni storiche parziali: i 461 prodotti online non rappresentano ancora un catalogo di lancio deliberato. Le immagini multiple presenti in WordPress non sono state trasferite dalle vecchie pipeline, e il checkout italiano non è ancora pubblicato in lingua italiana.

## In sintesi

La nuova base catalogo e il pannello Admin sono online. I dati originali sono
stati conservati, i campi importanti sono protetti da sovrascritture automatiche
e sono stati chiusi i principali interventi di sicurezza su accessi e file di
sincronizzazione.

L'ultimo aggiornamento backend permette a un Admin autorizzato di modificare i
campi manuali protetti senza togliere la protezione contro import e AI. Update,
ripristino, replay idempotente, conflitto e creazione con versione iniziale zero
sono stati collaudati; la modalità `canary` resta attiva.

## Cosa è completato e online

- catalogo unico basato sui prodotti Online Garden;
- conservazione degli originali WordPress e dei valori correnti separati;
- pannello Admin V2 con confronto per campo, provenienza e versione;
- editor specifici per testo, numeri, selezioni, booleani, liste e FAQ;
- protezione contro sovrascritture concorrenti;
- accessi amministrativi e funzioni Storage irrobustiti;
- Smart Sync con nuovi CSV custoditi nell'area privata;
- rimozione del vecchio CSV pubblico, mantenendo pubbliche le immagini prodotto;
- backend per aggiornare i campi manuali protetti, secondo il report di
  rilascio Lovable.

## Migliora con AI — cosa farà

- il pulsante compare soltanto sui campi editoriali autorizzati dal server;
- mostra una proposta separata dal valore corrente;
- permette di modificare, rifiutare o accettare la proposta;
- rifiutare non cambia il prodotto;
- accettare usa la stessa protezione di versione e cronologia delle modifiche
  manuali;
- se un altro Admin modifica il campo nel frattempo, la proposta diventa
  obsoleta e non può sovrascrivere il dato nuovo;
- non pubblica su Shopify e non esegue elaborazioni massive.

## Cosa è protetto

I cinque campi manuali principali — nome comune, ibridatore, colore del fiore,
colore della foglia e curiosità — restano protetti da import, AI e canali non
autorizzati. La modifica manuale Admin non elimina questa protezione.

Anche inventario, identità prodotto, categorie tecniche e stato Shopify restano
fuori dall'editing libero della scheda prodotto.

## Cosa manca

- review e merge della correzione di packaging 2D.6;
- pubblicazione coordinata e controllata delle due Edge Functions dalla stessa
  revisione, seguita da smoke read-only;
- rilascio coordinato di endpoint, capability e frontend;
- smoke con un campo non sensibile e una proposta controllata, senza Shopify;
- decidere se collegare automaticamente i valori correnti agli originali
  WordPress quando l'abbinamento è certo;
- completare un collaudo commerciale separato di Shopify, storefront e checkout.

## Prossimo collaudo

Prima dello smoke AI verranno concordati prodotto, campo, versione e contenuto
atteso. La generazione non scriverà sul prodotto; l'eventuale accettazione sarà
un passaggio umano separato. `OG_393883` resta escluso dalle scritture senza
autorizzazione esplicita.

## Stato finale

La piattaforma è in una fase avanzata e controllata. Catalogo, Admin V2,
sicurezza e Storage hanno una base stabile. La funzione AI richiesta è pronta
per review ma non è stata distribuita; resta un gate prima dell'handoff cliente.

## Aggiornamento 29/09/2026

Il test controllato della creazione di un nuovo valore è riuscito: il colore del fiore "viola" è stato aggiunto al Gladiolo "Violet Summer" e resta come dato corretto. La parte server della fase 2C.1 è chiusa e la UX Admin V2 è stata confermata; restano il rilascio controllato della Fase 2D e i gate commerciali Shopify.


## Fase 2C.2 — QA finale Admin V2 (2026-09-29)
ADMIN V2 UX — GO-LIVE READY (canary attivo). Backend 2C.1 CLOSED; create expectedVersion=0 live PASS; OG_365676.colore_fiore="viola" permanente; current values 24.467, history 5, command log 5. Due fix UX P3 (Salva solo con modifiche, niente "versione 0"). Dettagli: `docs/fase2c/qa-finale-admin-2C2.md`.

## Aggiornamento sicurezza AI — 02/10/2026

Il controllo pre-rilascio ha funzionato come previsto: i permessi database
delle reservation e delle proposte AI sono ora limitati a quanto serve al
backend. Il deploy successivo si è fermato durante il packaging e non ha
distribuito nuove Edge Functions. La funzione resta intenzionalmente non
pubblicata finché la correzione 2D.6 non sarà revisionata. Catalogo, Admin V2,
Shopify e dati prodotto non sono stati modificati.


## Fase 2D.7 (2026-10-02)
2D EDGE BACKEND LIVE · READ-ONLY SMOKE PASS · FRONTEND NOT PUBLISHED · AI PROVIDER NOT CALLED · AI GENERATION NOT YET TESTED · CANARY ACTIVE. Dettagli: `docs/fase2d/edge-live-2D7.md`.

## Fase 2D.8 — AI generation smoke (2026-10-02)
Frontend AI pubblicato; una generazione su OG_264361 `seo_title` → suggestion pending `72d271c6`, valore prodotto invariato, accept/reject non testati, canary attivo. Dettagli: `docs/fase2d/ai-generation-smoke-2D8.md`.


## 2D.9 — Controlled accept (2026-10-02)
Accept live su OG_264361/seo_title v1→v2, history/command +1, replay idempotente e conflict 409 verificati, Shopify non toccato, provider 0, canary attivo, restore non eseguito. Dettagli: `docs/fase2d/ai-controlled-accept-2D9.md`.
