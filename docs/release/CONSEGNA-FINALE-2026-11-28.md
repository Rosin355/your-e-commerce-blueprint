# Online Garden — consegna finale controllata

Verifica del 28 novembre 2026, 13:11–13:23 UTC, incluse le precisazioni del titolare alle 13:20 e 13:21. **NO-GO alla consegna produttiva completa. PENDING_CLIENT_ACCEPTANCE · SAL 57,75%.** I filoni sono valutati separatamente. Nessun codice applicativo, modello, secret, configurazione, ruolo, dato o infrastruttura modificato; zero deploy, Publish, merge, migrazioni, chiamate Gemini, scritture Shopify e salvataggi di bozze. Questa revisione completa documentazione e pacchetti operativi, non attesta funzionalità nuove in produzione.

## Tabella unica di consegna

| Funzione | Codice pronto | Rilasciata | Verificata in produzione | Blocco |
|---|---|---|---|---|
| Product Editor V3 | Sì, candidato applicativo #83 `14cd12a82192e54156815100ce7e5689e03a8654`; nessun diff applicativo | No, frontend pubblico del 26/11; AI correttiva precedente documentata | Preview autenticata iniziale PASS; percorso completo già PASS con fixture, non UAT produttiva | Revisioni attive e rollback selettivo non attestati. Una richiesta al gestore degli artefatti, definita sotto, prima del GO e dell'autorizzazione finale |
| Metafield e Curiosità | Mapping degli otto contenuti pronto nel candidato #83/#78 | Correzione integrata non rilasciata; Curiosità zero grant | Registro live riletto, non nuova create/read-back Shopify | API live non annuncia supporto Curiosità. Dopo rilascio verificato, autorizzare privatamente un solo grant `curiosita` sull'account esatto e, separatamente, la singola DRAFT tecnica |
| Redirect 301 | Sì, #82 `6257b677a7c14e709e5e2ecd41038f66647e6921`; 16 percorsi / 32 abbinamenti, pacchetti pilota/completo già generati | No: 0 redirect legacy→PDP osservati sui 32 URL HTTPS | 60 GET e 16 PDP renderizzate: zero errori; 16 canonical corretti; nessun redirect diretto | Nessuna sessione zona Cloudflare disponibile. Gestore della zona: applicare il pacchetto esistente pilota→completo e consegnare ricevuta/rollback; istruzione esatta sotto |
| Archivio clienti | #84 `ce9514f3660c4255c1c2bd780beee4a048406ccc` disponibile, ma non applicabile invariato coi vincoli Cloud correnti | No, schema archivio assente; 0 clienti importati | Soltanto letture aggregate del progetto esistente; precedenti prove locali non equivalgono a produzione | Backup e trattamento non approvati; CSV originale non disponibile in questo sandbox; schema/FK e importatore richiedono verifica di compatibilità Cloud. Sottoporre l'unico verbale privato al titolare/custode prima di schema, import e pubblicazione |
| Admin Marco | Elevazione globale additiva definita; vecchia proposta di parità esatta NON utilizzabile per questo mandato | No, candidato staff ancora Editor | 1 Admin + 2 assegnazioni Editor; due grant attivi con 8 capability, 17/22 campi e 0/3 opt-in | Autorizzazione additiva ricevuta alle 13:21 UTC; seconda prova nominativa indipendente assente. Allegare privatamente invito staff preesistente o attestazione di onboarding che identifichi Marco e la sua email; nessuna promozione prima del confronto univoco |

## 1. Identità e versioni: fatti, non supposizioni

