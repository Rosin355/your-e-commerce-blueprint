# Online Garden — flusso UX dell'autenticazione clienti

**Aggiornato il 16 novembre 2026; sostituisce le alternative UX del 15 novembre.** Proposta da approvare, nessuna interfaccia modificata/pubblicata o comunicazione inviata. L'[audit tecnico](customers-auth-architecture-2026-11-16.md) raccomanda **Shopify Customer Accounts per i clienti, Supabase Auth per Admin e operatori**. Il [pilota create-only](customers-pilot-plan-2026-11-15.md) diventa un'eccezione motivata, non il percorso predefinito per permettere ai vecchi clienti di acquistare.

## Problema attuale e decisione per il designer

Lettura statica del branch remoto `e09930f`: `/auth` e `/account` usano Supabase; `/account/callback` salva invece una sessione Shopify e poi apre `/account`. In assenza di Supabase si torna al login, mentre una sessione Supabase già aperta può appartenere a una persona diversa. Il link mobile porta sempre a `/auth`; il pulsante desktop considera `useAuth`. Il checkout non riceve l'identità cliente dal codice corrente. Questi comportamenti non sono stati collaudati sul sito pubblico.

La proposta elimina l'ambiguità dal percorso cliente: **un solo pulsante account e un solo flusso pubblico passwordless**, con ingresso personale separato sotto Admin. Non mostrare due pulsanti “Shopify/Supabase” al cliente. La scelta tecnica non deve diventare un problema da risolvere nell'interfaccia. Il personale deve poter accedere e recuperare la propria sessione prima di sostituire il login pubblico; non inviarlo al flusso clienti.

## Percorso pubblico futuro

```text
Account (desktop/mobile)
  -> guest: pagina /auth con azione volontaria di accesso
  -> Shopify: email + codice monouso -> callback verificato
  -> /account: profilo e ordini del cliente Shopify autenticato
  -> acquisto: carrello associato alla stessa identità -> checkout nativo
  -> esci: pulizia area cliente e logout Shopify -> stato guest

Accesso personale -> ingresso Admin dedicato -> Supabase -> permessi esistenti
```

Secondo la [documentazione Shopify](https://help.shopify.com/en/manual/customers/customer-accounts), l'accesso con email nuova può creare un profilo automaticamente. Il cliente non deve quindi ricevere la promessa “account storico recuperato” dopo il codice: è dimostrato il controllo della casella attuale, non il collegamento ai dati WooCommerce. Il tipo account, brand, dominio, redirect e automazioni del negozio devono ancora essere verificati.

1. Il cliente avvia volontariamente l'accesso. Nessun OTP, invito o email causato dall'apertura della pagina o dall'importazione di una lista.
2. Compila il percorso ospitato da Shopify. Niente password WordPress o reset Supabase nel percorso cliente. La richiesta di codice è una comunicazione richiesta dall'utente, distinta dal consenso marketing.
3. Il callback mostra uno stato di attesa, poi conferma soltanto una sessione e un profilo validi. Annullamento, errore o scadenza non mostrano successo. Nessun nome/email rimasto da una sessione precedente.
4. `/account` espone inizialmente profilo in sola lettura e ordini Shopify autorizzati, con paginazione. Campi mancanti restano vuoti con spiegazioni neutrali. Distinguere “nessun ordine Shopify” da “ordini temporaneamente non disponibili”. Il progetto non trasferisce lo storico WooCommerce.
5. Ritorno al carrello dopo login tramite percorso locale ammesso; checkout guest ancora disponibile secondo impostazioni approvate. Se l'identità non è confermata, proporre nuova autenticazione o prosecuzione guest esplicita, senza attribuire silenziosamente il checkout a un'altra persona.
6. Logout cliente separato da logout personale. Se l'uscita remota fallisce, l'area locale deve restare senza dati privati e spiegare che la disconnessione Shopify non è confermata. Il tasto indietro e una risposta API tardiva non devono ripopolare il profilo.

Le schermate ospitate non sono necessariamente personalizzabili come quelle React; il designer deve verificare i limiti del negozio prima di approvare i mockup. Non pubblicare URL di login dedotti o un nuovo pulsante prima del collaudo.

## Recupero e assistenza

**849 candidati:** nessun invito di massa o preselezione per la creazione. **7 quarantene:** blocco dei trasferimenti legacy, non della normale registrazione volontaria. **1 match esistente:** non ricreare. Profilo senza email, casella cambiata/condivisa e recapiti alternativi richiedono assistenza su iniziativa dell'utente, verifica privata e nessun merge automatico. Non rivelare se un'altra persona abbia un account, non chiedere password e non usare il solo telefono come prova d'identità.

I 953 ordini precedenti restano fuori da questa area; eventuale recupero dello storico è un progetto distinto. I dati minimi legacy non contengono nomi e indirizzi: nessun valore dedotto dall'email. Per gli utenti Supabase già registrati prevedere una spiegazione del nuovo accesso e una decisione di retention, senza cancellare o trasferire automaticamente profili.

## Testi proposti, non pubblicati

| Stato | Testo da revisionare |
| --- | --- |
| Accesso cliente | «Accedi con la tua email. Riceverai un codice monouso: non serve la password del vecchio sito.» |
| Account nuovo | «Al primo accesso può essere creato un profilo per questa email.» |
| Storico non migrato | «Gli ordini del precedente sito non sono disponibili in quest'area.» |
| Nessun ordine, risposta valida | «Non risultano ordini Shopify per questo account.» |
| Errore caricamento | «Non è stato possibile caricare gli ordini. Riprova più tardi.» |
| Casella non accessibile | «Contatta l'assistenza: ti aiuteremo a verificare i dati del tuo account.» |
| Callback fallito | «Non è stato possibile completare l'accesso. Riprova.» |
| Logout remoto incerto | «I dati sono stati rimossi da questa pagina. Non possiamo confermare la disconnessione da Shopify: riprova prima di lasciare un dispositivo condiviso.» |

Nessun consenso preselezionato, campagna o messaggio “migrazione completata”. Non esporre ID, token, stack o risposta tecnica Shopify al cliente. La proposta non autorizza modifiche ai consensi esistenti.

## Accettazione UX e go/no-go

- [ ] Owner approva B; Shopify verifica impostazioni e URL ufficiali, il team separa prima l'ingresso staff.
- [ ] Designer valida mobile/desktop, tastiera, focus, lingua, brand, attesa, cancellazione, errori e ritorno locale sicuro.
- [ ] Test con identità controllate autorizzati: accesso esistente/nuovo, reload/scadenza, logout, cambio persona, carrello/checkout e ritorno dal checkout.
- [ ] Profilo e ordini appartenenti sempre alla stessa identità, senza cache di un'altra persona; stato vuoto distinto da errore.
- [ ] Staff admin/tech_admin/editor/publisher mantiene accesso e recovery secondo i permessi correnti, anche senza sessione Shopify.
- [ ] Assistenza dispone di procedura privata per email cambiata, quarantene e phone-only, senza auto-merge o promesse sullo storico.
- [ ] Marketing e automazioni verificati; soli OTP alle caselle di prova espressamente autorizzate, nessun contatto a clienti reali.
- [ ] Prova del rollback: stato di indisponibilità customer sicuro, staff e guest preservati, nessuna promessa di cancellazione di effetti già prodotti.

Tutte le caselle restano aperte. La [matrice completa](customers-auth-risk-test-matrix.md) specifica prove e responsabilità. Questo audit non ha effettuato login, creato profili, richiesto codici o eseguito test sul negozio.
