# Online Garden — cruscotto di completamento, 20 novembre 2026

> **Progressi percentuali = stime di pianificazione, non metriche generate da CI né percentuali di dati migrati.** Il completamento richiede tutti i gate critici, indipendentemente dalla media ponderata. Evidenze fino al 20/11/2026; nessuna operazione su clienti, ordini, checkout o DNS è eseguita da questo documento.

## Risultato complessivo (stima): 55%

| Area | Peso nella consegna | Stima completamento | Contributo |
| --- | ---: | ---: | ---: |
| Storefront, UX e SEO base | 20% | 90% | 18,00 |
| Admin cliente e editing | 15% | 85% | 12,75 |
| Catalogo commerciale, pagamenti e spedizioni | 15% | 65% | 9,75 |
| Cloudflare DNS e redirect 301 | 10% | 70% | 7,00 |
| Migrazione clienti storici | 15% | 10% | 1,50 |
| Migrazione ordini storici | 15% | 5% | 0,75 |
| QA finale, contenuti legali e handoff | 10% | 50% | 5,00 |
| **TOTALE** | **100%** | **54,75% ≈ 55%** | **54,75** |

Le percentuali rappresentano un giudizio di avanzamento **per sforzo e gate restanti**; non sono progressi osservati del trasferimento. I rilasci già avvenuti e le prove sono documentati negli altri file indicati sotto. Non tradurre il 55% in «pronto al go-live completo».

## Cosa risulta completato

- Primo rilascio SEO P1 pubblicato 12/11/2026; `/sitemap.xml` con 1.349 URL (1.346 prodotti + tre pagine), robots/canonical e QA storefront desktop/mobile pubblici PASS nella prova registrata.
- Admin/Editor: accesso personale confermato, grant dei permessi catalogo operativo, percorso tecnico su DRAFT già verificato. **Non** equivale ad accettazione operativa completa di Marco su prodotto commerciale.
- Cloudflare: zona DNS predisposta, A apex/www proxied, MX/SPF/CNAME posta coerenti con i dati Lovable, tre CNAME DKIM aggiunti; schermata di attivazione raggiunta. Nameserver assegnati `carlos.ns.cloudflare.com` e `karsyn.ns.cloudflare.com`.
- Infrastruttura 301 preparata ma non in produzione: i 16 mapping storici verificabili risultano proposti, **0 approvati e 0 pubblicati** nell'ultima evidenza di progetto. 1.258 percorsi non approvati/identità non riconciliate. Verificare anche le regole effettivamente create in UI Cloudflare dopo il cambio NS prima di dichiararle live.

## Migrazione clienti — priorità alta e OBBLIGATORIA per la chiusura

Fonte: PR #53 preflight reale 13/11 e PR #54 piano/autenticazione 15–16/11, conservati come documenti di branch; non sono importazioni operative.

- 5.453 account storici analizzati nei contatori; 858 account con ordini e 953 ordini totali. Dei 858, 857 sono customer e 1 author (escluso).
- Sulla selezione di 1.108 righe: 249 customer senza ordini e 1 administrator senza ordini esclusi.
- Snapshot Shopify del 13/11: 12 profili (11 con email, 1 phone-only); uno dei 857 customer con ordini corrisponde già a Shopify.
- Il preflight reale email-only ha individuato **849 candidati da revisionare**, **7 quarantene**, **1 corrispondenza già presente**. `proposedNew=0`, `productionAuthorized=false`: **0 clienti storici migrati**.
- I sette casi da chiarire: sei customer con somiglianze telefoniche da verificare e un telefono malformato. Non dedurre doppioni certi, non normalizzare numeri arbitrariamente.
- L'audit autenticazione del 16/11 raccomanda **Shopify Customer Accounts** passwordless per i clienti e **Supabase Auth soltanto per il personale**. Il sito React ha ora percorsi/callback che possono usare sessioni differenti: prima correggere/testare il flusso cliente. Il precedente pilota create-only di cinque vecchi clienti è **sospeso come default**; eventualmente serve un requisito di precreazione approvato. Il successivo collaudo raccomandato usa identità controllate del team, non clienti reali.
- Niente importazione password WordPress, consensi marketing impliciti, inviti o OTP non richiesti. Nessun dato personale nel repo.

