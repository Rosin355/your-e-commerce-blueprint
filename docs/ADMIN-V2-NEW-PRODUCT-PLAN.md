# Admin V2 — stato reale e piano minimo “Nuovo prodotto”

30 ottobre 2026. **Documento di analisi/proposta; nessun nuovo flusso implementato, nessuna operazione live.** Revisione analizzata: PR #41 `d4029b5`, discendente di #39 `aa7e6ae`. [Audit catalogo](CATALOG-ALIGNMENT-AUDIT.md).

## 1. Risposta per Marco

Admin V2 consente nel codice consultazione e modifica controllata dei **campi di prodotti già registrati**, proposte AI per campo e sincronizzazione esplicita di campi supportati. L’abilitazione reale dipende da ruolo, flag server, mapping e capability: non è stata verificata con una sessione Marco nel progetto live.

**Non esiste oggi in Admin V2 un percorso completo per creare, classificare, salvare come bozza Shopify e pubblicare un nuovo prodotto.** Il pannello “Nuovo Prodotto AI” esiste e viene montato, ma in Admin legacy; richiede generazione AI e crea una bozza Shopify senza registrare l’identità canonica/mapping. Non è una soluzione pronta per l’autonomia completa del cliente.

## 2. Inventario di tutte le rotte Admin definite

Fonte: [src/App.tsx](../src/App.tsx). Tutte le rotte V2 sotto `/admin` passano da `AdminV2Guard` → contesto server → `AdminShell`. Le due legacy hanno `AdminGuard` separato. Questa è verifica del sorgente, non attestazione di ogni rotta nel deploy live.

| Rotta | Componente / funzione reale | Stato nel codice |
| --- | --- | --- |
| /admin | DashboardPage | Conteggi e collegamenti, letture API |
| /admin/products | ProductsPage | Lista, ricerca, filtri, paginazione; nessun pulsante Nuovo prodotto |
| /admin/products/:productId | ProductDetailPage | Campi tipizzati, capability, AI per campo, sync esplicita supportata |
| /admin/imports | ImportsPage in PlaceholderPages | Segnaposto; nessun importer V2 |
| /admin/categories | CategoriesPage in PlaceholderPages | Segnaposto; nessuna assegnazione V2 |
| /admin/publications | PublicationsPage in PlaceholderPages | Segnaposto; nessuna pubblicazione V2 |
| /admin/settings | SettingsPage in PlaceholderPages | Informazione sul contesto; testo “sola consultazione” statico, non prova dei flag attuali |
| /admin/technical | TechnicalToolsPage | Link legacy solo se tech_admin e VITE_ADMIN_LEGACY_TOOLS non false |
| /admin/import | AdminGuard → AdminImport | Tool legacy: clienti, prodotti CSV, AI Writer, WooCommerce→Shopify, Catalogo DB, Arricchimento |
| /admin/settings-legacy | AdminGuard → AdminSettings | Link Shopify Admin, checker handle e configurazione metafield; “Connesso” statico, non health check |

Non è definita `/admin/products/new`: oggi la stringa `new` può essere catturata da `:productId`, che richiede UUID valido lato API; non è una pagina creazione nascosta. Non sono definite altre rotte Admin nel router corrente.

**Nota qualità lista:** categorie/origine/completezza/“Da classificare” in `ProductsPage` vengono filtrati sulla pagina di risultati già scaricata; le opzioni categoria derivano dalla stessa pagina. Ricerca server ha limiti espliciti (500 match current values; review 2.000; ID intersection limitata a 1.000). Non usare questa UI per conteggi globali o certificare gli 82. Inoltre `serializeProductSummary` usa category_effective con fallback a product_category_raw: “mostra una categoria” non prova un’assegnazione canonica approvata, e la label “ereditata” non è di per sé prova del join parent.

## 3. Dove si raggiunge realmente NewProductAIPanel

Percorso nel codice:

`/admin/import → tab AI Writer → tab Nuovo prodotto → NewProductAIPanel`.

