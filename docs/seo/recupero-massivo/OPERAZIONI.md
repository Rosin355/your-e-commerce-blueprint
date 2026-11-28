## 28 novembre 2026 · Pilota Cloudflare PASS apex + www (primo hop diretto)

**Evidenza HTTP fornita dal titolare (28/11/2026, GET senza seguire redirect).** Il Worker `onlinegarden-301-redirects`, versione attiva prefisso `7d009cbd` da Dashboard Cloudflare, restituisce:

- **Apex**, `GET https://onlinegarden.it/prodotto/rose/rosa-jasmina-rampicante/?utm_source=test301`: `HTTP/2 301`, `location: https://onlinegarden.it/products/rosa-jasmina-rampicante?utm_source=test301`, `server: cloudflare`, `cache-control: no-store` (28 novembre, 14:45:47 GMT).
- **www**, `GET https://www.onlinegarden.it/prodotto/rose/rosa-jasmina-rampicante/?utm_source=test301`: `HTTP/2 301`, **lo stesso Location diretto alla PDP sull'apex**, UTM preservato, `server: cloudflare`, `cache-control: no-store` (28 novembre, **16:34:24 GMT**).
- Screenshot del titolare: sotto Workers & Pages > Worker > Domains e presente la route apex `onlinegarden.it/prodotto/rose/rosa-jasmina-rampicante/*`. Il test www dimostra il funzionamento del pilota dopo aggiunta della route `www.onlinegarden.it/prodotto/rose/rosa-jasmina-rampicante/*`; verificare l'elenco delle route completo prima del change massivo.
- I due test sono **primo hop diretto**, senza passaggio preliminare al vecchio URL sull'apex. Il difetto di doppio hop www registrato nel report di baseline precedente al change e risolto per **questo pilota**. Le precedenti 5.640 prove misuravano lo stato pre-change e non vanno rietichettate come post-change.
- **Stato:** pilota HTTP PASS su entrambi gli host; i **1.113 mapping APPROVED restano preparati, NON distribuiti**. Altri 1.112 non sono ancora attivi, salvo diversa prova live. Verificare versione attiva e conservare ID completo privatamente prima del rilascio.

**Prossimo gate operativo:** esaminare il pacchetto ZIP e i suoi SHA-256, verificare il sorgente `50/worker.mjs` e la relazione con il pilota, caricare/distribuire nel **Worker esistente** la versione cumulativa da 50 mantenendo per il momento le due route pilota strette; ripetere i test pilota. Solo dopo, aggiungere in modo additivo `onlinegarden.it/prodotto/*` e `www.onlinegarden.it/prodotto/*` (senza `/*`) e collaudare 50 righe piu regressioni e pass-through prima del lotto 250. Ricordare che distribuire codice e associare route sono **due changes distinti** e che il rollback deve includere entrambi. Non cambiare DNS, origine Lovable, SSL/TLS, catalogo, checkout o email.

**Stato progetto:** `PENDING_CLIENT_ACCEPTANCE`, SAL 57,75%.

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

## Baseline Cloudflare identificata tramite screenshot del titolare

**28 novembre 2026, ore locali circa 17:26, evidenza visuale.** Nel pannello Cloudflare Workers & Pages > `onlinegarden-301-redirects` > Deployments il titolare mostra:

- Versione **attiva**: prefisso ID `7d009cbd`, **100% del traffico**, deploy manuale circa due ore prima, `0%` error rate mostrato nel pannello e `0 req/sec` al momento dello screenshot.
- Versione **precedente** elencata: prefisso `c1232c3b`; non e' dimostrato che contenga il pilota, quindi **non** usarla automaticamente come rollback.
- I valori sono abbreviazioni visualizzate: l'UUID completo della versione attiva deve essere copiato tramite l'icona accanto alla riga e conservato nell'archivio **privato** del change, non dedotto dal prefisso.
- Gate successivo: acquisire UUID completo e verificare che il pilota corrisponda alla versione servita, poi inventariare tutte le route e redirect esistenti prima del change. **Nessun lotto massivo puo essere indicato come LIVE solo da questo screenshot.**

`PENDING_CLIENT_ACCEPTANCE` - SAL `57,75%`.

## Snapshot route pre-change, 28 novembre 2026 ore 17:31

Screenshot del titolare nella scheda Workers & Pages > `onlinegarden-301-redirects` > **Domains**: Worker URL di produzione attivo; sezione **Custom Domains and Routes** elenca **una sola route**, `onlinegarden.it/prodotto/rose/rosa-jasmina-rampicante/*`, zona `onlinegarden.it`. Non risultano altre route associate a questo Worker nell'elenco mostrato. Versione attiva gia osservata nel medesimo pannello: prefisso `7d009cbd`, 100% traffico; UUID completo da conservare privatamente.

Sequenza minima proposta: aggiungere in modo **additivo** una sola route pilota per `www.onlinegarden.it/prodotto/rose/rosa-jasmina-rampicante/*`, associata allo stesso Worker; non modificare quella apex. Verificare con `curl -sS -o /dev/null -D - 'https://www.onlinegarden.it/prodotto/rose/rosa-jasmina-rampicante/?utm_source=test301'` che il primo hop sia HTTP 301 con `Location: https://onlinegarden.it/products/rosa-jasmina-rampicante?utm_source=test301`. Se continua il redirect verso il vecchio permalink apex, sospendere e ispezionare precedenza delle Rules prima di ampliare. Una route HTTP non certifica il codice massivo distribuito; i lotti restano non deployati. Dopo PASS si potranno predisporre i due pattern generali previsti dal pacchetto, con rollout progressivo e rollback.

Stato: `PENDING_CLIENT_ACCEPTANCE` / SAL 57,75%.