**Definition of done clienti:** login e account Shopify cliente realmente operativi; fonte e campi approvati; nuovo snapshot completo; risoluzione casi ambigui; idempotenza e matching, mapping ID vecchio→nuovo conservato privatamente; pilota autorizzato, verifica, riconciliazione finale e assistenza documentata. La percentuale di migrazione reale resta **0%** finché non si creano/associano profili autorizzati.

## Migrazione 953 ordini storici — priorità alta e OBBLIGATORIA

- **0/953 ordini importati** secondo le evidenze disponibili.
- L'input minimo finora usato è **`ID,orders`**: basta per i conteggi ma **non contiene il dettaglio di ciascuno dei 953 ordini**. Serve un export ordine per ordine da fonte autorevole con ID storico, customer link, date, valuta, articoli/quantità/SKU, prezzi, tasse, sconti, spedizione, totali, stato pagamento/evasione, resi/rimborsi e riferimenti documentali pertinenti. Qualunque campo non disponibile va dichiarato, non inventato.
- Scelta implementativa da approvare: app di migrazione ordini compatibile oppure integrazione controllata su Shopify Admin GraphQL `orderCreate` (con scope e token offline appropriati). **Il CSV Shopify dei clienti non importa gli ordini.**
- `orderCreate` supporta `processedAt` storico e opzioni `sendReceipt` / `sendFulfillmentReceipt` (false per default), inventario `BYPASS` per default; collaudare tutte le semantiche e automazioni del negozio prima dell'import. Evitare ordini doppi, nuova riscossione, decremento stock, nuova spedizione, email indesiderate, metriche finanziarie false. Preservare l'ID storico in campo/metafield/traccia privata riconciliabile, non sostituire ordini reali con semplici «conteggi».
- Progettare l'ordine dei passi: (1) fonte dettagliata e checksum; (2) riconciliazione identità cliente; (3) dry-run senza rete/scritture; (4) prove controllate con account dati sintetici; (5) eventuale pilota reale con autorizzazione esplicita; (6) import per lotti idempotenti; (7) confronto `953 = importati + già presenti + esclusi motivati`, con verifica a campione degli importi e dei legami cliente/ordine. Qualora il negozio richieda che gli ordini siano visibili nella nuova area clienti, testarlo esplicitamente: non dedurlo dalla sola presenza in Admin.
- Archiviazione storica, trattamento fiscale/contabile, retention e trattamento degli stati di rimborso da validare con il titolare e consulente pertinente; il controllo tecnico non sostituisce il parere contabile.

**Fonti ufficiali:**  
https://help.shopify.com/it/manual/migrating-to-shopify/migrating-from-woocommerce  
https://shopify.dev/docs/api/admin-graphql/latest/mutations/orderCreate

## 20/11 — Fonte WooCommerce non più accessibile e archivio recupero troncato

**Conferma del proprietario:** il vecchio sito WooCommerce non è più disponibile; il fornitore precedente ha consegnato un backup, già esaminato, che risulta **troncato**. L'analisi documentata in `docs/release/PROJECT-CLOSEOUT-CHECKLIST.md` riporta un TAR di **20.447.232 byte**, terminato prima della fine di un membro interno dichiarato da **57.723.050 byte**. Nessun database SQL/WordPress e nessun dettaglio degli ordini è risultato recuperabile dal frammento analizzato.

**Conseguenza operativa:** i contatori `858` acquirenti / `953` ordini sono evidenza di quantità, **non** rappresentano 953 record d'ordine importabili. Non è autorizzato inventare date, prodotti, importi, stati o identificativi per far coincidere il conteggio.

