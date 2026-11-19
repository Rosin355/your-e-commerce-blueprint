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

## Grant AI operatore PASS — 19 novembre 2026; UI da ricaricare

**Lovable riferisce grant B dell'operatore aggiornato con una sola UPDATE condizionata** al baseline `2026-11-13 11:00:44 UTC`; nuovo timestamp `2026-11-19 16:28:50 UTC`, ruoli admin+editor preservati. Grant A di Marco immutato. **Verifica aggregata indipendente live in sola lettura:** 2 grant totali, entrambi enabled e con 8 capability/17 field_keys comprensivi di `ai`. Nessuna chiamata AI, scrittura prodotto, Shopify sync o nuovo Publish.

**UI Chrome dell'operatore prima del refresh:** editor della Gaura in sola lettura dopo `Annulla`, i pulsanti AI non ancora visibili nella lettura della pagina; cio' non prova un guasto, poiche' il client potrebbe non avere ricaricato il contesto permessi. **Passaggio di test immediato:** ricarica completa della scheda Chrome e lettura non mutante della sezione Contenuti; per campo descrittivo non vuoto il codice `FieldCard` mostra `Migliora il testo con AI` quando `field.capabilities.canSuggestAi` e' true; per campo AI-eligible vuoto mostra `Aiutami a compilare` e `Organizza le informazioni con AI`. Non premere generazione senza approvazione A. Se pulsanti mancanti dopo refresh, confrontare `canUseAi` e `canSuggestAi` nella risposta autenticata, senza mostrare token o dati personali. L'assenza non va imputata al provider AI senza verificare il gate di UI e backend.

**Separare le prove:** visibilita' pulsanti (read-only) e' distinta da generazione AI reale (costo, da autorizzare), salvataggio Admin (scrittura), sincronizzazione Shopify (scrittura live). Il prodotto ACTIVE Gaura resta vietato per test save/sync; avviso HTML legacy non ancora risolto.

## Chrome: pulsanti AI visibili dopo refresh — 19 novembre 2026

**PASS visibilita' AI, solo account operatore, sola lettura**. Dopo `Cmd+R` sulla scheda Chrome `onlinegarden.it/admin/products/472eb9de-14dc-4163-99f2-068c98397159` (Gaura Lindheimeri Siskiyou, prodotto ACTIVE), il testo UI mostra **3 pulsanti `Migliora il testo con AI`** nelle descrizioni non vuote e **3 sezioni `Aiutami a compilare` / `Organizza le informazioni con AI`** per `Punti di forza`, `Caratteristiche principali`, `Altri punti utili`. Nei campi vuoti si vedono textarea per 1-12 frasi verificate e checkbox di conferma. Il grant tecnico e' stato recepito sul frontend senza nuovo Publish. Test di generazione reale **NON ESEGUITO**; nessun click sui pulsanti AI, salvataggio interno o Shopify sync durante questa lettura. Il prodotto Gaura e' ACTIVE e presenta warning storico di formattazioni non supportate: NON usarlo per test mutanti. Prossimo test reale solo con DRAFT tecnica esplicitamente approvata, budget/consenso AI A separati, poi collaudo nominativo Marco.

## Piano T/A: nuovo prodotto e AI in sessione operatore — 19 novembre 2026

**Test guidato pianificato, NON eseguito.** Su Chrome con l'account operatore AI-enabled aprire `/admin/products/new` tramite catalogo, senza usare prodotti ACTIVE. Il wizard ha 6 passi: Informazioni, Dati commerciali, Categorie, Immagini e formati, Botanica e SEO, Anteprima. Nel primo passo mostra `Nome prodotto`, `SKU famiglia`, editor visuale `Descrizione verificata` e, se `canUseAi` e registro campo compatibili, `Aiutami a compilare` con conferma fatti. La richiesta AI sul nuovo prodotto e' **una chiamata al gateway**, puo' avere costo e scrittura nel registro richieste; non premere per errore o fare retry. Si usi soltanto un set minimo di fatti botanici confermati esplicitamente, senza prezzi/stock/claim fittizi generati dall'AI.

