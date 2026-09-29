# Online Garden — stato per il cliente

Aggiornamento: 29 settembre 2026

## Stato go-live aggiornato

Backend Admin e interfaccia Admin V2 sono ora pronti per il go-live. Sono passati anche il primo inserimento di un campo manuale assente, il replay sicuro delle richieste e il QA finale dell'interfaccia. Il valore `colore_fiore = "viola"` su `OG_365676` resta intenzionalmente come dato editoriale corretto.

Restano i controlli commerciali: catalogo Shopify/storefront, varianti, prezzi, immagini, spedizioni, checkout, email ordine, mobile e un ordine end-to-end controllato. La modalità `canary` resta attiva fino alla decisione finale di pubblicazione.

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
campi manuali protetti senza togliere la protezione contro import e AI. Una
prova controllata di modifica e ripristino è riuscita; resta da collaudare la
creazione di un campo ancora assente e da migliorare il messaggio restituito
quando una richiesta identica viene ripetuta.

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

## Cosa è protetto

I cinque campi manuali principali — nome comune, ibridatore, colore del fiore,
colore della foglia e curiosità — restano protetti da import, AI e canali non
autorizzati. La modifica manuale Admin non elimina questa protezione.

Anche inventario, identità prodotto, categorie tecniche e stato Shopify restano
fuori dall'editing libero della scheda prodotto.

## Cosa manca

- collaudare separatamente la creazione di un valore manuale assente;
- rendere il replay di una richiesta già riuscita riconoscibile come successo,
  pur mantenendo l'attuale protezione contro i duplicati;
- confermare in interfaccia il comportamento finale del pulsante Salva;
- decidere se collegare automaticamente i valori correnti agli originali
  WordPress quando l'abbinamento è certo;
- progettare eventuali suggerimenti AI per singolo campo, sempre come proposta;
- completare un collaudo commerciale separato di Shopify, storefront e checkout.

## Prossimo collaudo

Prima di qualsiasi scrittura verranno presentati per approvazione:

- prodotto e campo scelti;
- valore attuale e valore di prova;
- versione attesa;
- modalità di ripristino.

Il prodotto golden `OG_393883` non verrà modificato senza autorizzazione
esplicita. La prima prova di update ha già confermato lock, lineage, history e
assenza di AI/import/Shopify. Il prossimo test riguarda esclusivamente la
creazione con versione iniziale zero e richiede un rollback approvato in
anticipo.

## Stato finale

La piattaforma è in una fase avanzata e controllata. Catalogo, Admin V2,
sicurezza e Storage hanno una base stabile. La chiusura funzionale richiede il
forward-fix sul replay, il test controllato della creazione e la conferma UX.

## Aggiornamento 29/09/2026

Il test controllato della creazione di un nuovo valore è riuscito: il colore del fiore "viola" è stato aggiunto al Gladiolo "Violet Summer" e resta come dato corretto. La parte server della fase 2C.1 è chiusa; resta la conferma UX.


## Fase 2C.2 — QA finale Admin V2 (2026-09-29)
ADMIN V2 UX — GO-LIVE READY (canary attivo). Backend 2C.1 CLOSED; create expectedVersion=0 live PASS; OG_365676.colore_fiore="viola" permanente; current values 24.467, history 5, command log 5. Due fix UX P3 (Salva solo con modifiche, niente "versione 0"). Dettagli: `docs/fase2c/qa-finale-admin-2C2.md`.
