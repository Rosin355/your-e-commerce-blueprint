# Admin V2 PR #42 — runbook di integrazione e attivazione

**Preparato il 1 novembre 2026; nessuna fase eseguita con questo documento.** La PR #42 può essere integrata come codice soltanto dopo i gate di review; l'integrazione non autorizza migration, deploy, scritture, pubblicazione o modifica del catalogo. Baseline tecnica: [compatibilità Supabase](ADMIN-V2-LIVE-SUPABASE-COMPATIBILITY.md) e [matrice categorie](ADMIN-V2-CATEGORY-RECONCILIATION-PLAN.md). Registrare per ogni gate operatore, approvatore, ambiente, SHA, UTC, esito ed evidenze in un ticket di change.

## Gate 1 — merge del solo codice, scritture OFF

- **Prerequisiti:** PR #42 su base corretta, CI/GitGuardian verdi sul suo HEAD finale, review GitHub adeguata, diff finale limitato ad Admin V2/migration/documenti. Verificare che `PRODUCT_ADMIN_WRITES_ENABLED`, `PRODUCT_ADMIN_DRAFTS_ENABLED`, `PRODUCT_ADMIN_DRAFT_SHOPIFY_ENABLED` e `PRODUCT_ADMIN_CATEGORIES_ENABLED` siano assenti o `false` nell'ambiente di destinazione. Nessuna configurazione di approvazione operativa attiva. Per dichiarare *tutto* l'Admin read-only verificare separatamente anche `PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED=false`: la sync a campo singolo preesistente ha un interruttore indipendente, che questo merge non cambia.
- **Operazione proposta:** merge tramite normale processo del repository, senza eseguire migration o deploy automaticamente. Per il rilascio frontend/backend successivo, distribuire prima la funzione API compatibile con le nuove letture e poi il frontend, mantenendo i flag OFF.
- **Rischio e test di accettazione:** con migration assente, le letture delle tabelle esistenti devono funzionare; la pagina dettaglio può mostrare il messaggio gestito «Storico nuove bozze non disponibile» perché il journal non esiste ancora, senza crash del prodotto. Le pagine nuove devono mostrare empty/error state e nessuna CTA di scrittura abilitata. Richieste costruite manualmente a save/create/apply/recover devono fallire prima di scrivere. Nessuna regressione alle pagine Admin V2 già attive o allo storefront.
- **Rollback/recupero:** revert del codice/deploy al precedente SHA se il read-only degrada; non eliminare tabelle o dati. Se esistono operazioni `IN_FLIGHT` da una fase successiva, non ripetere Shopify e non cancellare journal: passare alla riconciliazione tecnica.
- **Evidenza obbligatoria:** SHA e check GitHub, review, snapshot flag senza valori sensibili, smoke read-only Admin V2 desktop/mobile, prova negativa delle mutation.

## Gate 2 — backup e migration autorizzata, preferibilmente in staging

- **Prerequisiti:** Gate 1 accettato; progetto Supabase `iekwvvihjwghosqdxrdi` confermato nel contesto di deployment; finestra e approvazione esplicita; backup/snapshot verificabile e piano di restore; staging con schema e dataset rappresentativi. Nessun comando di migration viene eseguito in questa review.
- **Operazione proposta:** applicare solo `20261031184521_admin_operational_drafts.sql` nello staging concordato; confrontare schema prima/dopo, owner, PK/FK, UNIQUE, CHECK, indici, trigger, `search_path`, RLS, policy e grant/EXECUTE per `anon`, `authenticated`, `service_role`.
- **Rischio e test di accettazione:** la migration deve essere additiva, senza variazione di righe/DDL preesistenti. Test negativi: ruoli client non leggono journal né eseguono le RPC; test positivi: service role con attore/ruolo corretto, idempotenza e SKU duplicato. Verificare che il frontend read-only continui a funzionare con flag OFF.
- **Rollback/recupero:** fermare l'attivazione se DDL/ACL divergono; preferire una migration correttiva in avanti. Non fare `DROP` automatico dei journal e non ripristinare il DB senza valutare operazioni registrate. Restore solo con procedura autorizzata.
- **Evidenza obbligatoria:** backup testato, hash migration, diff cataloghi prima/dopo, risultati ACL/RLS/RPC, test di regressione, approvazione change.

## Gate 3 — approvazione del mapping categorie, solo letture

- **Prerequisiti:** Gate 2 verificato; snapshot aggiornato delle 22 categorie interne, 23 handle canonici e collezioni Shopify; responsabile prodotto/tassonomia identificato. La [matrice](ADMIN-V2-CATEGORY-RECONCILIATION-PLAN.md) è una proposta, non un mapping già approvato.
- **Operazione proposta:** rileggere handle/GID/tipo e conteggi Shopify; confrontare gerarchia e contenuti; decidere per ogni categoria se un match è esatto sul piano semantico, plausibile, multiplo o assente. Generare anteprima del diff con categorie prive di match, collezioni legacy e impatto potenziale su prodotti già pubblicati.
- **Rischio e test di accettazione:** nessuna inferenza da titolo/descrizione prodotto; nessuna equivalenza automatica 22↔23. Ogni riga approvata deve avere ID interno, GID Shopify unico, handle, tipo `custom/manual`, fonte, approvatore e timestamp; i conflitti bloccano.
- **Rollback/recupero:** revocare la proposta prima di qualunque write; conservare decisioni e motivazioni. Nessun prodotto o collezione cambia in questo gate.
- **Evidenza obbligatoria:** manifest versionato, diff read-only, firma di Marco o del responsabile delegato, elenco esplicito delle righe sospese.

