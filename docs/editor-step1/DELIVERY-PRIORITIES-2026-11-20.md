# Online Garden — delivery gate rapido per Marco (20 novembre 2026)

## Stato deploy backend comunicato da Lovable — 20 novembre 2026

- **Backend `product-admin-api`: DEPLOY DICHIARATO COMPLETATO** da Lovable sul codice del merge `1fd8e7bc15b0c38f6dcaa1a6d17ade3506f0f245`, con fingerprint pacchetto trasmesso `8b6bd865…a12901d`. Il fingerprint prova il pacchetto inviato, **non** l'identita' binaria della funzione attualmente in esecuzione; la piattaforma non consente readback del codice live.
- `admin-draft-summary.ts` e `admin-draft-view.ts` inclusi nelle dipendenze. Verifica autenticata di **sola lettura** con sessione Admin riferita dall'operatore: HTTP 200, `ok: true`, una bozza `TEST-OG-AI-001` in `LOCAL_DRAFT`, risposta con sezioni titolo, SKU, descrizione, fornitore, valuta, tag, categorie, varianti, immagini e SEO. **I singoli valori del nuovo riepilogo non sono ancora stati controllati in questa verifica.** Nessuna operazione Shopify o write di catalogo.
- Nessun nuovo deploy di `product-admin-ai`, migration, grant, chiave, Publish frontend o modifica dei file di progetto dichiarati.
- **Lovable `get_project` in sola lettura** dopo il rapporto: progetto pronto e ultima revisione codice `1fd8e7bc15b0c38f6dcaa1a6d17ade3506f0f245` prima di questa registrazione documentale. `is_published=true` denota che esiste una precedente versione pubblicata, **non** conferma il Publish della nuova revisione.
- **Next gate proprietario:** Publish frontend da interfaccia Lovable dopo verifica revisione, poi verifica post-publish su `TEST-OG-AI-001` con account Admin e login personale di Marco. Stop immediato se valori, AI, permessi o stato locale/Shopify non sono coerenti. La documentazione qui registrata e' un commit docs-only: non modifica il codice applicativo oggetto del merge PR #57. Nessuna autorizzazione a pubblicare prodotti.

---

## Decisione sul candidato

**GO CON LIMITAZIONI** per la revisione del codice e il collaudo controllato. **NO-GO per l’uso ordinario di Marco** fino alla verifica della versione rilasciata con il suo account. I P0 hanno superato test su interfaccia, servizi e database locale. Il readback del record tecnico esistente conferma il dato di origine. Il lint generale conserva 42 errori e 11 avvisi identici alla base. La qualità di una risposta del provider reale e l’accettazione personale sono ancora da verificare. [Matrice prove](COLLAUDO-MARCO-STEP1C.md) · [Stato dei 14 interventi](BACKLOG-UX-MARCO.md)

### Rilascio da parte del responsabile

1. Revisionare la PR da `codex/marco-editor-delivery-fixes` verso `main`, controllare la CI sulla revisione esatta e annotare SHA e versioni frontend/API immediatamente precedenti. La base di sviluppo è `dd02dbd`.
2. Prima di ogni distribuzione, eseguire il percorso Playwright sintetico. Il test usa la UI del candidato, sessione fittizia e risposte simulate. Si può verificare generazione, salvataggio e riapertura senza accesso a Shopify.
3. Con l’autorizzazione al rilascio, distribuire dapprima `product-admin-api` e le dipendenze condivise, quindi il frontend dello stesso SHA. Questo candidato non richiede cambiamenti a schema, dati, grant, chiavi o funzione `product-admin-ai`.
4. Nell’ambiente esistente abilitato dal responsabile, aprire con Marco la sola bozza tecnica e completare la [checklist in lettura](CHECKLIST.md). Le verifiche di categoria legacy possono fare una query di lettura a Shopify. Per una prova completamente scollegata dal negozio usare Playwright. Un riepilogo assente, uno stato ambiguo o un permesso inatteso mantengono sospeso l’uso ordinario.
5. Registrare versione, operatore, browser e PASS/FAIL. Per provare scritture usare solo staging già autorizzato e il target sintetico assegnato. Un test del provider reale richiede consenso e budget dedicati.

### Ripristino

Prima della distribuzione è sufficiente lasciare la PR aperta o chiuderla. Dopo un rilascio, sospendere l’uso dell’editor interessato, ripristinare il frontend precedentemente registrato e preparare una PR di revert della PR distribuita. Se serve anche il rollback Edge, conservare il blocco server della pubblicazione dei prodotti tecnici o sospendere quell’operazione fino al ripristino della protezione. Ripetere i controlli in lettura sullo SKU tecnico e registrare l’esito. Le proposte e le bozze persistite sono compatibili con lo schema esistente. Nessun ripristino dati è necessario.

