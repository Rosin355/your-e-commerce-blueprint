# Step 1C — registro approvazioni separate

## Preflight M alternativa — nuove evidenze del 18 novembre 2026

**Decisione: NO-GO alla richiesta di autorizzazione M alternativa nella forma attuale. Nessuna scrittura autorizzata o eseguita.** La volontà del proprietario di valutare i controlli fail-closed è registrata: l'assenza delle attestazioni M-01/M-02 non viene trasformata automaticamente in obbligo di attendere il supporto. Resta però da identificare e confermare il percorso operativo che eseguirà davvero il batch Drizzle unico; non basta il nome di un tool di migration. Baseline remoto 6b67169, modifiche precedenti preservate.

| Verifica richiesta | Nuova evidenza | Esito e limite |
| --- | --- | --- |
| Backup DB recuperabile | Nel pannello autenticato del progetto Lovable corretto, Altro → Database → Manage → Backups, osservati 15 backup giornalieri dal 4 al 18 novembre; ultimo **18/11/2026 05:28:12 UTC (06:28:12 Europe/Rome)**, con comando **Restore to this backup** disponibile, come per i precedenti | **PASS disponibilità di un punto di ripristino concreto offerto dalla piattaforma.** Nessun backup creato/scaricato, nessun pulsante restore premuto. Integrità end-to-end, durata e risultato effettivo di un restore NON VERIFICATI; un backup giornaliero non promette recupero delle scritture successive |
| Un solo batch Drizzle ed esecutore | Esecutore tecnico previsto: processo Node, comando versionato `node node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.config.ts`, cartella drizzle/migrations e una sola history. Verificati nel pacchetto installato i percorsi pg/postgres-js verso il migratore ORM e la transazione comune a tutte le pending | **PASS statico della transazione; BLOCCATO percorso operativo live.** Non identificato un operatore/runner già disponibile che possa invocare esattamente quel comando sul Cloud corretto, con checkout congelato ed esclusione di altre catene/deploy automatici. La connessione query non è un migratore e il tool Lovable non è attestato equivalente. Nessuna URL o credenziale letta, nessun runner avviato |
| Pending e checksum | Nuova SELECT history: 16 righe 0000–0015, confronto automatico 16/16 SHA-256/when corrispondenti. Solo 0016/0017 pending; copie Supabase byte-identiche. Journal confirmed/RPC assenti, history Supabase ultima 20261110135043 | **PASS** sullo snapshot letto; ricontrollo obbligatorio immediatamente prima di una futura esecuzione approvata |
| Guardie ACL fail-closed | SQL 0017 immutato: owner reale della tabella creata, membership MEMBER/USAGE/SET, superuser/CREATEROLE, diritti effettivi e MAINTAIN; REVOKE ALL service_role, poi SELECT/INSERT; revoche client/RLS conservate. Riletti i test con owner service_role e membership ereditata/SET-only respinti e rollback di entrambe le pending/history | **PASS codice/prove offline già eseguite.** Riconfermata CI SUCCESS di 4bdf443, PostgreSQL 17 e browser/app. Nessuna nuova suite generale. Efficacia transazionale sul live condizionata al medesimo esecutore/batch, non dimostrata dal tool generico |
| Backend precedente | Letti chiamanti storici di admin_update_product_field e reserve_product_ai_generation; stessi parametri/risposte attese. Confronto automatico: ramo update precedente 0013→0016 byte-identico. Corpi RPC live ancora uguali alle baseline precedenti, come confermato dalle impronte. Nessuna tabella/colonna precedente rimossa, nessuna assegnazione ai | **PASS compatibilità statica dei contratti esaminati. Runtime Edge NON ATTESTATO**, nessuna certezza su quale sorgente o configurazione sia attiva; rischio M-02 rimane da accettare esplicitamente per l'alternativa |
| Versioni applicative recuperabili da Git | Risolti e letti oggetti Git: API cb7fc573e2b8c8d4838bb49cec38b74961d39e78; AI 096a435f0c0f6ba9722c67fbba2d1b8508678bc3; baseline applicativa e3a109e60550fee922e3263d348563d3ed7baf99 con sorgenti e package-lock leggibili. Riferimenti storici già documentati, non identificati come runtime corrente | **PASS recupero dei sorgenti.** Ricostruzione e redeploy possibili come percorso futuro, ma nessuna build/reinstallazione/deploy qui; ambiente, dipendenze/configurazioni server e risultato del recupero non certificati. NON è rollback runtime certificato né backup del DB |

