# Admin V2 operativo per Marco · verbale del 25 novembre 2026

**GO alla revisione del candidato isolato. NO-GO al rilascio commerciale e all’accettazione. SAL ufficiale 57,75%.**

| Stato | Evidenza |
|---|---|
| Implementato nel candidato | Modifica per capability, famiglie espandibili, due descrizioni, confronto e invio del singolo campo, gestione nominale di galleria e formati, verifica di canale, scheda e indice Storefront. |
| Verificato in isolamento | Applicazione React, handler Edge, risposte Shopify simulate e database PostgreSQL con dati sintetici. Matrice sotto. |
| Pubblicato | Il rilascio precedente della PR #73. Il dominio serviva ancora `index-BcqOotvz.js` al controllo iniziale. |
| Accettato da Marco | Collaudo personale e approvazione della nuova versione aperti. |

## Base e riscontri in lettura

Il ramo Lovable collegato e la base della PR sono `codex/rilascio-admin-v2-isolato-20261124` a `8528dbed0eb9dec96bde1abbd58c1769b22a7d38`. Il deployment Lovable pubblico documentato è `6ccdd609-33cd-4b09-a475-89928393d497` a `7806725`. Da `main` a `d3cfe7e8285ca04fdeae170aa632af10c1f65d31` sono state recuperate le due specifiche. La base isolata conserva il perimetro della vetrina pubblicata. [Rilascio precedente](PR73-CHIUSURA-AI.md)

Shopify espone già `custom.short_intro` sul prodotto, di tipo `multi_line_text_field`, con accesso Storefront `PUBLIC_READ`. Il registro Admin usa `descriptionHtml` per `description` e per il precedente alias `optimized_description`. Prima dell’intervento il mapping di `short_description` era vuoto e `short_intro` puntava al metafield esistente. Il candidato assegna un proprietario editoriale per destinazione. Il testo lungo va su `descriptionHtml`, il breve su `custom.short_intro`. I valori storici restano consultabili. I metadati SEO hanno destinazioni distinte. La scrittura del breve richiede verifica della definizione Shopify, del registro e del permesso sul campo. [Shopify metafieldsSet](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldsSet)

Le righe staff nominali abilitate sono più di una. I tag mancavano dalla lista dei campi editabili. Le tre abilitazioni AI pregresse circoscrivono ulteriormente il candidato al grant personale. L’identità di Marco deve essere verificata privatamente prima di applicare ogni permesso. La lettura diretta del pacchetto Edge distribuito ha restituito un diniego di autorizzazione. La sorgente dell’ultimo deploy documentato è `5a37f71d02070f51a5b2e841d15bf7cda3b72747`. La corrispondenza con la versione attiva è un gate del deploy.

## Flussi operativi

