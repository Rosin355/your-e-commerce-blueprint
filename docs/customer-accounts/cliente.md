# Nuovo accesso clienti — cosa è pronto e cosa resta da verificare

16 novembre 2026. È stato preparato un nuovo accesso con Shopify: l'acquirente sceglie di accedere, inserisce la propria email su Shopify e riceve un codice monouso. Non serve trasferire la password del vecchio sito. La sua area personale leggerà profilo e ordini Shopify dell'account autenticato.

**La funzionalità è disattivata.** Il sito pubblico continua con i percorsi attuali; il gestionale, il login Supabase di Marco, gli operatori e il checkout non sono stati modificati. Non è stato introdotto un nuovo Admin. Nessun profilo Shopify è stato creato o aggiornato, nessuna email è stata inviata, nessuna pubblicazione effettuata.

Il prossimo passo è un collaudo in un ambiente dedicato con indirizzi posseduti dal team e autorizzazione specifica: anche un primo accesso di prova può creare un profilo e inviare un codice. Prima occorre verificare impostazioni Shopify, automazioni, marketing e compatibilità dei percorsi già usati dal personale. Se fosse necessario intervenire sul login degli operatori, il lavoro si fermerà per una decisione separata.

Il nuovo login non importa i 849 candidati storici, non risolve automaticamente i sette casi in quarantena e non trasferisce i 953 ordini WooCommerce. Il profilo già presente non va ricreato. Email cambiata o profilo senza email richiedono assistenza privata. Non vengono attivati consensi marketing.

Il codice ha superato prove automatiche sintetiche; non sono state usate identità di clienti reali. Il checkout mantiene la propria sessione: l'accesso all'area personale non garantisce ancora che il checkout riconosca automaticamente la stessa persona. Questo punto, la sicurezza della sessione e i percorsi degli operatori devono essere verificati prima di una futura attivazione.

[Developer: configurazione, limiti e piano di prova](developer.md) · [Designer: schermate e stati](designer.md). La PR draft prepara il collaudo e non autorizza migrazione o rilascio in produzione.