**Isolamento commerciale:** nome e SKU riconoscibili come `TEST`/ `NON IN VENDITA`; non selezionare canali pubblicati o lanciare `Crea bozza Shopify`. Il wizard prevede `Verifica anteprima` (non mutante) e checkbox `Confermo i dati: salva soltanto una bozza interna`; `Salva bozza nell'Admin` crea un record interno **solo dopo un click esplicito** (test T da autorizzare separatamente). La bozza salva nel catalogo interno e compare nell'elenco; non e' una simulazione volatile, quindi registrare SKU e cleanup successivo, senza eliminare record senza consenso. Prezzi/varianti di test non vanno inventati come commerciali; usare input tecnico concordato.

**Sequenza verifica:** 1) aprire wizard, leggere campi e guardie, senza scrivere; 2) comporre bozza e verificare anteprima; 3) solo con scelta consapevole e un budget massimo autorizzato, una chiamata AI; 4) applicare proposta localmente e confrontare testo, non inviare a Shopify; 5) eventuale save interno una sola volta e readback del nuovo prodotto; 6) mai utilizzare `Crea bozza Shopify`, `Aggiorna sul sito` o `Pubblica` in questo collaudo. Il test dal profilo operatore NON sostituisce l'accettazione Marco.

## Sessione test nuovo prodotto — fatti AI pronti (19 novembre 2026)

**Stato UI verificato (lettura Browser, nessuna richiesta AI eseguita da assistente):** form nuovo prodotto al passaggio 1 Informazioni, nome `TEST — Lavanda officinale — NON IN VENDITA`, SKU `TEST-OG-AI-001`; editor `Descrizione verificata` vuoto; textarea `Informazioni fattuali confermabili` contiene tre frasi botaniche di esempio, una per riga; checkbox conferma selezionata; `Organizza le informazioni con AI` visibile. Il contenuto delle frasi deve essere confermato dall'operatore: l'AI non deve inventare altre informazioni. **Step richiesta reale e relativo costo non ancora confermati dal sistema.** L'operatore puo' avviare un'unica richiesta consapevole e fermarsi alla `Proposta da revisionare`; nessun click su `Applica alla compilazione`, `Salva bozza nell'Admin`, `Crea bozza Shopify` o `Pubblica` in questa fase. Se il provider fallisce, annotare l'errore senza retry automatici; se la proposta appare, verificarne fedelta' ai fatti e sola formattazione prima di applicarla.

## Prima generazione AI reale — PASS proposta, 19 novembre 2026

**Osservazione Chrome live, login tecnico, nuovo prodotto non salvato:** dopo click utente `Organizza le informazioni con AI`, la pagina mostra `Proposta da revisionare`, con `Scarta proposta` e `Applica alla compilazione`. Il valore generato e' formato da tre paragrafi e riprende fedelmente le tre informazioni confermate sulla lavanda (pianta aromatica perenne, posizioni soleggiate e terreno drenante, fiori profumati attrattivi per impollinatori). Nessuna affermazione aggiuntiva nel testo osservato. **PASS risposta del provider + UI proposta; NON ancora PASS applicazione, salvataggio, readback o test con Marco.** Costo effettivo/token e provider runtime non verificati: non dichiarare budget o charge. Il `ConfirmedAiAssistant` applica soltanto al form dopo conferma utente, senza write DB o Shopify automatici; separare esplicitamente dalle azioni `Salva bozza nell'Admin` e `Crea bozza Shopify`.

**Osservazione UX:** con dati confermati forniti come frasi complete, l'AI restituisce soprattutto formattazione in paragrafi, non un copy arricchito; per il cliente va spiegato che il modello non puo' integrare caratteristiche botaniche non verificate. Miglioramenti possibili da progettare successivamente solo con approvazione, senza allentare il divieto di informazioni inventate.
