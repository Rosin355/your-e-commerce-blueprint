# Collaudo pratico nella sessione di Marco

## Publish F-P PASS — 18 novembre 2026, release editor AI Marco

**Prerequisiti completati:** M/B/G e Publish F-P. Il frontend e' online su onlinegarden.it; il backend e i permessi di Marco risultano predisposti, ma **non** esiste ancora prova da login personale Marco o generazione AI reale. Prova iniziale T senza scritture: Marco apre `/admin` col proprio account, seleziona una bozza tecnica esplicitamente approvata, conferma la presenza del pulsante AI, verifica i badge Modificabile e le tre liste; annotare PASS/FAIL e browser. Le azioni **salva bozza interna** e **Aggiorna sul sito (Shopify)** sono distinte.

**Per provare la vera AI serve autorizzazione A**, indicando un solo campo, massimo costo, fatti sintetici espressamente confermati e assenza di informazioni personali; una sola richiesta, nessun retry, nessuna accettazione/sync automatico. Un eventuale salvataggio locale sulla bozza tecnica e' autorizzazione T distinta, da eseguire solo su target identificato e con readback. Niente sync Shopify a meno di gate S separato. Registrare versione `f54bf87` e asset `index-CMoOo4zb`; la vecchia versione era SEO P1 12/11 asset `index-7LGwLIzQ`. Il problema PDP carrello disabilitato per un prodotto e' NON VERIFICATO e non riguarda di per se' l'editor.

---


## Live Step M PASS — 18 novembre 2026

Il prerequisito schema per l'editor AI e' ora pronto nel Lovable Cloud esistente; il collaudo **resta NON ESEGUITO** finche' B (Edge), G (permessi nominativi) e F-P (Publish) non hanno esito positivo. La prova vera dovra' usare il login abituale di Marco, una bozza tecnica approvata e — solo con consenso A e budget fissato — una singola proposta AI. Le istruzioni pratiche sottostanti restano valide. Nessun prodotto commerciale deve essere modificato per dimostrare il funzionamento.

---


**Da eseguire soltanto dopo rilascio approvato e autorizzazione T. Adesso NON ESEGUITO.** Usa il login abituale, senza condividere credenziali. Il responsabile indica una sola bozza/DRAFT tecnica e dati sintetici approvati; nessun prodotto in vendita. Se non è disponibile il target, fermati.

- [ ] Apri la descrizione: Modifica, paragrafi, grassetto, elenco e link. Annulla e verifica originale invariato. HTML non supportato: stop, non convertirlo perdendo contenuti.
- [ ] Nei tre elenchi aggiungi una voce, spostala, rimuovila e annulla; poi salva una modifica approvata e verifica ordine/testo dopo ricarica. Non devi vedere JSON.
- [ ] Nella compilazione tecnica passa da formato singolo a multiplo e controlla SKU e prezzi in euro con virgola, senza valori inventati/precompilati. Non creare un prodotto Shopify. Usa soltanto prezzi di prova forniti dal responsabile.
- [ ] Salva bozza e riapri: contenuto e formattazione devono coincidere. Su campo locale vuoto con valore Shopify, prima annulla e poi salva esplicitamente: nessuna perdita dell’originale. Il tecnico coordina un conflitto su bozza tecnica: nessuna sovrascrittura silenziosa.
- [ ] **Solo con A:** conferma i fatti sintetici e richiedi UNA proposta AI per il campo autorizzato, preferibilmente descrizione vuota/nuova compilazione. Nessun consumo prima del click. Modifica la proposta e applicala soltanto alla compilazione, poi salva solo se previsto da T. Puoi invece scartarla. Non rifare la richiesta per provare entrambi i rami: scegli scarto oppure applicazione per la singola prova reale; il ramo non eseguito resta coperto soltanto dai test offline, da registrare come NON ESEGUITO live. Errore/timeout: niente retry e annota NON PROVATO il percorso incompleto.
- [ ] **Solo con S:** scegli un solo campo autorizzato, anche uno dei tre elenchi se tipo/definizione sono verificati, poi con il responsabile verifica target DRAFT, campo, versione e mapping, poi conferma Aggiorna sul sito. Readback corretto, stato ancora DRAFT, nessun altro prodotto/campo modificato. Mai premere Pubblica.
- [ ] Ripeti le operazioni senza consumo AI su desktop e mobile/Safari; tastiera Tab/Shift-Tab, focus visibile, etichette lette dallo screen reader, pulsanti di riordino e dialoghi accessibili, nessun controllo tagliato. Problemi: registra browser e passaggio, senza schermate con dati personali.

Risultati: PASS / FAIL / NON ESEGUITO per ogni punto, data, versione frontend/backend attestata dal tecnico e riscontro Marco nel registro privato. Nessuna spunta deriva dalla CI. AI reale e sync non autorizzati restano NON ESEGUITI. Il salvataggio locale, il sync e la pubblicazione sono tre cose diverse. Il proprietario decide la consegna soltanto dopo le evidenze; problemi o controlli mancanti mantengono stato PARZIALE/BLOCCATO.

## Verifica UI lettura account tecnico — 19 novembre 2026

**PASS parziale di sola lettura, non equivale a collaudo nominativo Marco o test salvataggio.** Browser Chrome con account operatore sulla scheda live **Gaura Lindheimeri Siskiyou**, SKU `OG_111433`, prodotto **ACTIVE** con varianti; da non usare per prove di modifica/sync. La pagina mostra il testo descrittivo senza tag HTML, badge `Modificabile`, `Bozza interna` e `Confermato`, pannello `Contenuti` con 14 campi e 3 liste `Punti di forza`, `Caratteristiche principali`, `Altri punti utili`. I pulsanti `Modifica` e `Aggiorna sul sito` sono visibili, ma non premuti; assenza di AI in operatore coerente con grant senza capability `ai`. **Non dichiarare AI o save PASS per Marco.**

