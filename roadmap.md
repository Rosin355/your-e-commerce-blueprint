# Consegna finale operativa — 28 novembre 2026

- [x] Product Editor V3: pubblicazione/ricevute riconciliate, checksum rollback intatti, preview autenticata iniziale PASS; gate runtime e rollback operativo documentato, nessun rilascio.
- [x] Redirect #82: CSV/pacchetti pilota e completo recuperati, 60 HTTP e 16 PDP DOM verificati; istruzione Cloudflare consegnata, nessuna attivazione senza accesso zona.
- [x] Archivio #84: backend/schema assente verificati, importatore esaminato e verbale privato unico predisposto; compatibilità DDL/canale import e backup/trattamento non approvati, nessuna migrazione/import.
- [x] Marco: ruoli/capability letti senza PII, preparata elevazione solo additiva; vecchio script revocante escluso, domanda nominativa aperta, nessun cambio reale.
- [x] Precisazione backup 13:20 UTC: documentazione ufficiale verificata, account Auth inclusi nel perimetro documentato; granularità ACL e restore reale non attestati. Il titolare conferma nessun ripristino; nessun blocco esteso agli altri filoni.
- [x] Autorizzazione Marco 13:21 UTC registrata; primo riscontro Auth aggregato confermato, seconda prova non disponibile negli incarichi. Richiesto documento preciso invito staff/onboarding indipendente con Marco ed email; nessuna promozione.
- [x] Schermata backup letta: ultimo punto 2026-11-28 05:31:17 UTC, nessun restore eseguito; documentata copertura Auth e granularità ACL/prova recupero ancora mancanti.
- [x] Aggiornati documentazione/guide e tabella finale distinguendo risultati reali e simulati; PENDING_CLIENT_ACCEPTANCE e SAL 57,75% invariati.
- [ ] Rilasciare editor — attende attestazione gestore runtime/rollback e GO produttivo.
- [ ] Attivare redirect — attende gestore autenticato Cloudflare, verifica precedenza e ricevuta pilota.
- [ ] Archivio reale — attende DDL/canale import compatibili, ricevuta recuperabilità e verbale privacy/fonte approvati.
- [ ] Elevare Marco ed eventuale singolo grant Curiosità — attende due attestazioni indipendenti e autorizzazione riferita all'account esatto.

# Consegna controllata Admin V2 — 28 novembre 2026

- [x] Identificare frontend pubblico per asset e baseline documentate delle sole product-admin-api / product-admin-ai, distinguendo sorgenti da runtime.
- [x] Preparare archivi e manifest ricostruibili, verificare il restore offline e controlli tipi dei quattro pacchetti senza distribuire nulla.
- [x] Verificare il candidato 14cd12a e il percorso browser simulato anteprima → modifica → approvazione → bozza → riapertura; 737 Node + 141 Deno + 46 browser PASS.
- [x] Verificare invarianti catalogo/checkout, mapping degli otto contenuti e predisporre una sola bozza tecnica senza crearla; grant reali Curiosità assenti, nessun permesso modificato.
- [x] Aggiornare verbale e checklist con un unico NO-GO e azioni minime; nessun A/B, permesso, deploy, Publish o dato reale modificato. [Consegna](docs/release/admin-v2-consegna-2026-11-28/README.md)
- [ ] Acquisire attestazione revisioni attive/artefatti e rollback provider — strumenti senza export runtime; unica azione di sblocco tecnico prima di chiedere autorizzazione al rilascio.

# Admin V2 — candidato Product Editor V3 (27 novembre 2026)

- [x] Deploy correttivo autorizzato della sola product-admin-ai da 874f2d3: manifest/ricevuta conservati, auth e log PASS, 43 regressioni offline PASS; zero Gemini, rollback non necessario. [Verbale](docs/release/DEPLOY-CORRETTIVO-PRODUCT-ADMIN-AI-V3-874f2d3-2026-11-27.md)
- [x] Preflight candidato 874f2d3: compatibilità, autenticazione non generativa, 850 prove offline, rollback sorgente e piano retest; GO condizionato, nessun deploy/Gemini. [Rapporto](docs/release/PREFLIGHT-RETEST-GEMINI-V3-874f2d3-2026-11-27.md)
- [x] Separare il candidato dalla #78 e derivare la V3 dalla head della #80, che dipende dalla #79.
- [x] Collaudare il percorso UI, le conferme per campo, la copertura Yucca e la riapertura di una singola bozza interna con provider simulato.
- [ ] UAT cliente sul percorso V3 — richiede accettazione personale; nessun ulteriore confronto A/B autorizzato.
- [ ] Verificare separatamente il modello reale @3 in ambiente autorizzato. Rilascio del frontend e della funzione AI da decidere dopo il collaudo.
- [x] Integrare e verificare in isolamento la #78 nel candidato 14cd12a; rilascio reale ancora soggetto al gate rollback. **PENDING_CLIENT_ACCEPTANCE · SAL 57,75%.** [Verbale V3](docs/release/ai-editor-v3/README.md)

