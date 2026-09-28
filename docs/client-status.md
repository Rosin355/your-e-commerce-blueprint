# Online Garden — stato per il cliente

Aggiornamento: 28 settembre 2026

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
