# Guida Marco — classi spedizione A/B in Shopify Admin

**5 novembre 2026: A+B sono LIVE.** Nessun nuovo abbonamento, app o deploy del gestionale. Il tuo ruolo Amministratore dell'organizzazione è stato verificato nell'intervento precedente; non sono stati cambiati permessi.

## Dove vedere la classe

Apri **Shopify Admin → Prodotti → Collezioni → OG Logistica B — Bulbi e succulente approvati**. La sorgente è **Varianti**, con selezioni esplicite. Il pulsante osservato «Includi manualmente varianti, 161 attualmente selezionate» apre il selettore; «161 varianti selezionate» permette di vedere quelle già incluse. Sono presenti anche i comandi «Rimuovi inclusione manuale».

La collezione B contiene oggi 118 bulbi e 43 piante grasse/succulente. La collezione **OG Logistica A — Ordinaria e sconosciuti** è complementare. Un tag prodotto non assegna la classe: non usarlo per cambiare la spedizione.

Prima di ogni modifica controlla ID prodotto, ID variante e SKU, non soltanto il titolo. Selezionare il prodotto intero nel picker può selezionare tutte le varianti: controlla ogni riga variante e includi soltanto gli ID verificati.

## A → B

1. Verifica che tutte le varianti del prodotto siano bulbi oppure piante grasse/succulente, secondo la politica commerciale del proprietario. Non serve una nuova approvazione su peso, dimensioni, fragilità o imballo. Se la categoria è ambigua, lascia A.
2. Se una variante è ordinaria, deve appartenere a un prodotto distinto: non mescolare classi nello stesso prodotto e non dividere automaticamente prodotti esistenti.
3. Nel selettore B cerca il prodotto/SKU e seleziona esplicitamente tutte le sue varianti idonee correnti.
4. Prima di confermare, rileggi la selezione: questa azione riduce il prezzo di spedizione per i carrelli interamente B. Conferma e salva con i comandi mostrati da Shopify.
5. Verifica che le varianti compaiano in B e non in A; apri un checkout di prova del sito, senza ordine, e confronta la tariffa con la tabella. Se l'appartenenza non è ancora aggiornata, attendi la rielaborazione della collezione e non procedere con altre modifiche.

## B → A

Apri le varianti selezionate nella collezione B e rimuovi **tutte le inclusioni del prodotto**, usando la deselezione oppure «Rimuovi inclusione manuale». Prima di confermare, considera che la spedizione dei carrelli interessati passerà ad A. Conferma/salva, poi verifica B assente, A presente e un checkout positivo. La collezione A si aggiorna per esclusione di B: non serve aggiungere manualmente il prodotto ad A.

## Nuovi prodotti e nuove varianti

Un nuovo ID variante non è selezionato automaticamente in B. La sorgente B usa ID espliciti, non tag prodotto ereditabili.

**Prima di aggiungere, importare o modificare una variante di un prodotto B:** togli tutte le sue inclusioni B e verifica che l'intero prodotto sia passato in A. Soltanto dopo crea/modifica la variante; ricontrolla la categoria di tutte le varianti e, se sono tutte idonee, reincludi gli ID correnti in B. Per una variante A usa un prodotto distinto.

Questo passaggio va rispettato anche nelle modifiche dirette in Shopify Admin e negli import. Il guard server del gestionale non intercetta automaticamente l'Admin Shopify: l'omogeneità futura richiede questa procedura. Nessun flag Admin V2 è stato abilitato e non esiste un nuovo pannello classi pubblicato nel gestionale.

## Verifica del prezzo

Shopify Admin → Mercati → Italy / Sicilia e Sardegna — Isole → Standard contiene **A e B nella stessa opzione**. Non aggiungere una tariffa gratuita, non lasciare A universale insieme a B e non creare una seconda opzione per sommare i prezzi.

| Checkout verificato | Subtotale | Unica spedizione |
|---|---:|---:|
| Roma, soli bulbi | 30,00 € | B 5,90 € |
| Roma, bulbi + Aloe | 60,80 € | B 7,90 € |
| Roma, bulbi + rosa A | 46,40 € | A 11,90 € |
| Roma, bulbi + rose A | 177,60 € | A 17,50 € |
| Palermo, soli bulbi | 30,00 € | B speciale 6,90 € |
| Cagliari, bulbi + rosa A | 46,40 € | A speciale 12,50 € |

Le fasce complete restano in [SHIPPING-RATE-MATRIX.md](SHIPPING-RATE-MATRIX.md). Per controllare un cambiamento apri il checkout dal sito con un indirizzo di prova e fermati alla tariffa: **non completare ordini o pagamenti**. Se compare un duplicato, una somma, una gratuità o nessuna spedizione, segnala SKU, quantità, totale dopo sconto, destinazione e screenshot della tariffa.

La disponibilità online rimane governata dalle giacenze reali: non cambiare inventario per eseguire un test. Nel collaudo è stata usata Aloe disponibile al posto di una succulenta non disponibile.

## Eccezioni geografiche e rollback

Sicilia e Sardegna usano la fascia speciale. **Elba, Lido di Venezia, Pellestrina e altre isole minori non sono ancora coperte dalla speciale verificata.** Segnala località, provincia, CAP reale verificato e riferimento del servizio; non aggiungere supplementi a intere province continentali, CAP inventati, blocchi o deroghe commerciali non approvati.

In caso di errore tariffario il responsabile autorizzato può tornare alla configurazione A positiva precedente: in ciascun mercato ripristinare il gruppo A su Tutti i prodotti e rimuovere il gruppo B, conservando gli importi A e la gratuità OFF. Verificare subito il checkout. Non ripristinare la vecchia gratuità da 55 €. Non cancellare prodotti, varianti o collezioni come parte del rollback.

La procedura nativa e i selettori sono stati verificati in UI; l'operazione futura di modifica classi va sempre ricontrollata nel checkout dopo il salvataggio. [Evidenze e screenshot](shipping-evidence/2026-11-05/b-live/README.md). Sendcloud resta per evasione ed etichette e non va modificato per cambiare queste tariffe.
