# Step 1B — preflight live in sola lettura

16 novembre 2026; osservazioni concluse alle 17:26 UTC. PR #56, branch `codex/marco-product-editor-step1`. Base documentale remota aggiornata con fast-forward a `cebcb8b`, preservato l’addendum del proprietario. Codice applicativo Step 1A: `8a1eee0`. **NO-GO allo Step 1C: blocchi confermati e metadati di distribuzione/configurazione incompleti.** Nessun test sintetico viene presentato come prova live.

## Metodo ed evidenze

Sole connessioni esistenti: Shopify GraphQL query di identità senza contatti; Lovable get/list progetto, stato Cloud e SELECT su cataloghi SQL, history, registro e grant editor senza identificativi personali. Nessun comando/RPC applicativo invocato. GET pubblico di homepage e bundle, nessun login. Connettore Supabase: progetto atteso non elencato e list_edge_functions negato; nessun tentativo di acquisire chiavi o aggirare il diniego. Lovable Cloud consente invece SELECT sul database del progetto identificato. Nessun secret letto, nessuna generazione, modifica di dati/schema/grant, deploy o Publish.

Identità incrociata: progetto Lovable «Your E-Commerce Blueprint», Cloud Supabase abilitato; config del suo commit e host nel bundle pubblico coincidono con il progetto configurato nel repository. Il dominio Shopify nel bundle coincide con la query live del negozio «Online Garden»: `ecom-blueprint-gen-6ud1s.myshopify.com`. Riferimenti tecnici e identificativi privati del database omessi dal report pubblico.

## Matrice delle differenze

PASS significa solo verifica specifica riuscita; BLOCKED indica impedimento confermato; NON VERIFICATO indica evidenza insufficiente.

| Componente | Stato reale verificato | Stato richiesto dalla PR #56 | Differenza | Intervento minimo | Autorizzazione necessaria |
| --- | --- | --- | --- | --- | --- |
| Identità progetto/DB/negozio | PASS: corrispondenza config Lovable, bundle pubblico, Cloud e shop live | Ambiente univoco | Nessuna per identificazione | Conservare il collegamento privato | Nessuna modifica |
| History | PASS per lettura: ultima Supabase `20261110135043`; ultima Drizzle corrisponde a 0015, hash SHA-256 e timestamp identici al file versionato | 0016/0017 applicate una sola volta | Entrambe assenti dalla history Supabase; Drizzle fermo a 0015 | Scegliere una sola catena e riconciliare history/checksum prima dell’esecuzione | Owner per qualunque migration; non concessa qui |
| Capability ai | BLOCKED: CHECK consente solo edit/sync/drafts/images/categories/prices/publish | CHECK additiva include ai | ai non ammessa | Migrazione 0017 verificata offline, dopo review drift | Schema separatamente autorizzato |
| Primo valore editoriale | BLOCKED: RPC admin_update_product_field esiste ma non contiene description/key_benefits; versione/idempotenza presenti | RPC 0016 con allowlist editoriali e liste | Funzione precedente, migrazione assente | Aggiornamento 0016 senza riscrivere valori | Migration separatamente autorizzata |
| Journal/RPC fatti confermati | BLOCKED: admin_confirmed_ai_requests e reserve_confirmed_ai_request assenti | Journal RLS/service-only e RPC di 0017 | Nuovo flusso non eseguibile sul DB corrente | 0017; preservare budget condiviso | Schema separatamente autorizzato |
| Tabelle AI precedenti | PASS: reservations e suggestions presenti con RLS; RPC reserve_product_ai_generation SECURITY INVOKER | Preservare prerequisiti storici e aggiungere budget condiviso | Nuova estensione del budget non distribuita | Review della sostituzione inclusa in 0017 | Migration separata |
| Ruolo/grant editor | PASS per stato aggregato: due grant editor abilitati, entrambi con sette capability e 14 campi; ai assente | edit+ai e field_keys esatti per assistenza | Nessuno dei due grant include i tre elenchi | Owner conferma privatamente quale operatore è Marco; approva eventuali estensioni nominative minime | Grant nominativi espliciti, nessuna estensione globale |
| Identità nominativa Marco | NON VERIFICATO: nessun dato personale interrogato; aggregati non identificano la persona | Collegamento certo all’operatore autorizzato | Attribuzione nominativa non attestata in questa sessione | Attestazione privata dell’owner sulla riga autorizzata, senza pubblicare UUID/email | Conferma owner; niente login/impersonificazione |
| Tre elenchi nel registro | PASS: key_benefits/key_features/special_bullets visible/editable/ai_allowed=true, manual_only=false, editor_type=multiselect | Stessi campi con editor visuale e grant | Registro pronto; grant insufficienti | Non duplicare campi; autorizzare solo quelli approvati | Owner sui grant |
| Mapping tre elenchi | PASS per registro live: custom.key_benefits, custom.key_features, custom.special_bullets, tipo metafield | Mapping esplicito e validato prima del sync | Tipi/definizioni Shopify e readback non verificati in questo step | Lettura mirata delle definizioni prima di autorizzare sync; nessuna lettura valori commerciali necessaria | Accesso read-only; sync richiede autorizzazione distinta |
| RLS/ACL DB | PASS nel perimetro letto: RLS attiva su capability/registro/current_values/tabelle AI; RPC esistenti senza EXECUTE PUBLIC/anon/authenticated | Preservare controlli e service-only nuovi oggetti | Nuovi oggetti ancora assenti | Verificare ACL dopo futuro rilascio | Nessuna revoca o modifica qui |
| Backend product-admin-api / product-admin-ai | NON VERIFICATO: connettore nega list_edge_functions | Artefatti PR #56 con autenticazione/grant/campo e sanitizzazione | Versioni/checksum deployed sconosciuti | Metadati read-only di deploy e sorgente/checksum con timestamp | Accesso di lettura alle funzioni, non credenziali |
| Frontend Lovable | PASS per metadato: latest_commit_sha e3a109e60550fee922e3263d348563d3ed7baf99, progetto published | Codice Step 1A 8a1eee0 | Progetto Lovable ancora alla baseline, non alla PR | Distribuzione controllata solo dopo chiusura gate | Merge/deploy/Publish separatamente autorizzati |
| Frontend onlinegarden.it | BLOCKED per nuovo flusso: GET serve /assets/index-7LGwLIzQ.js senza suggest_confirmed_field; SHA bundle sotto | Nuova azione frontend Step 1A | Flusso confermato della PR assente dal bundle principale | Future build/distribuzione approvata e verifica asset | Publish separato; SHA Git esatto del pubblicato NON VERIFICATO |
| Secret e flag runtime | NON VERIFICATO: nessuna superficie autorizzata per metadati di presenza/configurazione | LOVABLE_API_KEY presente; gate coerenti | Non deducibile da file Git o manifest storici | Owner fornisce solo presenza secret e valori non segreti dei gate | Lettura metadati, mai valori secret |
| Modello/credito/quota | NON VERIFICATO per progetto: nessuna generazione o dashboard billing accessibile nel connettore | Modello configurato supportato e budget approvato | Configurazione effettiva/credito/limiti non osservati | Attestazione dashboard AI/Connectors e credito con data, senza prompt/log personali | Accesso read-only; chiamata a consumo richiede autorizzazione successiva |

