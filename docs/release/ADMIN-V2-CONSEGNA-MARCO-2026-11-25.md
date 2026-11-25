# Admin V2 · decisione sulla consegna operativa a Marco

**25 novembre 2026 · GO al collaudo isolato. NO-GO alla consegna commerciale. SAL ufficiale 57,75%.**

Il ramo Lovable verificato è `codex/rilascio-admin-v2-isolato-20261124` a `ddc27efe0664826f4afc13e641c2d0445e118d0d`, con il commit automatico dei tipi Supabase successivo al merge documentale #75. Il candidato applicativo è `97797afcef558195eede6ec991ccce52e487f246`. Le PR #73, #74 e #75 sono antenate della base. L’adozione del candidato richiede una sola integrazione sul ramo isolato e un controllo del commit realmente mostrato dall’editor. [Base Lovable](https://github.com/Rosin355/your-e-commerce-blueprint/commit/ddc27efe0664826f4afc13e641c2d0445e118d0d)

## Cosa può fare Marco

| Attività | Nel candidato | Evidenza o limite |
|---|---|---|
| Trovare e modificare un prodotto | Vista semplice, dati tecnici richiudibili, modifica singola o riepilogo dei campi preparati | Confronto di versione e identità prima della scrittura, esito per campo. Dopo un errore verificare anche i campi già completati |
| Assistenza editoriale | Un pulsante per la nuova scheda e uno per la scheda esistente. Anteprima con valore, origine, esclusione, modifica e conferma della sostituzione | Nuova scheda con una richiesta strutturata quando consentita. Su una scheda esistente la richiesta riguarda la descrizione da fatti riconfermati. Per SEO e tag si utilizzano selezioni deterministiche consentite. I permessi della bozza nuova restano circoscritti |
| Breve, estesa, vantaggi e FAQ | Breve su `custom.short_intro`, estesa su `descriptionHtml`. Caratteristiche da fatti interi, punti di forza da vantaggi espliciti, FAQ solo da domanda e risposta confermate. Il tipo richiede un dominio verificato o la scelta manuale | Visualizzazione dell’origine per campo. Le immagini e i prezzi non diventano fonti automatiche di affermazioni. Generazione reale con Marco ancora da provare |
| Nuovo prodotto | Revisione, salvataggio interno e creazione DRAFT con un’unica conferma. La pubblicazione commerciale richiede una successiva verifica esplicita | SKU automatici, formato singolo o multiplo. Timeout della creazione da riconciliare con la stessa operazione. Pubblicazione tecnica bloccata |
| Immagini, ALT, prezzi, categorie e formati | Confronto dedicato, grant e rilettura. Rinominare un’opzione di formato conserva le varianti | Aggiunta o rimozione delle combinazioni su una famiglia esistente **bloccata**. La RPC `admin_complete_draft` verifica la lista SKU originale e registra una volta i collegamenti padre/figli. Manca una transazione di riconciliazione per cambiare quella lista dopo una mutazione remota parziale, preservando ordini, inventario e identità |
| Gestione della vendita | Rimuovere dal solo canale Online Garden, archiviare su tutti i canali, ripristinare come DRAFT. La ricevuta personale resta consultabile riaprendo la scheda | Grant `product_unpublish` e `product_archive` separati. Dopo ogni scrittura si rileggono Shopify e Storefront, con controllo dell’indice catalogo. Un esito incerto richiede riconciliazione |
| Eliminazione permanente | Singolo prodotto archiviato. Richiede `product_delete`, mandato commerciale nominativo per GID e revisione, titolo esatto e verifiche sotto indicate | Disattivata per Marco. Verificata su dati sintetici. L’eliminazione commerciale è irreversibile e richiede un GO sul singolo prodotto |

## Controlli e limiti dell’eliminazione

Il server verifica il padre e tutti gli SKU, i link canonici e legacy, le bozze interne irrisolte, tutti i canali attivi o programmati, l’assenza di media, le quantità per sede, le righe d’ordine per GID o SKU e i redirect Shopify in ingresso e uscita. Il mandato contiene il riferimento alla decisione commerciale, l’attestazione dei riferimenti esterni e una scadenza entro 24 ore. La tabella con RLS è privata. La Edge può leggerla. L’operatore che approva deve verificare anche lo storico esterno WooCommerce e i collegamenti esterni al negozio. Una fonte mancante impedisce di attestare il controllo.

