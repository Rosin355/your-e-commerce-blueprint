# Accettazione Admin V2 · 21 novembre 2026

## Chiusura AI della nuova bozza · 24 novembre 2026

Il percorso tecnico è stato eseguito con un account staff in anteprima e con rilettura su onlinegarden.it. Una richiesta reale ha organizzato la descrizione. SEO e tag hanno usato il fallback previsto per quell’account. Per Marco resta da verificare in prima persona la selezione del modello sui suoi tre campi abilitati. Per l’accettazione personale verificare nella stessa bozza le origini dei suggerimenti, il tipo manuale, due formati, tre mesi, foto e categoria fino alla riapertura. Registrare la conferma di Marco. [Stato di rilascio e rollback](../release/PR73-CHIUSURA-AI.md)

| Controllo | Prova disponibile | Esito e ambito |
| --- | --- | --- |
| Catalogo e ricerca | Ricerca globale per nome, SKU e GTIN. Filtri prima del cursore, righe oltre il primo lotto e oltre 500 valori. Guardie desktop e mobile. | PASS su fixture |
| Bozza interna | Il database di produzione contiene una singola operazione per la lavanda tecnica TEST-OG-AI-001, un formato, una foto, nessun collegamento Shopify. Riepilogo già verificato sul sito con utenza tecnica. | PASS produzione per la bozza esistente. Salvataggio e riapertura della versione candidata su fixture |
| Bozza Shopify e mapping | Su una diversa bozza tecnica preesistente il journal risulta VERIFIED_DRAFT. Shopify risponde DRAFT, canale del sito false, uno SKU con opzione Formato, un media READY con ALT e una collezione. | PASS rilettura diretta del 21 novembre. Invio, errore, riconciliazione e assenza di doppia creazione provati sul candidato con fixture |
| Modifica, categorie, prezzi e formati | Campi tipizzati, FAQ, provenienza, concorrenza, storico e selezioni verificati dai test. La versione della selezione viene acquisita all’inizio della modifica. | PASS tecnico. Galleria e modifiche strutturali di prodotti esistenti usano autorizzazioni native Shopify |
| AI | Confronto, scarto, accettazione, proposte obsolete e indisponibilità provati con fixture. Il percorso da fatti confermati ha una precedente generazione reale documentata. Per la proposta su un campo esiste anche un’accettazione tecnica live con rilettura della versione aggiornata. [Verbale di accettazione tecnica](../fase2d/ai-controlled-accept-2D9.md). | PASS tecnico. La nuova generazione dal comando di miglioramento campo resta da osservare in sessione autenticata |
| Autorizzazione | Lettura mirata del grant approvato. Unico ruolo editor, otto capability, diciassette campi. Il creatore della lavanda è un altro operatore. | PASS configurazione. Il controllo personale è separato |
| Sicurezza e checkout | Proxy già distribuito con allowlist, scansione precedente senza criticità. Raggiunto il checkout ospite nella verifica di baseline. | PASS conservazione del perimetro pubblicato |
| Accettazione di Marco | Accesso con la sua sessione, autonomia, leggibilità sul suo dispositivo e azione consentita da lui scelta sulla sola fixture. | PENDING_CLIENT_ACCEPTANCE |

## Prima sessione con il cliente

Marco accede personalmente a /admin, cerca TEST-OG-AI-001, apre lo storico e il riepilogo della foto, del prezzo e della collezione. Confronta il testo attuale con una proposta, sceglie se scartarla o confermarla e rilegge il risultato. Per la prova sulla lavanda si può annullare una modifica. Registrare data, dispositivo, comandi disponibili, esiti e eventuale messaggio di errore senza inserire dati personali. La decisione di accettazione spetta al cliente. Per un controllo Shopify in lettura usare la distinta bozza tecnica già verificata.

[Verbale della prova tecnica precedente](../editor-step1/COLLAUDO-MARCO-STEP1C.md) · [Versioni e stato di produzione](RELEASE-REPORT.md) · [Guida](CLIENT-GUIDE.md).
