# Rilascio product-admin-api — 26/11/2026

## Candidato dopo approvazione del piano — NON distribuito

**Commit sorgente `e612b24`, base `66f2599` · PENDING_CLIENT_ACCEPTANCE.** Il piano approvato autorizza preparazione e test isolati, non deploy/Publish/scritture. Backend e sito di produzione invariati. Shopify riconnesso esclusivamente attraverso lo strumento ufficiale per riprendere le letture; nessun nuovo backend, credenziale personalizzata, grant o modifica ai secret/flag di progetto.

### Letture live successive: supersedono i limiti del verbale iniziale sotto

- Strumenti Shopify: Product `16026906460500`, Variant `58634556997972`, SKU `OG-NP-146C68CF06-A15884233C`, handle `og-draft-ba386a9a-90b5-4207-a4f8-92dda4ee2002`; una sola corrispondenza del filtro SKU, **ACTIVE**, **non sul canale Lovable**. Ultima modifica Shopify letta: 17:44:42 UTC.
- Ricerca esatta con `inventory_total:0`: restituisce la stessa famiglia, unica variante; **stock aggregato 0** confermato attraverso filtro Admin Shopify, non un read-back di ogni sede/impegno inventario.
- Sessione tecnica nativa disponibile: anteprima autenticata `/admin/products/{id}` → **Edge di produzione `product-admin-api`, get_product HTTP 200**. `identityVerified=true`, `publicationStatus=ACTIVE`, `siteVisible=false`, `siteAvailability=null`, prezzo **14,60 EUR**, nessun errore restituito. Non è una sessione Marco, né la revisione binaria del backend.
- Confronto live dei campi esposti dall'Admin: descrizione formattata e titolo coincidono; nome botanico, difficoltà, FAQ, benefici/caratteristiche **null** su Shopify; quattro periodi **[]** dopo decodifica Admin. Non confondere questi vuoti remoti con i valori locali. `short_description` assente anche nella bozza: non ignorato, non richiesto.
- Azione Admin esistente `shopify-admin-proxy/list_shopify_metafield_definitions`: **26 definizioni PRODUCT**, inclusi due metafield Shopify taxonomy. Query esistente `first:100` senza pageInfo; risultato inferiore al limite, ma non fornisce accesso Storefront né prova mediante cursore. Il candidato invece impone paginazione e completezza esplicite. Azione `get_product` restituisce **images=[]**, nessuna foto.
- Dominio pubblico sulla PDP del handle esatto: **“Prodotto non trovato”**, verificato nel browser senza sessione cliente o operazione carrello/checkout. Quindi **STOREFRONT_VISIBILITY=NO** alla verifica, non inferito dalla ricerca “yucca”.
- DB riletto dopo le verifiche: 13 valori locali, 13 bloccati, zero verifiche remote persistite; invariato. Nessuna scrittura effettuata nei test.

### Output corrente

| Voce | Esito |
|---|---|
| METAFIELD_SYNC | **FAIL produzione**: 9 valori botanici/FAQ/liste richiesti locali non presenti nella lettura remota. **PASS candidato con mock**, non rilasciato |
| PRODUCT_STATUS | **ACTIVE**, riletto Shopify e Admin |
| ONLINE_STORE_PUBLICATION | **NO riferito dal collaudo**, non riletto indipendentemente dagli strumenti disponibili; non attestare tutti i publication IDs |
| LOVABLE_PUBLICATION | **NO**, strumento Shopify per SKU esatto |
| HEADLESS / SITO | Admin restituisce `siteVisible=false`; lista completa di publication IDs non esposta |
| STOREFRONT_VISIBILITY | **NO**, PDP pubblica esatta non trovata |
| INVENTORY | **0 aggregato**, filtro `inventory_total:0`, una variante; sedi/impegni non letti |
| IMMAGINI | **0**, lettura REST Admin del prodotto esatto |
| DEPLOY_REQUIRED | **Sì**, solo futura `product-admin-api` dopo gate; nessun deploy eseguito |
| FRONTEND_PUBLISH_REQUIRED | **Sì**, soli messaggi/conferme Admin del candidato; nessun Publish eseguito |

### Definizioni reali lette, mapping e valori esposti

Namespace `custom` salvo ultime due righe. Valori “vuoto” = lettura remota di `get_product` Admin, non bozza locale. L'endpoint definizioni non espone `access.storefront`; **non dichiarare PUBLIC_READ verificato**. Tipi reali riportati, nessuna definizione creata o modificata.

| Metafield | Tipo Shopify letto | Bozza / valore remoto / mapping |
|---|---|---|
| care_info | multi_line_text_field | Bozza assente, remoto vuoto; letto pubblico come careInfo |
| promo_text | single_line_text_field | Bozza assente, remoto vuoto; **registro/legacy prevede multi-line**, da bloccare se richiesto con tipo incompatibile |
| key_features | multi_line_text_field | Bozza array con testo originale, remoto vuoto; candidato serializza voci reversibili su righe |
| special_bullets | multi_line_text_field | Bozza assente, remoto vuoto; field sync distinto, non aggiunto al contratto nuova botanical |
| short_intro | multi_line_text_field | short_description assente; remoto vuoto; mapping canonico della descrizione breve |
| long_description | rich_text_field | **Nessun campo Admin canonico equivalente**; valore non esposto; descrizione Admin resta core descriptionHtml, non copiarla implicitamente qui |
| difficolta_di_coltivazione | single_line_text_field | Bozza Media, remoto vuoto; fonte da confermare |
| origini_e_habitat | multi_line_text_field | Bozza assente, remoto vuoto; target pubblico coerente |
| nome_botanico | single_line_text_field | Bozza yucca rostrata, remoto vuoto; richiesto ma omesso in produzione |
| nome_comune | single_line_text_field | Bozza assente, remoto vuoto |
| attributi_prodotto | json | Nessun campo Admin canonico; valore non esposto; letto dal pubblico, non generare implicitamente |
| periodo_di_fioritura | single_line_text_field | Bozza Febbraio/Maggio/Luglio/Ottobre, remoto [] |
| periodo_ottimale_di_potatura | single_line_text_field | Bozza Gennaio/Giugno/Luglio, remoto [] |
| periodo_di_messa_a_dimora | single_line_text_field | Bozza Gennaio/Marzo/Giugno/Dicembre, remoto [] |
| periodo_di_raccolta | single_line_text_field | Bozza Febbraio/Giugno, remoto [] |
| conosci_meglio_la_tua_pianta | multi_line_text_field | Bozza assente, remoto vuoto |
| come_prendersene_cura | multi_line_text_field | Bozza assente, remoto vuoto; pubblico legge questo, non custom.care_guide |
| titolo_sezione_faq | single_line_text_field | Bozza assente, remoto vuoto |
| faq_prodotto | json | Bozza FAQ di prova, remoto vuoto; candidato conserva JSON strutturato dopo conferma |
| ibridatore | single_line_text_field | Bozza assente, remoto vuoto; permesso/manual-only invariato |
| colore_fiore | single_line_text_field | Bozza assente, remoto vuoto; permesso/manual-only invariato |
| colore_foglia | single_line_text_field | Bozza assente, remoto vuoto; permesso/manual-only invariato |
| curiosita | multi_line_text_field | Bozza assente, remoto vuoto |
| key_benefits | multi_line_text_field | Bozza rree/gggg, remoto vuoto; dati di prova non verificati, nessuna correzione dei record |
| shopify.hardiness-zone | list.metaobject_reference | Nessun mapping/grant Admin canonico; valore non esposto, **escluso** |
| shopify.watering-needs | list.metaobject_reference | Nessun mapping/grant Admin canonico; valore non esposto, **escluso** |