- [AdminImport](../src/admin/pages/AdminImport.tsx): mostra AI Writer se `VITE_ENABLE_AI_PRODUCT_WRITER !== 'false'` (default abilitato).
- [AiWriterPanel](../src/admin/components/AiWriterPanel.tsx): tab `existing` di default, tab `new` monta [NewProductAIPanel](../src/admin/components/NewProductAIPanel.tsx).
- Accesso diretto legacy: sessione + `useAuth().isAdmin`, verificato su `user_roles.role = admin`. Il flag `VITE_ADMIN_LEGACY_TOOLS` regola il link V2, non blocca la rotta diretta legacy.
- Un utente con solo `tech_admin` può vedere il link da V2 ma non soddisfare il controllo legacy `admin`. Non presumere equivalenza tra i ruoli o ampliare permessi automaticamente.
- Il pannello non è montato da Dashboard, ProductsPage, ProductDetailPage o CategoriesPage V2.

Il percorso è realmente collegato nel sorgente; **raggiungibilità con l’account Marco, flag build, versione Edge deployata e autorizzazione commerciale non verificati live**. Nessun accesso autenticato o click di generazione/creazione è stato simulato contro produzione.

## 4. Creazione AI legacy: controlli, bozza e lacune

Fonti: [useNewProductAI](../src/admin/hooks/useNewProductAI.ts), [create-product-ai](../supabase/functions/create-product-ai/index.ts), [admin-auth](../supabase/functions/_shared/admin-auth.ts), `supabase/config.toml`.

| Passo | Comportamento osservato nel codice |
| --- | --- |
| Generazione | Titolo richiesto; chiamata action generate_content a provider AI con chiave solo server; ritorno seoData |
| Anteprima | Valori generati mostrati; HTML sanificato in preview, non editor completo di revisione campo per campo |
| Creazione | Hook richiede generatedContent + prezzo > 0; action create_product |
| Autenticazione | verify_jwt=false nella config, compensato da assertAdminRequest: auth.getUser e ruolo admin letto dal server prima di generare/creare |
| Validazione server | Titolo non vuoto e prezzo truthy > 0; payload any, nessuno schema completo per categoria, prezzo finito/precisione, tag, immagini e contenuti |
| Shopify | POST REST products.json, status draft fisso; una variante con prezzo e requires_shipping; categoria inserita come product_type |
| Collezioni | Nessun collection ID/handle canonico assegnato; product_type NON equivale a collezione |
| Identità | Non sono inviati SKU variante/parent, barcode o relazione canonica; nessun insert/update prodotti o mapping Supabase |
| Media/metafield | Upload immagine e quattro metafield, errori non bloccanti; possibile success=true con arricchimento parziale |
| Immagine AI | Checkbox presente e valore inviato, ma backend restituisce generatedImageBase64:null; generazione immagine non implementata in questo handler |
| Idempotenza | Nessuna request key/ledger nel create legacy; retry dopo risposta persa può creare un secondo prodotto |
| Pubblicazione | Nessun ACTIVE o publishablePublish nel create; DRAFT non è pubblicazione Headless |

Il backend può ricevere create_product senza seoData e creare una bozza con descrizione vuota; questo **non costituisce un percorso manuale utilizzabile** nel pannello, che blocca senza generazione. La descrizione inserita nel form non viene conservata come body_html di fallback nel create. Il pulsante legacy non crea automaticamente il record in Admin V2.

Il prompt legacy chiede, per dati botanici incerti, il valore più probabile: incompatibile con il requisito di non inventare informazioni. Non riutilizzare quel comportamento nel nuovo flusso. Né il flag frontend AI Writer né PRODUCT_ADMIN_WRITES_ENABLED costituiscono un gate del create legacy: quest’ultimo usa il proprio controllo admin. Non è un endpoint anonimo, ma il modello di autorizzazione/approvazione è distinto da V2.