- Repository: `Rosin355/your-e-commerce-blueprint`.
- Checkout iniziale pulito: `codex/ai-product-editor-v3-20261127`, HEAD documentale **`3c4deda689f21a34ee23d4d9cb2921470acf7f33`**. Applicativo invariato rispetto a **`14cd12a82192e54156815100ce7e5689e03a8654`**. PR #83 aperta, non merged; controllo GitHub della head iniziale concordante. Il nuovo commit di questa consegna modifica solo documentazione.
- PR #82 aperta, head **`6257b677a7c14e709e5e2ecd41038f66647e6921`**. PR #84 aperta, head **`ce9514f3660c4255c1c2bd780beee4a048406ccc`**. Recuperati soltanto file pertinenti per lettura/packaging; nessuna integrazione dei rami nel candidato.
- Preview: https://id-preview--95cad199-55fd-4870-9d5c-a2653edf88f5.lovable.app/admin/products/new
- Pubblicazione restituita dal provider: **2026-11-26T17:09:40.296219Z**, pubblica, con modifiche non pubblicate.
- Bundle frontend ancora **`index-kMoBF-yp.js`**, SHA-256 **`5f56ebc6dba0610359a64dfa936fc4744419e796d45687728d113fd6dcd4c05d`**; CSS **`index-jst0clO4.css`**, SHA-256 **`20e6fa8033d9c163e78c330641c33c4e7a36085c1b14147ea26b4cc0de42878d`**. Byte uguali su `onlinegarden.it` e `ecom-blueprint-gen.lovable.app`, come nella baseline conservata. Non è un deployment ID.
- `product-admin-api`: ultimo sorgente documentato **`f32989def1fc4d3593744d60c83836a46f247329`**, ricevuta **`04c778bd3ab3c9a847fe971c68e0e2770397b947258c426fae3e1a34d39692cd`**. Risposta live autenticata odierna: **`backendVersion=admin-editor-20261125`**, descrizioni distinte e sheet evidence supportati; **`supportsManualDraftCuriosity` assente**. Il marker non distingue univocamente le revisioni.
- `product-admin-ai`: ultimo sorgente distribuito documentato **`874f2d398bdb4c635955243ac2a3e1fc5546a254`**, manifest 31 moduli **`d6c02bbce3b9d7365a16278487ac32edfcfbcddadab0b08f196dd54b7e9ccf41`**, ricevuta **`14af6f9a418c63416d46ee02ab570f85f718ddecef55101a3d37bdc4f27fc332`**. La ricevuta conserva `deployment_id=null` e `runtime_sha_attested=false`. Nessuna generazione usata per dedurre lo SHA attivo.
- OPTIONS reale delle due funzioni alle 13:17:44 UTC: **200 / 200**. `sb-request-id` e `x-deno-execution-id` identificano richieste/esecuzioni, **non** deployment. La ricerca dei log per versione non restituisce una revisione attestabile.

## 2. Rollback: limite risolto documentalmente, gate non aggirato