`custom.care_guide` non compare nelle definizioni lette: mapping locale orfano rispetto al contratto pubblico `come_prendersene_cura`. Nessun alias inglese dello script storico compare in questa lettura, eccetto i target reali elencati sopra. Non aggiungere definizioni o cambiare permessi per colmare i vuoti. `long_description` e `promo_text` sono incompatibilità reali del percorso legacy, **non** motivo per duplicare contenuti nella nuova Admin V2.

### Correzione candidata e invarianti

- Nuovo modulo `_shared/admin-draft-metafields.ts`: elenco richiesto derivato dalla bozza, mapping solo dal registro, valori ricontrollati contro registro corrente, definizioni paginated PRODUCT e accesso pubblico, esatta compatibilità di tipo; liste tramite codec reversibile esistente, FAQ JSON, mesi scalari. Mancanza mapping/definizione/accesso/tipo/valore/conferma → errore esplicito prima della claim/create. Nessuna conversione di riferimenti metaobject o HTML a rich_text Shopify implicita.
- `_shared/admin-operational-core.ts`: campo additivo nel payload `botanicalConfirmedKeys`, validato; niente schema/RPC nuove. Ogni valore botanico presente deve avere conferma individuale prima della nuova preview/save/create. Questa conferma non certifica automaticamente la verità scientifica.
- Salvataggio nuova bozza: dopo l’RPC esistente rilegge ciascun campo richiesto da `product_current_values`, sul Product ID restituito, confrontando testo/numeri/JSON senza dipendere dall’ordine delle proprietà. Riga assente, identità diversa o valore divergente → niente successo globale; retry mantiene la stessa richiesta. Restituisce `VERIFIED_ADMIN`, distinto da verifica Shopify. Nessun tentativo di correggere record già salvati e nessuna nuova RPC/migration.
- `_shared/admin-operational-service.ts`: stessa create DRAFT, stessi prezzi/varianti/inventario/immagini/categorie, ma include tutti i metafield autorizzati e richiesti. Prima di finalizzare mapping legge valori esatti, namespace/key/type/identità, tutte le pagine; mismatch → NEEDS_RECONCILIATION, no successo globale e no seconda create. Recovery passa dalla stessa verifica. Le operazioni storiche VERIFIED_DRAFT mantengono il ritorno idempotente precedente, senza reinterpretare o riscrivere record chiusi.
- Recovery dopo timeout non richiede un nuovo grant sync o nuove definizioni Storefront: confronta mapping e contenuti persistiti con i valori remoti, accettando per liste solo i tre encoding reversibili già ammessi. Restano obbligatori ruolo/capability drafts, proprietà dell’operazione, gate generale e approvazione specifica `recovery:{id}`; nessuna nuova create. **Recovery può finalizzare il mapping locale secondo il contratto preesistente: non è un’azione read-only complessiva e non è stata eseguita su record reali.** Il confronto di bozze esistenti si limita alle letture disponibili e al comparatore puro testato; non introduce un nuovo endpoint o un comando di modifica.
- Frontend solo `NewProductPage`, `newDraft`, `DraftSummaryView`: checkbox fonte/valore per ogni campo botanico; modifica del campo annulla soltanto la sua conferma; riepilogo locale distinto; dopo create riuscita elenco dei metafield effettivamente riletti con valore e tipo. Nessuna deduzione automatica di mesi. Existing field sync/ProductReview restano invariati, già confrontano e verificano.
- Nessun cambio `publish_catalog_product`, canali, mercati, grant o pubblicazione implicita. Niente modifiche ai prodotti esistenti, incluso il test Yucca; futura sync selettiva richiede autorizzazione nuova e revisione dei dati di prova.
- Regola strutturale registrata in `AGENTS.md`; nessuna modifica homepage/catalogo pubblico/PDP/navbar/checkout/pagamenti/clienti/cookie.

Impronte finali del candidato: `_shared/admin-draft-metafields.ts` SHA-256 `444a4c443eded95a1c26a6820a87ae1e3577e81eb35b51b8c95e25911658e860`; `admin-operational-service.ts` SHA-256 `c48036591335763907ad26c1822e1b0f8818af0f4a8e4ce476c6aae01b16beea`. Nessuna impronta è una revisione runtime distribuita.

### Test del candidato

- **128 test Node PASS / 0 FAIL**, inclusi 18 nuovi test del piano e dei confronti: testo, FAQ JSON, tipi lista, mapping assente, tipo incompatibile, accesso non pubblico, fonte non confermata, conferme duplicate/spurie, campi mancanti non dedotti, paginazione/read-back assente, confronto read-only senza nuova conferma, preservazione valori, JSON ordinato diversamente, salvataggio locale incompleto e identità/valore divergenti.
- **34 test Deno PASS / 0 FAIL**, inclusi 6 nuovi test del servizio: invio effettivo botanica/mese/lista e rilettura, metafield remoto mancante, userError Shopify, scope Editor mancante, recovery dopo timeout senza nuovo grant sync/definizioni e rilettura dei campi locali dopo save. Verificata una sola create simulata, zero completamenti su errore, nessuna seconda create. Il test recovery mantiene l’approvazione specifica; nessuna regola di autorizzazione è stata allentata per farlo passare. Un'aspettativa storica IN_FLIGHT è aggiornata a NEEDS_RECONCILIATION, coerente con la gestione esplicita del mismatch.
- `deno check product-admin-api/index.ts` PASS; dipendenze locali risolte. Build automatica preview `build OK`; non lanciata manualmente.
- Browser anteprima con sessione tecnica: scheda esistente leggibile, nuova scheda aperta; giugno selezionato e conferma attiva; aggiunta luglio → conferma annullata, screenshot dei due stati verificati. Zero errori pagina. Rete blocca le azioni non autorizzate al test, inclusa una lettura opzionale `list_catalog_media`; nessun save/create/AI/pubblicazione eseguito. La persistenza è provata soltanto nel servizio con provider/DB simulati, non in produzione.

### Gate residui / collaudo Marco

**GO preparazione candidato; NO-GO deploy/Publish ora.** Richiedere autorizzazioni separate solo dopo preflight aggiornato. Restano non completamente esposti dagli endpoint esistenti: Online Store e lista completa publication IDs, disponibilità mercato contestualizzata, access.storefront delle 26 definizioni e valori effettivi dei metafield privi di mapping Admin. Non introdurre/deployare un endpoint diagnostico come alternativa implicita.

Marco: usare stesso SKU/GID, distinguere fonte botanica da selezione manuale, verificare confronto e messaggi; nuova bozza resta DRAFT; nessuna quantità/foto inventata per pubblicare. Test reale dopo futuro rilascio, solo con mandato specifico per salvataggio/sync. **PENDING_CLIENT_ACCEPTANCE**, SAL **57,75%** invariata. Nessun deploy `product-admin-api` o `product-admin-ai`, Publish, SQL, opt-in, scrittura commerciale o pagamento in questa fase.

### Diff e recovery proposti, non eseguiti

Diff candidato da `1a65c60` a `e612b24`: tre file di interfaccia `src/adminv2`, tre moduli `_shared` (uno nuovo), due test e `AGENTS.md`; entrypoint API, storefront pubblico, flusso login/cookie/checkout, configurazione funzioni e schema DB non modificati. Documentazione aggiornata separatamente. **Prima di qualsiasi rilascio: mostrare questo diff/test, completare i limiti live sopra e richiedere autorizzazione esplicita.**

Recovery se un futuro rilascio viene autorizzato: ripristino separato dei soli file/artefatti Admin da `1a65c60`, previo mandato; backend tramite nuovo deploy mirato della sola API con il relativo grafo shared approvato, frontend tramite versione precedente pubblicata. Non ripristinare DB o dati Shopify e non reinterpretare bozza/stati già completati; nessun rollback automatico autorizzato. Al momento non occorre recovery perché niente è stato distribuito.

