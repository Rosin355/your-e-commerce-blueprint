# Guida spedizioni per Marco

Aggiornata il **5 novembre 2026**. Questa guida distingue la gestione disponibile oggi da quella ancora da completare.

## Stato reale

Shopify Admin → Mercati → **Italy** → Spedizione → **Standard** applica la tabella A a tutti i prodotti. Il sottomercato **Sicilia e Sardegna — Isole** applica la tabella A speciale. Nessuna gratuità da 55 €. La B non è attiva: i 161 candidati non sono ancora approvazioni logistiche. Sendcloud resta il pannello per evasione ed etichette.

Il tuo account **Marco Geron** risulta attivo con ruolo **Amministratore dell'organizzazione** e privilegi completi. I permessi non sono stati cambiati. La gestione classi nel gestionale Online Garden non è stata pubblicata: non compare un nuovo comando A/B protetto per effetto di questo intervento.

## Verificare la classe e la tariffa oggi

1. Apri il prodotto in Shopify Admin e controlla tutte le varianti, SKU e disponibilità.
2. Oggi ogni variante fisica del catalogo usa A: un titolo «bulbo», una collezione botanica o un tag non costituiscono un'approvazione B.
3. Per controllare il costo effettivo, aggiungi il prodotto al carrello del sito, apri il checkout e inserisci una destinazione di prova. Fermati alla tariffa senza premere «Paga ora».
4. Confronta il totale dopo gli sconti con la [tabella approvata](SHIPPING-RATE-MATRIX.md). Devono apparire una sola tariffa corretta e nessuna gratuità. Roma 16,40 € → 8,90 €; Roma 65,60 € → 11,90 €; Palermo/Cagliari 65,60 € → 12,50 €.

## Richiedere A → B senza classificazioni erronee

La richiesta va registrata per ogni variante: ID prodotto, ID variante, SKU, classe proposta bulbo/grassa, conferma dell'idoneità logistica (imballo, fragilità, ingombro), nome dell'approvatore, data e riferimento alla conferma. Il file dei candidati è una lista da valutare, non un elenco da importare come approvato.

Prima di applicare B devono essere approvate **tutte** le varianti fisiche del prodotto. Una variante A deve essere un prodotto distinto, senza dividere automaticamente prodotti esistenti. Peso zero significa informazione insufficiente, non «leggero». Non compilare dimensioni o peso per tentativi.

**Blocco attuale:** il codice server di prova rifiuta assegnazioni B dal percorso generico e il registro è vuoto. Il passaggio autonomo A → B non è disponibile in un percorso protetto online. Non aggiungere tag B o modificare collezioni per aggirarlo: Shopify Admin diretto non passa da quel guard. Il futuro percorso protetto richiede una conferma esplicita che mostri classe attuale, nuova classe, tutte le varianti approvate e l'effetto sul prezzo; non è stato distribuito.

La configurazione A attuale si applica a tutti i prodotti. Prima di attivare B andrà sostituita con collezioni A/B complementari nella stessa opzione: aggiungere solo una tariffa B lasciando A su tutti i prodotti non riduce la spedizione, perché Shopify usa il massimo. Questa attivazione non è avvenuta.

## B → A e nuove varianti

Oggi nessun prodotto è B. Quando B sarà attivata con percorso protetto, B → A dovrà togliere l'idoneità B, verificare l'appartenenza alla sola A e mostrare la conferma del cambiamento tariffario. Non promettiamo quel pulsante come già online.

Per nuovi prodotti senza approvazione, mantenere A. Prima di aggiungere, importare o modificare una variante di un futuro prodotto B, declassificare e verificare l'intero prodotto in A tramite il percorso autorizzato. Soltanto dopo approvazione di tutte le varianti correnti potrà tornare B. Se serve una variante ordinaria, creare un prodotto distinto. Non usare import o modifiche dirette per eludere il blocco.

## Segnalare un'eccezione geografica

Inviare destinazione, provincia, CAP reale verificato, località, riferimento del corriere e tariffa attesa, senza dati personali del cliente non necessari. Elba, Lido di Venezia, Pellestrina e altre isole minori restano **non coperte dalla fascia speciale**: non sono state incluse intere province continentali. Il fatto che il checkout offra la tariffa standard del genitore non approva commercialmente quella tariffa.

Serve una decisione specifica del proprietario su questa limitazione prima di dichiarare la copertura completa. Non inventare un supplemento manuale, una lista CAP o un blocco checkout.

## Se la tariffa è errata

Non completare un ordine. Registrare prodotto/SKU, quantità, subtotale dopo sconto, destinazione e screenshot della sola tariffa. Segnalare subito duplicati, gratuità inattesa o assenza di spedizione. Il responsabile autorizzato può usare il [rollback positivo](SHIPPING-SHOPIFY-INTEGRATION.md): fallback 7 € senza gratuità e sottomercato isole in Bozza. Non ripristinare la vecchia gratuità da 55 €.
