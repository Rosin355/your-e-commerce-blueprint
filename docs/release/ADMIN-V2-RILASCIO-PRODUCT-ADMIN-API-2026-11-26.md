# Rilascio product-admin-api — 26/11/2026

## Gate finale PR #78 · 26 novembre 2026

| Decisione | Esito | Evidenza |
|---|---|---|
| PR_REVIEW | **PASS** | HEAD `05c5f336ff485748d5bd7026bffd955570d47834`, base isolata `1335c5bf07e1b802df5444a151e6ce169555529a`. GitHub indica Draft, MERGEABLE e quattro controlli SUCCESS. |
| ROLLBACK_READINESS | **BLOCKED in produzione** | Il pacchetto dal sorgente del precedente rilascio è stato ricostruito, estratto e verificato. Manca il collegamento verificabile con il deployment attivo e la sua configurazione. |
| AUTHENTICATED_UAT | **BLOCKED per l’esecuzione completa** | Checklist pronta. L’editor Lovable è sulla base. La bozza tecnica identificata copre la riapertura, ma il suo contenuto e lo scope dell’autore impediscono due prove decisive. |
| FINAL_RECOMMENDATION | **NO-GO al rilascio** | Accettazione **PENDING_CLIENT_ACCEPTANCE**. SAL ufficiale **57,75%**. |

### Perimetro e dipendenze