## Verbale iniziale audit — prima del piano approvato e delle successive letture live

## Audit bloccante metafield e pubblicazione — 26/11/2026, richiesta 18:01 UTC

**PENDING_CLIENT_ACCEPTANCE · NO-GO correzione distribuita / Publish.** Revisione sorgente `c80e562707893872b196cd30a28bede2da96b2fd`, checkout inizialmente pulito. In questo intervento: sole letture DB/log/sorgenti e test con mock; aggiornamenti esclusivamente documentali. Nessuna correzione applicativa, mutation Shopify, AI, migration, cambio grant/flag/secret, deploy o Publish.

### Identità certa, non ricerca per titolo

| Identificatore | Evidenza letta nel DB Admin |
|---|---|
| Product ID Admin | `84ea38ca-7620-41e7-bb67-ce430c1da546` |
| SKU famiglia e unica variante | `OG-NP-146C68CF06-A15884233C` |
| Product GID | `gid://shopify/Product/16026906460500` |
| Variant GID | `gid://shopify/ProductVariant/58634556997972` |
| Operazione | `ba386a9a-90b5-4207-a4f8-92dda4ee2002` |
| Creazione locale / verifica invio | 17:33:32 / 17:42:47 UTC, 26/11/2026 |
| Stato operazione | `VERIFIED_DRAFT`; approvazione `create_shopify_draft` COMPLETE |
| Handle previsto dal contratto | `og-draft-ba386a9a-90b5-4207-a4f8-92dda4ee2002` — non riletto live |

Una sola operazione e un link canonico individuati per questa identità. Nessuna riga legacy `product_sync_csv_products` per lo SKU: NON è da sola un errore, perché `getExactShopifyProductMapping` usa anche il link canonico verificato. L'assenza di duplicati sull'intero Shopify non è attestabile senza lettura remota.

**Blocco della verifica remota:** `shopify.get_product(16026906460500)` rifiutato: online access token expired or missing. Nessun retry Shopify o trasporto alternativo, nessuna credenziale letta. Le definizioni del negozio NON sono sostituite dal registro Admin o dallo script di configurazione. Log recenti `product-admin-api`: solo boot/shutdown; nessun userError recuperabile e nessuna prova che errori storici non esistano.

### Esito richiesto: distinguere confermato / riferito / non verificato

| Voce | Esito |
|---|---|
| METAFIELD_SYNC | **FAIL come sincronizzazione completa della scheda**: omissione nel codice e nessuna attestazione per campo; valori Shopify attuali non riletti |
| PRODUCT_STATUS | **ACTIVE riferito dal collaudo**; DB attesta solo DRAFT al momento dell'invio, non lo stato Shopify attuale |
| ONLINE_STORE_PUBLICATION | **NO riferito dal collaudo**; publication IDs attuali non riletti |
| STOREFRONT_VISIBILITY | **NOT_TESTED** sul prodotto esatto; risultato pubblico “yucca” non identificato |
| INVENTORY | **Non confermato live**; 0 riferito, prezzo 14,60 EUR presente nel payload, nessuna quantità salvata nella bozza |
| IMMAGINI / MERCATI | Bozza inviata `images=[]`; foto attuali e disponibilità nei mercati non verificate |
| DEPLOY_REQUIRED | **Sì**, per la futura correzione API validata; nessun deploy in questo intervento |
| FRONTEND_PUBLISH_REQUIRED | **Sì**, se si implementano confronto e messaggi Admin proposti; nessun cambio al frontend pubblico |

### Cause confermate nel codice e nel DB

1. **Metafield della nuova bozza omessi.** `validatedFields` salva botanica/FAQ/caratteristiche nel DB, ma `handleOperational/create_shopify_draft` costruisce `productSet.metafields` con solo `online_garden.creation_id` e l'eventuale `custom.short_intro`. Non include `draft.botanical`, quindi non prova né tenta la sincronizzazione dei relativi metafield. Il controllo `verifiedLinks` verifica testi/core/SEO/tag/foto/varianti/categorie, non questi metafield. I moduli operativi e di field sync sono identici alla base di deploy documentata `f32989d`; il diff commerce successivo riguarda le sole letture asset candidate, non questo invio. Revisione binaria corrente comunque non scaricabile.
2. **VERIFIED_DRAFT non significa scheda interamente sincronizzata.** La RPC live `admin_complete_draft` aggiorna link, stato operazione ed evento; non aggiorna verifiche dei singoli campi. Lettura corrente: 13 campi, tutti `approved`, `manual`, versione 1, `publish_blocked=true`; zero `shopify_verified_at`, zero errori registrati. Non ci sono comandi `sync_field` o cronologia di campo per questa identità. Questo dimostra assenza di attestazione per campo, non assenza di ogni dato Shopify.
3. **Pubblicazione distinta dalla sincronizzazione.** La creazione chiede esplicitamente DRAFT, non ACTIVE e non pubblica. Il journal letto registra solo la creazione; non consente di attribuire a qualcuno il successivo stato ACTIVE riferito. ACTIVE senza publication è uno stato possibile, non una prova di malfunzionamento dell'API di pubblicazione.
4. **Il workflow di pubblicazione esiste, ma il canale è Headless.** `CatalogActions` apre un'anteprima, richiede conferma esplicita; il server richiede capability e approvazione. `publish_catalog_product` può attivare il DRAFT, chiama `publishablePublish`, controlla userErrors e rilegge ACTIVE + Headless + Storefront. Usa solo `338862113108`: NON pubblica Online Store o Lovable e NON verifica tutti i mercati. Inoltre immagine READY, categoria, SEO e configurazione logistica sono prerequisiti; esaurito richiede conferma distinta. Questi controlli non vanno rimossi per far pubblicare il test.
5. **Tipi generici non interamente guidati dalle definizioni live.** Le liste editoriali leggono definizione Shopify e accettano `json`, `list.single_line_text_field`, `multi_line_text_field`; `short_intro` richiede tipo/accesso precisi e digest. Gli altri campi inferiscono il tipo dal registro o dal metafield esistente; i mesi forzano `single_line_text_field`. Una definizione diversa può produrre errore: incompatibilità concreta del negozio ancora NON attestata.
6. **Dati approvati non equivalgono a fatti verificati.** La RPC live salva tutti i campi come `manual/approved` alla conferma generale, senza evidenza botanica per campo. La nuova bozza parte con `botanical={}` e l'assistente propone extra solo caratteristiche/benefici/FAQ, non periodi. **Il cliente conferma alle 18:05 UTC la selezione manuale dei mesi: non attribuire i periodi all'AI.** La validità botanica e la fonte dei valori inseriti rimangono questioni distinte; nessun valore è stato corretto o cancellato.

### Regola e verifica dei percorsi Admin collegati

**Regola:** quando Marco richiede un campo, non può essere omesso senza avviso; salvataggio Admin, sincronizzazione Shopify, attivazione, pubblicazione e acquistabilità devono restare stati distinti. Sono stati letti i seguenti percorsi, non collaudati con una nuova sessione Marco:

