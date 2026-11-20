# Backlog UX editor prodotti — percorso Marco

## Stato del candidato del 20 novembre 2026

Il collaudo tecnico riguarda il branch `codex/marco-editor-delivery-fixes`. L'accettazione personale di Marco resta **NON ESEGUITA**. Le prove complete e i limiti sono nel [verbale di collaudo](COLLAUDO-MARCO-STEP1C.md).

| ID | Intervento nel candidato | Verifica |
| --- | --- | --- |
| UX-01 · P0 | La risposta di generazione mostra subito la proposta. Riaprire la scheda recupera quella in attesa. | PASS browser con doppio click, refresh, scarto, modifica, applicazione e versione superata. |
| UX-02 · P0 | Riepilogo in sola lettura dei dati registrati alla creazione, accessibile con il permesso bozze. | PASS RPC locale, proiezione autorizzata e riapertura browser. Confermati sul record di prova prezzo, categoria, foto e SEO. |
| UX-03 · P0 | La scheda distingue record interno, stato operativo e stato del canale di vendita. | PASS test di stati per locale, DRAFT, pubblicazione, acquisto indisponibile e verifica incerta. |
| UX-04 · P0 | Il salvataggio è interno. Le operazioni Shopify richiedono comandi distinti. La pubblicazione tecnica è bloccata anche sul server. | PASS test negativi di autorizzazione e pubblicazione. Il browser controlla le operazioni richieste. |
| UX-05 | Anteprima e riepilogo rendono il rich text sanitizzato. Il contenuto legacy conservato nel database resta disponibile. | PASS test browser su markup legacy, testo visibile e attributi pericolosi. |
| UX-06 | Campo prodotto, dati per l’AI e pulsanti di approvazione hanno etichette distinte. | PASS percorso browser. Comprensibilità senza tutoraggio da verificare con Marco. |
| UX-07 | Flussi separati per organizzare fatti confermati e migliorare un testo esistente. L’operatore può correggere e scartare. | PASS con provider simulato. Qualità editoriale di una nuova risposta reale NON ESEGUITA. |
| UX-08 | I campi autorizzati segnalano «Puoi modificare qui». Dati tecnici e comandi remoti si aprono su richiesta. | PASS controlli di ruolo e capability e percorso manuale in caso di errore AI. Login personale NON ESEGUITO. |
| UX-09 | Ricerca per nome, categorie assegnate e denominazione verificata per ID esatto. | PASS browser e servizio, compreso fallback. Il GID della bozza corrisponde ad «Aromatiche da esterno». |
| UX-10 | Ogni formato espone SKU, prezzo di vendita e prezzo precedente. L’input gestisce la virgola. | PASS regressioni prezzi/formati e confronto `10,00` in anteprima e riapertura. |
| UX-11 | Libreria, associazione alla bozza, caricamento e ALT sono distinguibili. Ritentare lo stesso file riutilizza la chiave. | PASS upload simulato, riselezione, rimozione locale e rilettura foto/ALT. |
| UX-12 | Botanica e FAQ sono raggruppate, la SEO si espande separatamente. I campi facoltativi possono restare vuoti. | PASS attraversamento del wizard e compilazione selettiva della SEO. |
| UX-13 | Un unico componente mostra titolo, descrizione, categoria, formati, prezzo, foto e SEO prima e dopo il salvataggio. | PASS confronto di entrambi i pannelli nel browser. Lo stato distingue anteprima, bozza e sito. |
| UX-14 | Conservati ordine e modifica delle tre liste editoriali. Una definizione Shopify non verificata impedisce l’invio. | PASS regressioni browser a 390 e 1280 px e controlli del contratto di sincronizzazione. |

---

## Cronologia precedente alla correzione del 20 novembre

> Aggiornato 19 novembre 2026. Documento operativo per designer, developer, responsabile Online Garden e cliente. Evidenza: collaudo reale sul prodotto `TEST-OG-AI-001`, pagina Admin e audit del codice su `main`. **Nessun punto seguente e' dichiarato implementato.** Questa lista non autorizza operazioni Shopify, nuove migrazioni o deploy.

## Obiettivo di prodotto

Marco deve riuscire a creare e modificare una pianta con la stessa naturalezza con cui compila una scheda cartacea: vedere cosa puo' toccare, capire cosa e' gia' salvato, utilizzare un aiuto AI senza inventare dati e non inviare mai involontariamente modifiche al negozio.

## Stato generale

- **PASS osservati:** nuovo prodotto con sei passaggi; 1 proposta `Aiutami a compilare` generata, verificata e applicata localmente; validazione server dell'anteprima; salvataggio `LOCAL_DRAFT` con descrizione persistita; nessun prodotto Shopify mappato.
- **NO-GO per consegna cliente:** la scheda salvata non rappresenta in modo affidabile i dati del payload operativo e il percorso `Migliora il testo con AI` puo' generare una proposta senza mostrarla. Necessarie correzioni con collaudi autenticati prima di autorizzare Marco all'uso ordinario.
- **Separazione cruciale:** `Salva bozza nell'Admin` e `Applica alla bozza` NON equivalgono a `Crea bozza Shopify`, `Aggiorna sul sito` o `Pubblica`.