- **Prodotti già presenti.** Ricerca del padre o dello SKU di variante. La scheda raggruppa i campi editabili e mantiene chiuse le informazioni tecniche. Dopo il salvataggio interno, Marco confronta il singolo campo con Shopify e conferma l’invio. Il backend verifica versione locale, valore remoto, famiglia SKU e ID. L’esito positivo richiede rilettura. Per il metafield breve viene usato anche il digest Shopify. I campi nativi privi di scrittura condizionale conservano una finestra di concorrenza fra ultima lettura e mutation. Una divergenza richiede riconciliazione.
- **Immagini e ALT.** Serve il permesso personale `product_gallery`, oltre a immagini e sincronizzazione. Si può aggiungere una foto READY della propria libreria, scollegarne una o sostituirla con una copia dotata del nuovo ALT. La sostituzione aggiunge la copia in fondo alla galleria, verifica la presenza e l’ALT, poi scollega il vecchio file da quel prodotto. La rimozione dell’ultima foto e quella di una foto collegata a una variante sono bloccate. Dopo un esito parziale, rileggere la galleria e il registro prima di qualsiasi nuovo invio. [Shopify fileUpdate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fileUpdate)
- **Formati.** Il permesso personale `product_formats` si aggiunge a prezzi e sincronizzazione. Per una famiglia con un’unica opzione «Formato» l’Editor può rinominare un valore esistente. La verifica conserva gli ID, il numero delle varianti, SKU e prezzi. Le variazioni strutturali che aggiungono o eliminano combinazioni su prodotti già collegati richiedono un flusso dedicato per riallineare anche il catalogo interno. I nuovi prodotti possono nascere con più formati. [Shopify productOptionUpdate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productOptionUpdate)
- **Nuove schede e AI.** SKU e mesi conservano il comportamento pubblicato. Una sola esperienza consente di approvare separatamente testo esteso e sintesi. L’estesa usa il servizio AI già distribuito e i suoi fallback. La breve propone una riga intera verificata, entro 320 caratteri, quando ci sono almeno due fatti. Con informazioni insufficienti rimane manuale. La PDP mostra la sintesi presso i dati d’acquisto e il testo lungo in una sezione con collegamento. Le proposte richiedono conferma e il salvataggio è distinto.
- **Pubblicazione.** Il comando di creazione accetta soltanto la bozza dell’autore abilitato, verifica gli SKU e crea in DRAFT. Un timeout richiede recupero per identificativo della medesima operazione. La verifica commerciale richiede prezzo, varianti, immagini, categoria, inventario, logistica e canale idonei. L’esaurito richiede una scelta esplicita. Un prodotto tecnico resta escluso anche se rinominato dopo la creazione. La pubblicazione controlla il canale, l’ID Storefront per handle e lo stesso ID nell’elenco paginato, entro 2.000 prodotti. Al superamento del limite o in presenza di ritardo di indicizzazione l’esito resta da verificare. L’acquistabilità è letta separatamente. [Paginazione Storefront](https://shopify.dev/docs/api/storefront/2026-01/queries/products)
- **Recupero.** Un’operazione incerta resta sul registro. Per i campi Shopify serve riconciliare il valore con il confronto approvato. Per una nuova bozza interna modificata dopo l’acquisizione del payload originario, l’invio bloccato richiede revisione della bozza. Nessun retry alla cieca.

## Matrice di verifica

| Caso | Verifica eseguita | Ambito |
|---|---|---|
| A–B | Campi pertinenti, dati tecnici chiusi, apertura a tastiera, ruoli respinti dal server | Chromium desktop e viewport mobile, API e PostgreSQL locali |
| C | Editor di campo, confronto dei due valori, conferma esplicita e gestione del conflitto | Chromium. In Safari desktop 26.0.1 aperto il confronto «Punti di forza» con la tastiera, fino alla schermata di invio |
| D–E | Invio del solo campo approvato, rilettura, alias bloccati, digest errato, collisioni e collegamenti ambigui | Handler e client GraphQL con trasporto simulato |
| F–G | Due formati, SKU stabili, riapertura interna, creazione in DRAFT, blocco del secondo invio e recupero | Browser, Deno e database di prova |
| H–I | Pubblicazione con conferma, ID nell’indice, assenza dall’indice, blocco del prodotto tecnico | Handler HTTP e risposte Shopify simulate. Pubblicazione reale aperta |
| J | Ruoli, SQL service-only, RLS, approvazione monouso, file privato e operazioni di altro Editor | PostgreSQL, test HTTP e unitari |
| K | Regressioni instradamento, login, sessioni cliente e creazione checkout | Suite offline. Smoke pubblico del candidato dopo il rilascio |
| L | Accettazione indipendente delle proposte, salvataggio, reload, DRAFT, mapping separati, rilettura e PDP responsiva | Browser e GraphQL simulato. Rilettura reale su DRAFT da autorizzare |

Chromium desktop 1280 px e mobile 390 px. Le verifiche di accessibilità comprendono tastiera, nome accessibile, focus e comunicazione degli errori. Safari su iPhone fisico e il percorso autenticato end-to-end restano nel collaudo. Il candidato non richiede deploy di `product-admin-ai`.

## Esiti riproducibili del candidato

| Controllo | Esito locale |
|---|---|
| TypeScript e build operativa Vite | PASS con `npm run typecheck` e `VITE_ADMIN_OPERATIONAL_RELEASE=true npm run build` |
| Lint mirato | 0 errori. Un avviso Fast Refresh sul modulo condiviso dei pulsanti, già presente nella base |
| Suite Node e Deno | 668/668 e 113/113. Rete esterna esclusa. Superato anche il typecheck Deno sul grafo Edge estratto |
| Chromium desktop/mobile | 28/28 complessivi. Compresi confronto e riapertura di galleria e formato, due testi e bozza interna |
| PostgreSQL | Apply e restore ripetuti con dati sintetici, claim con e senza grant, conservazione storico, ACL/RLS, concorrenza e replay. Superata anche la suite Drizzle successiva sullo stesso cluster |
| Safari desktop | Confronto editoriale manuale. Intero percorso iOS e collaudo cliente aperti |

I workflow applicazione, database ed Editor browser sono abilitati anche per PR destinate al ramo Lovable isolato. Gli esiti remoti si leggono sul commit della PR.

## Distribuzione, snapshot e rollback

1. **GO merge isolato.** Controllare HEAD, CI e base della PR. Integrare sul solo ramo Lovable indicato. Confrontare nuovamente il commit dell’editor con quello approvato prima del Publish.
2. **GO registro e journal SQL.** Sul progetto `iekwvvihjwghosqdxrdi` esportare privatamente `pg_get_functiondef` per `admin_update_product_field` e `admin_claim_catalog_approval`, definizione e validità di `admin_catalog_approvals_action_check`, mapping dei due campi e righe nominali originali. Verificare gli hash presenti negli script. Con `psql -X -v ON_ERROR_STOP=1 -v direction=apply -f <file>` applicare prima [registro e RPC](pending/marco-editor-registry.sql), poi [azioni del journal](pending/marco-editor-actions.sql). Se una precondizione diverge la transazione si arresta.
3. **GO permessi personali.** Identificare con Marco il suo staff ID nel pannello Auth. Verificare che ciascuna abilitazione richiesta sia assente nello snapshot. Eseguire [grant personale](pending/marco-editor-tags.sql) con `-v staff_id=<UUID verificato> -v direction=apply -v grant_key=<chiave>`, una transazione per `tags`, `product_gallery` e `product_formats` espressamente consentiti. Ricontrollare in sola lettura che le altre identità siano immutate. Il prezzo da solo non abilita la gestione dei formati.
4. **GO Edge.** Dal pannello Lovable Cloud/Supabase del progetto aprire Edge Functions → product-admin-api → distribuzioni. Identificare versione attiva, data, impostazione JWT e artifact. Confrontare sorgenti e dipendenze con lo snapshot, oppure esportare nuovamente la versione attiva ed eseguire la verifica sul pacchetto estratto. Distribuire soltanto `product-admin-api` con il relativo grafo. Controllare `get_admin_context` autenticato per il marker `admin-editor-20261125`, l’identità, le capability e il precedente frontend. Il nuovo percorso conserva DRAFT legacy privi di sintesi. Tenere il vecchio frontend fino al collaudo in anteprima.
5. **GO anteprima e Publish separati.** Verificare nella preview autenticata i casi A–L con una bozza designata dal responsabile, un editor senza grant e copia dei dati iniziali. Per il Publish confrontare l’intero ramo con la release precedente, verificare la PDP responsive e l’integrità dei percorsi clienti. Dopo il Publish rilevare HTML, hash degli asset, login staff/cliente, catalogo, carrello e passaggio al checkout senza pagamento. Usare il tasto di pubblicazione reale solo per un prodotto ordinario identificato con autorizzazione commerciale separata. I prodotti tecnici restano bloccati.
6. **Rollback.** Sospendere le nuove operazioni. Ripristinare il deployment Lovable precedente con tutto il frontend, inclusi i chunk. Verificare `assets/index-BcqOotvz.js` con SHA-256 `f254b4e7b2ada8527fbf99a15678a015dd9c70b3da147366d5b9e3208114c8bb`. Ripristinare la sola Edge dallo snapshot attivo verificato, con il precedente JWT. Revocare soltanto le chiavi aggiunte a Marco usando `direction=restore`. Riconciliare le operazioni incerte, poi ripristinare journal e mapping con i rispettivi script. In presenza di storico il vecchio vincolo viene ripristinato con `NOT VALID` per conservare le righe concluse e impedire nuovi comandi. Dopo il rollback controllare hash RPC, mapping, grant e accessi. Gli aggiornamenti Shopify già confermati richiedono un ripristino commerciale distinto basato sui valori salvati.

Gli archivi frontend e i grafi Edge candidato/precedente sono stati estratti e verificati separatamente in locale. Il manifesto consegnato riporta SHA-256 di ogni modulo e degli archivi. L’accesso alla versione Edge attiva e il collaudo commerciale restano prerequisiti del rilascio. Non sono stati modificati prodotti, prezzi, clienti o canali del negozio.

| Archivio verificato | SHA-256 |
|---|---|
| product-admin-api-rollback.tar.gz | `fba12b484e192e1b432c37f74ede977b0df9492c72922b1b0421a6e4a192f3df` |
| product-admin-api-candidate.tar.gz | `4a8100de5d0374325b1d694b463f75fe38883b5ca7990117468c525287d708fc` |
| frontend-pubblicato.tar.gz | `0ff5574b674a348e97ae65391c33f5fcbb9867bb3b5166851ff3f5b84703b71d` |