Checksum correnti riconfermati: 0016 `7c8ea0e61251667a9b049083dcada80e91ebf75b3e4111c640f847e7abb0097b`; 0017 `1f00aea53258b114f905d6a343f1057b1ae2d8c89823e78873354de8f9abc1c2`. SQL, journal e runtime invariati. I test dimostrano che un'eccezione ACL nel batch Drizzle annulla 0016, 0017 e nuove history: non promettono un rollback dopo commit, né proteggono da qualunque incompatibilità del backend.

**Evidenza minima per rivalutare la richiesta alternativa, senza un altro audit:** proprietario/operatore già autorizzato identifichi privatamente chi eseguirà M e confermi il processo/ambiente esatto capace di invocare il comando Drizzle versionato sul solo Cloud Online Garden, in una sessione e con un solo batch, nessuna seconda catena Supabase o deploy automatico. Non è richiesta qui una nuova credenziale né nuovamente l'attestazione preventiva del principal PostgreSQL che l'alternativa intende mitigare con le guardie. Se l'unica superficie è il tool migration Lovable con semantica non verificabile, il percorso resta BLOCCATO: non eseguirlo per scoprirne il comportamento.

Con quell'evidenza, si potrà sottoporre una richiesta M alternativa separata che congeli SHA/hash, punto backup e operatore, accetti espressamente runtime non attestato e recupero applicativo da Git non certificato, e disponga STOP su guard fallita/drift/esito ambiguo, postcheck readonly e nessun retry cieco. Il ripristino del backup è un'operazione distruttiva distinta: non incluso automaticamente in M, può perdere modifiche successive e necessita decisione specifica. Disponibilità del comando restore non equivale a prova pratica di ripristino.

Questo preflight non completa M-01/M-02 come attestazioni, non autorizza M/B/G/F/T/A/S, non cambia i grant e non avvia migration, restore, deploy o Publish. Aggiornati soltanto registro e checklist; nessuna comunicazione esterna o modifica alle PR #53–55.

## Step M — decisione corrente 18 novembre 2026

**M NON AUTORIZZABILE: NO-GO.** History ricontrollata: 16/16 hash/when fino a 0015; 0016/0017 non applicate e checksum correnti invariati. M-01: patch pronta offline, principal/owner del runner ancora non attestati; M-02: bundle/revisioni attivi e recupero ancora non attestati, accesso elenco negato. Supporto piattaforma resta owner dell'evidenza mancante; nessuna comunicazione inviata da Codex.

[Review corrente e scheda proprietario](REVIEW-M-0016-0017.md). Il consenso futuro riguarderà solo un batch Drizzle con SHA/hash congelati e postcheck; non include grant, backend, merge, Publish, AI o Shopify. D-BENEFITS completata/verificata il 17/11 secondo evidenza proprietario, senza completare altri gate.

16 novembre 2026. **Stato aggiornato 17/11: D-BENEFITS COMPLETATA E VERIFICATA; M/B/G/F-M/F-P/T/A/S restano IN ATTESA. Nessuna ulteriore scrittura autorizzata.** Il consenso al pacchetto 1C-0 non approva le operazioni. Un sì su una riga non abilita le altre. L’approvazione deve indicare codice voce, revisione/SHA del pacchetto, ambiente, owner, operatore, finestra/scadenza, scope privato e recupero incluso. Risposta generica «procedi» senza scope completo non supera i gate. GitHub conserva solo stato aggregato; principal, target e attestazioni sensibili restano nel registro privato.

