# Step 1 — editor prodotti: implementazione e limiti

## Versione in esercizio e ripristino · 20 novembre 2026

Il merge applicativo è `1fd8e7bc15b0c38f6dcaa1a6d17ade3506f0f245`. Lovable ha distribuito `product-admin-api` con i moduli condivisi del riepilogo. Il frontend pubblicato legge i dati della creazione e mostra a parte i valori editoriali correnti e lo stato di vendita verificabile. Le proposte AI usano la funzione `product-admin-ai` già in esercizio. Nessuna nuova migrazione. La verifica autenticata post-pubblicazione attesta il comportamento integrato. Lovable non fornisce il confronto binario con il codice Edge in esecuzione né lo SHA del bundle servito. [Verbale live](COLLAUDO-MARCO-STEP1C.md#verifica-live-dopo-publish-frontend--20-novembre-2026)

**Prove del rilascio.** Typecheck, build, 526 test Node, 107 Deno, 14 scenari Chromium e controlli database superati. Lint del perimetro senza errori. Il lint globale conserva i 42 errori e 11 avvisi rilevati anche sulla base. La chiusura documentale riutilizza gli esiti della PR #57. [CI applicazione e PostgreSQL 17](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/44716451641) · [CI browser](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/44716451721)

**Ripristino se necessario.** Il responsabile sospende l’uso interessato e identifica nella cronologia Lovable la revisione frontend immediatamente precedente a questa pubblicazione. Dopo autorizzazione ripristina quella revisione e prepara una PR di revert delle modifiche applicative della #57. Se occorre ripristinare anche l’API, mantenere la protezione server sui prodotti tecnici o sospendere la pubblicazione dei prodotti durante l’intervento. Verificare in sola lettura stato e dati della lavanda, quindi registrare revisione ed esito. Lo schema resta compatibile e non richiede ripristino dati.

**Cronologia.** Le note successive descrivono le verifiche alle rispettive date. Le istruzioni che indicano ancora da eseguire merge, deploy o pubblicazione sono superate.

---

## Architettura della correzione del 20 novembre 2026

| Fonte | Utilizzo nella scheda |
| --- | --- |
| Payload operativo registrato da `admin_save_new_draft` | Fotografia alla creazione. Il riepilogo espone i dati ammessi di prodotto, categorie, varianti/prezzi, riferimenti immagine/ALT e SEO. |
| `product_current_values` | Valori editoriali correnti versionati. `validatedFields` include solo i campi gestiti dal contratto. Una revisione successiva si legge nella scheda del campo. |
| Shopify Admin e Storefront | Stato specifico del prodotto mappato e visibilità/disponibilità nel canale effettivo. Una verifica assente o fallita produce uno stato esplicito di incertezza. |

`get_product_operations` recupera il payload per il ruolo operativo autorizzato o l’editor abilitato alle bozze. Costruisce lato server una proiezione con campi ammessi anche per gli oggetti annidati. I dati operativi grezzi rimangono sul server. I nomi delle categorie usano ID registrati e mapping verificati. Per i GID legacy senza nome locale, una sola query Shopify di lettura risolve gli ID esatti con handle canonico. Un errore del servizio preserva la selezione con «Categoria registrata · nome non verificato». Le immagini ammettono URL Shopify verificati dal proiettore. La stessa vista React rende anteprima e riepilogo. Per l’HTML usa la sanitizzazione editoriale e DOMPurify. [Risoluzione categorie](../../supabase/functions/_shared/admin-draft-summary.ts) · [Proiezione](../../supabase/functions/_shared/admin-draft-view.ts) · [Vista](../../src/adminv2/components/DraftSummaryView.tsx)

La query pending è circoscritta a operatore e prodotto, subordinata alla capability AI. Il risultato di generazione aggiorna la cache dopo aver fermato una lettura precedente. Sul refresh si legge la pending persistita. Il latch sul pulsante, l’assenza di retry automatico della mutazione e la prenotazione atomica già esistente proteggono dalle duplicazioni. L’accettazione verifica versione e idempotenza sul server. Un errore nel recupero mantiene accessibile l’editing manuale e permette di riprovare la sola lettura. [Hook](../../src/adminv2/hooks/useAdminData.ts) · [Scheda proposta](../../src/adminv2/components/AiSuggestionCard.tsx)

Per prodotti mappati con stato Shopify attivo o non in elenco, una lettura Storefront per ID restituisce presenza sul canale e `availableForSale`. Indisponibilità del servizio e prodotto assente dal canale hanno stati diversi. Il flag interno `products.is_active` descrive il record Admin. Il salvataggio interno e l’accettazione AI restano locali. Le operazioni commerciali conservano autorizzazione, controlli di versione, digest/idempotenza e conferma previsti dalle rispettive azioni. La pubblicazione è bloccata lato server per il record tecnico identificato, gli SKU di test e i titoli di prova riconosciuti, all’approvazione e prima della pubblicazione. [Stati](../../src/adminv2/lib/labels.ts) · [Operazioni commerciali](../../supabase/functions/_shared/admin-catalog-commerce.ts)

Per riprodurre il collaudo utilizzare Node 22.22.3, Deno 2.9.5, Chromium Playwright e PostgreSQL locale isolato, con le variabili previste dai due runner DB. Il test Drizzle include la 0018 canonica già presente sulla base e genera la 0019 solo nella directory temporanea del test. L’asserzione precedente era ferma alla generazione della 0018. Rimangono verificati ordine, hash, rollback ACL e replay. Questa PR non richiede migrazioni, backfill o modifiche ai grant. Il rilascio futuro comprende `product-admin-api` con i moduli condivisi e il frontend dello stesso commit. Il codice Edge `product-admin-ai` resta alla versione esistente. [Comandi ed esiti](COLLAUDO-MARCO-STEP1C.md) · [Gate e rollback](DELIVERY-PRIORITIES-2026-11-20.md)

---

## Cronologia precedente alla correzione del 20 novembre

## Percorso A — preparazione finale 18 novembre 2026

[Verifiche tecniche e limiti](ATTIVAZIONE-STEP1C.md): canoniche 0016/0017 e checksum conservati; futura 0018 nativa attiva tutte e tre le pending atomiche. Snapshot 0016/0017 assenti ammessi dal migratore e dal successivo generate --custom ufficiale; nessuno snapshot artificiale aggiunto. Prova isolata con vera generazione 0018, ordine/hash/history, rollback ACL e replay invariato PASS locale, ripetuta in CI PostgreSQL 17. Conflitto package.json con main risolto conservando tutte le dipendenze e riallineando lockfile. Nessuna migration o funzione distribuita; runtime Edge e hook esterni Lovable non attestati. Readiness di merge review subordinata alla CI finale, autorizzazioni live distinte.

## Migrazione unica Lovable — BLOCKED, 18 novembre 2026

La singola chiamata atomica dichiarata da Lovable non prova la corrispondenza hash/created_at/journal/replay con Drizzle. History live: id seriale, hash text, created_at bigint, nessuno stato/nome; ultima ancora 0015. [Contratto mancante e domanda unica pronta](ATTIVAZIONE-STEP1C.md). 0016/0017, copie, journal, checksum e test lasciati invariati; nessun pacchetto unico o test PostgreSQL 17 nuovo dichiarato completato. Non READY FOR MERGE REVIEW, nessuna funzione distribuita. Il controllo workflow GitHub non certifica gli hook esterni Lovable; nessun merge o altro passo live autorizzato.

## Step M — esito corrente 18 novembre 2026

[Review limitata 0016/0017 e scheda proprietario](REVIEW-M-0016-0017.md). Live ancora 0015, 16/16 hash/when corrispondenti, solo due pending; corpi RPC precedenti e RLS/vincoli confrontati senza differenze incompatibili nel perimetro. Copie/checksum SQL invariati. Nessun test generale ripetuto: patch ACL di 4bdf443 verificata offline su PostgreSQL 16/17 e CI verde.

**M-01 BLOCCATO live**, anche con la patch, perché la sessione query postgres non attesta il runner Drizzle; **M-02 BLOCCATO** perché metadati/bundle deployed non accessibili. La compatibilità del contratto versionato non certifica il backend attivo. Il metadato repository Lovable è oggi 96ac1b3, senza attribuirlo alla build pubblica o alle Edge. Supporto piattaforma deve fornire attestazioni o procedura equivalente verificabile; non eseguire migrazioni per ricavare il contesto.

Ordine sicuro condizionato: evidenze runner/backend/recupero → compatibilità → consenso M → unico batch Drizzle e postcheck readonly → B/G/F separati. Se incompatibile, STOP e percorso ponte approvato. D-BENEFITS completata/verificata il 17/11 secondo evidenza proprietario, nessun altro gate completato. NO-GO alla sola autorizzazione M; nessuna consegna Marco o scrittura live.

16 novembre 2026. Base main `e3a109e`, PR #22/#50/#51/#52 già integrate. Nessun secondo Admin, account, modifica al login o grant live. PR tecnica draft separata; nessun merge/deploy/Publish o uso di prodotti commerciali.

## Stato corretto

**Step 1A implementato e verificato offline. GO tecnico al solo preflight Step 1B in lettura, dopo CI verde. Editor NON consegnato a Marco:** provider/modello/credito, schema distribuito, grant e versione live rimangono da verificare. Nessun merge/deploy/Publish o richiesta a consumo. [Evidenze Step 1A](VERIFICHE-STEP1A.md).

## Modifiche

- RichTextEditor riusa Tiptap, StarterKit, ProseMirror: paragrafi, grassetto, corsivo, elenchi, link, undo/redo. Nessun HTML da digitare. Apertura/cancel non emettono una scrittura; il contenuto con strutture non supportate rimane originale e l'editor si blocca con spiegazione. È intenzionale: non flattenare immagini/tabelle/stili legacy per superare un test. Serve un caso approvato per eventuale conversione futura.
- DOMPurify protegge il browser. La policy condivisa `xss` è bundlata in `_shared/vendor/editorial-html.mjs` per Node/browser/Deno senza dipendenze runtime aggiuntive. `npm run build:editor-sanitizer` rigenera il file dalla sorgente e dal lockfile; licenze conservate. Le preview filtrano i contenuti; il server verifica il risultato del sanitizzatore e **rifiuta** HTML non sicuro/non canonico invece di salvarne silenziosamente una versione tagliata. Applicato alla validazione campo (anche accept AI) e alle nuove bozze.
- FieldCard: Modifica in alto, Modificabile/In modifica, Salva bozza, Aggiorna sul sito con conferma, Annulla; INTERNAL_ONLY diventa Bozza interna. Confronti sotto dettagli chiusi. Le due descrizioni che mappano descriptionHtml hanno un avviso esplicito: nessun sync automatico di entrambe.
- Le tre liste hanno controlli aggiungi/rimuovi/su/giù, ordine conservato, nomi cliente, whitelist e validazione server di stringhe non vuote (max 50 voci, 1000 caratteri ciascuna). Un grant sul campo resta indispensabile: la whitelist non concede permessi.
- Prima bozza dal valore Shopify: usa il valore letto, version=0, salvataggio esplicito, hash remoto riletto nel pacchetto di approvazione e ricontrollato all'esecuzione. Lettura/cancel non creano righe. Se il mapping o la lettura remota necessari mancano, stop. Le liste/descrizioni inizializzabili sono una allowlist finita; niente stock/prezzi/ID. Il canary mantiene i precedenti campi, senza abilitare automaticamente i tre nuovi elenchi.
- Formati nuovi prodotti: scelta singolo/multiplo, codice singolo condiviso con la famiglia, proposte deterministiche per nuovi SKU (da verificare), righe reali senza prezzi precompilati; virgola EUR accettata e normalizzata dal server; confronto opzionale con rimozione confermata. Unicità SKU e prezzi restano verificati nei percorsi esistenti. Nessuna modifica a varianti commerciali, stock o fiscalità.
- AI: infrastruttura esistente, grant caricato dal database, capability esplicite `ai` **e** `edit`, campo autorizzato/ai_allowed/strategia supportata, isolamento delle proposte per attore. La modalità catalogo nominativa non impone un `full` globale. Replay/accept/reject restano soggetti ai permessi correnti. Proposta mostrata/modificabile; Applica alla bozza richiede conferma e non sincronizza. Rate limit/reservation/hash/versione/idempotenza preesistenti riutilizzati; proposta altrui non viene riusata o scartata.

## Step 1A: contesto confermato e migrazioni

Il nuovo componente `ConfirmedAiAssistant` estende le card vuote autorizzate e la descrizione della nuova bozza. Nessuna richiesta al caricamento. L'operatore inserisce 1–12 frasi fattuali, conferma i dati, richiede la proposta, la modifica e sceglie scarto/applicazione. Ogni cambio dei fatti invalida conferma e proposta; risposte tardive sono ignorate. Dati insufficienti => spiegazione e compilazione manuale. La conferma non certifica scientificamente i fatti: la responsabilità della fonte resta dell'operatore.

L’entrypoint AI riusa l’helper CORS locale già presente, così è verificato interamente con il lock Deno esistente senza import npm non bloccati. Non cambia l’autenticazione.

Azione server `suggest_confirmed_field`: stessa autenticazione/ruoli/provider di `product-admin-ai`; `ai` **e** `edit`, field_keys, registro visible/editable/ai_allowed e allowlist di sei campi sono obbligatori. Identità deriva da JWT verificato, mai dal payload. Nessun accesso a prezzi/SKU/stock/certificazioni strutturali. Il modello può soltanto organizzare frasi fornite ESATTAMENTE: il server rifiuta parole/frasi diverse, numeri e claim nuovi. Questo flusso non offre una riscrittura libera. L'editor consente poi revisione manuale esplicita. Descrizioni rich text vengono formattate in paragrafi sicuri; liste conservano le voci. Nessun HTML o dato personale va inserito nei fatti.

Per le bozze non salvate non esiste un productId/versione: la proposta resta nella compilazione browser e non crea prodotti, current_values o product_ai_suggestions. Anche sul campo vuoto l'applicazione apre soltanto la bozza locale; Salva bozza è un'azione successiva con versione/hash catturati. Per i valori già presenti resta il flusso #22 con proposte persistite e accept/reject/versioni. Il rich text della nuova bozza viene aggiornato visivamente dopo applicazione esplicita, senza reset a ogni battitura.

Migrazione `20261116164306_admin_ai_confirmed_context.sql`, copia Drizzle `0017`: estende la CHECK delle sette capability con `ai`, senza INSERT/UPDATE su account o grant. Nuovo journal service-only `admin_confirmed_ai_requests` conserva soltanto attore, request key, campo, hash dei fatti e timestamp; nessun fatto/output del prodotto. RPC SECURITY INVOKER revocata a PUBLIC/anon/authenticated, controlla attore editor, grant corrente ai/edit, campo/registro e azione. Lock transazionale preesistente condiviso, massimo complessivo 5 tentativi/minuto condiviso con il percorso AI esistente, richiesta già usata rifiutata senza nuovo costo. Fallimenti provider consumano lo slot; nessun retry automatico. Per una nuova richiesta dopo errore serve riconfermare, dopo scarto serve un nuovo click. Retention del journal da concordare prima del rilascio; nessuna pulizia schedulata introdotta.

Migrazione primo valore `20261116161045_marco_editorial_missing_values.sql`, copia `0016`: ora distingue mesi, difficoltà, testi editoriali e tre elenchi. I tre elenchi iniziali richiedono almeno una voce valida. Conserva versione, lock, storico, idempotenza e revoche. Nessuna scrittura su Shopify. Entrambe registrate nel percorso effettivo `drizzle/migrations/meta/_journal.json` (16/17); il migratore Drizzle ufficiale le ha applicate nel database locale con baseline precedente ricostruita da SQL versionato. Seconda esecuzione senza riapplicazione. Le copie Supabase restano allineate: prima di ogni rilascio scegliere una sola catena, verificare history/checksum e drift in Step 1B, non applicare due volte via strumenti diversi.

Nessuna migrazione o capability applicata live. Owner dovrà autorizzare separatamente schema, eventuali grant nominativi e distribuzione dopo il preflight. Un campo non autorizzato resta negato anche se il frontend è manipolato. Test SQL locali eseguibili dopo la baseline con `npm run test:editor-step1a-db`, solo socket `/private/tmp/og-editor-*` e DB `og_admin_test_*`; in CI solo localhost/container effimero. Mai passare URL cloud o credenziali reali.

Generazione reale: endpoint `product-admin-ai`, secret server `LOVABLE_API_KEY` (solo presenza, non valore), `ADMIN_AI_MODEL` supportato e credito disponibile, limite costo/richieste e timeout `ADMIN_AI_TIMEOUT_MS`, flag scritture già configurato e grant nominativo. Default nel codice preesistente `google/gemini-3-flash-preview`: supporto effettivo non certificato. Niente chiavi nel browser, ricariche, abbonamenti o chiamate reali. Gestire 402/429/timeout/risposta non strutturata come errore; fallback manuale. I prompt non autorizzano nuovi claim botanici o numeri economici; verifica umana obbligatoria.

## Test e rollback

`npm run typecheck`; `npm run build`; `node ci/run-domain.mjs node`; `node ci/run-domain.mjs deno ci/deno-ci.lock`; `npm run test:editor-browser` (Chromium locale, sole fixture, richieste esterne abortite). Harness in `scripts/browser` non è una route dell'app e non viene incluso nella build distribuita. I test automatici non sono il collaudo nella sessione di Marco. I nuovi test SQL in CI applicano 0016/0017 sul container effimero dopo la baseline; non certificano lo schema live.

Rollback futuro: ripristino versione applicativa approvata, senza cancellare bozze/storico o fare restore generale. Nessuna down migration automatica né revoca dei grant di Marco. I salvataggi locali, la sincronizzazione e la pubblicazione restano effetti distinti; non annullabili genericamente con un rollback UI. Prima di distribuire, provare le migrazioni in un DB di verifica e il recovery con una DRAFT tecnica autorizzata.

## Preflight live Step 1B — 16 novembre 2026

**NO-GO allo Step 1C.** [Report e matrice verificata](VERIFICHE-STEP1B.md). Identità ambiente e mapping registro confermati via letture live; migrazioni 0016/0017 assenti, CHECK senza ai e grant editor senza ai/tre elenchi. Versioni Edge Functions, presenza secret, flag runtime, quota/credito e attribuzione nominativa privata restano NON VERIFICATI. Nessuna modifica live. Lovable è alla baseline e3a109e; SHA Git della build sul dominio non attestato. Non avviare rilascio o collaudo a consumo prima di chiudere questi gate e ottenere autorizzazioni separate.

## Pacchetto Step 1C-0 — preparato, non eseguito

[Piano developer](ATTIVAZIONE-STEP1C.md), [registro approvazioni](AUTORIZZAZIONI-STEP1C.md), [collaudo Marco](COLLAUDO-MARCO-STEP1C.md). **NO-GO esecuzione Step 1C**: approvazioni ed evidenze mancanti non acquisite da questo pacchetto. Il rischio del grant condiviso rilevato in 1C-0 è risolto dal controllo server descritto sotto: AI su sei campi, sync dei tre nuovi elenchi negato agli operatori catalogo. Nessuna modifica live.

## Restrizione server precedente — sync superato da Step 1C-1

EDITORIAL_AI_FIELDS in _shared/admin-catalog-policy.ts è l’unica allowlist catalogo AI: description, optimized_description, short_description, key_benefits, key_features, special_bullets. CONFIRMED_AI_FIELDS la riusa. catalogAiAllowed la applica anche al percorso precedente: listing filtra, generazione/accept/reject verificano il campo con grant corrente prima del service; ownership, ai_allowed, lock/versione, applicabilità e approvazioni restano invariati. Title, seo_title, seo_description, faq, prezzi, SKU e qualunque altro campo negati. Il registro non può ampliare questa lista.

catalogAllowed nega sync su EDITORIAL_LIST_FIELDS per il catalogo, pur mantenendo edit sul field_keys autorizzato. prepareCatalogApproval e withCatalogApproval invocano requireCatalog prima di snapshot/approvazione/replay: una vecchia approvazione non aggira il blocco. La serializzazione field-by-field usa aiFieldKeys e syncFieldKeys distinti ricevuti dal server; nessuna fiducia nella UI. Sync dei campi esistenti e percorsi amministrativi preesistenti fuori dal grant catalogo conservati. Nessun cambiamento a grant/ruoli/schema/migration/flag.

Il sync dei tre elenchi non è attivabile dalla sola approvazione operativa S in questa versione. Un futuro sblocco richiede decisione e intervento tecnico mirati; non attivare full o flag globali per aggirarlo. Il collaudo S può usare soltanto un campo preesistente sincronizzabile. Restano tutte le evidenze e autorizzazioni del report 1B prima del rilascio.

Verifica della restrizione: 20 nuovi test sintetici in scripts/tests/editorial-permission-scope.test.ts; totale 469 Node PASS, 106 Deno PASS, 5 Chromium PASS. Typecheck frontend, Deno check degli entrypoint, lint dei file modificati e build PASS. Suite esistenti di salvataggio, concorrenza, proposte e sync incluse; nessuna prova live o generazione reale. CI del commit da consultare nella PR; i test SQL restano nel job effimero esistente, nessuna migration modificata da questa restrizione.

**Stato corrente Step 1C-1:** il diniego totale del sync elenchi descritto nei passaggi storici è superato dal percorso controllato. AI resta sui soli sei campi; edit e sync sono capability separate. Nessun rilascio o grant live effettuato.

## Step 1C-1 — sync esplicito dei tre elenchi

Riusati catalogAiAllowed (sei campi invariati), catalogAllowed e il flusso approval/claim/complete esistente. Per i tre sync l’API impone grant catalogo editor attivo+sync+field_key anche se esistono altri ruoli; nessun percorso amministrativo alternativo per aggirarlo. Modifica richiede edit; AI richiede edit+ai, field_key e ai_allowed; sync non richiede ai e non ne deriva. Nessun grant automatico o nuovo schema di autorizzazione.

catalogSnapshot salva una revisione server e contratto del metafield/digest insieme alla snapshot del valore Admin e del remoto. La revisione non arriva dal client. I due punti prepare/execute verificano freschezza anche prima del replay COMPLETE. Payload hash e snapshot legano attore, azione, prodotto, campo, versione e contenuto; claim RPC atomico impedisce doppia esecuzione. Snapshot riletto, mapping ricontrollato e version/contenuto/review locale ricontrollati immediatamente prima della scrittura. Mutazioni concorrenti locali e Shopify non sono una transazione unica: un conflitto dopo la scrittura resta da riconciliare, non si sovrascrive con un retry.

Nuova query mirata legge metafieldDefinitions(PRODUCT, namespace, key, first:2) e il metafield del prodotto con compareDigest. Definizione unica, paginazione conclusa, mapping custom/key esatto e tipo json o list.single_line_text_field obbligatori. Valori esistenti opachi/incompatibili restano conservati e bloccano. Contenuto proposto: 1–50 stringhe non vuote, max 1000 caratteri; niente conversioni o deduplicazione/riordino impliciti. MetafieldsSet invia una sola voce con CAS (digest corrente oppure null se assente); readback esatto verifica tipo/valore/ordine. Errori di tipo/assenza accesso bloccano, nessuna definizione creata. Vedere [documentazione Shopify CAS](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/metafieldsSet).

Il client API conserva il default storico 2025-07: il validatore Shopify non rende più disponibile quella versione. Query e mutation validate sullo schema supportato 2026-10; nessuna versione/config runtime cambiata. Versione effettiva servita, supporto compareDigest, scope read_products/write_products, definizioni e accesso del progetto vanno attestati prima del rilascio. Se non verificabili, il campo resta bloccato: validazione statica non equivale a prova live.

La UI mostra Aggiorna sul sito soltanto con capability server e baseline verificata; negli altri casi spiega il blocco. Salva bozza e Accetta AI non sincronizzano. Per le liste l’azione combinata salva+sync è rimossa: aggiornamento solo della versione già salvata, con conferma distinta. Il percorso di sync dei campi precedenti non cambia.

Test Step 1C-1: nuove fixture Node per sei combinazioni campo/tipo, CAS nullo, definizioni negate, contenuto invalido, versioni/hash obsoleti, vecchie approvazioni, claim concorrente, replay senza riscrittura, esiti incerti e permessi. Browser aggiunge save senza sync, annullamento/conferma e messaggio blocco. Nessuna API reale invocata nei test. Risultati e CI del commit nella PR.

Verifica locale Step 1C-1: **491 Node PASS** (22 nuovi casi sync), **106 Deno PASS**, **6 Chromium PASS**; typecheck, lint (zero errori, warning Fast Refresh del solo harness), build e Deno check entrypoint PASS. Validazione statica query/mutation Shopify 2026-10 PASS; 2025-07 non disponibile nel validatore, runtime non modificato. CI del commit documentata nella PR, nessuna prova live.

## Step 1C-2 — wire multilinea e API versionata

Codec puro editorial-list-codec.ts: decode/encode strict multi_line_text_field per key_features/special_bullets, array JSON interno → LF sul wire → array identico; confronto readback raw esatto, senza trim/filter/sort/dedup. Voci con newline, righe vuote, CR, spazi esterni, payload JSON strutturati in multilinea o caratteri di controllo ambigui vengono bloccati conservando l’originale. Restano i codec json/list precedenti. key_benefits senza definizione resta bloccato; multi_line per questo campo non viene abilitato implicitamente.

La lettura live nel dettaglio Admin passa il tipo del medesimo snapshot al decoder, senza una seconda lettura o reinterpretazione di contenuti opachi. La nuova approvazione usa revisione v2 e include sempre contratto/digest/versione/contenuto. Pin 2026-10 e verifica header soltanto per il nuovo percorso editoriale; gli altri chiamanti conservano il default/override esistente. Il client versionato accetta l’opzione strict; default false per non modificare altri percorsi. Un mismatch dopo una scrittura è un esito incerto, non un’autorizzazione a ritentare. La documentazione Shopify dichiara 2026-10 stabile e 2025-07 fuori supporto; adeguamento globale del client fuori da questa correzione mirata.

Evidenze aggregate e limiti del campione nel piano ATTIVAZIONE-STEP1C.md (17/11). Nessun testo commerciale in fixture: test esclusivamente sintetici. I due campi multilinea sono tecnicamente pronti solo per forme reversibili, non certificati live su tutti i prodotti. Lo storefront esistente resta invariato.

Verifiche Step 1C-2: 510 Node PASS (19 nuovi casi codec/API), 106 Deno PASS, 6 Chromium PASS; typecheck, build, Deno check entrypoint, link/diff e validazione GraphQL 2026-10 PASS. Lint delle nuove parti PASS; nel client condiviso restano quattro any preesistenti, verificati come warning nel controllo mirato senza riscrivere il client. Nessuna prova live di mutation o richiesta AI. CI finale indicata nella PR.

## Step 1C-3 — key_benefits: solo contratto, non distribuito

Analisi dei consumer sulla PR #56: `src/hooks/useProduct.ts` non interroga `custom.key_benefits`, `ShopifyProduct` non espone `keyBenefits`, `Pdp.tsx` non lo mostra. Il backend esclude `multi_line_text_field` per key_benefits. **La sola creazione di una definizione Shopify non renderebbe il campo visibile, ne sincronizzabile.** La scheda tecnica [SHOPIFY-KEY-BENEFITS-DEFINITION.md](SHOPIFY-KEY-BENEFITS-DEFINITION.md) prepara il tipo PRODUCT/merchant-owned/multilinea/PUBLIC_READ e dettaglia adeguamenti e autorizzazioni future. Tutto il negozio e il sito sono rimasti invariati. Nessun test di codice nuovo o GO live attestato da questa preparazione.

## Step 1C-3 — consumer key_benefits completi nel codice

useProduct seleziona custom.key_benefits come keyBenefits { value type }; ShopifyProduct.node aggiunge la proprietà opzionale coerente. PDP usa parseKeyBenefits con il codec puro condiviso e tipo multi_line_text_field obbligatorio. Se vuoto/assente/incompatibile/ambiguo ritorna lista vuota. Non tocca parseMultilineMetafield né i due consumer precedenti. Il nuovo accordion conserva lo stile e il default esistente di Caratteristiche principali; appare solo con voci proprie. Soppressione di duplicati esatti soltanto rispetto alle voci già mostrate nelle altre due sezioni, nessuna mutazione del dato né deduplicazione semantica; ordine e duplicati interni residui conservati. React rende le voci come testo, senza HTML interpretato.

Server: rimosso soltanto l’esclusore key_benefits dal supporto multi_line_text_field. Definizione PRODUCT unica/compatibile obbligatoria, codec rigoroso, grant, ai_allowed per AI, snapshot/versione/CAS/readback/incerti invariati. Approvazione v3 solo key_benefits; v2 rimane valida per gli altri due campi. Nessun nuovo tipo/flag/grant/migrazione o creazione definizione. Pin Admin editoriale 2026-10 invariato; Storefront versione/default lasciati invariati.

Prove sintetiche: 523 Node PASS, 106 Deno PASS, 8 Chromium PASS; typecheck/lint/build e Deno check entrypoint PASS. Casi consumer: ordine/caratteri/duplicati, campo assente/vuoto/ambiguo, duplicati tra sezioni, query/tipo, vecchie approvazioni; esteso a key_benefits il test sync multilinea con compareDigest, readback e replay senza scrittura. Browser usa PDP reale con prodotto sintetico, rete esterna abortita, viewport 1280/390; verifica presenza/assenza e consumer precedenti, screenshot locali. Harness non incluso nella build dell’app. Query completa validata Storefront 2026-10 con sole due deprecazioni preesistenti; nessun cambiamento di schema query oltre al nuovo alias.

Compatibilità tecnica ora predisposta per tutti e tre i campi multilinea; sul negozio key_benefits resta BLOCCATO per definizione assente secondo la baseline documentata, non ricontrollata live in questo step. [Scheda D-BENEFITS](SHOPIFY-KEY-BENEFITS-DEFINITION.md): GO tecnico alla sola richiesta di autorizzazione, nessuna operazione live o consegna Marco.

## Step M — review finale, 17 novembre 2026

[Review sicurezza e scheda per il proprietario](REVIEW-M-0016-0017.md). Identità Cloud confermata; history live ferma a 0015, 16/16 hash/when corrispondenti; solo 0016/0017 pending, entrambe non applicate. RPC live corrispondenti ai corpi versionati precedenti, nessun drift incompatibile osservato nel perimetro. **NO-GO alla sola autorizzazione M**: M-01, default ACL live più ampi dei SELECT/INSERT dichiarati sul nuovo journal senza revoca service_role; M-02, backend deployed non verificabile per diniego ai metadati. Nessuna migration, correzione SQL, grant o deploy eseguiti. L’ordine schema→backend resta condizionato a correzione/attestazioni, non autorizza scritture.

D-BENEFITS **COMPLETATA E VERIFICATA il 17/11**, secondo evidenza proprietario: PRODUCT/custom.key_benefits/multi_line_text_field/PUBLIC_READ, Definition ID 778290364756. Le note precedenti sulla definizione non creata sono storiche. Nessun altro gate completato; nessuna consegna Marco. La procedura Drizzle applica entrambe le pending in una transazione: verificare entrambe le history dopo il commit, non aspettarsi un commit intermedio 0016.

## Follow-up code audit AI/live draft — 19 novembre 2026

Backlog prioritario e criteri di test in [BACKLOG-UX-MARCO.md](BACKLOG-UX-MARCO.md). Bug P0 UX-01: `AiSuggestionCard.generate()` non usa la risposta con `suggestion`; `useAiSuggestions` e' disabilitata (`enabled: false`), e `invalidateQueries` non popola una query non attiva; sistemare data flow/reload senza nuove chiamate provider e testare idempotenza. P0 UX-02: il salvataggio `save_new_product` passa `p_payload: draft` completo, ma `validatedFields` proietta soltanto descrizione/titolo/SEO/botanica su `product_current_values`; il dettaglio mostra quindi `Nessun valore` per dati operativi (prezzo, SKU field-by-field, vendor, tag, categoria, immagine). Prima di modificare schema o RPC, progettare readback read-only del payload dell'operazione e testare su record `LOCAL_DRAFT`. P0 UX-03/04: stato `Attivo` di prodotto interno non implica pubblicazione Shopify; mostrare stati separati, mantenere approvazioni esplicite per azioni remote. Nessun intervento di codice autorizzato da questa nota.