| Percorso / codice letto | Rispetta la regola? |
|---|---|
| NewProductPage: salva locale, salva+crea, crea separata | Pubblicazione separata sì; l'invio usa la stessa create che omette botanica. Riepilogo non elenca gli esiti per campo |
| ProductOperations: crea e recupera | No duplicazione automatica; riepilogo dichiarato interno. Storico operazioni non equivale a esiti metafield |
| DraftSummaryView + readDraftSummary | Mostrano payload salvato, non valori remoti; non provano sync botanica |
| ProductDetailPage + FieldCard | Confronto e conferma per campo presenti; errore esplicito, comando sync distinto dal salvataggio |
| ProductReview: revisione multipla | Rilegge campo/identità/versione prima e dopo salvataggio; invoca sync verificata, si ferma a errore ed elenca solo riusciti. Non dichiara successo globale su fallimento parziale |
| DraftSheetAssistant + sheetEvidence + newDraft | Proposte restano in memoria fino ad applicazione/conferma; mesi inizialmente vuoti, extra limitati a caratteristiche/benefici/FAQ |
| handleOperational: preview/save/create/recover + verifiedLinks | Validazione locale presente; omissione dei metafield botanici e read-back incompleto nella create e recovery |
| product-admin-api/sync_field + approvazioni + field-sync | Mapping/review/gate/versione/identità/concorrenza verificati; userErrors/read-back presenti. Tipi generici da confrontare con definizioni live |
| RPC live admin_save_new_draft | Salva tutto come manual/approved/bloccato, non è conferma botanica per campo |
| RPC live admin_complete_draft | Verifica mapping/idempotenza; non aggiorna attestazioni dei singoli campi |
| RPC live admin_complete_product_field_sync | Registra valore verificato o errore, storico e idempotenza; rifiuta valori bloccati/versione divergente |
| CatalogActions + commerce/publication | Pubblicazione esplicita/capability/userErrors/read-back sì; canale verificato solo Headless, mercati e Online Store esclusi |
| useProduct (lettura pubblica) | Legge target dichiarati, non valori Admin; care_guide non è sinonimo del target pubblico come_prendersene_cura |

Job `product_publication_jobs` per questa identità: **0**, letto nel DB. Individuati anche strumenti separati legacy/import/batch (`shopify-admin-proxy`, `shopify-create-batch`, `shopify-publication-batch`, remediation/export): **non sono i percorsi del collaudo Admin V2 e non sono stati auditati integralmente o modificati qui**. Un audit/correzione di tali percorsi richiede estensione esplicita del perimetro; nessuna certificazione implicita.

### Periodi e affidabilità botanica

| Campo | Valore persistito | Supporto nel testo fornito |
|---|---|---|
| Fioritura | Febbraio, Maggio, Luglio, Ottobre | Testo: **giugno-luglio**. Luglio supportato; giugno mancante, altri mesi non supportati |
| Messa a dimora | Gennaio, Marzo, Giugno, Dicembre | Nessuna informazione nel testo |
| Raccolta | Febbraio, Giugno | Nessuna informazione nel testo |
| Potatura | Gennaio, Giugno, Luglio | Nessuna informazione nel testo |
| Difficoltà | Media | Non attestata nel testo |
| FAQ / benefici | Q “hola”, A “ffff” / “rree”, “gggg” | Dati di prova, non fatti botanici attendibili |
| Caratteristiche | Testo originale breve completo | Compatibile con estrazione deterministica; non prova generazione AI di questo campo |

Non correggere automaticamente il prodotto, non sincronizzare i valori non supportati e non dedurre mesi dai bisogni della pianta. Il reviewer deve confermare la fonte di ogni valore; assenza fonte → vuoto o da confermare. Per questo prodotto non ci sono suggerimenti persistenti in `product_ai_suggestions`: le proposte della nuova bozza possono essere effimere, quindi questo non dimostra assenza di una chiamata AI. **Origine UI dei mesi risolta dalla risposta del cliente: selezionati manualmente, non generati dall'AI.** Nessuna rimozione o modifica dei dati di prova effettuata.

### Mapping completo nel perimetro editoriale

**Tutte le celle “Shopify attuale/definizione/accesso” sono NON VERIFICATE per autenticazione scaduta.** Tipi sotto = contratto locale, NON definizioni effettive del negozio. Il grant editoriale con scope immagini/formati è attivo con `edit/sync/drafts/images/categories/prices/publish/ai`; non sono stati esposti dati personali o ampliati permessi. Il permesso effettivo resta vincolato a field key, gate, conferma e revisione; i 13 valori sono attualmente bloccati alla sincronizzazione per campo.

| Campo Admin | Target / tipo locale | Valore bozza | Lettura pubblico / note |
|---|---|---|---|
| description | core `descriptionHtml`, HTML sicuro | Presente, formattato | `useProduct` legge `description`; nessun `custom.long_description` necessario per questo contratto |
| short_description | custom.short_intro / multi_line_text_field | Assente | `shortIntro`; non è un valore ignorato se non richiesto |
| optimized_description | mapping storico descriptionHtml, target risolto NULL | Assente | Escluso intenzionalmente: un solo owner per descrizione estesa |
| short_intro | mapping storico custom.short_intro, target risolto NULL | Assente | Escluso intenzionalmente: usare short_description |
| key_features | custom.key_features / tipo live json, lista o multilinea | Testo originale in array | `keyFeatures`; OMESSO nella create |
| key_benefits | custom.key_benefits / tipo live json, lista o multilinea | rree, gggg | `keyBenefits`; OMESSO, dati di prova da escludere |
| special_bullets | custom.special_bullets / tipo live json, lista o multilinea | Assente | `specialBullets`; non ammesso dal contratto botanical della nuova bozza, esiste per field sync |
| faq | custom.faq_prodotto / json | hola / ffff | `faqItems`; OMESSO, dati di prova da escludere |
| titolo_sezione_faq | custom.titolo_sezione_faq / single_line_text_field | Assente | `faqTitle`; non nel contratto botanical della nuova bozza |
| nome_botanico | custom.nome_botanico / single_line_text_field | yucca rostrata | `botanicalName`; OMESSO |
| nome_comune | custom.nome_comune / single_line_text_field | Assente | `commonName` |
| periodo_di_fioritura | custom.periodo_di_fioritura / single_line_text_field | Febbraio, Maggio, Luglio, Ottobre | `floweringPeriod`; OMESSO e non coerente con fonte |
| periodo_di_messa_a_dimora | custom.periodo_di_messa_a_dimora / single_line_text_field | Gennaio, Marzo, Giugno, Dicembre | `plantingPeriod`; OMESSO, fonte mancante |
| periodo_di_raccolta | custom.periodo_di_raccolta / single_line_text_field | Febbraio, Giugno | `harvestPeriod`; OMESSO, fonte mancante |
| periodo_ottimale_di_potatura | custom.periodo_ottimale_di_potatura / single_line_text_field | Gennaio, Giugno, Luglio | `pruningPeriod`; OMESSO, fonte mancante |
| difficolta_di_coltivazione | custom.difficolta_di_coltivazione / single_line_text_field | Media | `cultivationDifficulty`; OMESSO, fonte mancante |
| care_info | custom.care_info / multi_line_text_field | Assente | `careInfo`; non nel contratto botanical nuova bozza |
| care_guide | custom.care_guide / multi_line_text_field | Assente | `useProduct` legge **come_prendersene_cura**, non care_guide; non duplicare/mappare implicitamente |
| come_prendersene_cura | custom.come_prendersene_cura / multi_line_text_field | Assente | `careGuide`; non nel contratto botanical nuova bozza |
| conosci_meglio_la_tua_pianta | custom.conosci_meglio_la_tua_pianta / multi_line_text_field | Assente | `plantKnowledge`; non nel contratto botanical nuova bozza |
| origini_e_habitat | custom.origini_e_habitat / multi_line_text_field | Assente | `originsHabitat` |
| promo_text | custom.promo_text / multi_line_text_field inferito | Assente | `promoText`; script storico prevede single_line, incompatibilità live da verificare |
| ibridatore / colore_fiore / colore_foglia | custom.[stessa key] / single_line_text_field | Assenti | `hybridizer` / `flowerColor` / `leafColor`; mantenere regole manual-only del registro |
| curiosita | custom.curiosita / multi_line_text_field | Assente | `curiosity` |
| titolo / SEO / tag | core title / SEO title-description / core tags | Presenti | Invio e rilettura previsti; zero attestazioni per campo nel DB |
| long_description / caratteristiche / attributi_prodotto | Nessuna definizione Admin con queste key nella lettura corrente | Assenti | `attributi_prodotto` letto come productAttributes; long_description/caratteristiche non target equivalenti impliciti |
| online_garden.creation_id | tecnico single_line_text_field | ID operazione | Unico metafield sempre inviato; mai assegnarlo a Editor come contenuto |

