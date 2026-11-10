# SEO P1 — checkpoint per il rilascio della PR 49

Data: 10 novembre 2026. Stato: proposta di sequenza operativa, NON autorizzazione al merge, al deploy o ai mapping. Nessuna modifica live inclusa in questa nota.

## Evidenze e limiti

PR #49 letta aperta, non Draft e mergeable sul commit `0677798ae831fc31fd376b4c5ba91127d4517bf2`. Verificati direttamente i due check sullo stesso SHA: Storefront / pull-request e GitGuardian Security Checks entrambi completed/success. Questa verifica non attribuisce il PASS a commit documentali successivi e non costituisce review integrale del codice.

Il [report di recupero](SEO-RECOVERY-PLAN.md) distingue 1.380 URL storici, 1.274 percorsi, 21 percorsi prioritari senza 404 HTTP prodotto e quattro soft 404 confermate nel rendering. Tre percorsi sitemap risultano 404 nel report. I risultati del campione non vanno estesi a tutti gli URL e non dimostrano da soli la causa del calo GSC.

Lettura diretta a campione dell'export WooCommerce su Google Sheets: tab `wc-product-export-28-2-2026-1772300858057`, riga 1301, intervallo A:E: ID 15466, tipo variable, SKU OG_748228, nome Tradescantia Nanouk. Conferma la presenza del record storico, non l'approvazione dei 16 mapping e non un permalink originario assente dall'export. Fonte: https://docs.google.com/spreadsheets/d/1jwHC8GP-A6f_g5j-7fgBPoIt4_12IQ5rFieTVsqroNU

## Sequenza proposta per evitare di bloccare tutte le correzioni

### Primo rilascio — sitemap e correzioni storefront

Candidato a rilascio separato dopo review e autorizzazione esplicita: sitemap, direttiva robots, canonical, correzione noindex transitorio delle PDP, link con href e JSON-LD da dati reali. La fotografia preparata contiene 1.346 prodotti + 3 rotte, non 1.349 prodotti. Rigenerarla in sola lettura immediatamente prima del rilascio e verificare esclusione di test, DRAFT e pagine non pubbliche; mantenere un metodo di aggiornamento quando cambiano handle o pubblicazioni.

Prima di pubblicare da main verificare il diff completo rispetto all'ultimo deployment: il Livello B Admin gia integrato non deve attivarsi nella build, ne devono essere distribuite Edge Functions o applicate migration. Controllare la configurazione read-only senza cambiare secret o capability. Mantenere noindex e protezioni delle aree non pubbliche; nessun cambiamento checkout, tariffe A/B, Sendcloud, catalogo o Ads.

I redirect restano `enabled=false`, `approvalReference=null`, `reviewApproved=false`. Il primo rilascio NON deve essere descritto come recupero completato dei vecchi link. Dopo pubblicazione autorizzata: sitemap HTTP 200 e XML valido, robots corretto, PDP prioritari renderizzati e canonical coerenti, controllo regressioni essenziale e versione live registrata. La sitemap facilita la scoperta ma non garantisce indicizzazione o ranking.

### Secondo rilascio — redirect permanenti

Approvazione esplicita dei 16 mapping e verifica delle destinazioni, poi conferma del livello HTTP effettivamente controllato. L'adattatore in `infra/seo/` e offline e non e installato sul provider; il solo publish Lovable non ne dimostra l'attivazione. Nessun cambio DNS, nameserver, proxy, installazione provider o costo senza autorizzazione specifica.

Il redirect deve essere verificato con GET/HEAD e Location verso la destinazione pertinente, che deve mostrare realmente il prodotto e non soltanto HTTP 200. Distinguere apex/www e l'eventuale catena 302 + 301; ridurre gli hop quando possibile senza presentare un hop aggiuntivo, da solo, come prova di fallimento SEO. Nessuna regola indiscriminata verso homepage o sostituzione di slug per somiglianza.

Magnolia Little Gem, Celtis australis e Viburnum Coppertop restano in revisione secondo il report. Gli altri 1.255 percorsi restano nel backlog prioritizzato, non sono dichiarati cancellati. Il recupero del backup completo non e attestato: gli export prodotto gia accessibili hanno fornito le evidenze usate finora. Non e necessario restaurare il vecchio sito in produzione per ogni mapping confermato.

## Approvazioni e monitoraggio

Decisione ancora da richiedere al proprietario: autorizzare il primo rilascio circoscritto e, separatamente, approvare mapping/provider per il secondo. Nessuna autorizzazione e stata dedotta dal report consegnato.

Dopo il rilascio: invio sitemap e URL Inspection tramite accesso GSC autorizzato; il connettore Windsor Search Analytics non equivale al report completo di indicizzazione e non invia sitemap. Registrare stato tecnico, clic e impressioni senza promettere recupero immediato. SEO, Admin operativo e Ads rimangono attivita separate.

Riferimenti: [piano e matrice](SEO-RECOVERY-PLAN.md), [infrastruttura HTTP](../../infra/seo/README.md), [Google su JavaScript/noindex](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Google sulle migrazioni](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).