## Gate 4 — applicazione controllata del solo mapping approvato

- **Prerequisiti:** Gate 3 approvato e distinta autorizzazione di scrittura sul database; backup recente; manifest immutabile con hash; nessun drift di handle/GID/tipo rispetto allo snapshot approvato.
- **Operazione proposta:** transazione idempotente per `product_category_shopify_map` soltanto sulle righe approvate; nessuna associazione prodotto e nessuna mutation Shopify implicita. Registrare actor, fonte, stato e timestamp. Rileggere il mapping e confrontarlo riga per riga con il manifest.
- **Rischio e test di accettazione:** UNIQUE su GID/handle e foreign key rispettate; nessuna categoria ambigua o collezione smart ammessa; nessuna modifica a prodotti, prezzi o inventory. L'Admin V2 deve mostrare solo categorie con mapping verificato.
- **Rollback/recupero:** fermare al primo conflitto e non ritentare in massa; eventuale correzione in avanti con nuova approvazione, preservando l'audit. Un mapping registrato non dimostra che le membership Shopify dei prodotti siano allineate.
- **Evidenza obbligatoria:** transazione e conteggi prima/dopo, hash manifest, audit dell'operatore, verifica post-write e diff zero sulle tabelle prodotto.

## Gate 5 — un solo prodotto Shopify DRAFT canary

- **Prerequisiti:** Gate 4 e verifica Shopify Admin degli SKU/GID; SKU nuovo concordato e ricerca esatta senza collisioni; product/variant GID legacy non in conflitto; prezzo/valuta/immagini/testi approvati; autorizzazione scritta per una sola bozza. Pubblicazione e canali restano fuori scope.
- **Operazione proposta:** abilitare temporaneamente master write e flag bozza pertinenti, con `PRODUCT_ADMIN_OPERATIONAL_APPROVAL` limitata all'`operationId` e con scadenza; creare bozza interna, poi una sola DRAFT Shopify. Verificare marker, status DRAFT, SKU parent/varianti, prezzi, GID e link atomici; riportare i flag OFF alla fine.
- **Rischio e test di accettazione:** timeout o esito incerto non autorizzano una seconda `productSet`. Il recupero è una scrittura Supabase: con master OFF ora è bloccato; per completarlo serve riabilitazione esplicita e temporanea, approvata, dello stesso gate. Nessuna vendita, ordine o pubblicazione reale.
- **Rollback/recupero:** se l'esito è incerto, lasciare `NEEDS_RECONCILIATION`, cercare per marker/handle e riconciliare senza ricreare. Non cancellare automaticamente Shopify DRAFT o journal. Tornare ai flag OFF e conservare l'evidenza.
- **Evidenza obbligatoria:** approvazione, snapshot flag, operationId/hash non segreto, esito Shopify read-after-write, GID verificati, stato journal, assenza di pubblicazione e report di recovery.

## Gate 6 — account Marco, Safari/iOS e errori

- **Prerequisiti:** Gate 5 completato o recuperato; account reale di Marco con ruolo concesso tramite processo esistente; ambiente staging e dispositivi/browser concordati.
- **Operazione proposta:** provare letture, ricerca, categorie approvate, form manuale senza AI, anteprima e messaggi di errore con flag OFF; poi solo se autorizzato il canary con ruolo previsto. Testare Safari desktop/iOS, viewport compatti, focus, annunci screen reader, scadenza approvazione, perdita rete, timeout e drift categorie.
- **Rischio e test di accettazione:** nessuna escalation di ruolo dal client o da richiesta manuale; nessuna CTA per azioni non autorizzate; nessuna ripetizione delle mutation dopo esito incerto; recovery esplicito. Non dichiarare WCAG AA completa senza audit completo.
- **Rollback/recupero:** disattivare flag, bloccare nuovi invii e conservare journal; correggere in codice o con forward fix approvato, poi ripetere i test falliti.
- **Evidenza obbligatoria:** matrice browser/device/ruolo, screenshot, log sanificati, esiti error/timeout, firma QA e cliente.

## Gate 7 — decisione capabilities e pubblicazione

- **Prerequisiti:** Gate 6 approvato; catalogo e mapping riconciliati; decisioni commerciali su prezzi, disponibilità, canali, email e responsabilità del cliente documentate.
- **Operazione proposta:** definire in una modifica separata chi può salvare, inviare DRAFT, associare categorie e pubblicare; riesaminare permessi Shopify/Scope, controlli di approvazione e audit. Nessuna capability di pubblicazione nasce dal merge della PR #42.
- **Rischio e test di accettazione:** verificare checkout sandbox autorizzato, pubblicazioni Headless, notifiche, rollback e tutela dei prodotti già pubblicati; ottenere approvazione commerciale esplicita.
- **Rollback/recupero:** mantenere DRAFT e flag OFF se un gate fallisce; non rimuovere dati canonici né riutilizzare SKU/GID in esiti incerti.
- **Evidenza obbligatoria:** decisione firmata sulle capability, QA staging, report commerciale e security review finale prima di qualsiasi produzione.