Gli altri campi del registro sono core/varianti/media/inventario/categorie/import/system, non ulteriori metafield editoriali configurati. Non sono oggetto di nuove scritture o ampliamento capability. Lo script `create-shopify-metafield-definitions.ts` contiene inoltre alias inglesi (botanical_name, flowering_period, faq_items, care_guide ecc.): è solo sorgente storico, NON prova che tali definizioni esistano o siano quelle del sito. L'audit definitivo dovrà paginare TUTTE le definizioni PRODUCT e confrontarle con il registro, senza creare definizioni o migrare valori.

### Piano minimo, non implementato

1. Ripristinare l'accesso di sola lettura Shopify tramite il percorso ufficiale oppure usare una sessione tecnica già autorizzata; leggere Product/Variant esatti, creazione tecnica, metafieldDefinitions paginati, tutti i valori, publication IDs, mercati/cataloghi, immagini/inventory e userErrors recuperabili. Nessuna nuova credenziale/ambiente o bypass. Confronto bozza/Shopify/Storefront con ID, tipo, accesso, origine e timestamp distinti.
2. `_shared/admin-operational-service.ts` (`validatedFields`, create, `verifiedLinks`): costruire l'elenco dei soli campi richiesti e autorizzati, ricavare mapping dal registro e tipo dalla definizione Shopify verificata, riusare serializzatori sicuri e supporto liste. Preflight completo prima di claim/create; campo non mappato, tipo incompatibile o fonte non confermata → esclusione esplicita approvata o blocco, mai silent success. Non cambiare prezzo/inventario/varianti, non ricreare la Yucca esistente.
3. `_shared/admin-v2-shopify-field-sync.ts` / `admin-v2-field-policy.ts`: riusare read/compare/write/read e errori userErrors, senza aggirare versioni/digest/permission; esiti per campo. Per creare DRAFT verificare anche ogni metafield richiesto dopo la create; se esito incerto mantenere riconciliazione senza retry create. Per il prodotto già esistente usare solo sincronizzazione selettiva approvata, non il percorso create.
4. Rendere esplicito lo stato per campo nel confronto Admin, senza trasformare VERIFIED_DRAFT in SYNCED. Prima decidere se basta la risposta/verifica live per i campi già scritti oppure serve persistenza delle attestazioni tramite RPC esistente; qualsiasi necessità di modifica schema/RPC richiede piano e autorizzazione distinta, non è implicita in questo audit.
5. `NewProductPage`, `DraftSummaryView`, `ProductOperations` e `FieldCard`: mostrare inclusi/esclusi/bloccati/errore/valore remoto e stato aggiornato; richiesta conferma botanica per campo/fonte senza dichiarare scientificamente validati valori manuali. Preservare il confronto/read-back esistente di `FieldCard` e `ProductReview`, senza riscriverli inutilmente. Nessuna modifica homepage/catalogo/PDP/navbar/carrello/checkout.
6. `_shared/admin-catalog-commerce.ts` e `CatalogActions`: conservare pubblicazione esplicita separata; distinguere Headless, Online Store, Lovable e mercati. Nessuna aggiunta automatica di canali. Per una futura pubblicazione autorizzata definire esattamente canali/capability e rileggere ciascun esito con Storefront contestualizzata; non pubblicare questa Yucca di test in questo intervento.

### Test e checklist Marco

- Eseguiti **110 Node PASS + 28 Deno PASS**, fixture/provider simulati: mapping autorizzati/non mappati, mesi canonici, tipi lista incompatibili, letture prima/dopo, drift, errori Shopify, SEO, permessi, bozza DRAFT, SKU duplicati/recovery, label stato/canale, lifecycle. Il primo avvio del file Deno descrizioni con Node falliva `Deno is not defined`; rieseguito correttamente, 3/3 PASS. Nessun FAIL applicativo residuo nei file selezionati. Build automatica ultima osservata `build OK`; non eseguita manualmente.
- Questi test esistenti **NON certificano sincronizzazione botanica completa della nuova bozza**, provenienza semantica dei mesi, pubblicazioni/mercati live o comportamento con sessione Marco. Aggiungere dopo approvazione regressioni concrete per ciascuna omissione, errore parziale e conferma botanica; test di scrittura solo mock.
- Test finale minimo: esistente e nuova DRAFT; testo e JSON/lista reali simulati; campo non mappato; tipo incompatibile; nessuna fonte botanica; Editor senza grant; ACTIVE senza publication; stock 0/non acquistabile; partial failures; read-back non corrispondente; retry incerto/no duplicati. Non far passare l'intera scheda se un campo richiesto fallisce.
- Marco: identificare stesso SKU/GID; confermare fonte per ogni periodo (gli assenti restano vuoti), eliminare i dati di prova SOLO con futura approvazione; rivedere confronto campo per campo, elenco esclusioni e stato Shopify; sync separata dalla pubblicazione; una futura operazione di scrittura richiede autorizzazione specifica. Foto e inventario non vanno inventati per superare il collaudo.

**Prossimo gate:** approvazione del piano/candidato, poi completamento delle letture remote e test. Deploy `product-admin-api` e Publish dei soli messaggi Admin sono gate successivi separati, non autorizzati ora. Nessun nuovo backend. SAL **57,75%** invariata; accettazione resta **PENDING_CLIENT_ACCEPTANCE**.

## Correzione definitiva AI editor — rilascio coordinato 26/11/2026

**Stato: PENDING_CLIENT_ACCEPTANCE.** Autorizzazione coordinata ricevuta alle 17:05 UTC. Commit applicativo `d25292501a0d65aff5f28a6820f487836683bb78`; base del candidato `c4eaf74`, integrazione intermedia `ada4861`. Solo backend Lovable Cloud esistente. Nessuna nuova funzione/funzionalità “Genera scheda completa con AI”.

### Regola e verifica dei percorsi
Una proposta deve rielaborare soltanto fatti verificati, non dichiarare riuscito un fallback, mostrare la formattazione corretta e rimanere separata dalla bozza fino alla conferma.
- Nuova scheda: `NewProductPage` → `DraftSheetAssistant` → `suggestDraftEditorial` → `generateDraftSheet` → `generateConfirmedProposal`: codice letto e regressioni PASS; nessun salvataggio automatico.
- Prodotto esistente: fonti confermate in `DraftSheetAssistant`, campo vuoto in `FieldCard` → `ConfirmedAiAssistant` → `suggestConfirmedField`: codice letto; entrambi mostrano avvisi di sezione e aggiornano l’editor alla nuova risposta, senza perdere il controllo manuale.
- Suggerimenti persistenti: `AiSuggestionCard` → `generate_ai_suggestion` → `service.generateAiSuggestion`: codice letto; percorso separato, senza fallback estrattivo, con versione/prenotazione e conferma. Non modificate proposte pregresse o record approvati.
- Formattazione: contratto `sections/text/factIndices`; Markdown limitato convertito in HTML dal renderer, poi sanitizer condiviso; `RichTextEditor`/`EditorialText` sanitizzano anche nel browser. Nessun HTML arbitrario accettato dal modello.
- Selezioni SEO/tag: `admin-draft-editorial` mantiene scelte con origine deterministica esplicita e grant per campo; non presentate come prosa AI. Nessuna nuova capability.
- RPC: `reserve_confirmed_ai_request`/`reserve_new_draft_editorial_v1` sono prenotazioni autorizzative, non generatori o fallback; codice chiamante letto, RPC non modificate né eseguite durante questi test. Nessun job background o altra Edge aggiunta a questo flusso.
- Bozza/Shopify: funzioni di approvazione e invio esistenti invariate; test sintetici coprono il comportamento, nessuna scrittura di produzione. Asset API candidate ancora NON distribuite.