Durante la preparazione del candidato sono state effettuate solo letture applicative remote. Nessun merge, deploy Edge, Publish Lovable, generazione AI a pagamento o mutazione Shopify. Checkout, pagamenti, inventario, clienti, prodotti in vendita e navigazione storefront sono fuori dal perimetro delle modifiche.

---

## Cronologia precedente alla correzione del 20 novembre

## Obiettivo
Preparare **una singola PR** per rendere l'Editor Step 1C utilizzabile da Marco nel minor numero di passaggi possibile, senza introdurre regressioni ai prodotti in vendita. Riferimenti: [Backlog UX Marco](BACKLOG-UX-MARCO.md), [Collaudo live](COLLAUDO-MARCO-STEP1C.md), [Guida Marco](GUIDA-MARCO.md). Questo documento e' un brief, non attestazione di codice gia' corretto o prodotto distribuito.

## P0 non negoziabili
1. **AI su descrizione esistente.** `AiSuggestionCard.generate()` ignora `suggestion` restituita, `useAiSuggestions` ha `enabled:false`. Fix del flusso proposta immediata + pending persistita/recuperabile, nessuna doppia chiamata pagata, test `Scarta`/`Modifica`/`Applica` su bozza locale e nessun sync Shopify.
2. **Readback `LOCAL_DRAFT`.** `admin_save_new_draft` riceve `p_payload` completo ma il dettaglio field-by-field mostra falsamente `Nessun valore` su prezzo, tag, categorie, vendor e SKU. Offrire riepilogo read-only della bozza persistita (da fonte sicura, accesso autorizzato), senza riscrivere il catalogo operativo o duplicare in maniera rischiosa i campi.
3. **Stati distinti.** `Attivo` proviene da `products.is_active`, non significa pubblicato Shopify. Spiegare `record interno`, `LOCAL_DRAFT`, `Shopify DRAFT`, `ONLINE` separatamente, senza inventare live status.
4. **Safety remote.** Proteggere `Crea bozza Shopify`, `Aggiorna sul sito`, `Pubblica` dietro consensi/permessi reali, con test negativi per il prodotto `TEST-OG-AI-001`. Nessuna mutazione Shopify o pubblicazione durante il fix.

## P1 ad alta utilita' se P0 chiusi
HTML sanitizzato in anteprima (mai raw), riduzione rumore visuale, indicatori `Puoi modificare qui`, spiegazioni semplici per `AI` e salvataggio, categorie senza slug, prezzi/varianti e immagini con stati chiari, botanica e SEO sezioni progressive, anteprima completa con differenza tra bozza e sito. Mantenere tutti gli input accessibili e reversibili. Conservare manual-only per informazioni botaniche non verificate.

## Test obbligatori
- Unit/integration per proposta AI immediate, pending reload, stale, reject, accept una volta, nessuna rete AI reale nei test; osservare costo solo via log del provider eventualmente disponibile.
- Unit/readback per `LOCAL_DRAFT` con SKU TEST, 10.00 EUR, `Aromatiche da esterno`, descrizione AI, immagine e SEO, con permessi server testati; nessun `Nessun valore` ingannevole.
- Build, typecheck, lint, test pertinenti, verifiche autorizzazione server, regressioni HTML rich text e no Shopify writes.
- E2E solo in ambiente sintetico/mock o collaudo di lettura sulla DRAFT interna gia' creata; nessun prodotto commerciale e nessun invio Shopify.

## Gate di rilascio
Lavorare in branch e PR revisionabile, non alterare stati/grant/migrazioni Supabase Lovable senza necessità e autorizzazione. Nessun nuovo ambiente Supabase. Non eseguire merge, Lovable Publish o scritture sul negozio senza conferma del responsabile. In caso di blocco P0, NON dichiarare `READY`: indicare `NO-GO` e un follow-up concreto. Emettere esito P0/P1, test con comandi e risultati, commit, PR, file modificati, istruzioni di collaudo e rollback. Aggiornare `BACKLOG-UX-MARCO.md`, `COLLAUDO-MARCO-STEP1C.md`, `DESIGNER.md`, `DEVELOPER.md`, `GUIDA-MARCO.md` per quanto effettivamente cambiato.

## Suggerimento Codex
GPT-6.2 Astra xhigh per diagnosi multi-file e fix P0/P1; scegliere `high` se la latenza del ragionamento impedisce le verifiche entro la finestra di consegna. Evitare una seconda sessione se non necessaria.
