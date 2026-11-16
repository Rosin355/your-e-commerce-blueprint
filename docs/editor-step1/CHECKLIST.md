# Step 1 — checklist di chiusura

16 novembre 2026. **PARZIALE / BLOCCATO per consegna e collaudo live Marco.** Nessun merge/deploy/Publish, prodotto commerciale, pagamento AI o modifica a permessi live.

- [x] Riprese PR #22/#50/#51/#52 integrate; branch isolata da main.
- [x] Editor visuale e cancel conservativo; preview/sanitizzazione e rifiuto server HTML non sicuro.
- [x] CTA, badge, dettagli/confronto, avviso descrizioni con destinazione condivisa.
- [x] Tre liste e ordine; whitelist e grant esatto richiesti.
- [x] Prima bozza esplicita da Shopify, versione zero e rilettura hash nel flusso approvazione.
- [x] Formati singoli/multipli, confronto opzionale, prezzi EUR con virgola.
- [x] Proposta AI simulata mostrata e applicata soltanto dopo conferma; nessun autosync.
- [x] Migrazioni 0016/0017 applicate e verificate nel solo PostgreSQL locale isolato, tramite migratore Drizzle ufficiale e replay; nessuna applicazione live.
- [ ] Verificare/autorizzare nominativamente tre campi e capability AI: non modificati live.
- [ ] Provider/modello/credito/limiti e generazione reale autorizzata: NON PROVATA.
- [x] AI per campi vuoti e nuove bozze da fatti confermati: proposta modificabile, scarto e applicazione locale; provider simulato, nessun salvataggio/sync automatico.
- [ ] Accettazione personale Marco, Safari e screen reader: NON PROVATI.
- [ ] Sincronizzazione su DRAFT tecnica reale autorizzata e verifica readback: NON PROVATA.
- [ ] Decisione owner su rilascio: NON AUTORIZZATO.

La prova sintetica usa un repository/provider simulato: non dimostra accesso del cliente al provider live. Le sezioni storiche della documentazione restano cronologia; nessuna spunta live deriva da CI verde.

## Esito Step 1A — 16 novembre 2026

**Codice e schema verificati offline; GO tecnico al solo Step 1B in lettura, subordinato alla CI del commit della PR.** [Report Step 1A](VERIFICHE-STEP1A.md). Nessuna consegna a Marco: Step 1C/1D ancora NO-GO senza evidenze live e autorizzazioni separate. Migrazione `ai` senza grant automatici, RLS/revoche conservate; primo valore verificato con errori, replay, rollback e conflitto concorrente. Corretto il difetto che trattava i nuovi campi editoriali come mesi.

## Sequenza di chiusura — solo Step 1, un gate alla volta (16 novembre)

1. **Step 1A — completamento offline, stessa PR #56:** implementare AI per valore vuoto/nuova bozza **solo** da fatti esplicitamente forniti e confermati dall'operatore, con preview, scarto, conferma e senza salvataggio/pubblicazione automatica. Se non ci sono fatti verificati, mostrare spiegazione e compilazione manuale, non generare claim. Preparare una migrazione additiva e testata in DB locale isolato per la capability nominativa `ai` senza nuovi grant live, mantenendo controlli RLS e revoche. Verificare che la migrazione del primo valore sia agganciata al percorso effettivo; non applicare in produzione. CI completa + review di sicurezza. **GO al passo seguente solo con codice e schema verificati offline.**
2. **Step 1B — preflight live in sola lettura:** verificare il progetto corretto, lo schema realmente distribuito, grant di Marco e dei soli operatori autorizzati per i tre elenchi, versione reale delle Edge Functions, presenza (non valore) della configurazione provider, disponibilita modello/credito e scope. Nessuna modifica a permessi o dati. Produrre matrice differenze e i soli interventi minimi da approvare. **Stop se identita, schema o autorizzazioni sono ambigui.**
3. **Step 1C — rilascio condizionato e collaudo:** solo con autorizzazioni separate per migration, deploy backend/frontend, grant nominativi, una chiamata AI a costo limitato e uso di una DRAFT tecnica approvata. Deploy nell'ordine corretto; poi con la sessione di Marco verificare HTML visuale, elenco, formato/prezzo, salvataggio/rilettura, proposta AI reale/accettazione e sync soltanto se esplicitamente permesso. Safari e controlli accessibilita documentati. **Nessun prodotto commerciale toccato automaticamente.**
4. **Step 1D — decisione proprietario:** rendere disponibile l'editor solo dopo prove live e accettazione. Aggiornare questa checklist e il closeout con SHA, CI, versione frontend e backend effettive, timestamp delle prove, owner e stato *sviluppato/collaudato/pubblicato/accettato* separati. Se manca un gate, mantenere *PARZIALE/BLOCCATO*.

**Vincoli trasversali:** non iniziare gli Step 2–4 del piano generale, non toccare #53/#54/#55, login Marco, checkout, SEO/redirect, shipping o Shopify commerciale. Nessun nuovo account, secret in Git, charge AI o grant non esplicitamente autorizzati. Non trasformare la rinuncia a una funzione richiesta in un PASS fittizio.

## Preflight live Step 1B — 16 novembre 2026

**NO-GO allo Step 1C.** [Report e matrice verificata](VERIFICHE-STEP1B.md). Identità ambiente e mapping registro confermati via letture live; migrazioni 0016/0017 assenti, CHECK senza ai e grant editor senza ai/tre elenchi. Versioni Edge Functions, presenza secret, flag runtime, quota/credito e attribuzione nominativa privata restano NON VERIFICATI. Nessuna modifica live. Lovable è alla baseline e3a109e; SHA Git della build sul dominio non attestato. Non avviare rilascio o collaudo a consumo prima di chiudere questi gate e ottenere autorizzazioni separate.

