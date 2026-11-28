## 28 novembre 2026 · Pilota Cloudflare PASS apex + www (primo hop diretto)

**Evidenza HTTP fornita dal titolare (28/11/2026, GET senza seguire redirect).** Il Worker `onlinegarden-301-redirects`, versione attiva prefisso `7d009cbd` da Dashboard Cloudflare, restituisce:

- **Apex**, `GET https://onlinegarden.it/prodotto/rose/rosa-jasmina-rampicante/?utm_source=test301`: `HTTP/2 301`, `location: https://onlinegarden.it/products/rosa-jasmina-rampicante?utm_source=test301`, `server: cloudflare`, `cache-control: no-store` (28 novembre, 14:45:47 GMT).
- **www**, `GET https://www.onlinegarden.it/prodotto/rose/rosa-jasmina-rampicante/?utm_source=test301`: `HTTP/2 301`, **lo stesso Location diretto alla PDP sull'apex**, UTM preservato, `server: cloudflare`, `cache-control: no-store` (28 novembre, **16:34:24 GMT**).
- Screenshot del titolare: sotto Workers & Pages > Worker > Domains e presente la route apex `onlinegarden.it/prodotto/rose/rosa-jasmina-rampicante/*`. Il test www dimostra il funzionamento del pilota dopo aggiunta della route `www.onlinegarden.it/prodotto/rose/rosa-jasmina-rampicante/*`; verificare l'elenco delle route completo prima del change massivo.
- I due test sono **primo hop diretto**, senza passaggio preliminare al vecchio URL sull'apex. Il difetto di doppio hop www registrato nel report di baseline precedente al change e risolto per **questo pilota**. Le precedenti 5.640 prove misuravano lo stato pre-change e non vanno rietichettate come post-change.
- **Stato:** pilota HTTP PASS su entrambi gli host; i **1.113 mapping APPROVED restano preparati, NON distribuiti**. Altri 1.112 non sono ancora attivi, salvo diversa prova live. Verificare versione attiva e conservare ID completo privatamente prima del rilascio.

**Prossimo gate operativo:** esaminare il pacchetto ZIP e i suoi SHA-256, verificare il sorgente `50/worker.mjs` e la relazione con il pilota, caricare/distribuire nel **Worker esistente** la versione cumulativa da 50 mantenendo per il momento le due route pilota strette; ripetere i test pilota. Solo dopo, aggiungere in modo additivo `onlinegarden.it/prodotto/*` e `www.onlinegarden.it/prodotto/*` (senza `/*`) e collaudare 50 righe piu regressioni e pass-through prima del lotto 250. Ricordare che distribuire codice e associare route sono **due changes distinti** e che il rollback deve includere entrambi. Non cambiare DNS, origine Lovable, SSL/TLS, catalogo, checkout o email.

**Stato progetto:** `PENDING_CLIENT_ACCEPTANCE`, SAL 57,75%.

# Recupero SEO WooCommerce verso Shopify · 28 novembre 2026

**1.113 percorsi approvati per 1.111 schede Shopify distinte.** Il redirect diretto di Rosa Jasmina è verificato sul dominio principale. Il primo hop del www porta ancora al vecchio percorso sull’apex. Il pacchetto massivo è preparato. Accettazione cliente **PENDING_CLIENT_ACCEPTANCE**, SAL **57,75%**. [Registro completo](registro-redirect.csv) · [Pacchetto Cloudflare](onlinegarden-301-redirects.zip) · [Rilascio e rollback](OPERAZIONI.md)

| Provenienza del vecchio percorso | APPROVED | REVIEW | BLOCKED | Totale |
|---|---:|---:|---:|---:|
| Google Search Console | 1.032 | 45 | 197 | 1.274 |
| Archivio pubblico, aggiuntivi a GSC | 81 | 27 | 28 | 136 |
| **Percorsi distinti** | **1.113** | **72** | **225** | **1.410** |

## Come si dimostra ciascuna corrispondenza

