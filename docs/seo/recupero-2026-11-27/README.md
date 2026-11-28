# Recupero catalogo e piano Cloudflare · 27 novembre 2026

**READY_FOR_APPROVAL per 16 percorsi. Attivazione BLOCKED.** PENDING_CLIENT_ACCEPTANCE · SAL 57,75%. La lista è un artefatto offline per la revisione del titolare.

## Inventario e matrice

Export Woo del 28 febbraio, SHA-256 `e6bd2a7a2c5b94b3d33f97ae40aa0730108131e25d49fad3f5ed1522e4d96dbc`. Inventario del responsabile, SHA-256 `f0f267d623b932c6fffb522c3c6528069584d62ce37abcd7192b850f6b178cd1`. Gli ID e gli SKU dei 1.354 padri coincidono (1.220 variabili e 134 semplici, due privi di SKU). Una gift card fuori inventario. Fra 1.363 varianti, 11 senza SKU e 2 con riferimento padre condiviso non aggiungono prove di identità.

Snapshot Shopify Admin del 27 novembre, negozio Online Garden, conteggio EXACT 1.364 prodotti, 14 pagine, 1.364 GID distinti, varianti complete per ogni prodotto. Confronto per SKU letterale di padre o variante con relazione padre documentata. Un singolo GID per famiglia e nessuna collisione fra padri ammessi. Il titolo identico può generare solo un candidato. La [matrice completa](matrice-prodotti.csv) contiene 1.189 esatti per SKU, 1 probabile, 79 ambigui e 85 assenti ai criteri adottati. Una chiave SKU Woo condivisa tra famiglie, nessuno SKU condiviso fra prodotti Shopify. Identità prodotto e identità del vecchio URL sono verifiche distinte.

L'[inventario storico GSC](../LEGACY-URL-REDIRECT-MAP.csv) conserva 1.380 URL osservati, tutti sul www, per 1.274 percorsi. È prova di osservazione del percorso. L'export non documenta il canonical HTML originario. Per 1.210 padri ulteriori la matrice indica un percorso osservato con segmento finale coincidente con lo slug ipotizzato dal responsabile. Queste piste restano da verificare tramite permalink associato all'ID in un backup o sitemap corroborata. Per le 16 righe approvabili si dispone della [catena di evidenze Woo/GSC/Shopify](../REDIRECT-301-RELEASE-GATE-2026-11-20.md). Corrispondono a 20 URL GSC, incluse quattro forme con query variante. Restano sospesi 1.258 percorsi osservati. L'apex è incluso per coprire il comportamento HTTP dello stesso sito su entrambi gli host.

## Prove e piano

I [272 controlli GET/HEAD](http.csv) registrano il primo salto su HTTP/HTTPS, www/apex e query campione. Dopo la ripetizione di 25 richieste scadute, 136 risposte 200 e 136 risposte 301. Le sorgenti HTTPS apex rispondono 200. Le richieste www passano con 301 all'apex mantenendo il percorso legacy. Il 302 del 20 novembre è stato sostituito da un 301 di normalizzazione. Nessun 301 osservato dalla sorgente alla scheda. Tutte le [16 schede renderizzate](schede-pubbliche.json) hanno GET diretto 200, canonical e URL finale corretti, H1 e dati Product coerenti col titolo Shopify e assenza di noindex.

Il [CSV Cloudflare](cloudflare-bulk.csv) comprende 32 sorgenti esatte senza schema, due host per percorso, destinazione HTTPS assoluta, status 301 e quattro flag FALSE. Nessuna intestazione, wildcard, propagazione dei sottopercorsi o query nella sorgente. Un solo redirect per host e percorso. La destinazione è sempre una scheda fuori dal prefisso sorgente. [Formato Cloudflare](https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/reference/csv-file-format/)

**Decisione necessaria sulle query.** Questa lista può servire il traffico GET/HEAD senza query attraverso una regola che limiti esplicitamente metodo e query vuota. L'import da solo non applica tale filtro. UTM e attributi variante richiedono il trattamento selettivo e il passaggio all'origine già previsti dal contratto esistente. Senza filtro, la lista con preserve_query_string FALSE eliminerebbe anche gli UTM. Concordare l'integrazione prima dell'attivazione. Verificare anche precedenza sulla normalizzazione www/HTTPS per ottenere un solo salto. Approvazione mapping, infrastruttura e rollback separati.