| Voce | Oggetto e impatto | Verifica successiva | STOP | Recupero da approvare | Stato |
| --- | --- | --- | --- | --- | --- |
| M | Solo Drizzle 0016/0017 con hash del piano; DDL/RPC/journal, nessun grant utente | History esatta, CHECK/RLS/ACL/RPC, dati/grant invariati | Drift, pending extra, esito ambiguo o history incoerente | Abort transazionale; dopo commit niente down automatica, review correttiva | NO-GO alla sola autorizzazione: M-01/M-02 aperti |
| B | Deploy delle sole API/AI e dipendenze dallo SHA approvato; include percorso rollback | Revisioni/checksum di entrambe e compatibilità DB | Una funzione fallisce o versione/config divergente | Ripristino coppia backend precedente verificata | IN ATTESA |
| G | Una sola riga Marco confermata privatamente: +ai, +tre field_keys; nessun ruolo aggiunto | Diff della sola riga, altri account invariati, AI limitata ai sei campi; tre elenchi editabili ma sync negato | Identità dubbia, perimetro non rappresentabile, riga cambiata | Ripristino dei soli delta approvati con confronto post-stato | IN ATTESA |
| F-M | Merge sola PR #56 verso main, SHA/diff congelati; nessun deploy implicito | SHA risultante e sync Lovable | CI non verde o automazioni inseparabili non approvate | Revert mirato da approvare, nessuna riscrittura storia/merge altrui | IN ATTESA |
| F-P | Build/Publish frontend compatibile, include rollback build | Manifest SHA/hash pubblico, login e percorsi preservati, Customer Accounts OFF | Gate divergenti, regressione login/checkout/SEO o versione incerta | Ripubblicare artefatto precedente approvato e verificare dominio | IN ATTESA |
| T | Salvataggi locali su sola bozza/DRAFT tecnica approvata con dati sintetici; compilazione nuova bozza senza creazione Shopify | Save/readback/cancel/conflitto senza prodotti commerciali | Target non tecnico, dati originali alterati, salvataggio inatteso | Stop, preservare evidenze; eventuale correzione locale separata | IN ATTESA |
| A | Eventuale unica richiesta AI, campo/fatti sintetici/modello e tetto EUR espliciti | Proposta separata, costo e contatore osservati, nessun autosave | Credito/limite ignoti, costo incompatibile, 402/429/timeout, output invalido | Nessun retry; credito speso non rimborsabile automaticamente | IN ATTESA |
| S | Eventuale sync di un campo su una DRAFT Shopify privata identificata e mai pubblicata | Mapping/tipo, hash/versione e readback, altri campi/stato invariati | Collisione/versione/hash cambiati, target commerciale, esito parziale | Rilettura e riconciliazione; compensazione solo autorizzata, niente rollback automatico | IN ATTESA |

Nessuna voce autorizza creazione Shopify di nuove DRAFT, pubblicazione prodotti, variazione prezzi commerciali, cambi login/flag Customer Accounts, tariffe, pagamenti o SEO. Se manca una DRAFT tecnica, non crearla implicitamente: T/S restano bloccate fino a scelta esistente o autorizzazione distinta.

Prerequisiti proprietario: conferma privata identità; approvazione sei campi AI e blocco sync dei nuovi elenchi; revisioni/artefatti backend e frontend recuperabili; attestazione presenza secret, flag, modello/credito/quota e retention; target tecnico e dati/prezzi di prova; tetto EUR e responsabilità del collaudo. Tutte ancora da raccogliere, non simulate.

Journal esecuzione futuro, privato: voce/approvatore/data/scadenza, SHA e checksum, operatore e ambiente, precondizioni, inizio/fine, esito e postcondizioni, eventuale errore depurato, recupero e decisione ripresa. Su GitHub solo evidenze aggregate senza UUID/email/log sensibili. La checklist generale è il punto unico per seguire il gate; [piano](ATTIVAZIONE-STEP1C.md) e [collaudo](COLLAUDO-MARCO-STEP1C.md) ne dettagliano le operazioni.

## Perimetro server precedente — sync superato da Step 1C-1

G non abilita AI su title/SEO/FAQ o altri campi: la allowlist server contiene soltanto description, optimized_description, short_description, key_benefits, key_features, special_bullets. Grant edit+ai nominativo, field_keys, registro ai_allowed e gate restano necessari; non basta la sola allowlist. Nessun cambio live.

S resta soggetta ad approvazione separata e ai gate esistenti; per gli operatori catalogo i tre elenchi sono negati anche con un’approvazione precedente o una conferma esplicita. Non programmare la loro sync con questa versione. Un futuro sblocco richiede un intervento tecnico mirato autorizzato separatamente; questo task non introduce nuovi flag. Sync dei campi preesistenti invariato.