**Percorso di recupero prioritario:**
1. Richiedere a chi ha consegnato il backup una **copia integra originale** con dimensione/hash o un dump SQL selettivo di WooCommerce/HPOS e tabelle di righe ordini, metadati e associazioni clienti.
2. Chiedere al precedente hosting eventuali **snapshot indipendenti, restore point o backup giornalieri**, anche se il sito è offline.
3. Se le fonti non esistono, ricercare export separati di ordini, fatture, gestionali, documenti spedizione ed email; verificare copertura e qualità per ordine. Non chiamare «migrazione completa» una ricostruzione parziale.

**Lavoro Codex nel frattempo:** terminare separazione login clienti Shopify/Supabase, strumenti idempotenti e controlli per la migrazione; non eseguire import massivo di ordini fittizi né affermare che la migrazione ordini è conclusa. La migrazione clienti è un percorso distinto e resta subordinata a verifiche e autorizzazioni sui dati reali.

**Stato:** dettagli ordini NON DISPONIBILI nelle fonti attualmente documentate; l'esistenza di eventuali backup presso terzi è **sconosciuta**, non negata. 

## Altri gate prima del completamento

- **DNS/301:** verificare DNSSEC/DS, delega da ui-dns ai NS assegnati Cloudflare nel pannello autorizzato, TLS Lovable/CDN, primo 301 HTTP reale, email e checkout. Attualmente la schermata Cloudflare presenta `I updated my nameservers`; il cambio effettivo non è stato attestato.
- **Commerciale:** catalogo e disponibilità reali; ultime tariffe soprattutto tutte le isole minori; collaudo ordini E2E e ricevute, riconciliazione checkout; aggiornare dati SEO ad ogni cambio handle/prodotto.
- **Legale e contenuti:** testi attuali di termini, cookie, spedizioni/reso e dati societari approvati; autorizzazione al tracciamento; conferma delle notifiche e Safari/iOS.
- **Acceptance:** prova reale in sessione Marco su modifica/publish autorizzati, nessuna modifica tecnica non richiesta; monitoraggio post-rilascio, backup e rollback.
- Il backup TAR legacy esaminato per il recupero di testi/permalink risulta troncato e non è una fonte completa da cui derivare i dettagli dei 953 ordini. Distinguere questa fonte dagli export minimizzati clienti e dall'eventuale archivio completo ordini.

## Prossima sequenza operativa consigliata

1. Conservare Cloudflare pronto, senza cambiare delega in assenza del referente e del controllo DNSSEC.
2. **Subito in parallelo, preparare la migrazione dati**: ottenere/identificare la fonte dettagliata dei 953 ordini e verificare gli input privatamente; definire il percorso Shopify Customer Accounts per clienti reali con test tecnici controllati.
3. Decisione di prodotto: clienti storici devono poter vedere gli ordini precedenti? Per default in questo piano **sì, verificare** l'effettivo collegamento dei 953 ordini al profilo Shopify, con eventuali limiti da comunicare.
4. Solo dopo dati completi, matching approvato e writer revisionato, scegliere un pilota e chiedere consenso prima di qualsiasi write/notification.
5. Eseguire in parallelo chiusure catalogo/spedizioni/legal e QA senza bloccare il lavoro offline su clienti/ordini.
6. Go-live finale e consegna soltanto quando tutti i gate sono PASS; aggiornare tabella progressi con evidenza, data e responsabile.

## Riferimenti interni

- [PROJECT_STATUS](../PROJECT_STATUS.md)
- [Checklist di chiusura](PROJECT-CLOSEOUT-CHECKLIST.md)
- [Piano redirect](../seo/REDIRECT-301-RELEASE-GATE-2026-11-20.md)
- [DNS Cloudflare](../ops/dns-cloudflare-migration-audit.md)
- [Preflight clienti reale — PR #53](https://github.com/Rosin355/your-e-commerce-blueprint/blob/refs/pull/53/head/docs/migration/customers-real-email-only-preflight-2026-11-13.md)
- [Piano e audit autenticazione — PR #54](https://github.com/Rosin355/your-e-commerce-blueprint/blob/refs/pull/54/head/docs/migration/customers-auth-architecture-2026-11-16.md)

**Stato report:** documento di pianificazione pubblicato in branch documentale, senza publish del sito, import dati, invio email o modifiche ai servizi. 
