# Admin V2 — AI Product Editor

## V3 · Anteprima cliente e revisione della bozza completa

La V3 si apre con nome, fonti e generazione. La proposta si legge nella vista prodotto, con modifiche contestuali e revisione finale. La scheda avanzata conserva il percorso tecnico V2. Il verbale distingue il test reale precedente su @2 dal collaudo V3 con provider simulato. [Percorso, copertura, campi e immagini della V3](ai-editor-v3/README.md)

## V2 · Candidato per il collaudo del 27 novembre 2026

**READY_FOR_UAT in ambiente di prova · PENDING_CLIENT_ACCEPTANCE · SAL ufficiale 57,75%.** La V2 deriva dal commit originale `1da7ee1` della [Draft #79](https://github.com/Rosin355/your-e-commerce-blueprint/pull/79). Le prove descritte qui usano sorgenti locali, un provider simulato e dati sintetici. La V2 non è distribuita.

### Che cosa riceve la persona che prepara la scheda

Inserisce il nome prodotto, incolla una descrizione libera e conferma la fonte. La proposta estesa può contenere introduzione, descrizione botanica, fogliame, fioritura, portamento e sviluppo, coltivazione, impiego ornamentale e caratteristiche principali. Ogni argomento richiede informazioni pertinenti. La descrizione si legge nell’anteprima formattata. Le singole sezioni si modificano come testo, con paragrafi, liste e grassetto.

Il contratto **`online-garden-editoriale-it@2`** richiede italiano professionale, termini botanici comprensibili, tono sobrio e SEO naturale. Con informazioni sufficienti, l’obiettivo è 250–450 parole. Si conserva un testo più breve quando ulteriori paragrafi ripeterebbero dettagli, richiederebbero inferenze o darebbero spazio a dati in conflitto.

### Audit delle istruzioni effettive

| Revisione Git | Comportamento verificato nel codice |
|---|---|
| `8fb057f`, ancora in `97f1dd8` | L’assistente dei fatti confermati imponeva copia integrale e riordino delle righe. Questa regola sopravvive per i campi estrattivi. |
| `c4eaf74` | Compare una strategia dedicata alla prosa con sezioni e indici. Il provider usava ancora il formato testuale generico di `buildPrompt`, in tensione con lo schema strutturato. |
| `d252925`, fino alla #79 | Il provider invia direttamente le istruzioni editoriali strutturate per la descrizione verificata. Il testo chiedeva già una rielaborazione e 250–450 parole con fonti ricche. Il validatore esigeva uno fra «non», «mai» e «senza» nell’intera sezione se ne trovava uno nelle righe citate. Un indice citato marcava l’intera riga come coperta. Il client riceveva HTML e avvisi, senza sezioni modificabili indipendentemente. |
| V2 | Il server sceglie identità, stile, regole sulle fonti, schema e istruzioni per la sezione dal contratto versionato. Il browser invia soltanto dati, conferma e, per la rigenerazione, un titolo di sezione ammesso. Il prompt generico di `admin-ai-core` resta attivo nel percorso storico delle proposte su altri campi. |

### Percorso di una richiesta

1. Il client prepara il testo libero per il trasporto esistente. I fatti richiedono conferma esplicita. Restano attivi i limiti di 12 righe da 12–500 caratteri e i controlli su URL, email e markup. Gli input oltre contratto danno un errore prima della generazione.
2. `product-admin-ai` verifica il registro, il grant e la prenotazione già previsti. Il server separa le affermazioni, associa ciascuna alla riga originale e isola le fonti contraddittorie, incerte o commerciali riservate. Il nome prodotto serve a identificarlo. Le fonti escluse restano consultabili nel rendiconto.
3. Il provider riceve dati e istruzioni separati. La descrizione usa `propose_field_improvement`. Per i metadati autorizzati la scheda può effettuare la selezione indicizzata già esistente. La rigenerazione di un paragrafo usa la stessa azione `suggest_confirmed_field` e una sola richiesta per la descrizione.
4. Il validatore verifica titolo, indici, formato, riscontri nelle fonti, misure e loro referente, proprietà sensibili, negazioni, qualificazioni, copia estrattiva e limiti del registro. Compone l’HTML con il sanitizzatore condiviso. La rigenerazione accetta soltanto la sezione richiesta.
5. L’operatore rivede le proposte. Ogni sezione può essere proposta, modificata, accettata o rifiutata. Una sezione accettata richiede sblocco. Per sostituire testo manuale serve conferma. Una risposta respinta lascia disponibile il testo precedente. Accettare una sezione non applica il campo. Applicazione alla bozza e successivo salvataggio hanno comandi distinti.

[Contratto e schema](../../supabase/functions/_shared/admin-ai-editorial-contract.ts) · [Verifiche sulle fonti](../../supabase/functions/_shared/admin-ai-evidence.ts) · [Validazione della proposta](../../supabase/functions/_shared/admin-ai-description.ts)

### Campi e origine del valore

| Campo | Comportamento |
|---|---|
| Descrizione estesa | Testo AI con citazioni interne per sezione. Controllo del limite strategia e del registro, anteprima HTML e accettazione manuale. |
| Descrizione breve | Estratto deterministico di un fatto utilizzabile, modificabile e ricalcolabile. Limite del modulo 320 caratteri. |
| Titolo e meta description SEO | Scelta fra candidati ammissibili. Limiti del modulo 70 e 320 caratteri, con verifica del registro. |
| Tag | Selezione autorizzata fra nomi ammessi o proposta deterministica. |
| Tipo prodotto | Corrispondenza con il registro oppure scelta manuale. |
| Caratteristiche, punti di forza e FAQ | Proposte deterministiche su fatti ammessi. Vantaggi e domande richiedono una fonte esplicita nel formato supportato. Revisione per campo. |
| Metafield botanici strutturati, SKU, prezzi, disponibilità e inventario | Compilazione attraverso i flussi dedicati esistenti. Una misura descritta in prosa non aggiorna il relativo dato strutturato. |

### Come leggere gli esiti

Un unico riepilogo espandibile presenta le sezioni respinte, gli argomenti mancanti e il rendiconto dei fatti. Per ogni affermazione mostra testo sorgente ed esito: inclusa, equivalente, contraddittoria, da verificare o non coperta. Per le affermazioni coperte indica le sezioni pertinenti. Le equivalenze sono confronti deterministici e conservativi. Una parafrasi non riconosciuta può richiedere un controllo umano.

Un problema tecnico di connessione, timeout o provider è mostrato separatamente. Se mancano tutti i fatti utilizzabili, la revisione della fonte può essere restituita senza generazione. Un modello non può assegnare approvazioni né scegliere quale fra due famiglie o misure incompatibili sia quella corretta.

### Caso di riferimento e prove ripetibili

La fixture contiene l’input originale della **Yucca filamentosa**. Fra 20 affermazioni il test trova 4 incluse, 11 equivalenti, 4 contraddittorie e 1 da verificare. Restano 0 fatti utilizzabili non coperti. Le famiglie Agavaceae e Asparagaceae e le misure della pianta di 150 cm e 3 m richiedono chiarimento. I 3 m riferiti allo stelo floreale sono utilizzabili. «Senza fusto a fiamma» richiede correzione. «Solitamente priva di fusto» giustifica «generalmente senza fusto». Le sole rosette basali non provano l’assenza del fusto.

La risposta simulata comprende cinque sezioni e 184 parole di prosa per 159 parole di input. Non propone una destinazione ornamentale a partire dal solo apprezzamento in orticoltura. Il test del provider intercetta il messaggio effettivo e verifica i dati inviati. Il test HTTP passa attraverso l’handler reale con dipendenze simulate. Chromium controlla che una rigenerazione errata conservi testo manuale e sezioni accettate, che una valida sostituisca solo il paragrafo richiesto e che la bozza resti vuota prima dell’applicazione.

[Input originale](../../scripts/tests/fixtures/yucca-filamentosa-uat-20261127.txt) · [Risposta simulata leggibile](../../scripts/tests/fixtures/yucca-filamentosa-proposta.json) · [Regressioni deterministiche](../../scripts/tests/admin-ai-product-editor-v2.test.ts) · [Collaudo Chromium](../../scripts/browser/ai-editor-regression.spec.ts)

### Verifiche sul candidato V2

| Controllo locale | Esito |
|---|---|
| Suite di dominio Node con rete bloccata | 708 superati |
| Suite di dominio Deno con lock congelato e senza permesso di rete | 132 superati |
| Chromium su server locale con servizi simulati | 35 superati |
| Typecheck frontend e `deno check` dell’entrypoint `product-admin-ai` | PASS |
| ESLint sui file TypeScript interessati e build di produzione locale | PASS |

### Checklist UAT

- In anteprima isolata, incollare l’input originale. Confrontare famiglia, altezza della pianta, altezza dello stelo, assenza qualificata del fusto e periodo di fioritura con le fonti.
- Aprire il riepilogo. Correggere un dato ambiguo partendo da una fonte verificata, riconfermare l’input e controllarne il nuovo esito.
- Modificare il fogliame e accettare l’introduzione. Rigenerare solo la fioritura. Provare anche una risposta non valida e un errore tecnico usando i simulatori.
- Rifiutare un paragrafo e controllare l’anteprima HTML. Accettare gli altri e verificare che l’applicazione alla bozza richieda il comando esplicito. Ripetere con il grant effettivo di Marco nell’ambiente UAT autorizzato.
- Verificare stile, completezza, lunghezza e leggibilità con il referente editoriale. Un eventuale confronto con AI reale richiede autorizzazione separata, massimo di chiamate e budget esplicito.

**Dipendenze e rischi residui.** La [#79](https://github.com/Rosin355/your-e-commerce-blueprint/pull/79) fornisce la base dell’interfaccia. La [#78](https://github.com/Rosin355/your-e-commerce-blueprint/pull/78) riguarda ricevute e recupero metafield nel percorso di sincronizzazione. Il collaudo editoriale può procedere autonomamente. Il vocabolario semantico, le unità e i contesti riconosciuti sono finiti. Una fonte errata o una relazione botanica inedita richiedono giudizio umano. La prova simulata attesta il comportamento del software. La qualità del modello reale, i tempi di risposta reali e l’accettazione di Marco restano da verificare.

---

## Verbale originale della #79 · 27 novembre 2026

Stato: **READY_FOR_UAT (solo preview Admin)** · PENDING_CLIENT_ACCEPTANCE · SAL 57,75%.
Nessun deploy, Publish, merge su main, migration, permesso o scrittura Shopify.

## Architettura e flusso AI
- Riusa il servizio esistente `product-admin-ai` (`suggest_confirmed_field`, batch `reserve_new_draft_editorial_v1`); nessuna seconda pipeline.
- Input: nome prodotto + fatti verificati (1–12 righe) con conferma esplicita.
- «Completa scheda con AI» → proposte per descrizione estesa, descrizione breve, SEO, tag; tipo prodotto dal registro; caratteristiche/punti di forza/FAQ estratti in modo deterministico dai fatti.
- «Rigenera con AI» per singolo campo: nuova richiesta, viene sostituito solo quel campo (`mergeRegenerated`); campi accettati bloccati; errore AI o proposta non valida mantiene il valore precedente.
- Flussi separati: generazione → revisione (Accetta/Rifiuta/modifica) → salvataggio bozza locale → invio DRAFT Shopify → pubblicazione.

## Stati campo
Proposta AI · Modificato a mano · Accettato (bloccato) · Rifiutato · Mancante/non verificato. Nessuna proposta è approvata senza «Accetta» (con conferma).

## Matrice mapping
| Sezione | Fonte | AI |
|---|---|---|
| Descrizione estesa | `description` | Sì (sezioni con evidenze) |
| Descrizione breve | `short_description` | Sì / deterministico |
| Titolo e meta SEO | `seo_title`, `seo_description` | Sì |
| Tag | `tags` | Sì |
| Tipo prodotto | registro core | No, deterministico |
| Caratteristiche, punti di forza, FAQ | `key_features`, `key_benefits`, `faq` | No, estratti dai fatti |
| Periodi botanici, dimensioni, rusticità, cura | metafield botanici | **No**: manuale con conferma fonte per campo |
| SKU, prezzi, varianti, inventario | commerciali | **Mai** |

Non ancora supportati dall'AI: `special_bullets` per nuove bozze, sezione cura/coltivazione dedicata, categorie (restano selezione manuale). Richiederebbero modifiche backend con autorizzazione separata.

## Test
- `scripts/tests/admin-sheet-review.test.ts` 6/6 PASS (no auto-approvazione, rigenerazione isolata, accettati preservati, errori AI, mancanti).
- `admin-draft-sheet` + `admin-sheet-evidence` PASS; typecheck PASS.
- Preview autenticata (account Admin di Romesh) con risposte AI **simulate**: generazione, rifiuto, accettazione, rigenerazione singola, blocco del campo accettato. Scritture bloccate nel test. Non testati: AI reale, salvataggio/riapertura bozza, anti-duplicato (coperti dai test esistenti del servizio).
- Il test Admin **non** vale come collaudo dei permessi Editor di Marco.

## Checklist UAT
Admin: input breve → genera → modifica → rigenera una sezione → verifica campi accettati invariati → salva bozza → riapri → nessun duplicato.
Marco (sessione propria): stessi passi + verifica che compaiano solo i campi del suo grant.

## Dipendenze PR #78
La verifica metafield per campo e il recupero senza ricreazione sono nella PR #78 (non distribuita). Questo editor funziona in locale senza di essa; il salvataggio con ricevute campo per campo richiede il rilascio della #78.