I cinque archivi conservati nella [consegna precedente](admin-v2-consegna-2026-11-28/README.md#2-artefatti-e-verifica-del-rollback) sono integri: ricalcolati oggi gli SHA-256, tutti identici ai manifest. Restore offline byte-per-byte e controlli dei quattro pacchetti Edge erano già PASS: non ripetuti né riclassificati come rollback operativo.

Baseline separata `product-admin-api`: 40 moduli; baseline `product-admin-ai`: 31 moduli. Candidati: 44/31 moduli. Ogni eventuale ridistribuzione deve usare il grafo storico completo della funzione selezionata, non entrypoint vecchi con shared correnti. Non toccare DB, journal o Shopify durante rollback dell'editor.

**Procedura ufficialmente documentata:** History → versione marcata Published → Revert → Publish changes ripubblica il frontend precedente. Tuttavia Revert può ridistribuire tutte le Edge Functions cambiate nella versione: non è un rollback solo-frontend sicuro per questo mandato. La documentazione non offre upload di un archivio frontend arbitrario nel hosting Lovable né garanzia selettiva su `verify_jwt`. Non eseguire Revert generale per provare il recupero.

La distribuzione nominativa di singole funzioni è documentata, ma non costituisce attestazione della revisione oggi attiva né prova di recupero già riuscito. Secret sono gestiti separatamente e write-only. Oggi rilevata solo presenza dei nomi Shopify, Lovable AI e flag operativi; valori non letti, modificati o esportati. Configurazione JWT live e conservazione completa attraverso il rollback **non attestate**. Ruoli e grant riletti separatamente e preservati.

**Unica richiesta di attestazione al gestore degli artefatti:** nel registro di rilascio del progetto Lovable far attestare (1) ID/versione e timestamp attivi di frontend/API/AI, o assenza documentata di tali ID; (2) corrispondenza con i checksum/ricevute sopra; (3) modalità supportata per ripristinare separatamente il frontend e ciascuna delle due funzioni con i propri shared; (4) conservazione verificata di secret, JWT/config e ACL; (5) prova operativa pertinente, con esito e durata. Non richiedere chiavi o credenziali. Se tale prova non è disponibile, il gate resta NO-GO: non inventare una garanzia.

Fonti ufficiali verificate: [Edge Functions](https://docs.lovable.dev/features/edge-functions), [History](https://docs.lovable.dev/features/projects/history), [Publish](https://docs.lovable.dev/features/publish), [Secrets](https://docs.lovable.dev/features/secrets).

**Sequenza autorizzabile dopo il gate:** solo candidato #83 → sole `product-admin-api` e `product-admin-ai` con dipendenze corrette → auth/contratto legacy non generativi → frontend Publish → smoke Admin/PDP/cart/checkout senza ordini. Nessuna migrazione richiesta dal solo Product Editor. Gemini **3 Flash Preview** invariato, nessun A/B. Salvataggio interno/riapertura produttivi non eseguiti oggi; richiedono il futuro collaudo autorizzato.

## 3. Preview e pubblico: collaudi reali distinti da fixture

Sessione del richiedente aperta in preview: ruoli Admin+Editor restituiti dal servizio, quattro POST di sola lettura verificati nel sorgente (`get_admin_context`, `get_field_definitions`, `list_editorial_collections`, `catalog_categories`) tutti **200**. **Anteprima cliente**, **Genera scheda completa con AI**, **Editor avanzato** visibili; passaggio all'editor avanzato osservato. Zero errori pagina e zero invocazioni AI. Una lettura media aggiuntiva è stata bloccata precauzionalmente dal banco: non è un errore del prodotto né prova di galleria fallita. Nessun caricamento o scrittura media.

Il percorso completo anteprima → modifica → confronto/annullamento → approvazione → bozza → riapertura è già verificato nel banco esistente con `scripts/tests/fixtures/yucca-filamentosa-v3.json`: **737 Node + 141 Deno + 46 browser = 924 test simulati PASS**. Evidenze precedenti conservate, non ripetute per ottenere un nuovo numero. Le 254 parole sono della fixture, non Gemini. Nessuna demo artificiale o salvataggio reale introdotto.

Homepage, `/products` e Rosa Jasmina in browser pubblico: **200**, contenuti e comandi acquisto visibili. Le 16 PDP redirect sono state renderizzate oggi: **16/16 HTTP 200**, URL finale e canonical attesi, H1 presente, nessun noindex. Gli HTML grezzi SPA non contengono il canonical: verifica fatta sul DOM dopo render, non sul solo HTTP 200.

Nessun carrello/checkout modificato e nessun ordine avviato oggi. Il checkout con riepilogo Shopify verificato il 28/11 è evidenza precedente, non un nuovo PASS corrente. Gli asset pubblici invariati documentano che questa consegna non modifica lo storefront. Il candidato modifica anche resa editoriale PDP: verificarla dopo il futuro Publish, non promettere identità visuale futura.

## 4. Mapping e singola DRAFT futura

Registro live riletto: `description` → `descriptionHtml`; `short_description` → `custom.short_intro`; `faq` → `custom.faq_prodotto`; `key_features` → `custom.key_features`; `key_benefits` → `custom.key_benefits`; `curiosita` → `custom.curiosita`; `seo_title` / `seo_description` → SEO Shopify; `tags` → tags nativi. Tutti visibili/editabili nel registro; Curiosità **manual_only=true**. Non è un nuovo read-back di valori Shopify.

Descrizione, breve, FAQ, caratteristiche, punti di forza e SEO hanno grant su entrambi i profili staff osservati. Tag soltanto sul profilo Editor con 22 campi. Curiosità ha **zero grant** e manca il supporto API live: non persistibile autonomamente oggi. Restano soltanto visualizzati proposta non approvata, confronto, fonti e diagnostica; approvazione non equivale a salvataggio.

**Preparazione minima Curiosità:** una sola aggiunta della chiave `curiosita` al grant esistente dell'account esatto nominativamente approvato, preservando ogni altra chiave; nessun opt-in AI perché il contenuto è manuale. Non applicata. Subordinata al rilascio API e a consenso specifico sul destinatario.

La singola bozza tecnica rimane soltanto il [piano già pronto](admin-v2-consegna-2026-11-28/BOZZA-TECNICA-PIANO.json): SKU `OG-QA-ADMINV2-20261128-14CD12A`, titolo TEST Yucca, DRAFT, nessun canale/pubblicazione. Non creata. Prima della futura create: autorizzazione distinta, ricerca SKU esatta, chiave idempotente, salvataggio/riapertura e read-back stesso GID; timeout non autorizza una seconda create. Valori commerciali tecnici del piano ancora da approvare.

## 5. Cloudflare: azione esatta, non nuovo studio SEO

Accesso autenticato alla zona **non disponibile**: nessun connettore Cloudflare, nessun secret relativo e nessuna credenziale ambiente rilevata; `dash.cloudflare.com` mostra il challenge, non la zona autenticata. Nessun login aggirato, DNS modificato o rule attivata.

Da #82 recuperato il CSV definitivo invariato, senza intestazioni, 32 abbinamenti. **Non importarlo come regola generale attiva:** `preserve_query_string=FALSE` eliminerebbe UTM. Il contratto completo già implementato usa `build-rollout.mjs` per produrre i pacchetti autosufficienti: pilota Rosa Jasmina (1 percorso / 2 route) e completo (16 / 32). Generati con il generatore invariato e checksum manifest obbligatorio; nessun nuovo sviluppo.

**Unica azione nel tuo account Cloudflare:** apri `dash.cloudflare.com`, seleziona la zona **onlinegarden.it** e fai eseguire al gestore autorizzato il change del pacchetto allegato tramite **Workers & Pages**: Worker `og-legacy-products`, modulo `worker.mjs`, route esatte del `wrangler.json`. Prima conserva versione/route/ordine delle regole esistenti; non sovrascrivere un Worker o route appartenenti a un altro servizio. Applica prima **pilota**, controlla 301 diretto sui due host e HTTP/HTTPS, quindi sostituisci con **completo** soltanto dopo PASS. Se regole di normalizzazione precedenti intercettano il pilota, il gestore deve isolare esattamente quei percorsi rispettando l'ordine Cloudflare; senza tale verifica, non attivare.

Il modulo preserva UTM consentiti anche ripetuti, elimina `attribute_dimensioni` legacy, passa all'origine query ignote e metodi non GET/HEAD. Non convertire una dimensione Woo in un ID variante Shopify inventato. I 1.258 percorsi sospesi restano fuori.

Verifica dopo attivazione, dal checkout #82: `python3 infra/seo/check-redirect-http.py --pilot --expect-active`, poi `python3 infra/seo/check-redirect-http.py --expect-active`. Primo salto esatto 301, destinazione diretta 200, UTM conservati, query sconosciute passanti, niente cicli. Rollback: ripristinare solo versione Worker, route e precedenza esportate; nessun cambio DNS/checkout.

Oggi: **0 redirect legacy→PDP diretti su 32 sorgenti HTTPS**, 60 GET (32 sorgenti, 16 destinazioni, 12 varianti query pilota), tutti conclusi senza errori. I 301 di normalizzazione www/protocollo non contano come redirect prodotto attivo. Le 272 verifiche precedenti rimangono evidenze storiche, non ripetute.

## 6. Archivio privato: prerequisiti ed impedimenti esatti

Il backend collegato è il **Lovable Cloud esistente**, stesso ambiente per preview e pubblico, attivo. Nessun secondo progetto creato. Lettura odierna: schema `woo_archive` **assente**; 0 clienti importati nell'archivio. `/admin/clienti-storici` può rispondere 200 come fallback SPA: non prova una route applicativa pronta, che manca nel candidato #83.

Il CSV originale non è nel mount degli upload o negli input identificati di questo sandbox: **non dichiarato riletto**. Censimento precedente nel verbale #84: 5.453 account totali, **5.450 customer**, **857 acquirenti**, **952 acquisti dichiarati**; nessun dettaglio delle 953 transazioni. L'importatore recuperato proietta solo ID storico, nome, cognome, email e contatore; controlla i quattro totali, unicità ID, snapshot divergente, replay e transazione unica. Non crea account Auth/Shopify, non importa password/hash/token/indirizzi/consensi.

**Compatibilità da chiudere prima dell'applicazione:** la migrazione #84 crea tabelle/funzioni applicative in `woo_archive` e un FK `woo_archive.page_admins.user_id → auth.users`. I vincoli correnti di Lovable Cloud richiedono oggetti applicativi in `public` e consentono FK diretti Auth soltanto a `public.profiles`/`public.user_roles`. Perciò la migrazione **non viene applicata invariata**. La privacy deve essere mantenuta da RLS/ACL e RPC controllate, non da una promessa non verificata sul nome schema. **Azione unica per questo blocco tecnico:** far adeguare al maintainer della PR #84 il DDL esistente ai vincoli Cloud, conservando contratto RPC, dinieghi e audit; nessuna riscrittura esplorativa eseguita qui.

L'importatore reale esistente richiede `PGSERVICE` e un writer libpq verificato. Lovable Cloud non espone password DB o service-role al titolare: non chiedere credenziali inesistenti. Il gestore deve attestare un canale d'import supportato per questo importatore **prima** di autorizzare B; nessuna nuova funzione/importer sviluppata o distribuita implicitamente.

**Unico verbale privato di messa in esercizio predisposto fuori da Git/GitHub**, senza nominativi reali: identifica fonte/sha in deposito riservato, finalità/base giuridica/conservazione, responsabili, backup produttivo con Auth/ruoli/ACL, procedura di recupero, canale import, approvazioni separate A schema / B import / D Publish e controlli di uscita. Nessun dato personale inserito in log, AI o GitHub.

**Schermata ricevuta e letta alle 13:21 UTC:** backup più recente **2026-11-28 05:31:17 UTC**; undici righe complete visibili dal 18 al 28 novembre, con altre righe fuori inquadratura. Non dedurre un inventario totale. Il titolare conferma **nessun ripristino eseguito**. La documentazione ufficiale [Database backups](https://docs.lovable.dev/features/database-backups) copre struttura/dati e account Auth e descrive Restore to this backup nello stesso progetto; non attesta puntualmente oggetti ACL/GRANT/RLS né il risultato di un restore specifico. **Azione residua unica del titolare/custode:** completare il verbale privato con attestazione del gestore per copertura ACL/ruoli e prova di recuperabilità pertinente, oltre a fonte e trattamento; non eseguire Restore sulla produzione per ottenere la prova. Una fotografia del backup non è una prova di restore riuscito. Backup giornalieri: schema+dati, nessun PITR e storage escluso; export completo da **More → Database → Manage → Settings → Export project data** include Auth, ma non secret/provider/storage. Nessun export o restore produttivo avviato oggi. Il verbale di #84 che menziona PITR è storico: non attribuirlo a Cloud.

## 7. Marco: equivalenza funzionale, non revoca degli extra

Lettura live senza UUID/email nei risultati: un Admin+Editor e un altro profilo Editor, entrambi abilitati con **8 capability identiche**. Riferimento Admin: **17 campi, zero opt-in**. Editor: **22 campi, tre opt-in**; extra `tags`, `product_gallery`, `product_formats`, `product_unpublish`, `product_archive`; opt-in `seo_title`, `seo_description`, `tags`. Nessun `product_delete` nei grant osservati. Non attribuire definitivamente il secondo profilo a Marco solo dal nome o dai permessi.

**Incompatibilità concreta della proposta esistente:** `parita-admin.proposta.sql` della #84 aggiunge Admin ma poi sostituisce i campi col riferimento e cancella i tre opt-in. Contrasta col nuovo mandato. Script **non eseguito, non modificato e non proposto come procedura autorizzata**; l'indicazione di parità esatta nella documentazione storica è superata.

**Autorizzazione condizionata ricevuta dal titolare alle 13:21 UTC:** aggiungere solo Admin, mantenere Editor e tutti gli extra, non cambiare il responsabile; richiede due prove indipendenti, backup configurazione, audit e rollback. Auth verificata in sola lettura con output solo aggregato: un unico candidato Editor senza Admin è attivo con email confermata. Questo non è la seconda attestazione. Gli incarichi nominativi già caricati non contengono un collegamento documentale indipendente a UUID/email. **Documento esatto mancante:** copia privata dell’invito staff preesistente o verbale di onboarding verificato che riporti Marco e la sua email personale; deve provenire da una fonte indipendente dal record Auth, senza password, codici o token. Confrontare quell’email col record Auth e associare univocamente il relativo UUID; senza documento non promuovere.

**Change minimo preparato, non applicato:** verificare privatamente entrambi gli account con due riferimenti indipendenti, utente attivo/email confermata e baseline; autorizzazione sull'UUID esatto; aggiungere soltanto una riga `public.user_roles` ruolo `admin` al destinatario, mantenendo `editor`, grant/campability/campi e tutti gli opt-in. Nessun `tech_admin`, nessun Shopify staff implicito, nessuna revoca.

La promozione apre anche endpoint legacy protetti da `denyUnlessAdmin`: l'assenza di `product_delete` nel grant catalogo non certifica da sola l'impossibilità di operazioni Admin privilegiate indirette. L’autorizzazione ricevuta riguarda il ruolo globale; verificare comunque il perimetro effettivo prima del change, senza revoche implicite; non cambiare i controlli per facilitare la prova.

Rollback nominativo: conservare privatamente ID della sola riga aggiunta, attore e riferimento approvazione; in regressione revocare **solo quella riga**, mantenere Editor ed extra, rinnovare le sessioni secondo procedura autorizzata. Nessuna promozione reale oggi.

UAT successiva con **due sessioni personali separate**: dashboard, catalogo, bozze, categorie, diagnostica; archivio soltanto dopo A/B/D. Confrontare visibilità e accesso server, non identità perfetta dei grant; export motivato con audit per attore. Nessuna sessione Marco aperta o impersonata in questa verifica.

## Checklist finale

- [x] PR/commit effettivi verificati; nessuna integrazione applicativa.
- [x] Pubblicazione e byte frontend baseline confrontati; ricevute Edge e checksum archivi riconciliati.
- [x] Limite runtime e rollback provider dichiarato con una sola richiesta di attestazione.
- [x] Preview autenticata e pubblico verificati senza Gemini/scritture; prove 924 precedenti conservate.
- [x] Mapping live, grant e piano singola DRAFT non creata verificati.
- [x] CSV e pacchetti #82 esistenti recuperati; 60 HTTP e 16 DOM PDP verificati.
- [x] Schema/ruoli live letti in aggregato; fonte/importatore e limiti #84 documentati.
- [x] Verbale privato unico preparato; procedura Marco additiva distinta dal vecchio script revocante.
- [ ] Attestazione rollback e GO produttivo editor: gestore artefatti.
- [ ] Attivazione Cloudflare pilota/completo: gestore zona autenticato.
- [ ] Compatibilità DDL/canale import #84: maintainer e gestore Cloud.
- [ ] Backup/prova recupero e trattamento/fonte autorizzati: titolare/custode.
- [ ] Seconda prova indipendente Marco: documento onboarding/invito privato; autorizzazione additiva già ricevuta. Eventuale grant Curiosità resta separato.
- [ ] UAT e accettazione documentata: cliente. **PENDING_CLIENT_ACCEPTANCE · SAL 57,75%.**