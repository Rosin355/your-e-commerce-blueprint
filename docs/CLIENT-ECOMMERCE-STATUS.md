## Stato corrente — guard Admin #52 integrato e distribuito; cliente non ancora abilitato

**10 novembre 2026: rilascio del guard completato, consegna operativa a Marco ancora NON conclusa.** PR [#52](https://github.com/Rosin355/your-e-commerce-blueprint/pull/52) MERGED con commit di integrazione **`cb7fc573e2b8c8d4838bb49cec38b74961d39e78`** il 10/11 alle **19:24:21 CET**, dopo autorizzazione puntuale del proprietario. CI applicativa, PostgreSQL 17 e GitGuardian **SUCCESS** sul candidato **`e54d4d98ee09afac7bf79d3116074706370af11f`** ([run](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/42874590567)); sorgenti funzioni identici nel merge, nessun bypass. I commit documentali successivi non cambiano il codice distribuito; il workflow non esegue CI push su main.

**Deploy effettivo del solo `product-admin-api`:** Lovable ha verificato checkout pulito sul merge e SHA-256 del modulo `admin-v2-shopify-field-sync.ts` **`5f994970abfe1c032686df1e2a14e156ce3605d0e305e3d7f445904c3753faa6`**, entrypoint **`b15a7175bb89e6a5a0f20281ea4b678aa1778b7e7b48ebaf439e1e8913c14a9d`**. Pacchetto inviato **`8db90d7a67caacc580397e37db41f005605a08990adb4a2b624d55421224c91e`**; sono impronte dei sorgenti inviati, non un export del bytecode runtime. Nessun’altra funzione, migration, flag, ruolo, dato Shopify o Publish frontend modificato durante questo deploy. Il canary è rimasto chiuso e non è stato eseguito un altro test di scrittura live.

**Protezione SEO rilasciata:** snapshot live completo della coppia, conservazione dell’attributo adiacente, verifica post-write di entrambi e rifiuto degli snapshot incompleti. Titolo predefinito letto con lo stesso fallback al nome prodotto già usato dal sito. **7 nuovi test mirati PASS**, 2 regressioni pertinenti PASS, check Deno modulo/API e lint modulo PASS, oltre alla CI finale. La preservazione di un titolo SEO personalizzato è coperta dai test automatici, non da un nuovo canary live. Il valore raw nullo osservato sul titolo tecnico coincidente con il nome non prova una perdita del titolo effettivo: l’ipotesi di normalizzazione resta distinta dalle prove. La precedente richiesta circoscritta di ripristino è stata accettata dall’API senza cambiare il valore raw; non è registrata come ripristino raw riuscito.

**Percorso tecnico già eseguito, sempre sulla stessa DRAFT:** upload da computer/media READY; salvataggio e rilettura della bozza interna alle 17:22; replay RPC con stessi ID e senza duplicati (non un secondo salvataggio HTTP); una sola creazione Shopify dopo OK manuale del popup alle 17:51; fix Fornitore PR #51 con CI positiva e deploy API; recovery senza ricreare alle **18:08:46**, stato **VERIFIED_DRAFT**; modifica di `seo_description` versione **1 → 2** alle **18:16:17**, poi sync esplicito e rilettura identica alle **18:16:56**, errore nullo. Il `publish_state=published` del campo indica sincronizzazione, non pubblicazione del prodotto. Valori precedenti, versione e journal dei soli dati tecnici coinvolti conservati in archivio locale protetto, fuori Git; nessun export account/credenziali/clienti.

**Verifica finale in sola lettura:** 1 prodotto interno, 1 operazione, 1 mapping, 0 grant ordinari; GID **`gid://shopify/Product/15963458797908`**, variante `gid://shopify/ProductVariant/58250808787284`, SKU **`OG-ADMIN-CHECK-20261110-63B3FD`**, titolo **“TEST ADMIN — NON PUBBLICARE”**. Shopify resta **DRAFT**, media READY, una variante e `publishedOnPublication=false` sul canale Headless reale; descrizione SEO aggiornata presente. Il percorso pubblico aveva mostrato “Prodotto non trovato”. Nessuna pubblicazione o modifica commerciale, inventario, checkout, tariffe A/B, Sendcloud, SEO/redirect/GSC. Associazione logistica fallback A e profilo General soltanto osservati; nessun comando di modifica lanciato. Categorie editoriali vuote, zero mapping storici approvati.

**Capability effettive chiuse:** sync e nuove create OFF, approvazione operazione e scope null. Master true/canary come autorizzato; dopo chiusura la sessione tecnica mostrava modifiche non autorizzate, e la verifica SQL finale conferma zero grant ordinari. La registrazione del cliente è stata rinviata dal proprietario: nessuna identità cliente abilitata, nessun ruolo assegnato ad altri, nessuna sessione Marco collaudata. Il codice per il normale catalogo è presente, ma non viene dichiarato consegnato al cliente sulla sola prova tecnica.

**Versioni e limiti:** frontend live già verificato **`admin-delivery-20261110-r1`**, deployment `885640f0-b94e-4220-989c-dff4677b8125`, invariato dagli ultimi due rilasci backend. Migration originale/delta già applicati atomicamente, nessun SQL aggiuntivo. Smoke pubblico desktop/mobile precedente riutilizzato. Il successivo tentativo Admin mobile non ha applicato il viewport 390 e non è PASS; override ripristinato, Safari/iOS non attestati. Controllo aggiuntivo browser infine disconnesso, senza riaprire lo scope; non presentato come nuova diagnostica runtime. **restoreVerified=false**, rischio senza restore distruttivo già accettato. Nessuna nuova PR, attivazione o lavoro in background promessi; le sezioni successive conservano la cronologia.

---

## Stato live dopo il Publish — 10 novembre 2026, canary non ancora eseguito

**Migration e backend distribuiti; frontend pubblicato. Consegna operativa al cliente NON conclusa.** PR [#50](https://github.com/Rosin355/your-e-commerce-blueprint/pull/50) MERGED con commit di integrazione `096a435f0c0f6ba9722c67fbba2d1b8508678bc3`. CI applicativa, PostgreSQL 17.6 e GitGuardian SUCCESS sul candidato `5fbab624c60e81f7f90e72cbe3a740e3d97c662f` ([run](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/42837086444)). Non esiste CI push su main: non attribuire al merge un check non eseguito.

- **Migration PASS:** originale e delta applicati in una sola transazione nativa Lovable, dopo consenso puntuale del proprietario. Le due history Supabase contengono gli SHA-256 esatti `ce63ea211dd7b5f08e222f7b462afc5719a276782a80bca52c1b69abd29cf328` e `793fdc18a9c34e8575af3f9d74daac5ce0d04e666efccdaf733a3af202ba5d7c`. Sette tabelle RLS attiva/zero policy client, sei RPC service-only/search_path vuoto, nessun EXECUTE anon/authenticated. Nessun DELETE/TRUNCATE service_role sui nuovi journal. Il vecchio SECURITY DEFINER della sola RPC sync è preservato con ACL ristrette; nessun nuovo bypass RLS client.
- **File generati dal provider:** `drizzle/migrations/0015_admin_catalog_atomic_delivery.sql`, snapshot/journal Drizzle e tipi Supabase, integrati automaticamente sopra il merge, ultimo riferimento osservato `d9ad4902afeaae954bef56d1da0281cd2f17da57`. Il corpo applicato coincide con la proposta approvata salvo l’a capo finale; SHA file nativo `ee58531550b7e27c4003be80b5c9c43bbca7f689bc24f07d7f881669fceaa2b6`. Mantenerli come storico già applicato, non rieseguire il pacchetto. I sorgenti pending restano invariati.
- **Backend:** deploy mirato `product-admin-api` e guard `product-admin-ai` completato dal provider; codice funzioni identico alla revisione approvata. Impronte dei pacchetti inviati: API `b5b28ad35801dbf53de92d78997e157a5e26a36386635a11f18acb83727ed352`, AI `a52a2ac830a5e108421b4926b7a3bf4cfd93fb9b9055094bb89f7f78a24c73b0`. Non sono hash del bytecode riletto dal runtime. Prova live negativa dell’API: singola richiesta senza sessione rifiutata con `401 UNAUTHENTICATED / Token mancante`, prima dell’azione. Nessuna scrittura eseguita dalla prova. Il guard AI autenticato non è ancora collaudato live.
- **Frontend:** Publish Lovable `885640f0-b94e-4220-989c-dff4677b8125`; `onlinegarden.it/admin/settings` serve il marker DOM **`admin-delivery-20261110-r1`**. Diagnostica autenticata **16:07:40 CET: false / canary / false, READ-ONLY**. Dopo i soli file generati, typecheck/build PASS e tutti i 68 asset locali identici alla build del codice revisionato. Il tentativo opzionale di confrontare un asset con un client HTTP esterno al browser è stato rifiutato 403: non è usato come prova del contenuto live; vale il marker letto nel browser autenticato.
- **Configurazione canary parziale:** creati tramite strumento nativo i sei flag preparatori, inclusi scope esatto a scadenza, DRAFT interno ON richiesto, Shopify create/sync e categorie OFF, approvazione operazione nulla. Valori salvati write-only: non dedotti dall’inventario dei nomi. Il master esistente non è aggiornabile dal connettore; il suo passaggio a true è predisposto in UI e attende consenso al momento dell’azione. Ultimo runtime verificato master/sync OFF. Nessun prodotto o file caricato, nessun grant ordinario assegnato.
- **Account cliente:** assente in Auth al lookup esatto; registrazione rinviata dal proprietario. Nessun ruolo, account, password o capability attribuiti ad altri. Lo scope tecnico non è una sessione Marco. Unico DRAFT tecnico previsto, ancora non creato; nessuna pubblicazione commerciale provata o eseguita.
- **Recovery:** snapshot gestito `2026-11-10T05:26:11Z`, sorgente precedente archiviato, journal conservati. Rischio senza restore distruttivo accettato esplicitamente; **restoreVerified=false**. Nessun restore generale, export account o modifica a checkout/pagamenti, A/B, Sendcloud, inventario commerciale, SEO/redirect/GSC, clienti/ordini.

Le sezioni successive conservano la cronologia e non annullano questo stato più recente. Il salvataggio del master e il percorso DRAFT non sono attestati finché non vengono osservati.

---

## Consegna operativa Admin V2 — esecuzione 10 novembre 2026

PR di completamento [#50](https://github.com/Rosin355/your-e-commerce-blueprint/pull/50) **MERGED** il 10/11/2026 alle 14:46:08 UTC, main `096a435f0c0f6ba9722c67fbba2d1b8508678bc3`. [CI applicativa/PostgreSQL 17.6](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/42837086444) e GitGuardian SUCCESS su HEAD `5fbab624c60e81f7f90e72cbe3a740e3d97c662f`; codice integrato identico. Nessun bypass; repository senza branch protection/ruleset applicati al momento della verifica. Il workflow non esegue CI push/deploy su main: nessun PASS CI del merge dedotto. Operatività live ancora non dichiarata.

**Stato corrente: codice di completamento implementato; rilascio produttivo e accettazione NON conclusi.** Questo mandato autorizza migration additiva, backend, build operativa, un solo DRAFT tecnico e capability catalogo minime; supera i precedenti vincoli “solo preparazione” nel solo perimetro dichiarato. Le sezioni successive sono cronologia, salvo evidenze più recenti registrate esplicitamente.

- Partenza dal main effettivo `1324f0536eef3ff33ce43b8d74d84ba5307244a7`; PR #42/#46/#47 già integrate. Una sola PR di completamento; SEO #49 separata.
- Runtime live autenticato riletto il **10/11/2026 alle 15:18:56 CET**, origine `https://onlinegarden.it`: **false / canary / false**, stato **READ-ONLY**. Sessione tecnica, non sessione Marco. Nessuna attivazione deriva da questa lettura.
- L’account cliente indicato privatamente non esiste in Auth. Il proprietario ha rinviato registrazione/verifica: nessun account creato, nessuna password/codice richiesti, nessuna capability attribuita ad altri utenti. L’abilitazione cliente resta da eseguire sull’identità verificata.
- Implementati conferma UI + approvazione server persistita, actor/action/hash/versione/scadenza, claim singolo/audit, immagini da computer e READY, prezzi per variante, categorie editoriali manuali con identità verificata, pubblicazione separata sul canale Headless con controllo A/B. Salvataggio/invio iniziale sempre DRAFT; prodotto tecnico escluso dalla pubblicazione.
- Nessuna migration applicata, nessun deploy/Publish o flag produttivo modificato, nessun prodotto tecnico/commerciale scritto in questa fase. Il flag Vite nel codice prepara la futura build operativa; il default del codice resta fail-closed se manca l’esatto valore `true`. Merge, editor e sito pubblicato sono verifiche separate.
- Snapshot gestito osservato **2026-11-10T05:26:11Z**. Il proprietario accetta il rischio senza restore distruttivo di prova; **restoreVerified=false**. Sorgente backend precedente nota conservata e frontend precedente recuperabile; non è disponibile uno SHA attestabile del bundle backend attualmente in esecuzione.

## TODO SEO prioritario — 10 novembre 2026

**P1 — recupero visibilità organica dopo migrazione WooCommerce → Lovable/Shopify.** Il cliente segnala prodotti non più indicizzati e link storici in 404. È un problema da diagnosticare e correggere separatamente da Admin V2: non dedurre lo stato HTTP dal solo report Search Console.

- Fonte collegata: Google Search Console per `sc-domain:onlinegarden.it` tramite Windsor.ai. Prima settimana ottobre 2026: 299 clic e 25.353 impressioni; prima settimana novembre 2026: 155 clic e 10.704 impressioni (dati recenti suscettibili di consolidamento); il confronto segnala un calo, non ne identifica da solo la causa.
- Esempi di URL storici comparsi in GSC: `/prodotto/piante-da-interno/piante-da-appartamento/tradescantia-nanouk/`, `/prodotto/rose/rosa-jasmina-rampicante/`, `/prodotto/piante-da-esterno/alberi/ginkgo-biloba-mariken/`. Verificare risposte HTTP reali di host `www` e apex.
- Fonti di recupero: export Search Console (pagine, query, clic/impressioni), analytics Lovable, backlink, sitemap vecchie, e backup database WooCommerce già segnalato dal proprietario su Drive. Leggere solo quanto necessario; nessun import di clienti o dati personali per il lavoro SEO.
- Preparare matrice `old_url → current_url | restored_product | genuine_410/404`, con SKU/slug/prodotto realmente corrispondenti. Priorità agli URL con clic/impressioni/link in ingresso. Evitare redirect generici alla homepage, soft 404 e associazioni basate sul solo titolo.
- Verificare `robots.txt`, sitemap XML, `noindex`, canonical, host `www`/apex, linking interno e Product JSON-LD; per vecchi prodotti equivalenti usare 301/308 server-side diretti alla nuova scheda canonica, solo dopo QA HTTP. Per prodotti rimossi valutare alternative realmente equivalenti, altrimenti 404/410 appropriato.
- Dopo la pubblicazione autorizzata: inviare sitemap aggiornata a GSC, usare URL Inspection per pagine prioritarie, monitorare 404, clic, impressioni, copertura e posizioni per 4-8 settimane; i ranking non sono garantiti né immediati.
- **Stato: TODO PRIORITARIO / nessun redirect ancora autorizzato o pubblicato.** Mantenere Admin V2 Livello B, migration, scritture e sync Shopify OFF e separati; preservare tariffe A/B, checkout e Sendcloud.

## Integrazione sicura PR #47 — attestazione proprietario del 9 novembre 2026

Il proprietario attesta uno screenshot autenticato di `https://onlinegarden.it/admin/settings`, letto il **09/11/2026 alle 19:16:37 CET**: `writesEnabled=false`, `writeMode=canary`, `shopifySyncEnabled=false`, stato **READ-ONLY**. Fonte: dichiarazione esplicita del proprietario in chat; immagine non allegata a questo registro né ispezionata dall’agent. Nessuna email o credenziale registrata. Questa attestazione aggiornata sostituisce il blocco dovuto alla precedente impossibilità di rileggere Chrome; non dimostra una cronologia completa dei secret.

È autorizzata l’integrazione del solo codice tramite [PR #47](https://github.com/Rosin355/your-e-commerce-blueprint/pull/47), senza pubblicazione. **Stato MERGED e commit main effettivo fanno fede nel registro GitHub della PR**; prima del merge questa nota è preparatoria. Il nuovo commit documentale non modifica codice, configurazioni o migration. CI/GitGuardian devono essere verdi sull’HEAD effettivamente integrato.

Dopo l’integrazione, Livello B presente nel codice ma disabilitato; Livello A resta la versione pubblicata `admin-readonly-20261106-r1`. Frontend operativo solo con build esplicita e valore esatto `true`; default read-only, nessuna preferenza locale lo abilita. Migration `20261031184521` invariata e fuori dal percorso automatico; nessun nuovo SQL nel percorso migrations. Workflow GitHub limitato ai check pull_request, senza job deploy. La sincronizzazione del codice Lovable non equivale a pubblicazione, deploy Edge o applicazione SQL; nessuna di queste azioni è autorizzata o eseguita da questa integrazione.

L’ultima lettura attestata mantiene scritture e sync **OFF**. Recovery produttivo **non dimostrato**, identità/ruolo Marco **non verificati**, zero mapping categorie approvati; nessun canary autorizzato. L’attivazione operativa resta BLOCKED dal change operativo e dai suoi prerequisiti; il merge non li chiude. Payments, checkout, spedizioni A/B, Sendcloud, inventario, prodotti e SEO invariati.

## Gate finali Admin V2 — 9 novembre 2026

PR #47: codice compatibile con Livello A e candidabile al merge solo con CI/GitGuardian finali verdi; **merge non eseguito**, deploy operativo separatamente **BLOCKED**. Corretta soltanto la verifica del Product GID nel recovery e il rifiuto di una nuova create con GID già fissato; due test nuovi mirati, senza ripetere manualmente le suite precedenti. Nessuna altra PR.

Snapshot Lovable riconfermato: 9/11 05:25:16 UTC, ma **RECOVERY NON DIMOSTRATO**; restore in-place non eseguito. Identità e ruolo Marco NON VERIFICATI; letti esclusivamente metadati dello schema. Canary senza SKU/attore/operationId autorizzati, 22 decisioni categorie residue. Runtime 9/11 16:19:57 CET: false/canary/false. Nessuna migration, autorizzazione DDL, assegnazione ruolo, flag ON, sync o distribuzione; pagamenti/checkout/A+B/Sendcloud/inventario invariati. GSC/404/301 restano TODO successivi.

[Change definitivo, metodo autenticato Marco, recovery e STOP](ADMIN-V2-ACTIVATION-RUNBOOK.md). Unico riscontro del titolare: prova recovery pertinente già riuscita e conferma privata di account Marco/SKU/attore/operazioni; niente nuovi audit generali.

# Stato Admin V2 — aggiornamento 9 novembre 2026

**Livello A live in sola lettura; Livello B pronto nel codice di una PR dedicata, non attivato.** Base main `8854204`; nessuna modifica a main, dati, ruoli o flag produttivi. Nuovo collegamento endpoint/query operative, protezione server canary per SKU/attore/operazione con verifica DRAFT, accesso al form bozze e categorie senza mapping visibili. Build operativa opzionale, default ancora read-only.

[Runbook vigente e change unico](ADMIN-V2-ACTIVATION-RUNBOOK.md) · [Manifest](release/ADMIN-V2-ACTIVATION-MANIFEST.json). SQL originale invariato, quattro tabelle/RPC/history ancora assenti. Ultimo snapshot Lovable osservato 9/11 05:25:16 UTC; recovery effettivo non dimostrato. Diagnostica live 9/11 14:57:44 CET: false/canary/false. Account/ruolo Marco non verificati, zero privilegi assegnati. Categorie: 22 decisioni residue, nessun mapping approvato/applicato.

Attivazione live BLOCKED fino a recovery dimostrato e scheda change specifica approvata con identità/canary; nessun nuovo audit o ambiente richiesto. CI/GitGuardian e SHA conclusivi fanno riferimento all'HEAD della nuova PR, non ai check storici delle #42/#46. GSC, analisi 404 e redirect 301 restano TODO successivi; checkout, pagamenti, spedizioni A/B e Sendcloud invariati.

---

## Archivio precedente al completamento tecnico del 9 novembre

Le sezioni sottostanti conservano le evidenze storiche. Per stato, sequenza e autorizzazioni vigenti prevale la sezione del 9 novembre sopra. I riferimenti a staging aggiuntivo, export completo o applicazione della patch differita non sono istruzioni attuali.

## Chiusura definitiva della preparazione — 6 novembre 2026

**Ciclo tecnico/documentale CHIUSO. Livello A CONSEGNATO; Livello B BLOCKED.** La chiusura non equivale ad attivazione completa. Nessun nuovo audit, ambiente, strumento, servizio o test applicativo manuale; nessuna migration, export, modifica di dati/flag/permessi o pubblicazione eseguita in questa chiusura.

| Livello | Stato verificabile e consegna |
|---|---|
| A — consultazione | Già pubblicato: dashboard, catalogo, ricerca nome/SKU, tipo prodotto, filtro valori da verificare, paginazione, navigazione e dettaglio. Consultabile dagli account autorizzati; accesso personale Marco non ancora attestato. Filtri avanzati categoria/completezza/sincronizzazione/non classificati disabilitati, non consegnati come funzionanti. |
| B — operatività | SQL e codice differito preparati e testati nelle fasi precedenti; migration/nuove tabelle/RPC non attivate, editing e bozze/recovery/categorie/sync non operativi. Nessuna capability accesa. |

**Versione live attestata:** `admin-readonly-20261106-r1`, contenuto `1ad6182`, deployment `00a243b8-240f-48bf-8507-202d352fc4f4`; riferimento alla verifica live del 6 novembre ore 18:00:09 CET, con `writesEnabled=false / writeMode=canary / shopifySyncEnabled=false`. Non è un nuovo smoke: le evidenze già PASS sono riutilizzate, nessun codice live cambiato.

**Coerenza finale:** base PR #46 `3296a7669216ff1082ff74f5c52cec396af27acf`, ripresa da `f369ca5`; migration invariata con SHA-256 `ce63ea211dd7b5f08e222f7b462afc5719a276782a80bca52c1b69abd29cf328`. L'HEAD conclusivo/check/merge effettivi sono registrati nella descrizione della PR per evitare un riferimento circolare al commit documentale. È autorizzato soltanto il merge documentale dopo CI/GitGuardian PASS; nessun deploy Lovable incluso.

**Tre limiti operativi residui, senza nuovi filoni:** (1) recovery produttivo completo non dimostrato e specifica approvazione migration assente; (2) account/ruolo Marco non collegabili univocamente alle fonti accessibili, senza un identificativo confermato dal proprietario; non inferire dal nome o dal conteggio admin; (3) decisioni commerciali categorie e attivazione controllata delle capability/canary DRAFT non approvati. La tabella delle 22 decisioni è finalizzata, zero mapping applicati. WebKit resta non certificato secondo il limite già registrato, senza nuovi tentativi.

**Indicazione conclusiva al proprietario:** consegnare il Livello A come versione di consultazione, usando la guida Marco; il Livello B rimane separatamente bloccato, senza richieste di audit/test ripetitivi o consenso all'export completo. Shopify/Payments/checkout/A+B/Sendcloud/inventario invariati. SEO, GSC già collegata e redirect 301 rimangono TODO successivi, non eseguiti. Le sezioni sottostanti sono cronologia o procedure condizionate, non attività promesse dopo questa sessione.

## Recovery minimizzato — decisione vigente successiva a `40f5ba9`

**Export completo ritirato e non autorizzato.** Nessun account, hash password, token, secret o dato personale va esportato. La proposta precedente di download completo non è più il percorso da seguire. Nessuna nuova risorsa o modifica produttiva eseguita.

Il recupero gestito Lovable è disponibile ma sostituisce lo stesso DB; non è stato provato sul progetto. Il solo DDL della migration crea quattro tabelle/quattro RPC senza modificare righe preesistenti: prova e rollback limitati a quel delta sono preparabili con fixture sintetiche. Questo **non** equivale al recupero completo di dati/Auth/Storage e non chiude automaticamente il gate migration o scritture.

[Piano aggiornato: scope, snapshot, comando opzionale schema-only di otto tabelle, dipendenze, procedura PG17](release/ADMIN-V2-OPERATIONAL-ACTIVATION.md) · [Manifest](release/ADMIN-V2-ACTIVATION-MANIFEST.json). Export reale non eseguito e non autorizzato; nessuna prova applicativa ripetuta. L'eventuale archivio deve avere copie persistenti protette, non la sola `/private/tmp`. Il codice/migration originali, main, frontend live, flag e permessi restano invariati.

## Preparazione attivazione operativa — 6 novembre 2026, non eseguita

Main e versione live restano stabili: frontend `1ad6182` / `admin-readonly-20261106-r1`, scritture e sync OFF secondo l'ultima diagnostica live verificata. Questa nuova PR prepara soltanto l'attivazione; non pubblica codice o dati.

Migration unica già testata `20261031184521`, hash `ce63ea21…d29cf328`, invariata e ancora fuori dal percorso automatico. Verifica SELECT finale: prerequisiti presenti, migration/nuove RPC/tabelle assenti, 22 categorie e 0 mapping, una sola assegnazione admin aggregata; identità Marco non verificata.

**Backup NON VERIFICATO:** disponibili punti giornalieri (ultimo 6/11 05:25:08 UTC), ma nessun export/restore dimostrato. La revisione automatica ha bloccato l'avvio dell'export completo perché richiede consenso esplicito per dati account/hash password. Serve prima il consenso all'export e alla prova locale protetta; non è ancora il momento di approvare l'applicazione della migration. Database server 17.6, pg_restore locale 16.15: non dichiarare compatibilità o restore PASS.

[Piano unico con target, checksum, recupero, transazione, permessi, capability e rollback](release/ADMIN-V2-OPERATIONAL-ACTIVATION.md) · [Manifest](release/ADMIN-V2-ACTIVATION-MANIFEST.json). Nessun nuovo progetto/staging/abbonamento; nessun SQL di modifica, flag, ruolo o dato Shopify modificato. Test già PASS riutilizzati, nessuna suite manuale ripetuta. Il canary esistente limita ruoli/campi, non impone uno SKU singolo: questa limitazione è esplicita nel piano.

## Rilascio effettivo verificato — 6 novembre 2026, Admin in sola lettura

**PUBBLICATO, solo consultazione.** PR #42 integrata con merge `1ad61826c01ade2821f6c1577a3bd1555d0ab899`, HEAD revisionato `c35c53ba004bd425c371c369621938bd2f607ffe`; [CI Storefront SUCCESS](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/42256971612) e GitGuardian SUCCESS prima del merge ordinario. Nessuna modifica alla PR #45 o ai servizi shipping.

**Deployment Lovable** `00a243b8-240f-48bf-8507-202d352fc4f4`, contenuto `1ad6182`. Lovable conferma “Il tuo sito web è stato aggiornato”; il dominio `onlinegarden.it/admin/settings` serve il marker DOM **`admin-readonly-20261106-r1`**. Commit editor verificato prima e dopo la pubblicazione: `1ad6182`. Il successivo commit di sola documentazione non va confuso con un nuovo deploy. [Registro sanificato](admin-v2-evidence/2026-11-06-readonly/deployment.json).

**Controllo minimo live:** dashboard caricata (2706 righe interne), catalogo (25 risultati), navigazione, scheda OG_113165 aperta con Modifica disabilitato, categorie isolate con spiegazione; nessuna regressione evidente nel perimetro controllato. Diagnostica autenticata **6 novembre 18:00:09 CET**: `writesEnabled=false`, `writeMode=canary`, `shopifySyncEnabled=false`, valori reali senza override frontend. Nessuna scrittura di prova. Non è una nuova certificazione completa Safari/QA o un'accettazione di Marco.

**Disponibile:** consultazione dashboard, ricerca/paginazione e dettaglio tramite backend esistente. **Non operativo:** editing/salvataggio, sync, AI, nuove bozze/recovery, assegnazione categorie e filtri avanzati che richiedono il nuovo backend. Migration fuori dal percorso automatico, endpoint attivo preservato, nessuna migration o attivazione server eseguita. Il codice differito e le relative prove non sono backend distribuito. Account/ruolo Marco non verificati da questa sessione di altro Admin, nessun permesso aggiunto.

**Rollback:** nessun rollback eseguito. Conservare deployment ID e commit di contenuto; per eventuale ripristino frontend usare snapshot precedente verificato o revert mirato/pubblicazione. Base main precedente nota `8ad26ba` non attestata come precedente SHA servito: non dedurlo. Nessun DROP/down-migration, reset o force-push. Scritture e sync devono restare OFF anche dopo un ripristino.

**Limite per l'Admin modificabile:** attivazione operativa separatamente autorizzata (backup/rollback verificato, migration, ACL/RLS, backend compatibile, categorie/identità approvate, ruolo Marco e canary DRAFT concordato), con rimozione revisionata del vincolo frontend. Procedura futura conservata; nessun nuovo progetto, staging aggiuntivo o ciclo di test richiesto adesso. Le sezioni sottostanti sono cronologia/preparazione e non annullano lo stato pubblicato di sola consultazione.

## Decisione operativa vigente — rilascio Admin in sola lettura, 6 novembre 2026

Il proprietario autorizza merge della PR #42 e pubblicazione del **solo frontend compatibile**, senza staging aggiuntivi, migrazioni, prodotti nuovi o scritture. Questa decisione sostituisce i precedenti blocchi di rilascio riferiti all'Admin completamente modificabile; le funzioni operative future restano disabilitate. Non richiedere nuovi progetti o staging per consegnare questa versione.

| Funzione | Perimetro di questa versione |
|---|---|
| Dashboard, ricerca nome/SKU, tipo, paginazione | Disponibili tramite azioni già supportate dal backend attuale; limiti di ricerca/volumi del servizio attuale conservati, non dichiarati risolti dal solo frontend. |
| Scheda prodotto, valori e storico editoriale esistente | Consultazione, senza editor/sync/AI operativi. Gli stati di sincronizzazione non certificano la pubblicazione Shopify. |
| Categorie, nuove bozze e storico nuove operazioni | Isolati: nessuna chiamata a catalog_categories/get_product_operations o RPC nuove; pagina esplicativa sulle route dirette. |
| Filtri categoria/completezza/sincronizzazione/non classificati | Disabilitati con motivazione: il backend attuale non li supporta. Nessun filtro locale sui soli 25 risultati presentato come globale. |
| Legacy tecnico | Collegamenti nascosti e route legacy reindirizzate alle impostazioni protette nel frontend; autorizzazioni backend legacy non cambiate. |
| Permessi | Login e ruolo server esistenti; nessun nuovo ruolo a Marco. Identità personale Marco non certificata da una sessione di altro amministratore. |

**Confine fail-closed:** `ADMIN_READ_ONLY_RELEASE=true` è un vincolo nel codice, non una preferenza locale. Il canale Admin ammette soltanto le letture note e blocca le altre azioni prima del trasporto; canale AI bloccato, nessuna generazione. Capability dei campi disabilitate. Diagnostica continua a mostrare i flag reali del server senza forzarli a false. Lettura pre-release autenticata: `writesEnabled=false / writeMode=canary / shopifySyncEnabled=false`, ore 17:48:30 CET. Nessun secret o flag modificato.

**Separazione del backend:** entrypoint product-admin-api identico a main precedente; query attive con sole annotazioni TypeScript, nessuna nuova lettura di tabelle. Query future conservate in `admin-v2-queries-deferred.ts`, non importate dal percorso attivo; endpoint futuro nella patch `docs/release/ADMIN-V2-DEFERRED-ENDPOINT.patch`. Migration spostata in `docs/release/pending/20261031184521_admin_operational_drafts.sql`, fuori dal percorso di migration automatiche. I test offline conservano i controlli sul materiale differito. Nessun SQL applicato, nessun deploy Edge esplicitamente eseguito.

CI/GitGuardian e SHA effettivi sono registrati nella PR #42. Lo stato del deployment sarà attestato solo dalla risposta Lovable e dalla verifica della versione servita; merge e commit editor non equivalgono a pubblicazione. [Registro](https://github.com/Rosin355/your-e-commerce-blueprint/pull/42) · [Preflight](admin-v2-evidence/2026-11-06-readonly/preflight.json).

## 6 novembre 2026 — chiusura residui Admin V2, nessuna attivazione

- **Backend PARTIAL:** nessuna nuova incompatibilità nei metadata/grant mirati rispetto alla baseline; database operativo 25 tabelle, nuove RPC/migration ancora da attivare secondo gate. Non è uno staging. Un solo ruolo admin assegnato nell'aggregato letto: ruolo personale Marco **NON VERIFICATO**.
- **Staging NON DISPONIBILE negli accessi identificati/autorizzati.** Preview/bozze non isolano il database; fonte ufficiale e identità nel runbook. Non creato alcun progetto. Procedura locale temporanea documentata, SQL e prove PASS precedenti conservati senza ripetizioni.
- **UI/UX PARTIAL:** spiegazioni per invio/recupero disabilitati e linguaggio cliente; quattro nuovi casi Chromium PASS a 320/1440 px, typecheck/lint/build PASS. Un solo tentativo WebKit, ancora crash 139 prima della prova; Safari e accettazione Marco/designer aperti.
- Matrice categorie trasformata in tabella decisionale per Marco: 13 tecniche univoche, 3 plausibili, 2 ambigue e 4 assenti; zero mapping applicati. Le 194 famiglie non sono automaticamente prodotti Shopify mancanti.
- Percorso unico preparato: codice, backup provato, migration controllata, ACL/RLS, backend, frontend, capability limitate, canary DRAFT, account Marco, rollback. Pubblicazione **BLOCKED** finché non superati i gate e autorizzata la produzione. CI/GitGuardian e SHA finali nella PR #42, mantenuta Draft.
- PR #45, Shopify live, A/B, Sendcloud, checkout e pagamenti invariati; niente merge, deploy, migration o flag produttivi. GSC già collegata tramite Windsor.ai; 404/URL WooCommerce/mapping/301/monitoraggio restano TODO successivi, non eseguiti.

[Runbook](ADMIN-V2-ACTIVATION-RUNBOOK.md) · [Guida cliente](ADMIN-V2-CLIENT-GUIDE.md) · [QA](ADMIN-V2-QA-REPORT.md).

## 6 novembre 2026 — Admin V2 completamento mirato, rilascio BLOCKED

**Aggiornamento 6 novembre 2026 — PR #42; questa sezione prevale sugli stati storici sottostanti.**

- Runtime autenticato live **PASS**: scritture OFF, modo canary, sync Shopify OFF; dashboard/ricerca SKU/dettaglio letti senza write.
- Correzioni PR #42: filtri sul catalogo prima della paginazione, nessun troncamento silenzioso, stato sync non confuso con pubblicazione, focus visibile e responsive. Typecheck/lint/build, 370 Node e 103 Deno PASS; SQL locale/rollback PASS; Chromium simulato 11 scenari PASS.
- **UI/UX PARTIAL:** WebKit crash tecnico, Safari/device e accettazione Marco/designer non conclusi. **Sicurezza operativa BLOCKED:** ruoli reali Marco e RLS gestita post-migration non collaudati, legacy separati.
- SELECT backend Lovable conferma migration non applicata, 22 categorie e zero mapping/assegnazioni. **Staging NON ESEGUITA**. Nessun canary commerciale o write live.
- PR #42 Draft; risoluzione conflitti con main sul branch, nessun merge in main/deploy. SHA, CI e GitGuardian dell'HEAD finale nella PR. PR #45, tariffe A/B, Sendcloud e checkout indipendenti e invariati.
- **Progresso indicativo per gate, non misura del codice:** consultazione 75% (3/4: lettura live, filtri locali, UI; manca accettazione Marco); modifica/bozze 60% (3/5: server, SQL locale, UI; mancano staging e canary); categorie 50% (2/4: codice e QA locale; mancano mapping approvati e canary); UI 67% (4/6: responsive, tastiera/focus, conferme, stati; mancano Safari e accettazione); rilascio 25% (2/8: codice/CI e runtime; restanti gate nel runbook). Non è pronto all'uso completo del cliente.
- Prossima azione unica: ambiente staging Supabase isolato autorizzato e accessibile, prima di ogni decisione produttiva. [Guida Marco](ADMIN-V2-CLIENT-GUIDE.md), [runbook](ADMIN-V2-ACTIVATION-RUNBOOK.md), [QA](ADMIN-V2-QA-REPORT.md).

**TODO SEO post-rilascio, non eseguito:** Google Search Console **già collegata tramite Windsor.ai**; analisi 404, recupero URL WordPress/WooCommerce, mapping vecchio URL → pagina nuova, redirect permanenti HTTP 301 e monitoraggio indicizzazione. Le vecchie note “collegare GSC” sono superate. Nessun redirect o credenziale Google modificati.

## 5 novembre 2026 — Focus cliente: Admin V2 e rifinitura UI/UX; SEO rinviata

**Priorità scelta:** prima completare il pannello amministrativo utilizzabile da Marco e verificare definitivamente l'esperienza del sito, poi affrontare SEO tecnico. **TODO successivo:** collegamento Google Search Console, raccolta degli errori 404 e delle vecchie URL WordPress/WooCommerce, mappatura verso le pagine Online Garden equivalenti e redirect permanenti 301 verificati. Nessuna attività SEO/redirect avviata o pubblicata ora.

**Sito pubblico:** la navigazione principale, homepage, catalogo, schede prodotto, footer e pagine Contatti/Privacy sono stati pubblicati e collaudati nei rilasci precedenti; le tariffe spedizione A+B ora operano nel checkout Shopify live secondo gli ultimi test documentati nella PR #45, indipendentemente da Lovable. La chiusura UI/UX richiede ancora una prova di accettazione con il cliente e QA mirato desktop/mobile/Safari: non è certificata come conclusa.

**Gestionale:** la PR #42 rimane Draft e le nuove operazioni su categorie e bozze non sono state pubblicate. Il secret master delle scritture è stato impostato a `false`, ma non è ancora attestato dal pannello Admin autenticato dopo il cambio. Servono verifica dei tre stati in `/admin/settings`, verifica approvazioni/mapping categorie, migrazione e collaudo controllati prima di permettere modifiche commerciali. Marco non deve considerare disponibili le funzioni finché non sono state pubblicate e verificate. **Nessuna scrittura o pubblicazione eseguita con questa nota.**

## 2 novembre 2026 — master Admin V2 configurato a false; runtime da verificare

Dopo l'autorizzazione, è stato salvato `false` per il solo `PRODUCT_ADMIN_WRITES_ENABLED` del progetto Online Garden. Lovable ha confermato l'aggiornamento; nessun prodotto o dato è stato modificato, non c'è stato un deploy e il sito pubblico resta navigabile. La verifica della schermata Admin dopo il cambio richiede ancora un account Admin già autorizzato: nelle sessioni disponibili compare il login. **Non dichiariamo ancora READ-ONLY in produzione** e la PR #42 rimane bloccata. Il passo minimo è leggere i tre indicatori nella diagnostica su `onlinegarden.it/admin/settings`; non servono strumenti sviluppatore o condivisione di credenziali. [Runbook tecnico](ADMIN-V2-ACTIVATION-RUNBOOK.md). La sezione seguente conserva la misura Preview precedente.

## 2 novembre 2026 — diagnostica Preview: scritture Admin V2 abilitate

Un amministratore autorizzato ha letto alle 18:58 nella Preview Lovable `writesEnabled=true`, `writeMode=canary`, `shopifySyncEnabled=false`: la schermata segnala correttamente **SCRITTURE ABILITATE**. Questo non è ancora un controllo diretto del sito pubblico. La configurazione è condivisa a livello di progetto Lovable; disattivare il master `PRODUCT_ADMIN_WRITES_ENABLED` inciderebbe su Preview e produzione, impedendo le modifiche prodotto e AI dell'Admin V2. Le altre funzioni Admin con interruttori autonomi richiedono verifica separata. È stata verificata la possibilità di sostituire il solo master con `false`, ma non è stato salvato alcun cambiamento. Occorre autorizzazione esplicita prima della modifica e una successiva lettura autenticata sul dominio pubblico per chiudere il gate. PR #42 non integrata; nessuna migration, deploy o modifica ai prodotti. [Runbook](ADMIN-V2-ACTIVATION-RUNBOOK.md).

## 1 novembre 2026 — Admin V2 aggiornato dopo il footer, non ancora attivabile

Il branch della PR #42 ora include il nuovo `main@04ae6d4` dopo la pubblicazione della PR #43: il footer online, Contatti e Privacy Policy sono conservati. I controlli locali su homepage, catalogo, scheda prodotto e pagine legali sono positivi; 361 test Node e 103 Deno, typecheck, lint e build passano. Abbiamo inoltre nascosto una CTA di recupero quando l'Admin non è autorizzato a scrivere. La PR resta Draft e il nuovo HEAD richiede CI e GitGuardian propri.

**Non è ancora stata dimostrata la modalità di sola lettura dell'Admin nell'ambiente reale.** Due impostazioni già presenti in Lovable hanno valori non leggibili e non è disponibile una sessione Admin autorizzata per controllare i tre indicatori runtime. Il proprietario deve confermare soltanto `writesEnabled`, `writeMode` e `shopifySyncEnabled` tramite la [procedura senza credenziali](ADMIN-V2-ACTIVATION-RUNBOOK.md). Fino ad allora il gate rimane BLOCCATO: nessun merge, deploy, migration, attivazione di flag o cambiamento del catalogo è stato eseguito. Il footer pubblicato resta indipendente e invariato.

## 1 novembre 2026 — Admin V2: sicurezza e prossimi passaggi

Nella review finale della PR #42 è stato chiuso un ultimo varco del comando generale di sicurezza: prima, il recupero di una bozza Shopify poteva aggiornare il registro interno anche quando le scritture erano disabilitate. Ora il comando OFF blocca anche quel recupero e l'interfaccia nasconde il pulsante. I test locali passano; sul commit correttivo `c9329ca`, [CI applicativa SUCCESS](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41321729729) e GitGuardian PASS. L'HEAD documentale finale richiede i propri check. La PR rimane Draft e attende una review GitHub adeguata.

Abbiamo confrontato in sola lettura le 22 categorie interne con tutte le 55 collezioni Shopify: 13 handle coincidono, altri casi richiedono scelta o non hanno un match. **Nessun collegamento è stato applicato.** Le 194 famiglie senza Product GID nel mapping interno non sono automaticamente prodotti assenti da Shopify; serve confronto SKU/GID autorizzato. Per Marco, il percorso proposto è graduale: prima codice con scritture OFF, poi migration in staging autorizzata, approvazione delle categorie, un solo prodotto DRAFT di prova e test con il suo account/Safari; la pubblicazione resta una decisione separata. [Matrice](ADMIN-V2-CATEGORY-RECONCILIATION-PLAN.md) · [Piano operativo](ADMIN-V2-ACTIVATION-RUNBOOK.md).

## 1 novembre 2026 — verifica database Online Garden per PR #42

Abbiamo controllato **in sola lettura** il database Supabase collegato al progetto Online Garden e confrontato la nuova migration con lo schema reale. La compatibilità tecnica risulta positiva; nessuna migration è stata applicata e nessun prodotto Shopify è stato modificato. I test automatici sull'ultimo commit applicativo `d9f0d39` sono [passati su GitHub](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41236633321). Un eventuale commit solo documentale richiede il proprio controllo CI.

L'Admin V2 di Marco **non è ancora attivabile per nuove categorie o prodotti commerciali**: nel database sono presenti 22 categorie interne, ma manca il collegamento verificato con le collezioni Shopify; inoltre 194 famiglie interne non hanno ancora un Product GID nel mapping legacy. Questo non significa che siano prodotti assenti da Shopify: serve riconciliazione puntuale. Le 903 famiglie dell'importazione e gli 82 casi storici in revisione restano un'altra popolazione, da verificare separatamente. Migration, ruoli/flag, canary DRAFT, pubblicazione, email e validazione commerciale richiedono autorizzazioni e QA dedicati. [Dettaglio tecnico e gate](ADMIN-V2-LIVE-SUPABASE-COMPATIBILITY.md).

## 2 novembre 2026 — master Admin configurato a false, conferma runtime in attesa

Con autorizzazione del proprietario, Lovable ha registrato `false` per il solo `PRODUCT_ADMIN_WRITES_ENABLED` del progetto Online Garden. Nessun prodotto, dato o deploy è stato modificato e il sito pubblico resta disponibile. La schermata Admin dopo il cambio non è stata letta con un account autorizzato: nelle sessioni disponibili compare il login. La misura delle 18:58 riguardava la **Preview prima del cambio**; non dichiariamo READ-ONLY in produzione e la PR #42 resta bloccata. Il passo minimo è leggere i tre indicatori della diagnostica su `onlinegarden.it/admin/settings`, senza DevTools né condivisione di credenziali. [Runbook tecnico nel branch Draft #42](https://github.com/Rosin355/your-e-commerce-blueprint/blob/c05f58775e3fa9fb2299311cfc4dd520e8a26027/docs/ADMIN-V2-ACTIVATION-RUNBOOK.md).

## 2 novembre 2026 — diagnostica Admin pubblicata, verifica degli stati ancora da completare

La sola [PR #44](https://github.com/Rosin355/your-e-commerce-blueprint/pull/44) è stata integrata (`e26d6f4`) e il frontend è stato pubblicato su [onlinegarden.it](https://onlinegarden.it/) tramite Lovable (`251548b2-46c2-4842-85a7-16f9c1cdfa6f`). Homepage, catalogo, scheda prodotto, footer e carrello vuoto sono navigabili; `/admin/settings` richiede correttamente il login. La pagina diagnostica è disponibile nel codice pubblicato per gli Admin autorizzati, ma non è stato possibile leggerla con la sessione disponibile. I tre stati delle scritture **non sono verificati** e Admin V2 della PR #42 resta bloccato. Passo minimo: un Admin già autorizzato apre `/admin/settings` e legge i tre campi mostrati, senza DevTools né invio di credenziali. Nessuna modifica a Shopify, Supabase, Edge, migration, secret o flag. [Report tecnico](ADMIN-RUNTIME-DIAGNOSTICS-ONLY.md). La sezione seguente descrive il preflight precedente.

## 2 novembre 2026 — proposta di diagnostica Admin senza strumenti sviluppatore

È stata preparata separatamente dalla PR #42 una piccola schermata in `/admin/settings` che permette a un amministratore autorizzato di leggere tre stati tecnici già previsti dal server. Non cambia prodotti, prezzi, disponibilità, Shopify o impostazioni. In caso di errore mostra **NON VERIFICATO**, senza indicare falsamente che le scritture sono spente. Il codice della funzione pubblicata nell'ultima distribuzione documentata contiene i tre campi, ma i valori effettivi dell'ambiente online non sono ancora stati letti. La [Draft PR #44](https://github.com/Rosin355/your-e-commerce-blueprint/pull/44) ha CI e GitGuardian positivi sul commit implementativo; la schermata non è stata pubblicata. Per chiudere il gate read-only servirà, dopo una pubblicazione autorizzata, una lettura sul sito reale da parte di un Admin. Nessun controllo con DevTools è richiesto. La PR #42 e l'attivazione delle sue funzioni restano sospese. [Piano tecnico e rollback](ADMIN-RUNTIME-DIAGNOSTICS-ONLY.md).

## 30 ottobre 2026 — CI minima reale, preservando la base #39

Introdotto workflow pull_request verso main e codex/storefront-main-integration con runtime e Action fissati, npm ci senza lifecycle script, typecheck, lint pertinente, build e test Node/Deno con lock frozen. Solo contents:read, nessun segreto applicativo o permesso di scrittura, nessun sync/import/backup/deploy; test Node con blocco rete e Deno senza permessi runtime rete/run/write. Codice dello storefront e test esistenti invariati.

Scelta esplicita dell’utente: aggiornare soltanto la #41 e validare nel suo job technical-base anche l’HEAD esatto #39 aa7e6ae, senza muovere la base. I check sono collegati alla #41; non si dichiarano check diretti nuovi sulla #39. QA locale: #41 339 Node + 92 Deno, #39 336 Node + 92 Deno; typecheck/lint/build positivi. [Run GitHub 41072668699](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41072668699) SUCCESS su 6957184: entrambi gli SHA verificati con gli stessi conteggi, typecheck/lint/build e lock positivi; GitGuardian SUCCESS. Nessuna modifica alle protezioni branch. La #39 non ha un nuovo check applicativo direttamente collegato; il suo codice è validato dal job technical-base della #41. Il successivo commit delle evidenze genera una nuova run da controllare sull’HEAD finale. Review adeguate e staging/commerciale restano gate aperti: nessun READY FOR MERGE.

[Implementazione CI e bootstrap](CI-INTEGRATION.md) · [Release readiness corrente](release/FINAL-RELEASE-READINESS.md). I paragrafi successivi conservano lo stato precedente; i loro riferimenti a CI assente descrivono la situazione prima di questo intervento.

---

## 30 ottobre 2026 — integrazione finale Header Only, nuova Draft PR separata

La decisione cliente sostituisce UX 2.0 completa: homepage, catalogo e PDP con grafica precedente, soltanto navbar recente. Branch `codex/customer-experience-header-final` creato direttamente da #39 `aa7e6ae`, selezionando dieci file applicativi e il test monetario da `99fb008`; src identico al risultato approvato, nessuna ancestry/serie di commit importata dalla #40. HomepageV3 e HomeHero identici alla base.

QA locale positiva: typecheck/lint/build, 339 Node + 92 Deno, checkout di contratto simulato con fetch stub e browser desktop/mobile a sei larghezze. Mega-menu, ricerca, account non autenticato e carrello vuoto verificati; nessun checkout o ordine reale. 14 screenshot essenziali, senza duplicare l’archivio UX 2.0. GitGuardian #39/#40 risultava positivo alla verifica iniziale, ma restano mancanti CI applicativa e review adeguate: **BLOCKED al merge**. Staging/produzione e validazione commerciale separati.

Pubblicato soltanto il nuovo branch senza force push e aperta la **[Draft PR #41](https://github.com/Rosin355/your-e-commerce-blueprint/pull/41)** verso `codex/storefront-main-integration`, collegata a #39 e #40. GitGuardian #41 SUCCESS sul primo HEAD pubblicato `f4164ed`, mergeability clean e diff conforme al manifest; zero workflow applicativi e review: **BLOCKED al merge**. I check finali vanno confermati sul relativo HEAD. PR esistenti (inclusa #40 aperta) e worktree preservati. Nessun merge, deploy o cambiamento live. [Report corrente e gate](HEADER-ONLY-FINAL-INTEGRATION.md) · [Confronti essenziali](header-only-integration-evidence/2026-10-30/comparison.html). Le sezioni sotto sono storico della base.

---

# Online Garden — aggiornamento cliente

## 1 novembre 2026 — footer pubblicato sul dominio ufficiale

**Footer pubblicato e verificato su https://onlinegarden.it.** PR [#43](https://github.com/Rosin355/your-e-commerce-blueprint/pull/43) unita senza bypass. HEAD sorgente `e617c05ad9afcaf2c22ad5faac0da06e8bd9ad1d`; merge e commit effettivamente servito in produzione `8d2a160917895735658e34a37d6b337733a32649`. Deploy Lovable esplicito `0ae71161-a4cc-407e-ae36-b2202f381981`, confermato dal DOM del footer e dal `data-commit-sha` dell'HTML pubblico, non dal solo merge.

Il sito pubblico mostra ora il nuovo footer desktop e mobile. Le categorie aprono pagine reali, Contatti mostra `info@onlinegarden.it` e Privacy Policy porta all'informativa ufficiale Shopify. Social non verificati e newsletter inattiva sono rimossi dal footer; homepage, catalogo, schede prodotto e header conservano la grafica approvata.

La verifica reale dopo la pubblicazione è positiva per navigazione, link, focus, mobile e carrello vuoto. Il checkout non è stato completato con un acquisto o un carrello Shopify reale. Il codice Admin V2 della PR #42 non è stato pubblicato e non sono stati attivati flag o modificati negozio, database o dominio.

**Questo rilascio riguarda il footer, non l'approvazione a vendere.** Marco deve ancora fornire testi approvati per Cookie Policy, termini, spedizioni/resi e dati societari. La telemetria Lovable è ancora attiva: c'è un'impostazione per disabilitarla, ma occorre una decisione specifica e una successiva verifica. Nessuna CMP aggiunta e nessuna dichiarazione di conformità del consenso.

[Checklist Marco](legal/CLIENT-LEGAL-PUBLICATION-CHECKLIST.md) · [Screenshot realmente online e QA](legal/release-evidence/2026-11-01/README.md). Le sezioni successive sono storico precedente, non attestazioni aggiornate del rilascio.

### Storico precedente alla pubblicazione del footer

28 ottobre 2026. **Migliorie integrate e verificate localmente; pubblicazione non effettuata.**

La nuova versione è stata preparata sulla base più recente del sito. Conserva categorie, selezioni della homepage, suggerimenti e prodotti di prova nascosti. Il lavoro precedente è stato preservato integralmente.

## Miglioramenti verificati con dati di prova

- La ricerca può raggiungere anche i prodotti oltre il millesimo. Sono stati controllati cataloghi sintetici da 1.205 e 10.000 prodotti, mantenendo filtri, conteggi e ordinamenti sull'intero insieme.
- Le schede caricano tutte le varianti; verificato un prodotto di prova con 205 formati. Gli errori di caricamento hanno un messaggio e un nuovo tentativo, senza mostrare dati parziali come completi.
- Il percorso di acquisto gestisce doppi clic ed errori, senza raddoppiare la quantità al nuovo tentativo. Il checkout Shopify resta quello esistente; le prove sono simulate e non hanno creato ordini o carrelli reali.
- Navigazione mobile, tastiera e ingrandimento immagini migliorati. Disponibilità e informazioni della pianta vengono mostrate dai dati ricevuti, senza numeri di stock o descrizioni botaniche generati.
- Titoli e descrizioni delle pagine aggiornati durante la navigazione; pagine mancanti contrassegnate per non essere indicizzate dopo il caricamento dell'app. Aggiunti dati descrittivi delle schede, senza prezzi o recensioni inventati.

Il catalogo completo richiede ancora il caricamento di tutte le pagine prima dei risultati: i test non dimostrano tempi reali su rete mobile o Shopify. La maggiore copertura non equivale a una promessa di maggiore velocità. La riduzione dei dati per singolo prodotto è stata misurata soltanto su fixture controllate.

## Da validare prima del lancio

Confermare dominio pubblico, indicizzazione e pagine mancanti sul sito effettivamente pubblicato; provare in un ambiente autorizzato prodotti/varianti/prezzi/disponibilità reali e checkout di test; approvare pagamenti, spedizioni, resi e pagine informative. Non sono stati attivati servizi, newsletter o metodi di pagamento per deduzione.

L'amministrazione, le sincronizzazioni e i dati del negozio restano quelli della versione recente. Non sono stati modificati dati, prezzi, giacenze, utenti o configurazioni live. Nessuna pubblicazione automatica o nuova Pull Request creata.

Questo documento descrive lo stato cliente. Dettagli tecnici e prove sono nel [report di integrazione](STOREFRONT-MAIN-INTEGRATION.md).


## Autonomia Marco — aggiornamento 31 ottobre 2026

La veste grafica approvata rimane invariata. È pronto per review un percorso Admin per consultare categorie e compilare un nuovo prodotto senza AI. Salvare una bozza interna, inviarla come bozza Shopify e pubblicarla sono operazioni distinte. Le nuove funzioni non sono ancora attivate nel negozio; non sono stati modificati account, privilegi, inventario, prodotti o dominio. Email cliente/staff: checklist predisposta, ricezione effettiva ancora da verificare con un ordine test autorizzato.

Riferimenti: [Piano Admin](./ADMIN-V2-NEW-PRODUCT-PLAN.md), [QA](./ADMIN-V2-QA-REPORT.md), [Notifiche Shopify](./SHOPIFY-EMAIL-NOTIFICATIONS-AUDIT.md).

Draft PR [#42](https://github.com/Rosin355/your-e-commerce-blueprint/pull/42) pubblicata. CI applicativa e GitGuardian verificati SUCCESS sul codice `38b6324`; [esecuzione](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41232830219). Esito tecnico distinto dai gate live ancora aperti: nessuna attivazione del negozio.


**Addendum finale, connessione Shopify resa disponibile:** sola lettura sullo store corretto conferma EUR, italiano principale pubblicato, nuovi account cliente facoltativi, 1.348 prodotti ACTIVE, 16 DRAFT e 55 collezioni. Nessuna scrittura effettuata. Mapping Supabase, riconciliazione storica, autorizzazioni Marco, template/mittente/staff e recapito email restano non verificati. I gate di attivazione non cambiano.

## Review indipendente PR #42 — 31 ottobre 2026

Una seconda revisione ha trovato casi in cui un’approvazione generica o categorie non allineate avrebbero potuto autorizzare modifiche diverse da quelle previste. Il branch della PR è stato corretto: ogni approvazione riguarda ora una sola bozza o una proposta categorie esatta e ha una scadenza; il comando generale OFF blocca le nuove scritture; una differenza fra categorie interne e collezioni Shopify blocca l’operazione. Sono stati corretti anche il controllo dello SKU famiglia e la gestione della categoria primaria. La rimozione da collezioni attende il completamento del job Shopify prima di segnare il lavoro come verificato.

I test locali aggiornati passano, ma non è stato possibile confrontare lo schema con il database Supabase reale né collaudare le nuove operazioni su prodotti veri. Nessun prodotto, prezzo, giacenza, categoria, account o flag live è stato modificato. La PR resta **CHANGES REQUIRED** finché il nuovo commit non supera la CI/GitGuardian e la review del diff; l’eventuale integrazione del codice non autorizza di per sé la migration, l’attivazione per Marco o il rilascio commerciale. [Report tecnico e gate](./ADMIN-V2-QA-REPORT.md).

Il commit con le correzioni `d6a89bb` ha poi superato [CI GitHub](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41236000206) e GitGuardian. Resta necessaria la review della PR Draft e la verifica delle strutture Supabase reali prima dell'attivazione. Il commit documentale che registra questa evidenza deve avere un proprio controllo GitHub.

È stato ripetuto anche un controllo browser simulato su sei dimensioni desktop/mobile: navigazione Admin e stati principali funzionanti, senza chiamate ai dati reali. Questa verifica non sostituisce il collaudo dell'account di Marco o una prova controllata su Shopify.