## Decisione operativa successiva al preflight — 16 novembre, Step 1C-0

**Il NO-GO resta valido.** Evitare un terzo audit generale o un nuovo ramo di sviluppo. La prossima consegna deve essere un **pacchetto di rilascio eseguibile ma non eseguito**, con una tabella di autorizzazioni separata e un'unica checklist per il proprietario.

1. **Identita e permessi** — proprietario conferma privatamente quale dei due grant editoriali appartiene a Marco. Per la futura estensione approvare esattamente il principal, i tre field_keys editoriali e la capability `ai` (solo per campi con `ai_allowed`), senza alterare le sette capability esistenti, senza esporre identificativi su GitHub.
2. **Schema** — review finale della catena 0015 → 0016 → 0017 con una sola autorita di migrazione, SQL/checksum immutabili, precondizioni, postcondizioni, idempotenza e arresto in caso di drift. Le migration sono state testate offline, non applicate al live. Nessun rollback automatico distruttivo dello schema.
3. **Backend e config** — owner/operatore con accesso Lovable fornisce attestazione non segreta di revisioni effettive delle due Edge Functions, presenza del secret server, flag, modello/credito/quota, senza copiare i valori o riutilizzare credenziali in chat/CI.
4. **Rilascio** — distinguere e autorizzare esplicitamente: migration DB, deploy Edge coerenti col commit, grant nominativi, merge frontend, Publish Lovable, eventuale richiesta AI a consumo e sync su una sola DRAFT tecnica approvata. Non dedurre il GO da autorizzazioni parziali.
5. **Collaudo umano** — nella sessione personale di Marco: HTML visuale, tre liste, formato/prezzi, salvataggio e readback, proposta AI reale (se autorizzata), cancellazione e conferma; Safari e accessibilita. Registrare build frontend e revisioni Edge osservate **dopo** il rilascio; in caso di blocco, preservare l'Admin attuale e dichiarare consegna PARZIALE.

**Step immediato autorizzato:** Codex puo preparare questo pacchetto e raccogliere soltanto metadati gia accessibili in lettura. **Non sono autorizzati** migrazioni/deploy/grant/merge/Publish, chiamate AI a pagamento o mutazioni Shopify. Quando il pacchetto sara pronto, il proprietario deve approvare separatamente lo scope puntuale prima di qualsiasi write.

## Pacchetto Step 1C-0 — preparato, non eseguito

[Piano developer](ATTIVAZIONE-STEP1C.md), [registro approvazioni](AUTORIZZAZIONI-STEP1C.md), [collaudo Marco](COLLAUDO-MARCO-STEP1C.md). **NO-GO esecuzione Step 1C**: approvazioni ed evidenze mancanti non acquisite da questo pacchetto. Restrizione server successiva: AI soltanto sui sei campi editoriali; aggiungere i tre field_keys non concede il loro sync. Nessuna modifica live.

- [x] 1C-0: piano Drizzle con checksum, recupero e autorizzazioni separate predisposto.
- [ ] Identità nominativa e perimetro AI/sync confermati privatamente.
- [ ] Versioni/config/provider/credito e artefatti rollback attestati.
- [ ] M/B/G/F-M/F-P/T approvati separatamente; eventuali A/S con scope e budget.
- [ ] Esecuzione e collaudo live: NON ESEGUITI, nessuna consegna Marco.

## Restrizione precedente — sync superato da Step 1C-1

- [x] AI catalogo ristretta ai sei campi editoriali, anche nel percorso proposte precedente.
- [x] Tre elenchi modificabili con grant esatto, sync catalogo negato a prescindere dall’aggiunta ai field_keys o da vecchie approvazioni.
- [x] Contesti UI AI/sync separati e controlli server applicati prima delle approvazioni/replay.
- [ ] Rilascio, migration, grant e prove reali: ancora NON AUTORIZZATI/NON ESEGUITI. Il sync dei tre elenchi non è previsto in questo rilascio; collaudo S solo su campo preesistente sincronizzabile.

L’avvertenza sul rischio condiviso nei paragrafi storici 1C-0 documenta il motivo della restrizione; il perimetro corrente è quello sopra. Nessuna consegna Marco o GO automatico allo Step 1C operativo.

**Stato corrente Step 1C-1:** il diniego totale del sync elenchi descritto nei passaggi storici è superato dal percorso controllato. AI resta sui soli sei campi; edit e sync sono capability separate. Nessun rilascio o grant live effettuato.

## Step 1C-1 — stato corrente, supera il blocco sync iniziale

- [x] Sei campi AI invariati, nessuna AI su titolo/SEO/FAQ o campi economici.
- [x] Tre elenchi: sync singolo campo con grant sync nominativo, gate, nuova revisione server di approvazione, hash/versione/contenuto e claim atomico.
- [x] Definizione/tipo verificati, CAS compareDigest, mutation singola senza cancellazioni e readback ordinato.
- [x] Vecchie approvazioni negate, esiti incerti senza retry cieco; Salva bozza e AI non sincronizzano.
- [ ] Compatibilità/definizioni/scope/versione API effettivi live: NON VERIFICATI da test sintetici.
- [ ] Autorizzazioni e collaudo live sulla sola DRAFT tecnica: NON ESEGUITI. NO-GO rilascio invariato fino a chiusura gate preflight.