### Correzioni
- Riutilizzato il candidato, senza doppio motore. Corretto anche il conflitto residuo tra prompt generico (valore testuale/niente Markdown) e schema editoriale: ora prompt dedicato con fatti indicizzati e formato coerente.
- Validator: sezioni invalide escluse con codici `UNSUPPORTED_FACT`, `INCOMPLETE_RESPONSE`, `FORMAT_ERROR`, `EXTRACTIVE_COPY`; sezioni valide conservate. Se nulla è utilizzabile, errore esplicito; mai sostituzione con originali. Numeri, negazioni, citazioni e guardie sui claim preservati/estesi.
- UI: avvisi visibili in entrambi gli assistenti; retry aggiornato realmente nell’editor, vecchi avvisi rimossi con la nuova risposta; applicazione e salvataggio restano separati.
- I controlli automatici NON certificano semanticamente ogni possibile proposizione: revisionare tutte le affermazioni contro i fatti è obbligatorio. Nessuna promessa generale di assenza di allucinazioni.

### Test eseguiti
- Node Admin: **272 PASS / 0 FAIL**; ultime regressioni handler+AI dopo il marker **64 PASS / 0 FAIL** (riesecuzione, non da sommare).
- Deno descrizioni/asset/servizio: **27 PASS / 0 FAIL**; `deno check product-admin-ai/index.ts` PASS; compilazione automatica preview `build OK`.
- Input originali conservati nei test: Yucca rostrata (11 righe/2696 caratteri), arbusto Agavaceae (1 riga). Provider SIMULATO: prosa rielaborata fedele alle fixture, sezioni/lista/grassetto, risposta incompleta, misure/claim inventati, HTML arbitrario, copie e provider indisponibile. Nessuna chiamata AI a consumo in questo intervento.
- Browser Admin autenticato prima del rilascio: dashboard/new-product read-only; AI simulata, avvisi/anteprima/scarto PASS, bozza vuota, zero scritture.
- Retry/mobile: fixture Editor sintetica isolata con tutti i provider remoti bloccati, Python Playwright PASS; nuova risposta visibile, avvisi precedenti rimossi, scarto, zero mutazioni/errori pagina. Il runner JS Playwright non parte perché il browser della sua versione non è installato: usato il browser Python già disponibile, senza installazioni. Test JS di regressione mantenuto nel progetto.
- Nuova sessione Admin post-autorizzazione non disponibile: il percorso nativo `--self` rifiuta l’associazione corrente; nessun account creato/impersonato. Non confondere i test sintetici con un nuovo collaudo autenticato di produzione.

### Perimetro e distribuzione
- Diff frontend rispetto a `f32989d`: soltanto `ConfirmedAiAssistant.tsx`, `DraftSheetAssistant.tsx`, `ProductAssetEditor.tsx`, `adminApi.ts`. Asset editor: avviso `canModify=false` e disabilitazione dei comandi non eseguibili, nessuna modifica API/grant. Zero file homepage/catalogo/PDP/navbar/checkout/pagamenti/clienti/cookie.
- Deploy nativo effettuato: **solo `product-admin-ai`** dal commit verificato. `product-admin-api` NON ridistribuita.
- 27 moduli locali, zero import mancanti/sibling. Entrypoint SHA-256 `29f1dcd692938ed64274f80a965c84340f9c6130f9bed3d76b2ccaa21ece6618`.
- Impronta locale del manifest ordinato path/hash: `46cdf26c88a269bb4d153d092fec10bfc500fc165252cd44ac6f3107e93f1866`. Impronta nativa sorgenti+impostazioni inviate: `c9e642028af58be0d4be92e49521e3dac8825af4a99656ed25acff2071193dab`; formati distinti, non da confrontare come hash equivalenti.
- Runtime: OPTIONS **200**, POST senza autenticazione **401**, entrambi con `X-Admin-AI-Version=verified-editorial-20261126-r2`. Versione applicativa attestata; ID/revisione/download runtime non esposti, checksum runtime binario non attestabile.
- Publish frontend **completato e verificato sul dominio pubblico** dopo una sola richiesta: nuovo asset `index-kMoBF-yp.js`, precedente `index-DwN3gNmM.js`. ID deploy frontend non esposto dallo strumento. `/admin`, homepage e `/products` HTTP 200; login Admin visibile, zero errori pagina. Il frontend LIVE è stato inoltre collaudato con provider/identità interamente sintetici e isolati: anteprima formattata, avviso sezione esclusa, Riprova con nuova risposta, avvisi eliminati, bozza vuota e Scarta PASS, zero mutazioni. Questo NON attesta una nuova sessione Admin reale o una generazione Gemini reale post-rilascio.
- Nessun cambio DB/RLS/ACL/ruoli/opt-in/secret/flag/Shopify/inventario/prezzi/ordini/DNS.

### Recovery e retest Marco
Recovery tecnico: precedente sorgente AI recuperabile dal commit `f32989def1fc4d3593744d60c83836a46f247329`, entrypoint SHA `a8a6621d21babc237a926d3689e98d6bc75b489c70c165a9a2d4243fdcacd625`; solo nuovo deploy mirato previa decisione, nessun rollback/restore eseguito. Frontend precedente identificato dall’asset `index-DwN3gNmM.js`; non è una prova di restore eseguito.

Marco deve ripetere sui due testi ORIGINALI: login, conferma fatti, Completa scheda con AI, confronto di ogni sezione, formattazione senza Markdown letterale, avvisi e Riprova in caso parziale/errore, Scarta/applica alla sola bozza dopo conferma. Nessuna sincronizzazione Shopify o pubblicazione prodotto. Generazione REALE con Gemini e sessione Marco restano da collaudare; bug immagini/formati e relativo API fix non dichiarati risolti da questo deploy. SAL invariata **57,75%**.

---

### Esito finale richiesto
| Voce | Esito |
|---|---|
| Root cause risolta | YES nel codice distribuito: niente prompt estrattivo/fallback descrizione |
| Validator corretto | YES, sezioni escluse e avvisi, errore se nessuna proposta utilizzabile |
| Prompt corretto | YES, fatti indicizzati e schema coerente |
| Rendering corretto | YES, preview e bundle LIVE testati con risposte sintetiche |
| Test | Node 272 PASS; Deno 27 PASS; handler finale 64 PASS; browser Python PASS |
| Deploy effettuato | YES, solo product-admin-ai |
| Publish frontend necessario | YES, autorizzato/completato; asset index-kMoBF-yp.js |
| Versione runtime verificata | verified-editorial-20261126-r2 tramite header live; hash binario non recuperabile |
| Retest Marco | REQUIRED; login reale e generazioni Gemini sui due input originali non eseguiti dopo il rilascio |

**GO rilascio tecnico completato; NO-GO accettazione definitiva prima del collaudo Marco.** Nessuna scrittura prodotti/Shopify o modifica catalogo pubblico. Le prove AI reali precedenti restano nel verbale storico e NON sono presentate come PASS del nuovo candidato.