# Admin V2 — metafield/publication audit (2026-11-26)

- [x] Identify exact test product via canonical Admin link, operation and SKU; compare stored values and read source.
- [x] Diagnose draft metafield omission, missing per-field verification and explicit publication channel scope; run isolated regressions.
- [x] Document diagnosis, mapping limitations and correction plan; no application edits or deployment.
- [x] Read live exact Product/Variant/SKU, 26 PRODUCT definitions, Admin-visible field values, stock-zero match, images and public PDP after official Shopify reconnection; no writes.
- [ ] Complete Online Store publication IDs, market context, definition access and values of unmapped taxonomy/long-description fields — existing read endpoints do not expose them completely; do not add/deploy an endpoint implicitly.
- [x] Confirm seasonal values' origin — user confirmed manual selection at 18:05 UTC; no evidence of AI-generated months, factual review remains separate.
- [x] Check sibling Admin field/review/create/recovery/publication paths and live draft/sync RPC contracts; document gaps without changing settled records.
- [x] Prepare approved source-only candidate e612b24 with paginated live definitions, per-field botanical acknowledgement, local/remote read-back and failure reconciliation; 128 Node + 34 Deno PASS; browser review invalidation PASS.
- [ ] Deploy candidate and publish Admin messages — requires separate renewed authorization and remaining live checks; production remains unchanged.

# Admin V2 — real UAT fixes (2026-11-26)

- [x] Prepare lean paginated gallery/formats reads and scoped-grant regressions; no grant changes.
- [x] Replace extractive description/fallback with evidence-indexed AI proposals and explicit failures; retain draft approval.
- [x] Run synthetic regressions, Admin browser preview and controlled AI checks; document results.
- [ ] Confirm original gallery/formats production failure — available Admin lacks Marco's asset field scope; requires an equivalent authorized Editor session/network evidence.
- [ ] Approve AI factual fidelity on both real UAT inputs — short generation introduced unverified editorial claims; extended generation rejected; both exact UAT inputs received; original live model fidelity still awaits controlled retest.
- [x] AI-only backend deployed after renewed coordinated authorization; frontend published and public bundle verified. Gallery/formats API fix remains held pending authorized Editor evidence.
- [ ] Marco acceptance — must be retested on his device after validated release; PENDING_CLIENT_ACCEPTANCE.

# Historical security audit — outside this UAT-fix scope

- [x] Validate all 15 existing findings against current source and live read-only evidence; runtime order retirement remains unverified.
- [x] Prepare and test source-only fixes for confirmed endpoint vulnerabilities.
- [x] Verify Admin V2, storefront and cart without purchases or catalog writes.
- [ ] Complete checkout verification — pre-Publish check again stuck on checkout creation; requires diagnosis authorization.
- [x] Repeat quick security scan.
- [ ] Obtain final deep scan — final saved migration requires asynchronous scan result.
- [x] Report every finding and request approval before preparing production permission changes.
- [x] Apply approved role-disclosure restriction; preserve grants, roles, capabilities and policies.
- [ ] Verify Marco's authenticated UI — existing Admin session available, no Marco session authorized.
- [ ] Publish authorized but stopped: checkout verification failed; no frontend publication performed.
# Definitive AI editor correction (2026-11-26)

- [x] Reuse candidate; preserve valid sections with explicit warnings, safe rendering and manual approval.
- [x] Regressions with exact Yucca and exact short evergreen UAT input now received; retain separate synthetic fixtures.
- [x] Non-destructive preview validation and scoped AI-only deployment: runtime marker/OPTIONS/no-auth PASS.
- [x] Update existing report and status; retain PENDING_CLIENT_ACCEPTANCE.

- [x] Post-Publish verification after coordinated release: verify AI/Admin-only frontend diff, deploy only product-admin-ai and Publish; stop on scope drift, no product-admin-api or Shopify writes.

- [ ] Authenticated production retest and real Gemini acceptance — requires Marco’s session/device; do not create accounts or impersonate.