I limiti di lettura sono 50 varianti, 50 sedi per variante, 100 pubblicazioni, 400 ordini, 25 righe per ordine, 2.000 redirect e 2.000 prodotti nell’indice Storefront. I riferimenti agli ordini richiedono l’accesso allo storico completo e la lettura degli ordini. Superare un limite, perdere una pagina o ricevere un dato incompleto arresta il flusso. L’indicizzazione può essere ritardata. La rilettura dopo una mutazione può quindi richiedere riconciliazione anche quando Shopify l’ha già eseguita. I sistemi esterni possono cambiare tra controllo e scrittura. Durante la finestra proteggere il singolo prodotto da aggiornamenti concorrenti di altri operatori o importatori. L’archivio interno e il journal vengono conservati.

## Evidenza di collaudo

| Dove | Esito |
|---|---|
| Node e Deno | 671 test Node e 120 Deno superati. Autorizzazioni, dati editoriali, preflight di pubblicazione, idempotenza, ordini, stock per sede, mapping, redirect e lettura della vetrina con dipendenze simulate |
| PostgreSQL locale | Applicazione ripetibile, rifiuto senza grant personale, ripristino e riattivazione con quattro eventi storici conservati. ACL del mandato e rifiuto del secondo Editor verificati |
| Chromium | 33 test superati, inclusi desktop e viewport mobile, flussi AI, DRAFT, confronto del singolo campo, interruzione per conflitto, archivio e ricevuta dopo reload. API Shopify e AI simulate |
| Safari | Safari desktop 26.0.1 sul candidato locale ha aperto il confronto «Punti di forza», mostrato l’azione di invio e chiuso il confronto con zero salvataggi e zero sincronizzazioni. Il runner WebKit 2388 termina con segnale 11 prima di aprire la pagina. Il percorso completo con Marco su Safari desktop e iPhone resta aperto |
| Build | Typecheck React, build Vite con Admin operativo e Deno check dell’entrypoint e dei pacchetti estratti superati |
| Dominio e Cloud reali | HTML e SHA-256 del bundle pubblico verificati. Il comando di sola lettura `get_admin_context` senza credenziali riceve HTTP 401. Il registro nominativo conferma Editor con `edit, sync, drafts, images, categories, prices, publish, ai`. Accesso personale e operazioni del candidato da provare con Marco |
| Regressioni vetrina | Sulla base isolata questo intervento interessa l’Admin e la sua Edge. Dal sorgente pubblico si ereditano la breve sulla PDP, i colori dei pulsanti, i due ID tecnici filtrati e i tipi Supabase generati. Routing account, carrello e checkout coincidono. Test offline positivi. Smoke pubblico del candidato successivo al Publish |

## Finestra di rilascio e rollback

| Decisione | Quando procedere |
|---|---|
| SQL registro e journal | **GO tecnico, NO-GO esecuzione.** Rileggere sul progetto `iekwvvihjwghosqdxrdi` identità, mapping, vincolo e corpi delle RPC. Salvare privatamente righe, ACL, definizioni e hash. Applicare in ordine i tre file SQL indicati sotto dopo il GO |
| Grant personali | **GO alla preparazione, NO-GO esecuzione.** Attivare solo le chiavi autorizzate, sull’UUID già verificato. Separare il mandato per le azioni reversibili. La cancellazione è esclusa dagli script di grant |
| Deploy Edge | **GO tecnico al pacchetto, NO-GO esecuzione.** Dopo SQL e GO dedicato, distribuire la sola `product-admin-api` sul progetto esistente. Registrare data, ID e impostazione del gateway JWT mostrata dal pannello. Il codice chiama Auth `getUser` e legge ruoli e grant server-side. Conservare la configurazione del gateway attuale. Verificare 401 senza sessione e, con Marco, `supportsSheetEvidence`, `lifecycleActions`, ricezione degli stati e compatibilità con il frontend pubblico |
| Anteprima autenticata | **GO su fixture.** Per il collaudo personale usare la bozza tecnica approvata dopo l’attivazione delle dipendenze. Identificare lo SHA dell’editor prima di iniziare |
| Publish Lovable | **NO-GO** fino a sincronizzazione dello SHA, prova personale, Safari e decisione del responsabile. Un solo Publish dopo l’approvazione del candidato verificato |
| Operazioni commerciali | **NO-GO** fino al mandato che specifica azione, prodotto e canale. La creazione DRAFT in Shopify richiede un GO identificabile. Una bozza tecnica rimane fuori vendita |

