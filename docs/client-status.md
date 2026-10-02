# Online Garden — stato per il cliente

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
