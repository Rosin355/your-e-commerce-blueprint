# Step 1C — registro approvazioni separate

16 novembre 2026. **Tutte le voci IN ATTESA, nessuna scrittura autorizzata.** Il consenso al pacchetto 1C-0 non approva le operazioni. Un sì su una riga non abilita le altre. L’approvazione deve indicare codice voce, revisione/SHA del pacchetto, ambiente, owner, operatore, finestra/scadenza, scope privato e recupero incluso. Risposta generica «procedi» senza scope completo non supera i gate. GitHub conserva solo stato aggregato; principal, target e attestazioni sensibili restano nel registro privato.

| Voce | Oggetto e impatto | Verifica successiva | STOP | Recupero da approvare | Stato |
| --- | --- | --- | --- | --- | --- |
| M | Solo Drizzle 0016/0017 con hash del piano; DDL/RPC/journal, nessun grant utente | History esatta, CHECK/RLS/ACL/RPC, dati/grant invariati | Drift, pending extra, esito ambiguo o history incoerente | Abort transazionale; dopo commit niente down automatica, review correttiva | IN ATTESA |
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
