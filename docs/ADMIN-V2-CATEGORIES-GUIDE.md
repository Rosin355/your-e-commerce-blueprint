# Guida categorie per Marco

Stato: IMPLEMENTED e TESTED con simulazioni; NOT YET ENABLED nel negozio live.

1. Apri **Admin → Categorie** e cerca nome o handle.
2. Ogni scheda distingue categoria interna, mapping collezione Shopify e presenza nel menu. Il conteggio è interno; zero non significa automaticamente zero prodotti nel negozio.
3. Usa **Mostra** per vedere associati, senza categoria canonica o multi-associati. Lo SKU apre la scheda Admin.
4. **Proponi categorie** mostra le checkbox delle categorie reali. Un mapping non verificato non è selezionabile.
5. **Verifica proposta** non scrive: mostra aggiunte/rimozioni interne e, se disponibile, il confronto effettivo Shopify.
6. **Conferma assegnazione** compare soltanto con permesso amministrativo e abilitazione operativa. Richiede conferma separata; il server rilegge la situazione e rifiuta proposte obsolete.
7. Un esito da riconciliare richiede il team tecnico. Non tentare di aggirarlo cambiando prodotto o ripetendo le richieste. Il registro impedisce operazioni contemporanee sullo stesso prodotto.

Non vengono cancellate collezioni. Non vengono dedotte categorie da nome o descrizione. Le collezioni automatiche non sono modificabili da questo percorso. Gli 82 casi storici rimangono un lavoro di riconciliazione distinto.

Per il designer: palette e shell Admin esistenti, schede responsive, controlli con etichette, anteprima prima della conferma; errori e assenza dati visibili, senza sostituzione con dati dimostrativi.