**Riscontri UX per designer/developer (da triage, nessuna implementazione autorizzata):**
- Scheda molto lunga e ripetitiva: per quasi ogni campo espone Dettagli e confronto, Originale WordPress assente, origine, versione, stato revisione, protetto da re-import, destinazione, sincronizzazione, formato. Per Marco valutare vista semplice di default con pannello tecnico secondario espandibile e assistenza contestuale.
- SKU `OG_111433` descritto come «Codice univoco del prodotto. Non modificabile.» ma il controllo testuale contiene `Modifica`: verificare se il click e' bloccato o se l'etichetta e' ambigua, senza usarlo sul prodotto ACTIVE.
- `Stato sync corrente: Mai sincronizzato` pur mostrando un valore Shopify live disponibile: precisare la differenza tra tracciamento sincronizzazione Admin e disponibilita' valore sullo store, evitando messaggi fuorvianti.
- Le tre liste sono accessibili ma non e' dimostrata l'ergonomia del riordino, l'editing e il salvataggio; i pulsanti AI non sono visibili da questo account e vanno verificati nominativamente con Marco.
- `Prezzo —` nel riepilogo di un prodotto con varianti: verificare che la UI indichi «Prezzo nelle varianti» quando appropriato, senza inventare importi.

**Prossima prova sicura:** scegliere una **DRAFT tecnica autorizzata**, aprire `Modifica` su un campo editoriale e verificare editor/annulla senza salvare o inviare a Shopify; solo dopo, per test save/AI reali, autorizzazioni separate e account nominativo Marco. Nessun cambio live effettuato durante questa verifica.

## Blocco editor HTML legacy rilevato — 19 novembre 2026

**Riscontro live Chrome, sessione operatore, prodotto ACTIVE Gaura Lindheimeri Siskiyou (SKU `OG_111433`), solo apertura editor e nessun salvataggio.** Aprendo **Contenuti → Descrizione estesa → Modifica**, appare esplicitamente:

> Il contenuto contiene formattazioni non supportate. L'originale e' conservato: annulla e richiedi assistenza per modificarlo senza perdita.

La barra editor Tiptap offre Paragrafo, Grassetto, Corsivo, Elenco puntato, Elenco numerato, Annulla modifica, Ripristina. Il testo leggibile e' presente, ma il contesto del browser mostra anche marcatori `img` con `src` vuoto: e' **evidenza di possibile elemento multimediale non riproducibile in questo editor**, NON prova di perdita dal database/Shopify. E' visibile il pulsante combinato **Salva bozza e aggiorna sul sito**, distinto da **Salva bozza** (quest'ultimo mostra inizialmente "Nessuna modifica da salvare"). UI consente di annullare.

**Decisione di collaudo:** NON usare il prodotto ACTIVE per test di salvataggio; raccomandato **Annulla** e nessuna sincronizzazione. Il test formato legacy e' **BLOCKED per editing sicuro finche' non viene analizzata e risolta la formattazione non supportata**, eventualmente tramite supporto Lovable e nuova prova su DRAFT tecnica autorizzata. Non normalizzare, eliminare immagini o sovrascrivere HTML senza preservazione lossless e consenso specifico. Test editor su semplice DRAFT separato consentito, nessun coinvolgimento prodotti commerciali. Prima della consegna a Marco, verificare comportamento del warning su descrizioni reali e rendere esplicita la distinzione salvataggio interno vs salvataggio+sync Shopify. Non dichiarare PASS sul salvataggio della descrizione di Gaura.

## Perche' l'AI non appare nell'account tecnico — 19 novembre 2026

**Comportamento atteso verificato con lettura della sessione Chrome operatore e del backend.** Il frontend pubblicato mostra l'editor visuale e i campi AI-eligible, ma non mostra il comando AI nel profilo operatore. Query live aggregata senza dati identificativi: esistono **1 grant 8 capability / 17 campi con `ai`** (assegnato nominativamente a Marco secondo preflight Lovable) e **1 grant 7 capability / 14 campi senza `ai`** (operatore tecnico). Il backend `product-admin-api`, azione `get_admin_context`, espone `canUseAi: writesEnabled() && catalogAiAllowed(auth)`: il flag di scrittura ON non sostituisce il permesso `ai`. L'assenza del pulsante AI nell'account tecnico **non dimostra un difetto AI** e non sostituisce il collaudo nominativo Marco.

**Per una prova preventiva dall'account tecnico**, prima occorre un **nuovo consenso nominativo separato** per ampliare esclusivamente il grant B dell'operatore: aggiungere la capability `ai` e, per testare tutti e tre gli elenchi, i field_keys `key_benefits,key_features,special_bullets`, preservando i 7 e 14 esistenti, account/ruoli e grant Marco. Confronto condizionale su baseline letta al momento dell'operazione, UPDATE attesa di una riga e readback. Non usare permessi globali, non attribuire ai a ogni admin, non creare nuovo login o bypass. Tale grant non autorizza automaticamente una generazione AI a pagamento: richiede test A separato, fatto con un solo campo e DRAFT tecnica. E' consigliato revocare i permessi AI aggiuntivi temporanei al termine delle prove solo con autorizzazione e readback distinti.

**In data odierna nessuna estensione del grant tecnico, generazione AI o modifica Shopify eseguita da questo controllo.**
