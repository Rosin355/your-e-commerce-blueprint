# Baseline organica — Online Garden, 10 novembre 2026

Fonte: Google Search Console, proprietà `sc-domain:onlinegarden.it`, letta tramite Windsor.ai connector `searchconsole`. `get_connectors`, `get_fields` e `get_options` verificati prima delle estrazioni. Lettura ripetuta con `include_fresh_data=false`; nessuna impostazione GSC modificata. Le giornate recenti possono ancora consolidarsi.

## Confronto omogeneo di sette giorni

| Periodo GSC | Clic | Impressioni | CTR calcolato |
| --- | ---: | ---: | ---: |
| 1–7 ottobre 2026 | 299 | 25.353 | 1,18% |
| 1–7 novembre 2026 | 155 | 10.704 | 1,45% |
| Variazione | −144 (−48,16%) | −14.649 (−57,78%) | +0,27 punti |

Calcoli eseguiti sui sette record giornalieri, senza sommare dimensioni alternative. Evidenza: [giorni e pagine prodotto](evidence/gsc-2026-11-10.json). La somma delle righe per pagina/query può differire dai totali della proprietà per aggregazione e anonimizzazione; non viene usata per sostituirli. Le date sono quelle restituite da GSC, non visite aggregate sul fuso locale del sito.

Il calo è osservato; il confronto da solo non distingue migrazione, stagionalità, domanda, ranking, disponibilità o altri fattori. Le soft 404 e la sitemap assente sono difetti verificati, ma il loro contributo percentuale al calo non è dimostrato.

## Priorità prodotto

Le varianti URL con query `attribute_dimensioni` e gli host sono raggruppati qui **solo per prioritizzazione del percorso**. La matrice CSV mantiene separati i 1.380 URL originali osservati, riconducibili a 1.274 percorsi prodotto. Clic/impressioni nella matrice sono la somma dei due intervalli, non un mese intero.

| Percorso finale storico | Clic ottobre / novembre | Impressioni ottobre / novembre |
| --- | ---: | ---: |
| tradescantia-nanouk | 10 / 0 | 641 / 1 |
| rhyncospermum-asiaticum-tricolor-gelsomino | 8 / 0 | 293 / 28 |
| kalanchoe-calandiva-bianco | 6 / 0 | 623 / 21 |
| ginkgo-biloba-mariken | 1 / 5 | 13 / 21 |
| agave-americana-verde | 4 / 1 | 220 / 35 |
| calycanthus-venus-calicanto-estivo | 5 / 0 | 72 / 8 |

Evidenza completa: [priorità per percorso](evidence/legacy-priorities.json). Ordinamento: clic combinati, poi impressioni combinate; P1 se almeno un clic, P2 senza clic ma almeno 100 impressioni, P3 coda restante. Nessun valore economico o volume backlink è stato inventato.

Una lettura mirata delle query ottobre per Tradescantia è salvata [qui](evidence/gsc-tradescantia-queries-october.json): per esempio “pianta foglie verdi e viola” 2 clic/11 impressioni e “pianta grassa viola” 0/104. Sono query realmente restituite; non costituiscono una classificazione botanica o una proposta di riscrittura automatica.

## Fonti complementari e limiti

Analytics Lovable è stato letto separatamente per l'intervallo richiesto `2026-11-01T00:00:00Z`–`2026-11-08T00:00:00Z`: il provider ha restituito anche un bucket del giorno 8. Per questo i suoi totali non sono confrontati con GSC 1–7 e non sono presentati come traffico organico. La presenza di un percorso storico tra le pagine visitate è solo un segnale di priorità, non prova di un 404 o di un ranking. Nessun percorso account/ordine o dato cliente è stato conservato nel report.

Non sono disponibili tramite questo connettore la diagnosi Page Indexing per singolo URL, il canonical scelto da Google, il rendering di un Googlebot verificato o un export backlink. Chrome pubblico e curl non sostituiscono URL Inspection. Nessuna sitemap inviata e nessuna richiesta di indicizzazione effettuata.

## Monitoraggio dopo la futura pubblicazione autorizzata

T0 è la data effettiva di pubblicazione del change SEO, ancora da definire. Nessuna automazione creata.

| Scadenza | Verifica | Indicatore e criterio |
| --- | --- | --- |
| T0 + 7 giorni | QA HTTP e primo crawl | 16 mapping approvati: 301 diretto e destinazioni 200; sitemap XML 200 con URL canonici; controllo URL Inspection sui 4 prodotti iniziali; registrare data ultimo crawl. |
| T0 + 14 giorni | Indicizzazione e query | Canonical scelto da Google coerente; assenza di nuove soft 404 sulle destinazioni; clic/impressioni per vecchio+nuovo URL aggregati per identità prodotto. |
| T0 + 30 giorni | Andamento organico | Confrontare finestre complete e omogenee, query e posizione media restituite da GSC, impressioni/clic dei prodotti P1 e quota di nuove URL. Annotare disponibilità e interventi intervenuti. |
| T0 + 60 giorni | Revisione recupero | Valutare trend, copertura, redirect residue e coda P2/P3; decidere interventi aggiuntivi sulle sole evidenze. |

Il passaggio delle impressioni dalla vecchia URL alla nuova non va contato come perdita due volte. Non sono garantiti tempi di scansione, posizioni o recupero del volume storico.