Il bundle pubblico ha SHA-256 `7df678d36d3888cbb5cc7e48a8a7910d6b7d153404a10bd2154a9e72c453c907`. Non equivale a uno SHA Git. latest_commit_sha di Lovable descrive il progetto corrente, non certifica quale commit sia stato pubblicato sul dominio. Nessuna versione backend è stata dedotta dalla versione frontend.

ACL: le tabelle capability/reservations espongono grant solo service_role fra i ruoli client ispezionati; current_values ha SELECT autenticato con policy can_edit_products. Il registro ha policy di lettura can_edit_products e policy ALL limitata ad admin/tech_admin: i grant SQL authenticated sul registro non significano autorizzazione editor alle scritture. Le RPC esistenti osservate hanno anche un ruolo tecnico di esecuzione Cloud; non è un grant a utenti e non è stato modificato. Non eseguiti test negativi live o chiamate alle RPC. Controlli server deployed NON VERIFICATI.

Altre osservazioni: description e optimized_description condividono descriptionHtml, come previsto dalla UI della PR; short_description ha mapping vuoto e non va sincronizzata inventando una destinazione.

## AI: codice, documentazione e limiti

Codice PR: gateway Lovable `https://ai.gateway.lovable.dev/v1/chat/completions`, secret server LOVABLE_API_KEY; override ADMIN_AI_MODEL, default google/gemini-3-flash-preview; timeout default 12000 ms da ADMIN_AI_TIMEOUT_MS, max_tokens 2000, temperatura 0.2; budget applicativo previsto 5 richieste/minuto condivise. Questi sono valori di codice, NON configurazione runtime osservata.

La [documentazione ufficiale chat](https://docs.lovable.dev/features/ai-chat), consultata il 16/11, elenca Gemini 3 Flash Preview fra i modelli disponibili. PASS per disponibilità documentata della famiglia; non prova l’override configurato, l’accesso del progetto o la risposta del provider. La [guida AI](https://docs.lovable.dev/features/ai) indica Connectors → AI per modelli disponibili e More → AI per attività/costi. Credito residuo e quota progetto NON VERIFICATI. Non è necessario consumare una generazione per attestare uno screenshot aggregato della dashboard. Nessuna modifica automatica del modello proposta o effettuata.

Gate da attestare privatamente: PRODUCT_ADMIN_WRITES_ENABLED, PRODUCT_ADMIN_DRAFTS_ENABLED, PRODUCT_ADMIN_DRAFT_SHOPIFY_ENABLED, PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED e, se coinvolto, PRODUCT_ADMIN_CATEGORIES_ENABLED; distinguere poi le flag frontend realmente compilate. Non usare manifest storici come prova dello stato attuale. Verificare anche retention journal e impostazioni di conservazione AI prima di inviare informazioni reali.

## Chiusura del gate

Prima di valutare Step 1C servono: conferma nominativa privata, metadati deploy/backend, presenza configurazione e gate, attestazione modello/credito/quota e manifest build pubblicata. Poi approvazioni distinte per 0016/0017, grant ai e tre field_keys ai soli operatori designati, distribuzioni e budget massimo di un futuro test AI. Nessuno di questi interventi è autorizzato o eseguito dal presente preflight. Il sync Shopify e il collaudo su DRAFT tecnica richiedono selezione e consenso separati; non sbloccare genericamente i gate.

Documentazione soltanto: nessuna nuova funzionalità, test generale ripetuto o modifica runtime. I PASS offline e la CI Step 1A restano nel report precedente. Editor non consegnato a Marco. **Step 1C NO-GO.**