Il diff della PR contiene **22 file**: 7 backend, 4 frontend Admin, 2 frontend PDP, 8 di test/fixture e questo verbale. La fixture PostgreSQL prepara le due definizioni storiche per il test di `0021`. Nessuna migrazione applicativa, modifica di grant, dipendenza npm, modifica al checkout, alla pubblicazione o alla configurazione commerciale. I certificati conservati sullo SHA coprono 703 test Node, 141 Deno, 39 Chromium e le prove indipendenti. In questo gate sono stati riletti il diff e i risultati esistenti. [Diff certificato](https://github.com/Rosin355/your-e-commerce-blueprint/compare/1335c5bf07e1b802df5444a151e6ce169555529a...05c5f336ff485748d5bd7026bffd955570d47834) · [CI GitHub](https://github.com/Rosin355/your-e-commerce-blueprint/pull/78/checks)

L’artefatto Edge del candidato richiede **41 moduli locali** raggiungibili da `supabase/functions/product-admin-api/index.ts`. Rispetto al sorgente dell’ultimo deploy documentato da `f32989d`, il grafo contiene **nove file aggiunti o cambiati**. Sette sono quelli backend della PR. I due ulteriori sono `admin-catalog-assets.ts` e `admin-catalog-commerce.ts`, già sulla base, per la lettura paginata di foto e formati. Includere nel controllo autenticato anche queste letture. La distribuzione riguarda la sola `product-admin-api`. Il pacchetto frontend comprende anche le modifiche PDP per i tipi storici. Sul DB esistente sono stati verificati in sola lettura il journal e la presenza delle quattro RPC di salvataggio, claim della bozza, completamento e claim dell’approvazione. Le verifiche di presenza non esercitano le RPC.

### Rollback della sola Edge

- **Base ricostruita:** `f32989def1fc4d3593744d60c83836a46f247329`, deploy storico delle 15:45 UTC circa. Il genitore della PR e il precedente rilascio di `product-admin-ai` sono riferimenti diversi.
- **Prova locale eseguita:** estratti da Git i **40 moduli transitivi**, inclusi i file vendorizzati importati. Archivio privato `backups/pr78-rollback/product-admin-api-f32989d-source.tar.gz` con configurazione di repository, lock e `SHA256SUMS`. Dopo estrazione in una directory vuota: tutti i digest corretti e `deno check --no-config --no-npm --frozen --lock=ci/deno-ci.lock supabase/functions/product-admin-api/index.ts` riuscito con Deno 2.9.5. SHA-256 archivio `6bdc5657e0e22dc503cadcddd4e256a95f46a0609c5575333eb3ac257ae814a3`. Manifesto dei soli 40 moduli `32216cd8bd49d99268b215f0ea3a7d2cc7fa53dce8581ac47e63b23e703ab527`. Entrypoint `523f825e1aa3c7c6cc0786d1230073901d18e28451e5aa95efed4e4f4fd7ae0d`.
- **Limite della ricevuta storica:** il messaggio di deploy registra `04c778bd…92cd`. Ripetendo l’hash dell’elenco ordinato dei **57 file TypeScript** Git della funzione e di `_shared`, esclusi i test, si ottiene `a9743cd28904fc016c9e4957d1578373d535264a12c277e1aafcbdafb6107ba8`. L’entrypoint coincide col riferimento storico. Il digest complessivo della ricevuta resta da riconciliare con lo stesso formato e inventario. L’archivio locale e il manifesto transitivo hanno ciascuno un proprio formato.
- **Gestione live:** per il progetto esistente `iekwvvihjwghosqdxrdi`, sia `list_edge_functions` sia `get_edge_function(product-admin-api)` hanno negato la lettura di gestione. Il file Git `supabase/config.toml` non contiene una sezione specifica `[functions.product-admin-api]`. Il marker applicativo `admin-editor-20261125` è condiviso tra revisioni.
- **Condizione che sblocca il rollback:** il gestore autorizzato legge versione/ID e impostazione JWT effettiva, scarica la singola funzione e le dipendenze, rilegge il medesimo ID e verifica l’archivio estratto. Per un progetto gestito da Lovable Cloud è equivalente l’attestazione del gestore che colleghi esplicitamente versione attiva, configurazione e digest verificabile di un pacchetto disponibile. Se il pacchetto differisce da quello Git, conservare e verificare quello effettivo. Un ripristino globale Lovable può ridistribuire più Edge. [Download ufficiale Supabase](https://supabase.com/docs/guides/functions/quickstart-dashboard#download-edge-functions) · [Funzioni singole e ripristino in Lovable](https://docs.lovable.dev/features/edge-functions)

### DEPLOY_ORDER e arresto in caso di errore

1. Registrare il pacchetto di rollback live e la versione frontend pubblicata con i suoi chunk. La home pubblica serve `/assets/index-kMoBF-yp.js`, SHA-256 `5f56ebc6dba0610359a64dfa936fc4744419e796d45687728d113fd6dcd4c05d` al gate. Il singolo asset è un controllo di identità. Al ripristino serve la versione frontend completa.
2. Dopo un GO al merge, integrare sul solo ramo isolato. Verificare la provenienza del commit risultante e l’identità del suo tree applicativo con il candidato. In questa lettura Lovable indica `1335c5b`, con zero draft Lovable aperti. Controllare anche che la sola sincronizzazione dei sorgenti non avvii un deploy Edge anticipato.
3. Con GO Edge, distribuire la sola `product-admin-api` dal candidato e registrare ID e configurazione effettivi. Tenere il frontend pubblico corrente. Provare in sola lettura la compatibilità con il vecchio client, il rifiuto senza sessione, `get_admin_context` con l’Editor e letture di scheda, galleria e formati. Fermare il rilascio al primo esito inatteso.
4. Eseguire la checklist seguente in anteprima sul candidato con Marco. Separare il GO per qualsiasi salvataggio interno dal GO per l’unica eventuale DRAFT Shopify. Una sessione di anteprima può utilizzare il backend di produzione.
5. Solo dopo gli esiti concordati con Marco e il GO Publish, pubblicare il frontend. Verificare sul dominio reale asset, login staff/cliente, home, catalogo, PDP, carrello e apertura checkout senza ordine. In caso di regressione frontend ripristinare prima la versione frontend completa. Per un errore della sola Edge ripristinare il pacchetto attivo attestato. Conservare journal, operazioni e GID e riconciliare gli invii in corso attraverso l’operazione originale.

### Checklist autenticata per Marco

- [ ] Annotare in privato data, operatore, dispositivo, revisione preview/Edge, ID interno, operation ID e impronta della bozza. Marco accede personalmente. Confrontare l’autore dell’operazione con l’utente della sessione e rileggere ruolo, flag effettivi e scope per i campi selezionati.
- [ ] Cercare la sola bozza tecnica designata `TEST-OG-AI-001`. La lettura SQL di questo gate rileva **un prodotto, una LOCAL_DRAFT, zero link Shopify interni, un formato, una foto, quattro tag e zero campi botanici nel payload salvato**. Annotare breve/estesa, SKU, formato, prezzo, foto e ALT e confrontarli alla riapertura. L’assenza di link interni richiede una verifica separata delle corrispondenze SKU su Shopify prima di qualsiasi creazione.
- [ ] **Idoneità alla prova:** per l’autore della bozza risultano attivi ruolo Editor e capability `drafts/edit/sync`. Fra le 16 chiavi editoriali controllate manca `tags`; il candidato ne verifica lo scope quando il payload contiene tag. Il percorso di creazione remota è quindi bloccato per questa combinazione. L’identificazione personale dell’autore con Marco richiede la sua sessione. Il gate non richiede di cambiare il grant o il payload.
- [ ] **Conferma storica:** selezionare una LOCAL_DRAFT tecnica espressamente autorizzata, dell’operatore, con botanica già registrata e conferme mancanti. Per lo stesso autore, fra gli SKU `TEST-%`, il conteggio attuale di bozze che soddisfano queste condizioni è zero. Sulla bozza idonea controllare mesi non consecutivi, FAQ e liste contro le fonti, confermare e riaprire. Prova riuscita solo con lo stesso operation ID e una ricevuta coerente con l’hash. Mantenere questa voce aperta fino a disponibilità del caso adatto.
- [ ] Con GO al salvataggio interno sulla bozza designata, verificare persistenza e ricevuta dei campi consentiti. Se la rilettura dà un errore reale usare il recupero per l’operazione originale. Le gare e gli errori forzati restano coperti dalle simulazioni già certificate.
- [ ] **Solo con GO Shopify per uno specifico target idoneo:** rileggere definizioni PRODUCT, namespace/key/type, accesso Storefront e unicità SKU. Eseguire una sola creazione DRAFT, registrare GID e risultati per ogni campo richiesto, verificare stato e canali; qualsiasi esito incompleto richiede riconciliazione. Confrontare SKU/formati, prezzi, inventario e immagini con la baseline. Verificare le liste su una PDP autorizzata già leggibile o in anteprima adeguata. Il prodotto tecnico resta fuori vendita.
- [ ] Registrare l’esito personale di Marco per ogni caso: superato, fallito o bloccato con motivazione. La firma di accettazione e l’aggiornamento SAL richiedono nuove evidenze. Questo gate ha utilizzato letture di gestione, SQL SELECT e asset pubblico. Nessun merge, deploy, Publish, cambio di permessi o scrittura di produzione.

## Correzione dei blocker della review indipendente · 26 novembre 2026

**GO alla revisione della Draft PR. NO-GO alla distribuzione. PENDING_CLIENT_ACCEPTANCE · SAL 57,75%.** Il ramo `codex/fix-metafield-recovery` deriva direttamente da `e612b24` con il primo commit applicativo `6656f86`. Il candidato applicativo è `e0513357df07b3777fb42078806499b80cb2095c`. Il ramo di lavoro incorpora i soli documenti già presenti sulla base Lovable `1335c5b`. La review storica di `41a89ca` è riportata sotto. Il suo ramo conserva la stessa revisione.

### Dieci fallimenti riprodotti prima della correzione

| N. | Controllo | Origine rispetto a `66f2599` | Nuovo candidato |
|---|---|---|---|
| 1 | Recupero dopo commit locale e rilettura fallita | Il genitore già rifiutava la chiave in REVIEW_REQUIRED. La rilettura dei campi aggiunta in `e612b24` rende riproducibile il blocco dopo un commit riuscito | PASS. Prepare e dispatch accettano la stessa identità e lo stesso payload. Il recupero rilegge la stessa operazione anche dopo la scadenza. Un solo salvataggio |
| 2 | Rilettura tardiva dopo un recovery riuscito | Riprodotto sul genitore | PASS. Una sola create. Stato finale VERIFIED_DRAFT anche dopo il ritorno dell’errore |
| 3 | FAQ con proprietà JSON riordinate | Riprodotto sul genitore | PASS. Ordine delle proprietà irrilevante, ordine delle domande e valori preservati |
| 4–5 | PDP `key_features`, tipi `json` e `list.single_line_text_field` | Entrambi riprodotti sul genitore | 2 PASS. Voci distinte anche nel componente PDP montato in Chromium |
| 6–7 | PDP `key_benefits`, stessi due tipi | Entrambi riprodotti sul genitore | 2 PASS. Ordine preservato e voci già visibili nelle altre sezioni escluse secondo il contratto esistente |
| 8 | CR o LF nel valore destinato a un metafield monoriga | Riprodotto sul genitore | PASS. Rifiuto prima della mutation |
| 9 | Mapping PRODUCT dopo il passaggio del registro a variante | Riprodotto sul genitore | PASS. Controllati registro e definizioni PRODUCT paginate, con verifica del proprietario restituito |
| 10 | Chromium, descrizione breve/estesa, salvataggio e riapertura | Riprodotto sul genitore. La risposta sintetica dichiarava una sorgente AI superata | PASS con fixture conforme al contratto esistente. Nessuna generazione AI reale |

### Comportamento verificato

- Il journal associa la ricevuta ad autore, azione e hash della richiesta. Il recupero del salvataggio usa la chiave UUID originale. Il controllo integrato attraversa preparazione, claim, commit, rilettura fallita e due accessi successivi alla stessa ricevuta. Una seconda bozza Shopify non viene creata.
- Le transizioni di errore richiedono la stessa operazione, `IN_FLIGHT` e lo stesso hash del payload. Prima di claim e completamento il servizio rilegge versione e stato dopo l’I/O esterno. Le RPC esistenti serializzano claim e completamento sulla stessa riga. Le prove controllate coprono invii simultanei, recuperi concorrenti, errore tardivo e versione superata. Il payload salvato è immutabile nei percorsi Admin supportati.
- Il salvataggio e l’anteprima Editor verificano `edit` sui campi editoriali compilati. La prima creazione DRAFT richiede `drafts`, proprietà dell’operazione, approvazione e `sync` per i campi richiesti. Per i metafield si applica anche l’interruttore di sincronizzazione. I controlli su SKU, importi, varianti, galleria e pubblicazione conservano i percorsi esistenti.
- Per una LOCAL_DRAFT storica, l’autore può confermare sul prodotto riaperto i valori botanici già salvati. Una ricevuta separata lega conferma, ID operazione e hash. La creazione remota richiede ancora un comando dedicato. Un VERIFIED_DRAFT storico attesta creazione e collegamento. Gli esiti metafield richiedono una rilettura distinta e datata.
- La verifica raccoglie un esito per ogni campo. Un valore mancante o differente, un mapping incompatibile, una lettura incompleta e un rifiuto Shopify hanno esiti distinti. Anche nel recupero un mapping bloccato lascia verificare gli altri campi leggibili. Qualsiasi esito incompleto impedisce il completamento. Gli esiti vengono restituiti all’Admin e registrati nel journal delle approvazioni del flusso ordinario.

### Test isolati e limiti di evidenza

| Gruppo | PASS | FAIL | Portata |
|---|---:|---:|---|
| Node ordinari | 703 | 0 | Runner del repository con blocco di rete |
| Deno ordinari | 141 | 0 | Dipendenze bloccate, nessun permesso di rete a runtime |
| Chromium | 39 | 0 | Browser con servizi simulati e traffico esterno bloccato. Inclusi PDP, due dimensioni, bozza storica, mesi, errore/recupero e separazione della pubblicazione |
| Contratto Node indipendente | 11 | 0 | Stesse asserzioni della review su un nuovo percorso sorgente. Otto erano rosse su `e612b24` |
| Race Deno indipendente | 1 | 0 | Stesso interleaving e asserzioni. Fixture positiva adeguata a `sync` per titolo e descrizione e al relativo flag |
| Suite Deno del servizio con controllo tipi | 33 | 0 | Sottoinsieme dei 141. Risolti entrambi gli errori TS2345 della review |
| PostgreSQL sintetico | 2 suite | 0 | PostgreSQL 16.15 locale via socket privato. Concorrenza, mapping, RPC, ACL e rollback delle fixture |

Typecheck frontend, controllo Deno con lock congelato, build Vite e lint del perimetro modificato superati. Il testrunner PostgreSQL storico falliva con `P0002` nella migrazione `0021` perché la fixture mancava di `short_description` e `short_intro`. Il test ora prepara entrambe le righe e verifica il mapping. Nessuna migrazione o ACL applicativa è cambiata. La build segnala ancora la classe Tailwind ambigua e la dimensione di alcuni chunk.

### Rilascio, rollback e retest di Marco

1. **Prima di un GO operativo**, identificare su Lovable Cloud la revisione effettivamente attiva di `product-admin-api`, il relativo grafo shared ripristinabile e la versione frontend pubblicata. L’asset `index-kMoBF-yp.js` è il riferimento del verbale del 26 novembre. Verificare l’identità attuale dei due artefatti prima di qualsiasi intervento.
2. **Rollback se il candidato verrà distribuito**, su autorizzazione specifica. Ripristinare separatamente la revisione verificata della sola Edge e la versione frontend identificata. Conservare bozze, mapping e journal. Per ogni operazione incompleta partire dall’ID originale con il recupero in lettura. Evitare una seconda create e qualsiasi aggiornamento automatico delle vecchie VERIFIED_DRAFT.
3. **Retest di Marco**, con bozza tecnica identificata e account personale. Riaprire la stessa LOCAL_DRAFT, controllare nome botanico, mesi non consecutivi, FAQ e liste, confermare i valori e verificare l’ID dopo la riapertura. Verificare il comportamento con un campo fuori dal mandato corrente.
4. **Solo se autorizzata la creazione DRAFT**, confrontare ID interno, operation ID e GID. Rileggere i risultati campo per campo, la resa delle liste sulla PDP autorizzata e lo stato fuori vendita. Verificare che prezzi, quantità, formati e foto corrispondano alla bozza concordata. Registrare esito personale di Marco e qualsiasi divergenza prima di aggiornare l’accettazione o la SAL.

Il collaudo sintetico non attesta lo stato attuale dei prodotti o dei grant di produzione. Il recupero locale richiede una riga effettivamente salvata sulla stessa richiesta. Il recupero remoto resta aperto se Shopify non restituisce un’identità univoca. Nessun deploy, Publish, merge su main, modifica di grant, scrittura Shopify o DB di produzione in questa attività.

## Review indipendente del candidato e612b24

**Decisione del 26 novembre 2026 · NO-GO al rilascio.** Il confronto diretto con `66f2599` riguarda due moduli Edge, i rispettivi due file di test e una riga di `AGENTS.md`. La prima parte della correzione e le tre modifiche all’interfaccia erano già nel genitore. Le due impronte SHA-256 riportate sotto coincidono con i sorgenti del candidato. Il verbale da aggiornare si trova nel successivo commit documentale `1335c5b`. L’accettazione di Marco resta **PENDING_CLIENT_ACCEPTANCE**, SAL **57,75%**. [Diff diretto](https://github.com/Rosin355/your-e-commerce-blueprint/compare/66f2599...e612b24).

| Controllo | Esito | Evidenza determinante |
|---|---|---|
| REVIEW | FAIL | Errori riproducibili su recupero, confronto e visualizzazione |
| SECURITY | FAIL | Controlli personali di modifica e interruttore di sincronizzazione applicati in modo diverso nei percorsi descritti sotto |
| FIELD_MAPPING | FAIL | Tutti gli 11 target correnti coincidono. Il controllo immediatamente prima dell’invio accetta un campo che il registro ha nel frattempo riservato alle varianti |
| SHOPIFY_COMPATIBILITY | FAIL | FAQ JSON equivalenti possono fallire la rilettura. Due tipi lista ammessi dal piano hanno una resa errata sulla PDP |
| IDEMPOTENCY | FAIL | Una sola creazione remota nei test. Recupero locale bloccato e possibile regressione dello stato terminale |
| RELEASE_RECOMMENDATION | NO-GO | Correggere i casi sotto e ripetere i test mirati prima di richiedere deploy o Publish |

### Verifica del negozio e dei target

Dalla connessione Shopify Admin in sola lettura, la query su `metafieldDefinitions(ownerType: PRODUCT)` ha restituito 26 definizioni, tutte `PUBLIC_READ`, in un’unica pagina con `hasNextPage=false`. Le 24 definizioni `custom` riportano un elenco di validazioni vuoto. Le due `shopify.*` sono riferimenti tassonomici esclusi dalla nuova bozza. Il solo accesso Storefront alla definizione lascia separata la pubblicazione del prodotto.

| Campi della nuova bozza | Target Shopify verificato |
|---|---|
| Nome botanico, nome comune, difficoltà, quattro periodi | Stessa chiave in `custom`, tipo `single_line_text_field`. I mesi vengono normalizzati in ordine di calendario |
| `short_description` | `custom.short_intro`, tipo `multi_line_text_field` |
| `faq` | `custom.faq_prodotto`, tipo `json` |
| `key_features`, `key_benefits` | Stessa chiave in `custom`, entrambe `multi_line_text_field` nella lettura attuale |

Una seconda query sull’identità esatta della Yucca di collaudo ha restituito il prodotto `16026906460500` in stato `ACTIVE`. La lista completa dei metafield visibili alla connessione contiene il marcatore `online_garden.creation_id` e i due tag SEO `global`. I nove valori botanici, FAQ e liste attesi dal precedente collaudo sono ancora assenti da quella lettura. Questi risultati descrivono la produzione alla data della review. Il candidato è stato provato soltanto in isolamento. [Contratto Shopify delle definizioni](https://shopify.dev/docs/api/admin-graphql/2026-01/objects/MetafieldDefinition).

### Difetti che condizionano il rilascio

1. **Approvazione e recupero del salvataggio locale.** Dopo il commit di `admin_save_new_draft`, un errore di rilettura marca l’approvazione `REVIEW_REQUIRED`. Per `save_new_product` la stessa chiave viene rifiutata già alla preparazione dell’approvazione. Il pulsante «Recupera salvataggio con la stessa richiesta» rimane quindi inutilizzabile proprio quando la bozza può già esistere. Serve la rilettura della stessa operazione, legata ad autore e contenuto, senza ripetere il salvataggio. [Salvataggio](https://github.com/Rosin355/your-e-commerce-blueprint/blob/e612b24/supabase/functions/_shared/admin-operational-service.ts#L582) · [Stati ammessi](https://github.com/Rosin355/your-e-commerce-blueprint/blob/e612b24/supabase/functions/_shared/admin-catalog-policy.ts#L140).
2. **Due tentativi possono contraddirsi sullo stato finale.** In simulazione la recovery completa il mapping. Un errore tardivo della prima rilettura aggiorna la riga per il solo ID e riporta `VERIFIED_DRAFT` a `NEEDS_RECONCILIATION`. È stata osservata una sola create. La transizione di errore deve essere condizionata allo stato ancora aperto e deve preservare mapping e ricevuta già completati. [Gestione del mismatch](https://github.com/Rosin355/your-e-commerce-blueprint/blob/e612b24/supabase/functions/_shared/admin-operational-service.ts#L785).
3. **Permessi e protezioni.** La creazione remota dell’Editor verifica `drafts`, proprietà della bozza, approvazione specifica e `sync` per ciascun metafield richiesto. Nel salvataggio locale il controllo personale `edit` per campo copre la descrizione breve e le due liste. Nome botanico, periodi, difficoltà e FAQ passano dal solo registro dopo il controllo `drafts`. Inoltre il nuovo invio di metafield segue il flag di creazione DRAFT anche quando l’interruttore della sincronizzazione per campo è spento. Il percorso legge le modifiche successive tramite `updated_at`; il blocco di sync e lo stato di revisione delle singole righe vengono verificati da `sync_field`, non dalla create. Chiarire e applicare la regola specifica per la prima creazione, mantenendo i grant personali. Nessun indizio di pubblicazione automatica o di modifica ai grant di Marco. [Scope del salvataggio](https://github.com/Rosin355/your-e-commerce-blueprint/blob/e612b24/supabase/functions/_shared/admin-operational-service.ts#L525) · [Controlli del field sync](https://github.com/Rosin355/your-e-commerce-blueprint/blob/e612b24/supabase/functions/product-admin-api/index.ts#L453).
4. **Compatibilità sul percorso completo.** Se un campo passa a `applies_to=variant` dopo il salvataggio, il pianificatore lo ammette ancora sul PRODUCT. Un testo con ritorno a capo supera il preflight per un tipo monoriga. La rilettura remota confronta le FAQ come stringhe e rifiuta oggetti JSON equivalenti con proprietà in ordine diverso. Per le liste `json` e `list.single_line_text_field`, due voci di `key_features` diventano un’unica riga JSON sulla PDP, mentre `key_benefits` scompare. Entrambe le liste hanno dato esito corretto col tipo multilinea attualmente presente nel negozio. Allineare i tipi accettati alla resa effettiva e mantenere l’ordine delle voci nel confronto strutturato. [Piano e rilettura](https://github.com/Rosin355/your-e-commerce-blueprint/blob/e612b24/supabase/functions/_shared/admin-draft-metafields.ts#L79) · [Lettore della PDP](https://github.com/Rosin355/your-e-commerce-blueprint/blob/e612b24/src/components/storefront/pdpMetafields.ts#L32) · [Tipi Shopify](https://shopify.dev/docs/apps/build/metafields/list-of-data-types).
5. **Errori parziali e bozze precedenti.** La paginazione e l’identità del prodotto vengono controllate. Al primo mismatch il comparatore interrompe la risposta e perde l’elenco dei campi già verificati e di quelli ancora da leggere. Un errore Shopify nella create restituisce una diagnosi generica. Le vecchie `LOCAL_DRAFT` con botanica e senza `botanicalConfirmedKeys` vengono bloccate correttamente, ma la scheda riaperta offre solo l’invio del payload immutabile. Per il collaudo serve un modo esplicito di confermare i valori sulla stessa bozza. Un `VERIFIED_DRAFT` storico continua ad attestare creazione e mapping. La risposta immediata può contenere i dettagli per campo, mentre la riapertura della scheda mostra il riepilogo locale e lo storico dell’operazione. [Conferme](https://github.com/Rosin355/your-e-commerce-blueprint/blob/e612b24/supabase/functions/_shared/admin-draft-metafields.ts#L39) · [Riapertura](https://github.com/Rosin355/your-e-commerce-blueprint/blob/e612b24/src/adminv2/components/ProductOperations.tsx#L47).

### Test indipendenti

| Gruppo sul candidato | PASS | FAIL | Portata |
|---|---:|---:|---|
| Node del repository | 208 | 0 | Dodici suite mirate, rete disabilitata |
| Deno del repository | 40 | 0 | Quattro suite a runtime con `--no-check`, DB e Shopify simulati |
| Chromium del repository | 4 | 1 | Creazione DRAFT e sync singola simulata. Nel test breve/estesa il modello simulato viene rifiutato prima del salvataggio |
| Prove Node indipendenti | 3 | 8 | Undici target correnti e due liste multilinea superati. Falliscono quattro rese storiche, FAQ equivalente, testo monoriga, cambio di ambito e recupero della stessa richiesta |
| Prova Deno indipendente | 0 | 1 | Rilettura tardiva dopo un completamento concorrente |
| Prova Chromium indipendente | 1 | 0 | Selezione di Novembre e Febbraio, aggiunta di Maggio, conferma revocata e anteprima bloccata. Dopo nuova conferma i tre mesi si rileggono sulla stessa bozza interna simulata |

**Totale sul candidato: 256 PASS, 10 FAIL.** `npm run typecheck`, build Vite e `deno check` dell’entrypoint Edge sono riusciti. Il controllo tipi della suite del servizio con Deno 2.9.5 fallisce prima dell’esecuzione con due `TS2345` alle righe 665 e 675: due callback rendono obbligatorio un argomento opzionale. Il conteggio runtime e quello del compilatore sono separati. Le 128 prove Node e 34 Deno del verbale originario appartengono alla precedente selezione e non entrano nel totale di questa review.

Sul genitore `66f2599` si riproducono lo stesso timeout Chromium prima di «Applica Descrizione estesa» e uno dei due errori Deno di tipo. L’altro errore riguarda il nuovo test di recovery del candidato. Questi controlli sul genitore sono esclusi dal totale. Per il nuovo collaudo servono anche casi con grant Editor parziale in salvataggio, bozza storica priva di conferme e ricevuta mista con un campo corretto e uno mancante.

Il payload della nuova create mantiene `status: DRAFT`, prezzi e opzioni espliciti, riferimenti foto già pronti e politica inventario preesistente. Il diff aggiunge solo i metafield all’input Shopify. Il recupero esegue letture Shopify e può finalizzare il mapping locale. Le prove hanno usato simulazioni locali e query Shopify in sola lettura. [Contratto Shopify di productSet](https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/productSet).

## Evidenze della preparazione del candidato, precedenti alla review indipendente

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
| METAFIELD_SYNC | **FAIL produzione** per i nove valori richiesti. La selezione iniziale di test con mock è passata. La review indipendente sopra registra i casi falliti sul candidato |
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

Namespace `custom` salvo le ultime due righe. I valori indicati come vuoti provengono dalla lettura remota di `get_product` Admin. L’endpoint usato in questa prima verifica esponeva solo i tipi. La successiva query Shopify Admin della review indipendente ha confermato `access.storefront=PUBLIC_READ` per tutte le 26 definizioni.

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

### Test della preparazione originaria

- **128 test Node PASS / 0 FAIL**, inclusi 18 nuovi test del piano e dei confronti: testo, FAQ JSON, tipi lista, mapping assente, tipo incompatibile, accesso non pubblico, fonte non confermata, conferme duplicate/spurie, campi mancanti non dedotti, paginazione/read-back assente, confronto read-only senza nuova conferma, preservazione valori, JSON ordinato diversamente, salvataggio locale incompleto e identità/valore divergenti.
- **34 test Deno PASS / 0 FAIL**, inclusi 6 nuovi test del servizio: invio effettivo botanica/mese/lista e rilettura, metafield remoto mancante, userError Shopify, scope Editor mancante, recovery dopo timeout senza nuovo grant sync/definizioni e rilettura dei campi locali dopo save. Verificata una sola create simulata, zero completamenti su errore, nessuna seconda create. Il test recovery mantiene l’approvazione specifica; nessuna regola di autorizzazione è stata allentata per farlo passare. Un'aspettativa storica IN_FLIGHT è aggiornata a NEEDS_RECONCILIATION, coerente con la gestione esplicita del mismatch.
- `deno check product-admin-api/index.ts` PASS; dipendenze locali risolte. Build automatica preview `build OK`; non lanciata manualmente.
- Browser anteprima con sessione tecnica: scheda esistente leggibile, nuova scheda aperta; giugno selezionato e conferma attiva; aggiunta luglio → conferma annullata, screenshot dei due stati verificati. Zero errori pagina. Rete blocca le azioni non autorizzate al test, inclusa una lettura opzionale `list_catalog_media`; nessun save/create/AI/pubblicazione eseguito. La persistenza è provata soltanto nel servizio con provider/DB simulati, non in produzione.

### Gate residui / collaudo Marco

**NO-GO deploy e Publish.** La review indipendente in apertura riporta i blocchi riprodotti e la nuova verifica di accesso Storefront. Le precedenti verifiche coprivano solo in parte i canali e la disponibilità per mercato. Una verifica della pubblicazione richiede una lettura specifica per il canale e il prodotto.

Marco: usare stesso SKU/GID, distinguere fonte botanica da selezione manuale, verificare confronto e messaggi; nuova bozza resta DRAFT; nessuna quantità/foto inventata per pubblicare. Test reale dopo futuro rilascio, solo con mandato specifico per salvataggio/sync. **PENDING_CLIENT_ACCEPTANCE**, SAL **57,75%** invariata. Nessun deploy `product-admin-api` o `product-admin-ai`, Publish, SQL, opt-in, scrittura commerciale o pagamento in questa fase.

### Diff e recovery proposti, non eseguiti

Il diff cumulativo da `1a65c60` a `e612b24` comprende tre file di interfaccia `src/adminv2`, tre moduli `_shared` (uno nuovo), due file di test, `AGENTS.md` e la rinomina del piano Lovable a contenuto identico. Il diff diretto con `66f2599` comprende solo i cinque file indicati in apertura. Il rilascio richiede la chiusura dei difetti della review e autorizzazione esplicita.

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