## Lavori prioritari

| ID | Priorita' | Problema osservato | Proposta per UX e sviluppo | Criterio di accettazione |
| --- | --- | --- | --- | --- |
| UX-01 | **P0** | `Migliora il testo con AI`: `AiSuggestionCard.generate()` chiama `onGenerate` ma ignora il risultato; `useAiSuggestions` ha `enabled: false`, quindi l'invalidazione non recupera automaticamente la proposta. Richiesta a consumo potenzialmente invisibile. | Rendere disponibile `suggestion` dopo la prima risposta; recuperare proposte pending al ritorno sulla scheda senza generarle di nuovo; mostrare caricamento, errori, consumo e stato. Fino al fix, disabilitare o marcare il pulsante come non collaudato. | Una sola richiesta genera una proposta visualizzata accanto all'originale; refresh ripristina la proposta in attesa, senza nuova chiamata provider; test `Scarta`, `Modifica`, `Applica alla bozza`; Shopify invariato. |
| UX-02 | **P0** | Il wizard salva tutti i campi nel `p_payload`, ma `validatedFields` scrive in `product_current_values` soltanto titolo, descrizione, SEO e botanica. Nel dettaglio `Prezzo`, `Tag`, `Categoria effettiva`, `Fornitore`, `SKU` risultano `Nessun valore`. | Esporre un **Riepilogo della bozza interna salvata** in sola lettura basato sul payload reale, con titolo, SKU, vendor, tag, categorie, varianti/prezzi, immagini e SEO. Identificare esplicitamente quali dati provengono dalla bozza e quali sono valori correnti o Shopify. | Readback verificato di `TEST-OG-AI-001` (10 EUR, categoria `Aromatiche da esterno`, immagine caricata, SEO); nessuna mutazione durante la consultazione; nessun valore perso o falsamente indicato come assente. |
| UX-03 | **P0** | Etichetta `Attivo` visibile su un prodotto con `Bozza interna — non inviata` e senza mapping Shopify. | Distinguere **record interno attivo**, **bozza locale**, **bozza Shopify**, **pubblicato sul sito** con testi e stati indipendenti. Separare visivamente azioni locali e azioni Shopify. | Marco distingue chiaramente in meno di un colpo d'occhio se il prodotto e' sul sito; nessun falso indicatore di pubblicazione. |
| UX-04 | **P0** | `Crea bozza Shopify`, `Aggiorna sul sito` e `Pubblica` sono sullo stesso percorso di lavoro della compilazione. | Azioni remota in una sezione distinta, con riepilogo diff, autorizzazione e conferma dei side effect; per un prodotto `TEST` bloccare il flusso pubblico con policy effettiva, non solo testo. | Nessun operatore puo' pubblicare per errore con un click confuso; test negativo su SKU TEST e test di permessi per Marco. |
| UX-05 | **P1** | L'anteprima del wizard mostra `<p>...</p>` letteralmente anziche' paragrafi; contenuti legacy talvolta generano avviso formattazione non supportata. | Renderizzare in anteprima HTML **sanitizzato**; conservare i dati originali e bloccare soltanto trasformazioni con perdita; usare un editor WYSIWYG con indicazioni comprensibili. | Nessun tag HTML esposto all'operatore; paragrafi/liste/link resi correttamente; contenuto legacy non riscritto in modo distruttivo. |
| UX-06 | **P1** | Anche durante il test un operatore tecnico ha confuso `Descrizione verificata` e `Informazioni fattuali confermabili`. | Evidenziare il campo da compilare, aggiungere badge contestuali `Puoi modificare qui`, istruzioni di una riga e distinzione `Testo del prodotto` / `Dati da dare all'AI`. | Marco completa un test AI senza tutoraggio, sa scegliere `Scarta` e `Applica`, non confonde input, preview e pubblicazione. |
| UX-07 | **P1** | AI limitata a riorganizzare frasi gia' note: generazione valida ma poco diversa dall'originale. | Esplicitare i due casi d'uso `Organizza fatti verificati` e `Migliora testo esistente`; miglioramenti stilistici solo entro fatti disponibili. Eventuale supporto ricerca fonti come proposta separata, con origine verificabile e approvazione umana. | Mai creare prezzi, dimensioni, stock, fioriture o certificazioni non documentate; tutte le proposte restano modificabili/scartabili. |
| UX-08 | **P1** | Ambiguita' di etichette `Modifica`, `Salva bozza`, `Aggiorna sul sito`, `Manuale`, `Protetto da re-import`, `Valore Shopify live`. | Modalita' **Semplice** per Marco: mostrare solo informazioni commerciali utili e stato chiaro; dettagli tecnici in **Avanzato** per gli sviluppatori; guida contestuale di dove e come aggiornare. | Test con account Marco e permessi effettivi: modifica consentita nei campi di competenza, sincronizzazione solo dove autorizzata, senza vedere dettagli che distraggono. |
| UX-09 | **P1** | Lista categorie lunga (23 voci) e slug `(aromatiche)` visibili. | Ricerca, suggerimenti verificati, gerarchia leggibile, categorie selezionate in evidenza; nascondere gli slug nell'interfaccia semplice. | Una lavanda viene associata alla categoria corretta senza interpretare codici tecnici, categoria conservata nel riepilogo della bozza. |
| UX-10 | **P1** | Formati, prezzo precedente e SKU richiedono conoscenze specifiche; prezzo di test `0,00` puo' essere interpretato come commerciale. | Esempi contestuali senza precompilare valori non confermati, spiegare prezzo precedente (solo se reale), differenza formato/SKU, controlli chiari; evidenziare i prodotti TEST. | Marco crea 1 e 2 formati e corregge prezzi con virgola senza confondere test, sconti, inventario o pubblicazione. |
| UX-11 | **P1** | Immagine caricata nella libreria remota prima del save; `Rimuovi dalla bozza` scollega il riferimento ma non dimostra cancellazione del file remoto. Testo ALT `lavanda` generico. | Stati espliciti `In caricamento`, `Pronta`, `Associata alla bozza`; miniatura persistita, suggerimenti ALT basati sull'immagine verificata, indicazione licenza e azioni di eliminazione distinte. | Foto e ALT leggibili dopo salvataggio/riapertura; nessun upload duplicato dopo errore; eliminazione dalla bozza non scambiata con cancellazione dalla libreria. |
| UX-12 | **P1** | `Botanica e SEO` mostra quattro selettori con 12 mesi ciascuno e moltissimi campi facoltativi. | Sezioni espandibili `Dati essenziali`, `Informazioni botaniche`, `SEO`, `FAQ`; mesi solo per informazioni verificate e con spiegazione del significato. | Marco compila solo i dati che conosce, senza sentirsi obbligato a scegliere mesi o fare deduzioni. |
| UX-13 | **P1** | Anteprima nuova scheda non mostrava immagine o SEO; readback dopo save incompleto. | Un'anteprima completa prima e dopo save: foto, titolo, descrizione, SEO, categoria, prezzo, varianti, stato locale/Shopify. | Differenze fra compilazione e record salvato evidenziate; test confronto screenshot e payload non mutante. |
| UX-14 | **P2** | `Punti di forza`, `Caratteristiche principali`, `Altri punti utili` mostrano in alcuni casi `Tipo o definizione Shopify non verificabile`. | Diagnostica per sviluppatore e spiegazione semplificata per Marco; impedire click su sync non supportato mantenendo editing di bozza dove permesso. | Marco puo' modificare i contenuti ammessi senza confrontarsi con errori di schema; sync non verificato resta bloccato. |