La matrice del 27 novembre è stata rigenerata dagli originali ed è identica alla versione Git. Dei 1.354 prodotti padre Woo, 1.189 hanno identità esatta su Shopify, 79 ambigua, 85 assente e uno probabile. La lettura Admin ha attraversato 14 pagine e 1.364 prodotti con tutte le varianti. Dei 1.189 esatti, 1.173 risultavano attivi. Dei 1.048 percorsi candidati univoci dell’audit iniziale, 987 sono approvati, 31 richiedono revisione e 30 sono bloccati. Tutte le cinque collisioni iniziali sono escluse. I 16 percorsi del fascicolo originario hanno superato i controlli. [Matrice Woo](../recupero-2026-11-27/matrice-prodotti.csv) · [Conteggi e impronte](release.json)

Le 1.380 URL GSC comprendono 106 query Woo `attribute_dimensioni`. L’archivio ha fornito 1.370 percorsi prodotto osservati, di cui 136 esterni a GSC. Sei delle sette sitemap prodotto dell’indice Rank Math hanno restituito XML utilizzabile, con 1.194 permalink distinti e 984 associati a immagini. La settima ha restituito 404, senza altra cattura verificata. Abbiamo inoltre estratto prove da 161 schede Woo con canonical e ID del prodotto e da 30 pagine di categoria con canonical verificato. Nelle categorie, 224 occorrenze associano nella stessa scheda link del prodotto, ID del contenitore, ID dell’azione Woo e SKU. Le letture fallite o senza identificativo concordante non qualificano un percorso. [Indice storico del negozio](https://web.archive.org/web/20241102183941id_/https://www.onlinegarden.it/sitemap_index.xml) · [Ricevute per percorso](archivio-origini.csv) · [Categorie storiche](categorie.jsonl.gz)

Sono stati confrontati l’export Woo di febbraio, otto export prodotto di luglio, l’inventario Woo, il catalogo Shopify e i materiali di progetto. Il backup TAR disponibile è troncato prima del database. Gli export prodotto e i fogli di migrazione consultati conservano identità e SKU, senza una colonna che attesti il permalink. La sitemap corrente riguarda il nuovo sito. Il registro distingue il percorso sorgente osservato, l’ID Woo dell’export, eventuali ID/SKU rilevati in archivio, candidati concorrenti, GID, destinazione candidata, prova storica, QA e decisione. Una destinazione indicata su una riga REVIEW o BLOCKED è solo un indizio. [Impronte e fonti](fonti.json)

| Prova principale per le righe APPROVED | Percorsi |
|---|---:|
| Permalink in sitemap storica e identica immagine WordPress di proprietà univoca nell’export, con categoria e SKU concordanti | 729 |
| Scheda Woo archiviata con canonical e ID padre concordante, con riscontro dello SKU quando presente | 127 |
| Scheda nella categoria archiviata con permalink, ID padre e SKU concordanti | 127 |
| Percorso osservato, categoria Woo e nome file dell’immagine originale univoco, con nome prodotto o slug inventariato e SKU concordanti | 114 |
| Fascicolo originario dei 16, ricontrollato | 16 |

Tutte le righe approvate hanno uno SKU concordante univoco e una scheda Shopify attiva e verificata. Per confrontare i nomi file si rimuovono solo suffissi WordPress numerici, dimensioni e modificatori riconosciuti. Il solo slug non abilita una regola. Due coppie di alias storici condividono la destinazione, una per *Laurus nobilis* e una per *Musa acuminata Grand Nain*. Ogni alias ha una prova diretta separata dello stesso ID Woo. Tre altri alias rimangono in revisione.

## Perché 297 percorsi restano fuori dal Worker

| Decisione | Motivo | Percorsi |
|---|---|---:|
| REVIEW | Manca un collegamento verificabile fra percorso e ID Woo | 37 |
| REVIEW | Prodotto candidato individuato, permalink insufficientemente corroborato | 32 |
| REVIEW | Alias senza prova diretta separata | 3 |
| BLOCKED | Identità Shopify ambigua | 80 |
| BLOCKED | Nessuna identità Shopify nella matrice | 77 |
| BLOCKED | Più identità Woo candidate sullo stesso percorso | 23 |
| BLOCKED | ID Woo storico senza successore verificato | 23 |
| BLOCKED | Prodotto Shopify non attivo | 16 |
| BLOCKED | Identità archiviata divergente | 6 |

## Collaudo pubblico e locale

- 5.640 richieste HTTPS senza seguire i redirect, una GET e una HEAD per ognuno dei 1.410 percorsi su ciascun host. Sull’apex ci sono 2 risposte 301 dirette per il medesimo percorso e 2.818 risposte 200. Sul www tutte le 2.820 risposte sono 301 verso lo stesso percorso Woo sull’apex. Il test mirato del pilota comprende HTTP, HTTPS, UTM, dimensione Woo e pagina di destinazione. [Baseline HTTP completa](primi-hop.csv.gz) · [Pilota](pilota-http.csv)
- 1.173 schede attive su 1.173 hanno risposto 200 direttamente, con URL finale e canonical attesi, H1 e nome del Product JSON-LD identici al titolo Admin, senza noindex nei meta o negli header. Il controllo del contenuto usa Chromium dopo il rendering della scheda. [Ricevute per GID, URL e timestamp](pdp.jsonl.gz)
- Undici regressioni storefront superate. Homepage, catalogo, prodotto, ingresso al login Shopify, carrello vuoto, normalizzazione www e HTTPS sono stati visitati. Nel test checkout, la creazione del carrello Shopify e la navigazione finale sono state intercettate usando una fixture locale. Il percorso prodotto sconosciuto di controllo e il pilota con query sconosciuta hanno restituito 200 dall’origine sull’apex. Questa risposta dell’origine resta un possibile soft 404. [Verbale browser](regressioni-storefront.json)
- I sei lotti hanno superato 69.936 verifiche positive di redirect e 7.290 verifiche di passaggio all’origine, oltre alla suite storica di 384 casi. Le prove verificano anche il ritorno al lotto precedente, l’esclusione di ogni riga non approvata, la conservazione della richiesta originale e il rifiuto delle destinazioni esterne. Il dry-run di Wrangler 4.169.0 ha compilato il Worker completo in 18,99 KiB gzip, senza binding. Il runtime locale Cloudflare workerd ha servito correttamente anche 2.230 richieste con origine simulata. [Ricevuta e impronte del pacchetto](collaudo-pacchetto.json) · [Test sui lotti](../../../infra/seo/massivo/prova-lotti.mjs)

## Indicazioni per cliente e designer

**Cliente.** Le 1.113 corrispondenze sono idonee al rilascio graduale. Oggi chi apre il vecchio link di Rosa Jasmina sul dominio principale raggiunge direttamente la scheda. L’attivazione dei lotti e il controllo sul www dipendono dal change del titolare Cloudflare. La prova conclusiva di ogni lotto è una ricevuta HTTP successiva alla promozione.

**Designer.** Per nuovi link in pagine, newsletter e materiali editoriali usare la colonna `new_url` delle sole righe APPROVED. Per il collaudo aprire la scheda sul dominio principale, confrontare nome visibile e H1 e controllare il carrello. Le vecchie dimensioni Woo rimandano al prodotto padre approvato. L’utente sceglie l’eventuale variante dalla scheda corrente.

## Riproduzione per developer

Dalla radice della PR, Node, Python 3 e curl permettono di ricostruire la mappa e i lotti. Per i controlli browser servono Playwright e Chrome. Il generatore controlla le impronte del CSV e della mappa. Il test dei lotti confronta le coppie con tutte le righe APPROVED del registro.

```sh
node infra/seo/check-redirect-candidates.mjs
node infra/seo/massivo/prova-lotti.mjs
node infra/seo/build-rollout.mjs full /tmp/onlinegarden-301-full
# Con Miniflare 5.20261127.0-beta presente nel percorso moduli Node
node infra/seo/massivo/prova-workerd.cjs /tmp/onlinegarden-301-full
python3 infra/seo/massivo/pacchetto.py /tmp/onlinegarden-301-redirects.zip
```

Per rigenerare il registro usare `riconcilia.py` con i nove export Woo, l’inventario, lo snapshot completo Admin di soli prodotti, il JSONL PDP decompresso e `archivio-origini.csv`. Il comando `sigilla.py` verifica la corrispondenza fra registro, mappa e ricevute prima della build. Le pagine archiviate si rileggono dai link e dalle impronte. I file completi degli export privati restano nell’archivio del progetto. [Sorgenti e verificatori](../../../infra/seo/massivo/) · [Procedura Cloudflare](OPERAZIONI.md)
