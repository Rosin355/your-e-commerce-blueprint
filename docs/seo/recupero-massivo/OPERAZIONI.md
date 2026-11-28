# Rilascio e ripristino del Worker onlinegarden-301-redirects

## Stato di partenza del 28 novembre 2026

L’apex risponde con un solo 301 per Rosa Jasmina. Sul www il primo hop porta allo stesso percorso Woo sull’apex. Le ricevute di rete dimostrano l’ordine effettivo delle risposte. Il pannello accessibile in questa sessione mostrava il login. L’UUID attivo, le associazioni dei trigger e l’esatta regola che normalizza il www richiedono la lettura della zona da parte del titolare. La precedente stima di 32 route e il nome di esempio `og-legacy-products` appartengono alla preparazione storica.

## Prima del traffico

1. Aprire il Worker esistente, sezione Deployments. Registrare nel change privato l’ID della versione che serve il pilota, le percentuali, la data e il riferimento al bundle precedente. Verificare che la versione sia disponibile per Rollback, salvare il sorgente precedente nell’area privata e inventariare route, esclusioni, redirect di zona e binding attuali. Annotare ID e proprietario di ogni trigger interessato. Se il servizio ospita altre funzioni, binding o route operative, confrontarne prima il comportamento con il bundle. Una distribuzione su più versioni richiede il salvataggio di tutta la configurazione e delle percentuali prima di procedere.
2. Confrontare la tabella route e il comportamento del www con le ricevute. Una route più specifica prevale, anche se esclude un Worker. Conservare le route specifiche del pilota. Accertare che entrambe siano associate al servizio previsto, che le nuove route non sottraggano traffico a un altro Worker e che un redirect di zona non intercetti prima il www. Usare il trace autorizzato della zona per localizzare il primo hop. Qualsiasi intervento su una regola condivisa richiede un piano circoscritto che mantenga la normalizzazione del resto del sito. [Regole di precedenza Cloudflare](https://developers.cloudflare.com/workers/configuration/routing/routes/) · [Redirect di zona](https://developers.cloudflare.com/rules/url-forwarding/)
3. Verificare le impronte dello ZIP con `shasum -a 256 -c SHA256SUMS` dalla directory estratta. Ricontrollare i candidati del lotto con il catalogo Shopify in lettura e il controllo browser delle relative schede. Un prodotto divenuto draft, rimosso o con canonical diverso esce dal lotto. Verificare quota e traffico dei due prefissi, compresi i passaggi all’origine.
4. Usare il bundle `pilot/worker.mjs` del solo pilota sul servizio esistente. Se i due pattern generali sono liberi, associarli **in modo additivo** con Settings → Domains & Routes → Add Route. I pattern sono `onlinegarden.it/prodotto/*` e `www.onlinegarden.it/prodotto/*`. Confrontare gli altri trigger prima e dopo. Il file `wrangler.json` descrive i due pattern del change. Una sostituzione globale dell’elenco dei trigger può cancellare regole preesistenti.

## Avanzamento per lotti

L’ordine è pilota, 50, 250, 500, 1.000, completo. Ogni lotto include tutti i percorsi del precedente. Il pilota rimane primo, seguono gli altri mapping del fascicolo originario ancora approvati e poi i percorsi in ordine alfabetico. Ciascuna versione serve il 100% delle richieste del proprio lotto. Un’assegnazione casuale del traffico produrrebbe esiti diversi per lo stesso vecchio URL.

Dalla directory del lotto, con il profilo già autorizzato del gestore, `wrangler versions upload --config wrangler.json` crea la candidata. Registrare l’UUID restituito e il digest di `worker.mjs`. La promozione esplicita è `wrangler versions deploy UUID_CANDIDATA@100% --config wrangler.json`, sostituendo il segnaposto con la versione appena controllata. La gestione dei trigger è separata. [Comandi versionati Wrangler](https://developers.cloudflare.com/workers/wrangler/commands/workers/)

Dalla radice della PR, sostituire i percorsi segnaposto con la directory estratta e una ricevuta nuova.

```sh
node infra/seo/massivo/verifica-pdp.cjs docs/seo/recupero-massivo/pdp.jsonl.gz ricevuta-pdp.jsonl 4 /percorso/lotto/mapping.json
python3 infra/seo/massivo/primi-hop.py stage ricevuta-lotto.csv --map /percorso/lotto/mapping.json
node infra/seo/massivo/regressioni.cjs ricevuta-storefront.json
```

Il controllo browser confronta titolo, H1, JSON-LD, canonical e indicizzabilità col fascicolo del lotto. Il controllo HTTP richiede GET e HEAD sui due host in HTTP e HTTPS, query mista, Location diretta e destinazione terminale 200. Verifica inoltre che i percorsi fuori lotto passino all’origine o alla normale canonicalizzazione dell’host. Il controllo storefront verifica home, catalogo, scheda, ingresso al login, carrello e avvio checkout intercettato. Richiede Playwright e Chrome. Salvare gli esiti insieme alla versione, controllare errori 5xx, quota, richieste inattese e segnalazioni Search Console. Ampliare soltanto dopo il PASS dell’intero lotto e una finestra di osservazione registrata. Il fallimento attuale del www trattiene il passaggio da pilota a 50.

## Rollback

Al primo mapping errato, loop, perdita di UTM, intercettazione di un flusso commerciale o incremento di 5xx, sospendere l’avanzamento. In Deployments selezionare **l’UUID precedentemente salvato** e usare Rollback. Per uno split preesistente ripristinare le percentuali documentate. Ripristinare separatamente la configurazione dei trigger e delle eventuali eccezioni di redirect dal registro del change, rimuovendo soltanto le aggiunte effettuate. Verificare Rosa Jasmina su entrambi gli host, almeno un percorso appena ritirato, le regressioni commerciali e il confronto con le ricevute precedenti. I client che hanno già memorizzato un 301 possono continuare a usarlo. Il Worker restituisce `Cache-Control: no-store`. [Rollback Cloudflare](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)

È inclusa la copia `rollback/pilota-originale.mjs` del Worker pilota precedente, SHA-256 `54686b0b7c0cf55e37afed0c8faff34a156901e794f13834f6c5811c9d4f8c14`. Il Worker e il file Wrangler originali sono stati ricostruiti dal commit `18d47ec` e confrontati byte per byte con lo ZIP originario del titolare, SHA-256 `e790e15cc2a57154a228f68f3637b94ef7cd4eb6bf1a8d5bfef6f4c01f838158`. Per ripristinare utilizzare la versione attiva registrata dal provider prima del change. La corrispondenza fra il sorgente originale e l’UUID realmente in produzione resta da attestare nel pannello. Il nome di esempio del vecchio file Wrangler appartiene al fascicolo storico.