**Stato corrente Step 1C-1:** il diniego totale del sync elenchi descritto nei passaggi storici è superato dal percorso controllato. AI resta sui soli sei campi; edit e sync sono capability separate. Nessun rilascio o grant live effettuato.

## Step 1C-1 — scope della voce S

S può riguardare ora uno dei tre metafield custom.key_benefits/custom.key_features/custom.special_bullets su un unico prodotto DRAFT tecnico identificato privatamente, con una lista/versione approvata. L’approvazione owner non è un grant, non vale per altri campi/prodotti/operatori e non è stata concessa qui. Obbligatoria una nuova conferma applicativa, con revisione server editorial-list-sync-v1: tutte le approvazioni precedenti sono inutilizzabili per questi tre sync, anche se COMPLETE.

Postcondizioni S: solo quel metafield scritto, tipo invariato e lista ordinata identica nel readback, stato DRAFT e altri campi invariati. STOP su mapping/definizione/accesso non verificabili, hash/versione divergenti, CAS fallito, timeout o verifica incompleta. Recupero: lettura e riconciliazione approvate; nessun retry/compensazione automatica. IN_FLIGHT/REVIEW_REQUIRED blocca una nuova approvazione sullo stesso attore/prodotto/campo. Tutte le voci M/B/G/F-M/F-P/T/A/S restano IN ATTESA.

## Scope dopo Step 1C-2

S può essere valutata tecnicamente per key_features/special_bullets soltanto con valore multilinea reversibile e conferma v2 nuova. key_benefits resta BLOCCATO per definizione assente; nessuna autorizzazione S implica creazione della definizione o conversioni di valori. Le attestazioni live, il target tecnico, le revisioni e le approvazioni restano necessari. Nessun consenso raccolto/eseguito in questo step.

## Nuovo gate D-BENEFITS — sola definizione Shopify, 17 novembre 2026

**IN ATTESA, non autorizzato:** creare ESCLUSIVAMENTE la definizione merchant-owned `PRODUCT`, `custom.key_benefits`, tipo `multi_line_text_field`, etichetta `Punti di forza`, accesso Storefront `PUBLIC_READ`, sul negozio Online Garden gia identificato. Nessun valore iniziale, creazione prodotto, aggiornamento valori, conversione, grant Supabase, deploy o Publish. Per la motivazione e i consumer vedi [scheda proposta](SHOPIFY-KEY-BENEFITS-DEFINITION.md).

**Precondizioni D-BENEFITS:** (a) codice query/tipo/PDP e sync multilinea predisposto, CI/review verdi sullo SHA scelto, (b) definizione ancora assente in read-only, (c) snapshot recente assenza di valori, (d) accessi Shopify e sequenza/recupero documentati, (e) autorizzazione owner distinta e registrata privatamente. Se una condizione manca: STOP.

**Postcondizioni D-BENEFITS, se approvata in futuro:** readback univoco di key/type/owner/access, zero valori prodotto scritti; in caso di esito ambiguo non ritentare prima di riconciliare. Non sblocca S, M, B, G, F-M, F-P, T o A; ogni voce necessita autorizzazione separata. L'analisi dei consumer non equivale al loro sviluppo.

## Step M — esito attuale, 17 novembre 2026

**D-BENEFITS COMPLETATA E VERIFICATA**, evidenza fornita dal proprietario: PRODUCT/custom.key_benefits/multi_line_text_field/PUBLIC_READ, Definition ID 778290364756. Le precedenti sezioni IN ATTESA D-BENEFITS sono cronologia, superate da questo stato. Nessuna operazione Shopify svolta in Step M.

**M: NO-GO alla sola autorizzazione**, non eseguita: default ACL live del service_role non normalizzati dalla 0017 (M-01) e compatibilità Edge deployed non dimostrata per accesso negato (M-02). [Review e scheda proprietario](REVIEW-M-0016-0017.md). Correzione minima descritta ma NON applicata; nessuna riscrittura dei due file approvati offline. Tutti gli altri gate restano separati e pendenti.

## M-01 corretto offline, autorizzazione M ancora bloccata

