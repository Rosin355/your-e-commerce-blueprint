# Admin V2 operativo per Marco · verbale del 25 novembre 2026

**PR #74 integrata nel ramo Lovable isolato il 25 novembre 2026 alle 12:19 CET. Editor sincronizzato, frontend pubblico ancora alla PR #73. SAL ufficiale 57,75%.**

Il merge `f5b7ae04830b75b600bd795bce017af53316fbac` ha come primo genitore la base `8528dbed0eb9dec96bde1abbd58c1769b22a7d38` e come secondo l’HEAD autorizzato `b881b4edd4fea4ae1ec30d3b56d0f5c7eea89425`. L’albero del merge coincide con quello dell’HEAD verificato. Destinazione esclusiva `codex/rilascio-admin-v2-isolato-20261124`. GitHub riportava PR integrabile e quattro controlli verdi, `editor-browser`, `Storefront / pull-request`, `Admin catalog / PostgreSQL 17` e `GitGuardian Security Checks`. [Ricevuta della PR #74](https://github.com/Rosin355/your-e-commerce-blueprint/pull/74) · [Commit di merge](https://github.com/Rosin355/your-e-commerce-blueprint/commit/f5b7ae04830b75b600bd795bce017af53316fbac)

## Decisioni operative dopo il merge

| Operazione | Decisione | Condizione per procedere |
|---|---|---|
| SQL del registro e del journal | **GO tecnico alla preparazione. NO-GO all’esecuzione.** | Snapshot coerente e prove locali di applicazione e ripristino superate. Occorrono l’autorizzazione SQL e il confronto con lo stato del progetto immediatamente prima dell’intervento. |
| Grant personali | **NO-GO all’applicazione.** | Occorre la scelta esplicita delle singole chiavi da aggiungere a Marco fra `tags`, `product_gallery` e `product_formats`. La riga nominativa è identificata e salvata privatamente. |
| Deploy di `product-admin-api` | **NO-GO.** | Manca la prova del pacchetto ripristinabile della revisione attiva con la sua configurazione JWT. Servono tale prova, le precondizioni SQL delle funzioni da usare e il GO al deploy della sola Edge. |
| Publish Lovable | **NO-GO.** | Occorrono il backend verificato, il collaudo autenticato del perimetro da rilasciare e il GO al Publish. Ricontrollare SHA e delta dell’editor prima di pubblicare. |

### Editor e vetrina pubblica

Lovable riportava lo SHA completo del merge come ultimo commit dell’editor, con modifiche in attesa di Publish. Il dominio pubblico restituiva HTTP 200 per `/`, `/admin`, `/account` e `/collections/all`. Tutte e quattro le risposte HTML indicavano `/assets/index-BcqOotvz.js`. L’asset scaricato aveva SHA-256 `f254b4e7b2ada8527fbf99a15678a015dd9c70b3da147366d5b9e3208114c8bb`, uguale a quello dell’archivio frontend.

Nel confronto tra i sorgenti pubblicati a `7806725b9a51b669e9a77eaa6ebd7cd83e5ae253` e il merge, fuori da `src/adminv2` cambiano tre file in `src`. La scheda prodotto mostra l’introduzione breve quando distinta dal testo esteso. Il pulsante condiviso aggiunge due varianti per i comandi editoriali. Il client Storefront importa da un modulo condiviso gli stessi due ID tecnici già esclusi dal catalogo. I sorgenti di routing, account cliente, carrello e passaggio al checkout coincidono. I **34/34 test mirati offline** eseguiti dopo il merge coprono anche sessione cliente, filtri catalogo, quantità e risposta alla creazione del checkout. La lettura dell’HTML pubblico documenta l’asset in servizio. La sessione cliente e il passaggio al checkout sul futuro rilascio restano da osservare sul dominio reale.

### Perimetro verificato

| Stato | Evidenza |
|---|---|
| Implementato nel candidato | Modifica per capability, famiglie espandibili, due descrizioni, confronto e invio del singolo campo, gestione nominale di galleria e formati, verifica di canale, scheda e indice Storefront. |
| Verificato in isolamento | Applicazione React, handler Edge, risposte Shopify simulate e database PostgreSQL con dati sintetici. Matrice sotto. |
| Pubblicato | Il rilascio precedente della PR #73. Il dominio serviva ancora `index-BcqOotvz.js` al controllo iniziale. |
| Accettato da Marco | Collaudo personale e approvazione della nuova versione aperti. |

## Base e riscontri in lettura

Al momento dell’apertura, il ramo Lovable collegato e la base della PR erano `codex/rilascio-admin-v2-isolato-20261124` a `8528dbed0eb9dec96bde1abbd58c1769b22a7d38`. Il deployment Lovable pubblico documentato è `6ccdd609-33cd-4b09-a475-89928393d497` a `7806725`. Da `main` a `d3cfe7e8285ca04fdeae170aa632af10c1f65d31` sono state recuperate le due specifiche. La base isolata conserva il perimetro della vetrina pubblicata. [Rilascio precedente](PR73-CHIUSURA-AI.md)

Shopify espone già `custom.short_intro` sul prodotto, di tipo `multi_line_text_field`, con accesso Storefront `PUBLIC_READ`. Il registro Admin usa `descriptionHtml` per `description` e per il precedente alias `optimized_description`. Prima dell’intervento il mapping di `short_description` era vuoto e `short_intro` puntava al metafield esistente. Il candidato assegna un proprietario editoriale per destinazione. Il testo lungo va su `descriptionHtml`, il breve su `custom.short_intro`. I valori storici restano consultabili. I metadati SEO hanno destinazioni distinte. La scrittura del breve richiede verifica della definizione Shopify, del registro e del permesso sul campo. [Shopify metafieldsSet](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldsSet)

### Permessi effettivamente registrati per Marco

La lettura su Lovable Cloud ha identificato un solo account abilitato con ruolo `editor`, approvazione nominativa e le tre adesioni AI della nuova bozza. Lo snapshot privato conserva la riga originale e l’impronta delle altre righe staff per il confronto dopo eventuali grant.

| Chiave | Stato nominale | Chiave | Stato nominale |
|---|---|---|---|
| `edit` | Presente | `sync` | **Presente** |
| `drafts` | Presente | `images` | Presente |
| `categories` | Presente | `prices` | Presente |
| `publish` | **Presente** | `ai` | Presente |
| `tags` | Assente dai campi editabili | `product_gallery` | Assente dai campi editabili |
| `product_formats` | Assente dai campi editabili | | |

L’adesione AI per i tag della nuova bozza rimane valida nel suo ambito. Un comando di scrittura sul catalogo richiede anche i controlli del server sul campo e sul prodotto. In anteprima autenticata verificare `writesEnabled`, `canSync` e `canPublish` nella sessione di Marco. I grant nominali di sincronizzazione e pubblicazione sono già presenti.

Il connettore Lovable Cloud ha restituito in sola lettura il vincolo del journal e i corpi delle due RPC in produzione. I tre hash corrispondono alle precondizioni dei candidati SQL e alla fixture PostgreSQL. Lo snapshot privato db-live-baseline.json contiene i quattro mapping, le due definizioni SQL e il vincolo validato. Ripetere il confronto prima dell’intervento.

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

## Sequenza per la finestra di rilascio autorizzata

### 1. Registro, journal e grant

Lo snapshot privato post-merge è stato acquisito il 25 novembre alle 12:27 CET. Le definizioni complete delle due RPC, il vincolo del journal con lo stato di validazione e i quattro mapping corrispondono alla baseline già provata su PostgreSQL isolato. Lo snapshot comprende anche la riga originale di Marco e l’impronta degli altri operatori. SHA-256 del file privato `postmerge-private.json` `49c1b7813b96f04dbe23985757fd768686cc2ee06bba9ccbb0a8fb5ba958ffa8`. Conservare i dati nominativi nel fascicolo privato.

1. Prima di qualsiasi scrittura verificare progetto `iekwvvihjwghosqdxrdi`, identità, contenuto dello snapshot e assenza di modifiche intervenute. Controllare in particolare `short_description`, `short_intro`, `description` e `optimized_description`. Se i valori differiscono, confrontare la variazione prima di scegliere la baseline.
2. Con il GO SQL usare la connessione al progetto già autorizzata e `psql -X -v ON_ERROR_STOP=1 -v direction=apply -f <file>`. Applicare prima il registro e la RPC editoriale, poi le azioni e la RPC del journal. Verificare il mapping del breve a `custom.short_intro` e le azioni `set_catalog_image` e `rename_catalog_format`. [Registro e RPC](pending/marco-editor-registry.sql) · [Journal e RPC](pending/marco-editor-actions.sql)
3. Con il GO personale usare lo stesso comando per lo script dei grant, aggiungendo `-v staff_id=<UUID verificato privatamente>` e `-v grant_key=<chiave approvata>`. Passare sempre la chiave esplicita. Una transazione e una rilettura per ciascuna chiave autorizzata. Galleria richiede anche `images` e `sync`, formati richiede `prices` e `sync`. Confrontare la riga con l’originale e l’impronta degli altri operatori. [Grant personale reversibile](pending/marco-editor-tags.sql)

### 2. Recupero della revisione Edge attiva

Nel progetto Lovable, **Altro → Database → Manage → Edge functions → product-admin-api** mostrava la funzione attiva. «Deployments 227» è un conteggio. «View code» ha aperto il sorgente corrente dell’editor. Il connettore di gestione ha negato la lettura della funzione. Anche la CLI ufficiale ha restituito HTTP 403 sia per l’inventario sia per il download della singola funzione.

Sul medesimo progetto, un operatore che dispone della lettura di gestione può eseguire questi due comandi da una directory privata vuota. Per associare il download alla distribuzione, rileggere l’inventario al termine e verificare che la versione sia rimasta la stessa.

```sh
supabase functions list --project-ref iekwvvihjwghosqdxrdi -o json
supabase functions download product-admin-api --project-ref iekwvvihjwghosqdxrdi --use-api
```

Acquisire versione o ID della distribuzione, data, configurazione JWT, entrypoint e dipendenze della sola funzione. Archiviare i sorgenti scaricati con il loro SHA-256 e verificare sul pacchetto estratto risoluzione degli import e typecheck. Se la lettura di gestione è riservata a Lovable Cloud, richiedere al gestore del **progetto esistente** il pacchetto oppure l’associazione verificabile fra versione attiva, configurazione e impronta di un archivio disponibile. L’archivio storico proviene da `5a37f71d02070f51a5b2e841d15bf7cda3b72747`. La ricevuta documenta quel deploy, ma l’identità con la versione oggi attiva resta da dimostrare. Il ripristino generale di una versione Lovable può coinvolgere altre Edge modificate. Per questa release usare il percorso per la singola funzione. [Funzioni Edge in Lovable Cloud](https://docs.lovable.dev/features/edge-functions) · [Download di una funzione con la CLI](https://supabase.com/docs/reference/cli/supabase-functions-download)

Dopo la verifica del rollback e il GO Edge, distribuire la sola `product-admin-api` con le sue dipendenze, conservando il frontend pubblico precedente. Controllare `get_admin_context` per il marker `admin-editor-20261125`, il ruolo e le azioni abilitate, e verificare la compatibilità con il frontend pubblicato. Il contratto utilizza la `product-admin-ai` già distribuita.

### 3. Collaudo con Marco e Publish

La Quercus tecnica della PR #73 risulta `LOCAL_DRAFT`, priva di collegamento Shopify e di proprietà di un altro operatore. Prima della prova designare una bozza tecnica di Marco o, con autorizzazione, farla creare nella sua sessione. Annotare privatamente identificativo, autore, stato iniziale e azioni consentite. Il collaudo personale è **aperto**.

| Prova da eseguire in anteprima autenticata | Evidenza per l’accettazione |
|---|---|
| Descrizioni, SKU e persistenza | Con fatti verificati approvare separatamente breve ed estesa. Salvare internamente, riaprire e confrontare testi, due formati, SKU automatici distinti, mesi, prezzi e foto. |
| Foto e formati | Con le sole chiavi approvate, verificare foto e ALT, rinominare un formato esistente e rileggere gli stessi ID, SKU, prezzi e numero di varianti. Annotare l’esito anche quando la chiave manca e l’azione è indisponibile. |
| Sync | Solo con GO specifico per la bozza designata, creare il DRAFT su Shopify e rileggere stato, ID e assenza dal canale. Confrontare il singolo campo e verificarne la destinazione dopo la conferma. Dopo un timeout recuperare la stessa operazione. |
| Pubblicazione | Verificare il blocco nella **verifica preliminare** del prodotto tecnico e conservarne l’esito. Il percorso positivo ha evidenza simulata. Una pubblicazione reale richiederebbe un prodotto ordinario identificato e un mandato commerciale distinto. |

Annotare data, dispositivo, esiti e decisione di Marco. Prima del Publish verificare SHA e delta dell’editor, esito dei casi applicabili e disponibilità del rollback. Dopo il GO al Publish controllare sul dominio pubblico asset serviti, accesso staff e cliente, catalogo, scheda prodotto, carrello e passaggio al checkout senza pagamento. [Checklist di accettazione](../admin-v2/FINAL-ACCEPTANCE.md)

### 4. Rollback e limite sulle varianti

Sospendere le nuove operazioni interessate. Per il frontend tornare al deployment pubblico `6ccdd609-33cd-4b09-a475-89928393d497` con tutti i chunk, verificare l’asset e l’hash sopra indicati. Per la sola Edge usare il pacchetto della revisione attiva acquisito prima del deploy e la sua configurazione JWT. Verificare il precedente contratto in sessione autenticata.

Ripristinare in ordine inverso le sole chiavi effettivamente aggiunte, con lo stesso UUID e `direction=restore`. Riconciliare le operazioni `IN_FLIGHT` o `REVIEW_REQUIRED` prima di ripristinare journal e registro con `direction=restore`. Se sono già presenti azioni concluse dei nuovi tipi, il vincolo precedente torna `NOT VALID` per preservare le righe storiche. Confrontare RPC, mapping, vincolo e permessi con lo snapshot e registrare l’eventuale differenza prevista di validazione. Una scrittura Shopify già confermata richiede una correzione dedicata basata sui valori riletti e sull’autorizzazione al singolo prodotto.

**Varianti di famiglie esistenti.** La PR permette la rinomina di un valore su una famiglia con la sola opzione Formato. Aggiunta ed eliminazione di combinazioni rimangono aperte come intervento separato. Prima di implementarle occorre identificare le varianti per ID, valutare collisioni SKU, disponibilità, media e collegamenti interni, progettare il recupero dopo un invio parziale e provare il riallineamento su una copia autorizzata. Il limite riguarda soltanto la modifica strutturale delle famiglie esistenti.

Gli archivi frontend e i grafi Edge candidato e storico sono stati estratti e verificati in locale. Il manifesto privato contiene le impronte dei moduli.

| Archivio verificato | SHA-256 |
|---|---|
| product-admin-api-rollback.tar.gz | `fba12b484e192e1b432c37f74ede977b0df9492c72922b1b0421a6e4a192f3df` |
| product-admin-api-candidate.tar.gz | `41d297b861e61eccd3d4c1257e80bfe47fb3abab5a778fd1ae995dc31302bf73` |
| frontend-pubblicato.tar.gz | `2f9ece4c1fbf5b284e0585711b492780f3cc5240db10e11f097d1a44c15f7ec4` |
| db-live-baseline.json | `df294220a75d5481b4bfb10e4f0793292cf00b0e335081915e72cb61f9b61c72` |