## Verbale storico del candidato precedente (non sostituisce lo stato corrente)

## Aggiornamento collaudo reale — correzioni candidate, NON distribuite

**Stato: PENDING_CLIENT_ACCEPTANCE · NO-GO rilascio delle correzioni.** Base controllata `1423a9c0241925e6d1115a4cac47f53c6a493255`. Nessuna migration, cambio grant/ruoli/flag/secret, scrittura prodotti, deploy Edge o Publish in questo intervento.

### BUG IMMAGINI / BUG FORMATI
- Flusso: `ProductAssetEditor` → `product-admin-api` → `handleCatalogCommerce` → `mappedCatalogProduct` → `readAssetState`; nessuna dipendenza da `shopify-admin-proxy`.
- Difetti confermati nel sorgente: lettura subordinata a snapshot commerciale comprensivo di inventario e delivery profile; limiti 30 media/50 varianti bloccavano anche la consultazione. Non è dimostrato che questo sia l'errore del Pero in produzione: log recenti senza stack; account Admin disponibile restituisce **403 FORBIDDEN** su entrambe le letture perché non ha i field keys nominali asset. Nessuna impersonificazione o espansione permessi.
- Candidato: query minimale paginata per le sole letture, preceduta dagli stessi grant `sync + images/prices + product_gallery/product_formats` e verifica SKU/famiglia. Snapshot e limiti di scrittura invariati. Famiglie oltre i limiti di modifica restano consultabili con avviso esplicito di gestione staff Shopify. Errori lettura sanitizzati.
- File: `_shared/admin-catalog-assets.ts`, `_shared/admin-catalog-commerce.ts`, `src/adminv2/components/ProductAssetEditor.tsx`.
- Test: Editor sintetico legge immagini e varianti attraverso handler commerce reale; capability mancanti negate prima del provider; 101 varianti paginate; zero mutation Shopify; snapshot scrittura incompleto negato.
- **Verifica live Editor equivalente: BLOCCATA**, serve una sessione autorizzata con scope asset o evidenza di rete del collaudo. Non dichiarare bug produzione risolto.

### BUG AI
- Root cause accertata: `generateConfirmedProposal` imponeva copia integrale/riordino, mentre `callDraftSheetProvider` generava esclusivamente indici. Validator sostituiva output non estrattivo con originali e restituiva successo. Log runtime confermano due `fallback / INVALID_MODEL_PROPOSAL` alle 16:26 e 16:31 UTC.
- Candidato: descrizione generativa separata dalle selezioni SEO/tag, contratto `sections + factIndices + missingInformation`; controlli su copertura, copia, numeri, negazioni e alcuni claim; conversione Markdown limitato (grassetto/liste) in HTML sanitizzato per richtext; output senza markup per plain text. Nessun fallback descrizione presentato come AI riuscita. Errori provider espliciti con status upstream e messaggio sicuro; modello `google/gemini-3-flash-preview`, endpoint, timer e cap 2.000 token preservati. Selezioni aggiuntive restano autorizzate individualmente e usano una seconda chiamata, solo quando prenotate.
- File: `_shared/admin-ai-description.ts` (nuovo), `_shared/admin-ai-confirmed.ts`, `product-admin-ai/{provider,draft-sheet,index}.ts`, `src/adminv2/{lib/adminApi,components/DraftSheetAssistant}.tsx/ts`.
- Prove reali autorizzate: **2 richieste gateway HTTP 200**, nessuna scrittura DB/Shopify. Primo input breve sintetico Yucca: testo realmente rielaborato, 773 caratteri HTML, due sezioni, ma osservati giudizi/utilizzi non attestati; rafforzati prompt e guardie. Secondo input esteso sintetico: rifiutato dal validator per proprietà/utilizzo non confermato, nessuna copia sostitutiva. **Factual fidelity reale NON PASS**: nessun deploy. Non ripetute richieste fallite. Test originale esteso Yucca non disponibile, richiesto upload.
- I controlli sintattici/citazioni non sono una prova semantica completa: revisione umana indispensabile; nessuna garanzia generale di assenza di invenzioni.
- Browser autenticato Admin, provider mock: sezioni/grassetto renderizzati; confronto originale; applicazione alla sola bozza in memoria dopo conferma; zero salvataggi e zero scritture backend. Persistenza bozza intenzionalmente non provata.

### Test e rilascio
- Suite Node Admin: **265 PASS / 0 FAIL** prima dell'ultima fixture estesa aggiunta; suite mirata AI con fixture estesa rieseguita separatamente.
- Suite Deno asset/servizio/lifecycle: **31 PASS / 0 FAIL**; capability negative aggiuntive rieseguite.
- `deno check` delle due entrypoint: PASS. Build preview automatica: ultimo esito osservato **build OK**. Nessun cambiamento storefront/checkout/clienti/cookie.
- Deploy effettuati: **NESSUNO**. Funzioni coinvolte nel candidato: solo `product-admin-api` e `product-admin-ai`; non distribuire altre funzioni.
- Publish frontend necessario per messaggi/guardie aggiornati: **SÌ, solo dopo verifiche bloccanti**, non effettuato.
- Recovery: nessun rollback necessario; produzione invariata. Recupero codice candidato/precedente tramite Git.

### Retest Marco / gate
1. Raccogliere status/codice delle due chiamate asset sul Pero con scope Editor legittimo; distinguere connessione/scope Shopify da mapping/limiti.
2. Verificare lettura completa immagini e varianti senza mutation e senza aumentare capability.
3. Confrontare descrizioni AI breve ed esatta Yucca estesa con tutti i fatti; nessun claim non supportato, errori espliciti.
4. Solo dopo PASS, distribuire esclusivamente funzioni coinvolte; controlli OPTIONS/no-auth/Editor read-only e verifica output AI.
5. Publish mirato necessario, quindi anteprima/confronto/accetta-scarta/salvataggio di sola bozza autorizzata; sincronizzazione Shopify sempre separata e NON eseguita durante i test.
6. Nuovo test reale di Marco obbligatorio prima di accettazione. SAL ufficiale invariata **57,75%**.

Le sezioni sotto conservano il verbale del rilascio precedente, non attestano il candidato di correzione.

## Tecnico
- Funzione: `product-admin-api` (solo questa), backend Lovable Cloud esistente.
- Commit sorgente: `f32989d` (branch `codex/rilascio-admin-v2-isolato-20261124`), deploy 26/11/2026 ~15:45 UTC.
- Impronta inviata: `04c778bd3ab3c9a847fe971c68e0e2770397b947258c426fae3e1a34d39692cd`; entrypoint `523f825e…ae0d`.
- Marker runtime verificato: `backendVersion=admin-editor-20261125`, `supportsDistinctDescriptions=true`.
- Revisione runtime non esposta da Lovable Cloud: l'attestazione si basa su marker + impronta inviata.
- Descrizione breve: `short_description` → metafield `custom.short_intro`, nessuna ulteriore migration necessaria.
- DB invariato dal deploy: 2 grant attivi, 3 opt-in AI, 24 migration registrate.

## Verifiche
| Controllo | Esito |
|---|---|
| Token non valido | 401 PASS |
| Admin `get_admin_context` | 200, ruoli admin/editor, capability preservate PASS |
| Ricerca SKU `OG_111899` | 200 PASS |
| Sessione Editor Marco | NON TESTATO (richiede il suo dispositivo) |
| Customer Shopify su API Admin | coperto da test automatici; non testato live |
| Test Node Admin/permessi | 311 PASS (3 file Deno-only) |
| Test Deno (lifecycle, descrizioni, servizio) | 28 PASS |
| Typecheck funzione | PASS |
| Scritture Shopify | NESSUNA |