## Piano di attuazione consigliato (non autorizzato in questa nota)

1. **Blocco affidabilita' P0:** UX-01 → UX-02 → UX-03/04. Nessuna prova AI a consumo sul pulsante legacy finche' UX-01 non supera i test.
2. **Riduzione attrito P1:** UX-05/06/08/09/10/11/12/13; validare con un percorso reale di Marco, non soltanto con account amministratore.
3. **Contenuti e supporto P1/P2:** UX-07 e UX-14 dopo la sicurezza operativa.
4. **Accettazione cliente:** prova completa `nuovo prodotto → proposta AI → revisione → salvataggio bozza → riapertura e lettura valori`, separata dalla prova autorizzata di sincronizzazione Shopify. Annotare esiti e screenshot nel `COLLAUDO-MARCO-STEP1C.md`.

## Ruoli e documentazione

- **Designer:** wireframe modalita' semplice, microcopy, stati UI, indicatori di modifica e di pubblicazione; artefatti su `DESIGNER.md`.
- **Developer:** fix query AI, readback bozza, gestione sicurezza HTML, differenziazione stati, prove read-only e regressioni; specifiche tecniche in `DEVELOPER.md`.
- **Cliente/responsabile:** controlla priorita', testo di etichette e autorizza separatamente eventuali azioni Shopify. Prima del GO usare `GUIDA-MARCO.md` solo come guida di collaudo.
- **Modello Codex:** GPT-6 Medium per microcopy e UI; GPT-6 High quando intervengono payload, persistenza, permessi o Shopify. Lavorare in commit/PR revisionabile e aggiornare questo backlog con stato ed evidenze.

## Tracciamento

| Versione | Data | Esito |
| --- | --- | --- |
| v1 | 2026-11-19 | Backlog creato da collaudo e audit codice, tutti i punti ancora da fare; nessuna modifica applicativa eseguita. |