1. Registrare prima e dopo le sole righe pertinenti. Per la baseline già letta i corpi di `admin_update_product_field` e `admin_claim_catalog_approval` hanno MD5 rispettivamente `2621cc0ee78a99e6dc55bd0602dc4ac3` e `35742108b8980a1cb930aee7d453dc75`. Ricontrollare gli hash sulla stessa transazione di applicazione.
2. Sul collegamento privato già verificato usare `psql -X -v ON_ERROR_STOP=1 -v direction=apply -f <file>` in ordine per [registro](pending/marco-editor-registry.sql), [journal galleria e formati](pending/marco-editor-actions.sql) e [journal azioni sul prodotto](pending/marco-product-lifecycle.sql). Controllare mapping breve, vincoli, permessi RPC e ACL del mandato.
3. Per ogni chiave approvata usare lo stesso comando con `-v staff_id=<UUID privato> -v grant_key=<chiave>`. Il [grant editoriale](pending/marco-editor-tags.sql) ammette `tags`, `product_gallery`, `product_formats`. Il [grant per azioni reversibili](pending/marco-reversible-grant.sql) ammette `product_unpublish` e `product_archive`. Rileggere ruolo e chiavi di Marco, confrontare con lo snapshot, verificare che gli altri Editor conservino i propri accessi.
4. Creare o verificare entrambi gli archivi con `python3 scripts/package-admin-catalog-edge.py <SHA> <directory-privata>`. L’archivio contiene il grafo locale della sola Edge, il lockfile e il TOML del progetto. Estrarlo e ricontrollare SHA, Deno e configurazione del gateway. Usare l’operazione di distribuzione puntuale su Lovable Cloud. La procedura di ripristino usa il deploy storico documentato `5a37f71`. Il download del runtime attivo è indisponibile. Il confronto byte per byte con il runtime resta un rischio esplicito del GO Edge. [Procedura per Edge Functions](https://docs.lovable.dev/features/edge-functions)
5. In caso di regressione fermare gli invii, riconciliare le operazioni in volo o in revisione sul GID interessato e registrare l’esito. Tornare al frontend completo del deployment `6ccdd609-33cd-4b09-a475-89928393d497`. Se necessario ridistribuire il solo archivio Edge storico. Ripristinare i soli grant introdotti con `direction=restore`, poi gli script SQL in ordine inverso. Confrontare con lo snapshot, preservare i journal, verificare il login e un comando di lettura autorizzato.

| Archivio | SHA-256 verificato |
|---|---|
| Candidato `97797af` · 40 moduli locali | `abe7d408dd4d05d8a8e7dcffd17f96ad4d32d857e6cb1b93b8d4645d0e3f1c0a` |
| Ripristino storico `5a37f71` · 36 moduli locali | `fba12b484e192e1b432c37f74ede977b0df9492c72922b1b0421a6e4a192f3df` |
| Frontend pubblico completo | `2f9ece4c1fbf5b284e0585711b492780f3cc5240db10e11f097d1a44c15f7ec4` |
| Asset pubblico `index-BcqOotvz.js` | `f254b4e7b2ada8527fbf99a15678a015dd9c70b3da147366d5b9e3208114c8bb` |

## Sessione unica di accettazione

Marco entra con il proprio account. Il responsabile identifica in privato bozza, SKU e GID permessi. Registrare browser, ora, azione, stato prima/dopo e giudizio personale.

1. Cercare un prodotto esistente, aprire la scheda e verificare vista semplice, pannello tecnico chiuso, immagini e prezzo leggibile. Sulla bozza concordata riconfermare i fatti esistenti, generare una volta, controllare provenienza e costi, escludere un campo e correggere una proposta. Verificare che breve ed estesa differiscano.
2. Rivedere la sola correzione approvata, distinguere i campi solo interni da quelli destinati a Shopify, salvare e riaprire. Provare tag, foto e ALT, due formati con prezzi e mesi sparsi. Un nuovo prodotto si salva internamente prima di inviarlo come DRAFT. Verificare SKU, ID, unicità, foto e rilettura. Riservare quest’ultimo invio al GO DRAFT.
3. Controllare il blocco della pubblicazione tecnica. Su un prodotto commerciale indicato dal responsabile e dopo il relativo GO verificare pubblicazione, presenza nella PDP, nel catalogo e disponibilità. Per rimozione e archivio verificare separatamente canali, stato ARCHIVED e ripristino DRAFT. Collaudare rifiuto della cancellazione e conferma rafforzata sulle fixture. Una cancellazione vera richiede un mandato separato.
4. Dopo Publish controllare home, catalogo, PDP, login staff e cliente, carrello e apertura checkout senza acquisto. Annotare le eventuali anomalie prima dell’accettazione e dell’aggiornamento della SAL.