Il percorso usa REST legacy, quindi per lo sviluppo nuovo si propone il client GraphQL già presente, verificando versione e contratti. [Shopify documenta REST come legacy](https://shopify.dev/docs/api/admin-rest); [productCreate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate) richiede write_products e crea inizialmente una sola variante. Nessuna conversione o modifica è stata eseguita qui.

## 5. Modifiche con/senza AI nei prodotti esistenti

| Funzione | Stato sorgente | Stato operativo live in questo audit |
| --- | --- | --- |
| Lettura identità/current values/storia | product-admin-api, query allowlist | Non verificato: Supabase target non autorizzato |
| Editing manuale campi esistenti/mancanti ammessi | V2 FieldCard/FieldEditor; validate, versioni e comandi atomici | Condizionato da flag/ruolo/capability; non si dichiara abilitato per Marco |
| AI per singolo campo | product-admin-ai, strategie, suggerimento separato, accetta/scarta | Codice presente; non invocato, nessuna spesa AI |
| Sync campo singolo | Mapping SKU esatto, verifica variante/prodotto, replay, drift e verifica post-write | Codice presente; flag separato e ruolo admin/tech_admin; non invocato |
| Creazione manuale V2 | Nessuna rotta/comando/form create | Mancante |
| Creazione AI V2 | Nessuna integrazione NewProductAIPanel | Mancante |
| Classificazione canonica V2 | Segnaposto e campi strutturali protetti | Mancante |
| Creazione batch tecnica | Manifest privato, ledger e DRAFT | Evidenze storiche di esecuzione; non self-service e non ritestata live |
| Pubblicazione tecnica batch | Manifest, digest/gate e target espliciti | Codice/documentazione disponibili; non pulsante cliente e non verificata live |
| Import automatico Shopify → canonico Supabase | Nessun consumer trovato nel perimetro | Non disponibile come percorso automatico dimostrato |

### Permessi e validazioni da conservare

- `product-admin-api` e `product-admin-ai` verificano JWT con Auth e caricano ruoli server-side; nessun ruolo fidato dal payload browser. Service-role/Admin token rimangono nelle Edge Functions, non nel frontend.
- Letture V2: admin, tech_admin, editor, publisher. Comandi campo: admin/tech_admin/editor; canary limita ulteriormente. Sync Shopify: admin/tech_admin. Il solo ruolo publisher **non** abilita oggi una pubblicazione, che non è tra le azioni API.
- PRODUCT_ADMIN_WRITES_ENABLED default false; PRODUCT_ADMIN_WRITE_MODE default canary; gate sync separato. I valori live non sono stati letti o modificati. Capability del campo e autorizzazione API devono restare l’autorità, non testi statici o pulsanti visibili.
- Registro campi, enum, mesi, FAQ/list editor, expectedVersion e idempotencyKey; campi manual-only e protezione reimport; SKU/parent/tipo/categorie come strutturali non modificabili da AI.
- HTML sanificato in preview non equivale a validazione server dell’intero payload; i nuovi campi devono essere validati server-side prima di qualsiasi write autorizzata.

## 6. Come entra un nuovo prodotto nel catalogo unico

L’Admin legge `products` e `product_current_values`; la vetrina legge Shopify. Sono identità e proiezioni dello stesso dominio, non due cataloghi commerciali da far evolvere indipendentemente.

- Creando oggi da create-product-ai si ottiene Product ID/handle Shopify, ma non SKU o UUID canonico salvato: il percorso termina prima della riconciliazione.
- Creando da manifest si ottengono prove nel ledger, ma l’API V2 richiede il mapping esatto nella tabella legacy. Il backfill tecnico può collegare ID già verificati, non acquisisce indiscriminatamente prodotti nuovi e non è stato eseguito.
- Un prodotto creato direttamente da Shopify Admin può diventare visibile al token se pubblicato, senza essere automaticamente presente in V2. Non riconciliare per titolo, categorie ipotizzate o suffix SKU.

**Proposta:** una sola identità in products, un solo set di valori correnti con origine manuale e storia; parent/varianti espliciti; mapping persistito e verificato con SKU esatti e GID restituiti da Shopify. La compatibilità col lookup V2 attuale va preservata tramite adapter/mapping controllato: non aggiungere un secondo registro che il reader ignora. Per prodotti esterni Shopify serve una riconciliazione esplicita prima dell’editing V2; eventuale webhook sarà un progetto separato, con verifica HMAC/dedup e policy di conflitto, non un prerequisito per il primo flusso interno.

## 7. Flusso unico proposto, non implementato

**Nuovo prodotto → Compilazione → Categorie → Anteprima → Bozza Shopify → Pubblicazione controllata.** Una sola UI V2 e un unico percorso con AI opzionale; nessun nuovo pannello tecnico parallelo.

1. **Nuovo prodotto:** azione nella lista e route statica dedicata, capability server esplicita. Identità canonica con origine manuale; politica SKU approvata, controllo unicità normalizzata e relazioni parent/varianti. Non inventare codici secondo convenzioni non approvate. Salvare una bozza interna con UUID stabile non pubblica nulla.
2. **Compilazione:** titolo, descrizione, media reali, formati/opzioni e valori commerciali inseriti dall’operatore autorizzato. Riutilizzare editor, validazione e storia. AI facoltativa solo su campi editoriali, proposta separata da accettare; deve poter restare incompleto anziché stimare botanica, consegna o promozioni. Nessun prezzo, stock, SKU o categoria generati dall’AI. Primo rilascio può limitarsi a simple e variable con opzioni supportate esplicitamente, bloccando strutture ambigue.
3. **Categorie:** selezione multipla da tassonomia approvata con etichette comprensibili; categoria primaria e categorie secondarie quando previste. Scrivere associazioni approvate al parent; effective category delle varianti deriva dal parent. Mapping verso Collection GID verificato, non testo libero product_type. I casi senza mapping restano “Da classificare”, senza pubblicazione. Nessuna categoria ricavata da titoli/descrizioni.
4. **Anteprima:** mostra dati realmente salvati e un riepilogo prodotto/card/PDP con componenti approvati; niente JSON o editor metafield raw. Evidenzia campi mancanti, fatti da revisionare, varianti, categorie e differenze in uscita. Un suggerimento AI non accettato non entra nel payload. Anteprima basata su dati persistiti, nessun fixture commerciale presentato come reale.
5. **Bozza Shopify:** comando server separato, idempotente, auditabile. Riutilizzare client GraphQL, controlli identità, ledger/replay e postcondizioni degli executor; non aggirarne manifest/allowlist attraverso payload frontend arbitrari. Preparare un nuovo adapter single-product sottoposto a review: quello batch oggi non è utilizzabile direttamente come API di form. Creare DRAFT con insieme varianti/SKU/media approvati, assegnazioni ammesse e mapping verificato di ritorno. In caso di errore parziale, conservare Product GID e stato di riconciliazione, non rifare un create cieco; retry sicuro. Nessun set ACTIVE implicito.
6. **Pubblicazione controllata:** capacità/ruolo dedicato da approvare, riepilogo finale e conferma esplicita distinta dal salvataggio e dal DRAFT. Preflight live di identità, contenuti, prezzi, readiness commerciale/logistica e canali approvati. Riutilizzare ledger/digest e verifica, senza trasportare nel nuovo prodotto i default storici “stock 20” o i manifest dei 903. Shopify resta autorità per inventory/prezzi; eventuali future scritture commerciali richiedono perimetro separato. Verificare ACTIVE + target pubblicazioni necessari + visibilità effettiva Storefront e mapping locale; drift/errore impediscono stato “Pubblicato”.

La bozza interna e la bozza Shopify sono stati dello stesso prodotto, non cataloghi paralleli. Shopify è autorità per stato commerciale, varianti acquistabili, prezzi e disponibilità; Supabase conserva identità, sorgenti, editing approvato, mapping e audit. Conflitti esterni richiedono confronto esplicito e non sovrascrittura silenziosa.

## 8. Piano minimo con criteri di accettazione

Il blocco 0 ha due esiti separati: decisioni necessarie al nuovo flusso e riconciliazione storica da completare quando arrivano gli export. Non impone di fermare CI/review dello storefront, analisi dei permessi, design del form o preparazione dei contratti offline. Nessuno di questi sviluppi viene implementato nell’incarico attuale; non si abilita una pubblicazione o una riassegnazione in attesa dei dati.

| Blocco | Riutilizzare | Sviluppo minimo | Criterio verificabile |
| --- | --- | --- | --- |
| 0 — fotografia e decisioni | CSV pubblici, ledger e mapping esistenti | Accesso/export read-only, riconciliazione 903/82, regole SKU/ruolo cliente | Ogni famiglia ha identità/mapping certo o motivo di blocco; nessuna categoria inferita |
| 1 — bozza interna manuale | products/current values/history, guard V2, editor/validator | Route/form create + comando server/RPC atomico revisionato, capability e idempotenza | Senza AI e senza Shopify si crea/riprende lo stesso prodotto; doppio invio non duplica; utente non autorizzato respinto; nessuna write commerciale |
| 2 — classificazione e anteprima | Schema categorie/source map/assignments/shopify map, componenti approvati | API/UI assegnazione manuale ed ereditarietà; filtri globali corretti; preview | Solo categorie approvate/GID verificati; parent/varianti coerenti; non classificato bloccato alla pubblicazione; conteggi globali non limitati alla pagina |
| 3 — AI facoltativa | product-admin-ai e suggerimenti per campo | Estensione al nuovo record usando le stesse policy | Percorso completo senza AI; accetta/scarta auditati; nessun fatto o dato strutturale inventato; conflitto versione blocca |
| 4 — Shopify DRAFT | Client GraphQL, ledger e postcondizioni create | Adapter singolo prodotto e mapping di ritorno compatibile V2 | Uno SKU/UUID → un Product GID corretto; Variant GID e SKU esatti; retry e timeout non duplicano; DRAFT invisibile al pubblico; errori media/mapping impediscono stato completo |
| 5 — pubblicazione | Verifiche publication batch, replay/digest | Comando e schermata controllati con permessi specifici | Nessuna pubblicazione al salvataggio; preflight fallito = zero mutation; target approvati soltanto; post-verifica Shopify e Storefront, audit e mapping coerenti |

Le mutation dei blocchi 4–5 non sono autorizzate da questo audit. Richiedono approvazione dell’implementazione, staging/sandbox e una successiva autorizzazione operativa. Non si abilitano ora flag, ruoli o scope.

## 9. Rischi e gate di consegna

| Rischio | Evidenza / controllo necessario |
| --- | --- |
| Prodotto Shopify orfano rispetto a V2 | Create AI legacy senza SKU/mapping/identità; usare percorso unico e riconciliazione verificata |
| Doppio prodotto dopo timeout | Create legacy senza idempotenza; riusare ledger e postcondizioni |
| Categoria apparentemente presente ma non canonica | product_type libero e summary raw fallback; UI deve distinguere stato approvato/da classificare |
| Contenuto botanico/commerciale stimato | Prompt legacy probabilistico; AI opzionale e approvazione campo, non riuso invariato del prompt |
| Permessi incoerenti | admin legacy diverso da tech_admin/editor V2; verificare ruolo Marco e policy per create/classify/publish separatamente |
| Stato UI ingannevole | Testi statici read-only/Connesso, filtri locali; usare capability server e query globali |
| Divergenza mapping/Shopify esterno | Lookup legacy esatto; niente import automatico dimostrato, conflitti bloccanti |
| Ambiguità dei conteggi | 903 coorte storica ≠ 1.346 Product GID pubblici; chiusura tramite join esplicito |
| API non effettivamente fissata | Richiesta Storefront 2025-07 servita come 2026-01; aggiornamento/version-test separato |

Prima di implementare il nuovo flusso occorre approvare flusso/ruoli, policy SKU/varianti e perimetro commerciale. La riconciliazione integrale dei 903 non blocca progettazione, review, specifiche o futuri sviluppi offline indipendenti: può avanzare come attività parallela. Le letture mancanti servono per certificare il catalogo completo; il rilascio del nuovo flusso richiederà comunque mapping e tassonomia verificati per i prodotti interessati. Gate prima di operazioni: test negativi auth/RLS, replay/concorrenza, drift/parziali, canali e staging autorizzato; Safari/mobile/accessibilità e validazione commerciale separata. Nessun ordine reale per attestare il codice.

## 10. Verifiche di questo incarico

Audit di rotte/mount, handler, auth, flag, schema e mapping; query Storefront completamente paginate e membership reciproche confrontate. Test di contratto esistenti eseguiti offline: 195 Node su dieci file pertinenti; suite Deno separata e risultati registrati nelle [evidenze QA](catalog-audit-evidence/2026-10-30/validation.json). I test non confermano deploy o privilegi live. Nessun nuovo test che simuli falsamente operatività commerciale, nessun nuovo componente/API/migration implementato.