1. Rieseguire baseline HTTP e controllo identità con catalogo aggiornato. Verificare fonte, ID, SKU, canonical, prima risposta, assenza di homepage, catene e loop. Generare la lista con `python3 infra/seo/prepara-bulk-recupero.py` dalla radice e confrontarla byte per byte.
2. Eseguire `node infra/seo/check-redirect-candidates.mjs`. Il test locale copre 384 redirect simulati, percorsi protetti e manifest disattivato. Sui soli URL approvati prevedere prima un collaudo controllato. Con approvazione di tutte le righe usare `python3 infra/seo/check-redirect-http.py --expect-active`. Ogni primo salto deve dare 301 e Location attesa; ogni destinazione deve dare direttamente 200.
3. Verificare query miste, sconosciute, slash, carrello, POST, host, TLS e disponibilità. Monitorare indicizzazione e segnalazioni Search Console. Sospendere la regola se cambiano identità o canonical o compaiono catene. Conservare la baseline e seguire il piano di ripristino del [gate infrastrutturale](../REDIRECT-301-RELEASE-GATE-2026-11-20.md).

## 28 novembre 2026 · BLOCKED_INFRA

Il ricontrollo ha trovato 16 prodotti Shopify ACTIVE con GID, handle e almeno uno SKU di variante concordante con la matrice Woo. Tutte le [16 PDP](schede-2026-11-28.json) danno 200 diretto, canonical esatto, H1 e JSON-LD Product coerenti con Shopify, senza noindex. Le [272 prime risposte HTTP](http-2026-11-28.csv) comprendono 136 risposte 200 e 136 risposte 301. Dieci letture inizialmente scadute sono state ripetute e sostituite con la risposta effettiva. Delle 208 prove sulle sorgenti, zero arrivano direttamente alla PDP prevista. I 301 esistenti normalizzano host o protocollo. I 1.258 percorsi sospesi restano esclusi.

La sessione Cloudflare apre il login. Manca un accesso verificato alla zona con lettura della precedenza, versione precedente e ripristino. Attivazioni e rollback reali in questa esecuzione sono entrambi zero.

### Consegna al gestore della zona

Il [CSV definitivo](cloudflare-bulk.csv) censisce i 32 abbinamenti esatti. Un Bulk Redirect con questi flag perde gli UTM se applicato alle query. Per l’intero contratto usare il Worker generato dalle stesse 16 righe verificate. Il generatore controlla l’impronta del manifest, scrive in una cartella nuova e produce un modulo autosufficiente e la relativa configurazione Wrangler. Il repository non associa route né avvia un deploy. [Formato CSV Cloudflare](https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/reference/csv-file-format/)

Dalla radice del branch #82 generare i due pacchetti con i comandi seguenti, scegliendo cartelle private nuove. Il pilota usa Rosa Jasmina su www e apex. Il pacchetto completo sostituisce il pilota con lo stesso nome Worker. La configurazione comprende rispettivamente 2 e 32 route, ognuna limitata al percorso legacy e al relativo host. Il suffisso wildcard abilita il confronto in presenza di query. Il modulo verifica poi il percorso letterale prima di produrre un 301. [Route Cloudflare](https://developers.cloudflare.com/workers/configuration/routing/routes/)

```sh
node infra/seo/build-rollout.mjs pilot /tmp/og-301-pilota
node infra/seo/build-rollout.mjs full /tmp/og-301-completo
```

Il modulo intercetta GET e HEAD. Rimuove l’attributo Woo `attribute_dimensioni` e conserva, anche se ripetuti, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term` e `utm_content`. Passa all’origine gli altri metodi, le query non ammesse, i prefissi simili e i prodotti esclusi. In isolamento sono passati 384 casi sul resolver e 576 casi sui due moduli generati.

**Unica azione del titolare** — affidare al gestore autenticato della zona `onlinegarden.it` il change pilota → completo con ricevuta e ripristino. Il gestore esporta prima ordine delle regole www/HTTPS, route e versione Worker corrente, e verifica che le route o il nome non appartengano a un altro servizio. Una regola precedente che risponde con un redirect interrompe l’elaborazione. Se il gestore non può isolare i soli percorsi del change o ripristinare la versione precedente, mantiene il blocco. [Ordine di esecuzione Cloudflare](https://developers.cloudflare.com/rules/reference/traffic-sequence/)

Il gestore pubblica il pacchetto pilota dalla zona confermata, poi esegue `python3 infra/seo/check-redirect-http.py --pilot --expect-active` e controlla il passaggio all’origine per una query sconosciuta e un percorso escluso. Estende solo dopo che la prima risposta di ogni sorgente pilota è 301 verso la PDP, anche su HTTP e www, con 200 diretto a destinazione. Sul completo usa `python3 infra/seo/check-redirect-http.py --expect-active` e ripete le sedici PDP. Per il rollback ripristina le route, l’ordine e la versione esportati, ritira solo le associazioni nuove e confronta i primi hop con la baseline. Conserva ricevute e identificativi del change nel registro della zona.