## Rollback
Nuovo deploy mirato di `product-admin-api` dal commit precedente `5a37f71` (o r2 `ca9050d`).

## Checklist collaudo Marco (dispositivo personale)
1. Login Editor su onlinegarden.it/admin.
2. Dashboard e catalogo visibili.
3. Ricerca di un prodotto/SKU esistente.
4. Apertura editor.
5. Modifica su bozza autorizzata `TEST-OG-AI-001` soltanto.
6. Descrizione breve separata dalla descrizione estesa.
7. AI su vantaggi/caratteristiche/punti speciali disponibile.
8. Azioni negate: cancellazione definitiva prodotto non disponibile.
9. Logout e nuovo login.
Nessuna pubblicazione/sincronizzazione Shopify senza conferma specifica.

## Per il cliente
Il pannello Admin è aggiornato. Marco può fare il collaudo dal suo dispositivo. Nessun prodotto, prezzo o ordine è stato modificato.

## Residui
- Collaudo Marco — responsabile Marco — priorità alta.
- Test restore snapshot — responsabile tecnico — media.
- Deploy `product-admin-ai` aggiornato se richiesto — tecnico — media.

## Attestazione rollback PR #78 — 2026-11-26 22:09 UTC

Verifica di gestione e recuperabilità, **separata dai test funzionali**. Nessun deploy, Publish, rollback, merge, modifica applicativa, database, JWT, secret, grant o Shopify. Stato **PENDING_CLIENT_ACCEPTANCE**, SAL **57,75%**.

Mandato: candidato dichiarato `05c5f336ff485748d5bd7026bffd955570d47834`. Checkout osservato pulito `1335c5bf07e1b802df5444a151e6ce169555529a`; il candidato non è disponibile come oggetto nel repository locale. Nessun fetch o cambio branch; la review PR #78 è riferita dal committente, non verificata in questa attività.

| Campo | Risultato attestato |
|---|---|
| ACTIVE_EDGE_REVISION | **NON RECUPERATA**: identificativo funzione, revisione/versione e timestamp della revisione attiva non restituiti dagli strumenti di gestione accessibili. |
| ACTIVE_SOURCE_ATTESTATION | **NON ATTESTATA**: nessun pacchetto attivo scaricato; nessun confronto runtime/Git possibile. `f32989d` resta il precedente rilascio documentato, non prova dell'attuale runtime. |
| JWT_CONFIGURATION_VERIFIED | **NO** per la configurazione effettiva del gateway. Il config Git corrente non contiene un override `product-admin-api`; il default della piattaforma e i precedenti 401 non attestano il valore live. Nessun cambio JWT. |
| ROLLBACK_PACKAGE_AVAILABLE | **PARZIALE**: sorgente Git precedente e tutte le dipendenze relative recuperabili; pacchetto runtime completo non disponibile né ridistribuibilità operativa provata. |
| ROLLBACK_SCOPE | Solo `product-admin-api`, includendo le sue dipendenze nel pacchetto della funzione; nessun deploy di `product-admin-ai`, ripristino DB o frontend previsto. Questa possibilità è documentata, non eseguita o collaudata qui. |
| ROLLBACK_READINESS | **BLOCKED**. Non dichiarare READY_FOR_RELEASE_AUTHORIZATION. |

### EVIDENCE — prove effettivamente ottenute

1. `project_info` e `lovable supabase info --environment production --json` confermano il backend di produzione Lovable Cloud gestito, collegato all'istanza originale del progetto; binding degli strumenti e configurazione client coerenti. Nessun nuovo ambiente. Identificativi infrastrutturali e chiavi omessi dal verbale.
2. Lettura autorizzata `supabase functions list` fallita prima di restituire metadata: **Access token not provided**. Non effettuati login, creazione/richiesta credenziali, download o tentativi alternativi. Il CLI Lovable espone info/log/diagnostica, non un comando di esportazione della revisione attiva.
3. Commit precedente effettivamente recuperabile: `f32989def1fc4d3593744d60c83836a46f247329`. SHA-256 entrypoint sui byte Git: `523f825e1aa3c7c6cc0786d1230073901d18e28451e5aa95efed4e4f4fd7ae0d`, coerente con l'impronta abbreviata del verbale precedente.
4. Traversata statica ricorsiva degli import/export relativi, incluse dichiarazioni multilinea e import letterali: **40 file**, di cui **29 shared**, **zero dipendenze relative mancanti**. Import remoto dichiarato: `https://esm.sh/@supabase/supabase-js@2.49.8`. Non scaricata né attestata la chiusura transitiva CDN; non dichiarare pacchetto autosufficiente o riproducibilità binaria.
5. Impronta del manifest Git: `5b8fe5f8f4fe04fdbf959f9d489f744c78b2b7bfaf046b2284bf03e38c936480`. Metodo riproducibile: SHA-256 dei byte di ciascun file ottenuto con `git show <commit>:<path>`; ordinamento lessicografico dei path; concatenazione UTF-8 di righe `path<TAB>sha256<LF>`; SHA-256 della concatenazione. È un'impronta nuova del grafo sorgente, **non** l'hash del bundle inviato storicamente `04c778bd…39692cd`, né del pacchetto attivo.
6. Diff **Git locale HEAD / Git f32989d**, non runtime: quattro dipendenze del grafo precedente differiscono: `_shared/admin-catalog-assets.ts`, `_shared/admin-catalog-commerce.ts`, `_shared/admin-operational-core.ts`, `_shared/admin-operational-service.ts`. L'entrypoint non differisce. Nessuna differenza runtime/Git attestabile senza il pacchetto attivo; usare shared correnti insieme all'entrypoint storico non ricostruirebbe il grafo storico completo.
7. Schema dello strumento nativo di deploy: accetta una lista di nomi funzione; può essere limitata alla sola API. Strumento **non invocato**. Le dipendenze shared sono pacchettizzate per funzione; non occorre ridistribuire altre funzioni soltanto perché condividono i file.

### Fonti ufficiali e limiti della UI

- [Edge functions](https://docs.lovable.dev/features/edge-functions): UI con stato, last-updated, deployment count, endpoint, log e **View code**. Nessuna UI di gestione è stata aperta in questa verifica; non sono quindi stati letti tali valori. La documentazione non attesta che View code sia un export completo della specifica revisione runtime, né documenta revisione ID, valore JWT live o download del bundle attivo con tutte le dipendenze.
- [Git sync](https://docs.lovable.dev/integrations/git-sync-overview#backend-files-in-your-commits): sorgente sincronizzato non equivale a deploy avvenuto.
- [Version history](https://docs.lovable.dev/features/projects/history): restore di una versione non è rollback selettivo di una funzione; può ridistribuire le funzioni cambiate. Non usarlo per questo mandato.

### REMAINING_BLOCKERS / attestazione richiesta al gestore

Il gestore deve fornire per la sola `product-admin-api` dell'istanza Cloud originale: identificativo funzione, revisione/versione attiva e timestamp UTC; valore gateway `verify_jwt` effettivo; export o snapshot immutabile del pacchetto di quella revisione con shared e dipendenze, inventario e checksum; confronto con il grafo `f32989d`; conferma di conservazione e procedura supportata di ridistribuzione selettiva, preservando JWT/config/secrets e senza ripristino globale o modifiche ad AI, DB e storefront.

Un'attestazione gestionale della corrispondenza tra revisione attiva e pacchetto conservato può sostituire l'accesso diretto al bundle, purché riporti identità della revisione, inventario/checksum e disponibilità di ripristino selettivo. Marker applicativi, test funzionali e sola presenza del commit Git non sostituiscono queste prove. Qualunque deploy o rollback reale richiede successiva autorizzazione esplicita.