Patch 0017 preparata/testata con guard ownership/membership e ACL SELECT/INSERT sul solo journal. Nuovo hash: 1f00aea53258b114f905d6a343f1057b1ae2d8c89823e78873354de8f9abc1c2; 0016 immutata. **M-01 BLOCCATO live** perché il ruolo del runner non è attestato; i risultati postgres della query Cloud e gli owner esistenti non bastano. Richiesta precisa di attestazione e scenari offline nel [report aggiornato](REVIEW-M-0016-0017.md). Qualunque futura M deve indicare il nuovo hash, non quello della review iniziale, e richiede ancora approvazione separata.

M-02 separatamente BLOCCATO: revisione/bundle/compatibilità e artefatto di recupero delle due Edge da attestare nel pannello Lovable, non disponibili ai connettori. Nessuna operazione live autorizzata o eseguita. D-BENEFITS rimane completata; nessun altro gate completato.

## Evidenze piattaforma pendenti — 18 novembre 2026

La risposta Lovable conferma impossibilita' di attestare M-01/M-02 dal suo agente: runner Drizzle e' un contesto transitorio non leggibile prima della migration, mentre l'agente non puo' interrogare a runtime revisioni/ID/checksum delle due Edge. **Questa non e' un'autorizzazione a procedere.** Il proprietario dovra' chiedere al supporto ufficiale un'attestazione o una procedura equivalente verificabile; in sua assenza M resta NO-GO. Nessuna autorizzazione M/B/G/F-M/F-P/T/A/S derivante dalla risposta.

## Alternativa proposta senza attestazioni piattaforma — 18 novembre 2026

**PROPOSTA DEL PROPRIETARIO: procedere senza attendere Lovable Support. Non equivale ad approvazione M.** La PR #56 contiene gia' nella 0017 controlli ACL/ownership a fail-closed, verificati offline su PostgreSQL 16 e 17. Se il batch Drizzle 0016→0017 e' realmente una singola transazione, l'eventuale eccezione della guard annulla le due migrazioni e la nuova history; un timeout/esito ambiguo va invece riconciliato in sola lettura, mai ritentato automaticamente. Il controllo usa il proprietario reale della tabella creata, percio' puo' valutare il ruolo effettivo del CREATE TABLE durante l'esecuzione, pur senza dimostrare in anticipo current_user/session_user del runner.

**Rischio che resta:** manca un manifest verificabile delle due Edge Functions attive e non esiste rollback runtime attestato. La compatibilita' delle firme e dei vecchi percorsi SQL e' stata controllata nel repository, ma non costituisce prova del backend deployato. Un eventuale GO con questa incertezza e' una decisione consapevole con rischio residuo, non un PASS delle attestazioni M-01/M-02. NON dichiarare M-01/M-02 risolti per assenza di errori offline.

**Sequenza minima da proporre per decisione esplicita, non ancora eseguita:**
1. Attestare identita' del progetto, backup/schema/grant/history e possibilita' di ripristino reale; confermare runner unico e transazione Drizzle, esclusione di altre pending o deploy automatici, baseline SQL e hash 0016/0017 con un checkout SHA congelato e pulito. Se la recuperabilita' non e' dimostrata, STOP.
2. Autorizzazione **M alternativa** specifica: accettare l'incertezza sul runner e sul bundle backend attivo; approvare ESCLUSIVAMENTE una invocazione del batch Drizzle 0016+0017 sul Cloud Online Garden, lasciando operative le guard ACL. Non autorizza G/B/F/T/A/S, non consente SQL manuale, modifiche a ruoli, rollback distruttivo o migration di prova.
3. Dopo il batch: postcheck readonly di history, CHECK, ACL effettive, owner, RPC e grant; smoke test non mutanti delle pagine/operazioni esistenti. Se guard fallisce, history parziale, timeout o regressione: STOP e riconciliazione, senza retry cieco. Se passa, rimane necessario un controllo separato di deploy/recupero Edge prima della voce B.
4. Soltanto con un'ulteriore autorizzazione B, pianificare il deploy mirato delle due Edge da un SHA verificato, con artefatto precedente ricostruibile dal Git e una prova di recupero adeguata; il solo commit storico non attesta il vecchio runtime. G/F-M/F-P/T/A/S restano approvazioni autonome.

**Stato attuale:** valutazione alternativa preparata; M NON AUTORIZZATA, nessuna migrazione o deploy live. Il consenso generico a "andare avanti" non vale come approvazione della scrittura DB: servono scope, runner, backup/recovery e accettazione consapevole del rischio M-02.
