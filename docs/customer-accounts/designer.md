# Area cliente Shopify — specifica UX della prova

16 novembre 2026. L'esperienza è preparata nel codice con feature flag OFF. Nessuna schermata è stata pubblicata o collaudata con un cliente reale. [Guida tecnica e gate](developer.md).

| Schermata/stato ON | Esperienza preparata |
| --- | --- |
| Header desktop e mobile | Stesso percorso `/account`, senza usare il nome della sessione Supabase |
| `/auth` guest | Spiegazione email + codice Shopify; pulsante volontario “Accedi con Shopify”; avviso possibile creazione al primo accesso |
| Shopify ospitato | Inserimento email e codice gestiti da Shopify; nessun form password WordPress; brand e localizzazione da verificare nel negozio di prova |
| Callback | Attesa; successo solo dopo token e profilo validi; errore generico con link per riprovare |
| Account | Nome/email se presenti, ordini Shopify propri, data/importo, paginazione “Carica altri ordini”; nessun dato dedotto |
| Errore dati | Messaggio di indisponibilità distinto da “nessun ordine”; i dati di una persona precedente vengono rimossi |
| Logout | Dati locali rimossi subito; avviso se uscita remota non confermata |
| Configurazione assente | Stato di indisponibilità, ritorno al negozio |

I componenti riutilizzano header/footer, pulsanti e layout responsive esistenti. Da collaudare: mobile, focus al callback, tastiera, screen reader, timeout/cancellazione OTP, due tab e comportamento del tasto indietro. Le pagine Shopify ospitate hanno vincoli di personalizzazione propri. Nessun mockup equivale a una configurazione effettiva.

Non mostrare “migrazione completata”: l'OTP prova l'accesso alla casella attuale e non recupera password o storico WooCommerce. I 953 ordini storici non vengono importati. I 849 sono candidati alla review legacy; i sette casi dubbi non vengono trasferiti. Quarantena legacy non significa divieto di normale registrazione. Email cambiata e profilo senza email richiedono assistenza privata, senza auto-merge o enumerazione di account.

Con flag OFF il sito e il percorso di Marco rimangono quelli attuali. Nessun nuovo ingresso Admin progettato. Nella prova ON il checkout mantiene il flusso preesistente e può richiedere un accesso separato: non promettere identità unificata finché non collaudata/implementata. Nessun consenso preselezionato o campagna è parte del flusso.
