# Admin V2 — correzione sincronizzazione metafield e diagnosi pubblicazione

## Diagnosi verificata
- Prodotto esatto: `gid://shopify/Product/16026906460500`, variante `gid://shopify/ProductVariant/58634556997972`, SKU `OG-NP-146C68CF06-A15884233C`.
- L'invio della nuova bozza salva botanica/FAQ/caratteristiche nell'Admin ma non le include nella creazione Shopify. Invia solo il metafield tecnico e l'eventuale descrizione breve.
- `VERIFIED_DRAFT` verifica creazione e mapping, non l'intera scheda: 13 valori Admin, zero verifiche remote per campo, tutti ancora bloccati alla sync per campo.
- Pubblicazione esplicita già presente, ma solo Headless: non Online Store o Lovable. Creare/sincronizzare non pubblica automaticamente.
- Periodi salvati non coerenti con il testo: fioritura riportata giugno-luglio, altri periodi senza fonte. Il cliente conferma alle 18:05 UTC che i mesi sono stati selezionati manualmente: **non è un bug di generazione AI**. La verifica botanica resta distinta dall'inserimento manuale.
- **110 test Node + 28 Deno PASS**, solo mock. Nessuna correzione applicativa o operazione di produzione effettuata.

## Limiti della verifica
Accesso Shopify scaduto: definizioni e valori effettivi, publication IDs, mercati, inventario e immagini non riletti. ACTIVE / nessuna pubblicazione / stock 0 sono evidenze riferite, non nuove attestazioni. Visibilità Storefront del prodotto esatto: **NOT_TESTED**. Non sostituire questa verifica con la ricerca per titolo. Origine manuale dei mesi confermata dal cliente, senza modificarli.

## Regola e percorsi collegati controllati
Un campo richiesto non può sparire senza avviso: salvare nell'Admin, sincronizzare su Shopify e pubblicare sul sito sono risultati diversi.
- Nuova scheda, creazione separata o combinata, recupero e riepilogo: codice letto; stessa omissione botanica e stessa verifica limitata ai campi previsti dalla create.
- Scheda esistente, invio singolo campo e revisione di più campi: codice letto; confronto, errori e read-back presenti. Una revisione parziale elenca i campi riusciti e si ferma all'errore, senza dichiarare completamento globale.
- RPC bozza/sync: definizioni live lette; create conserva valori bloccati, completion non attesta ogni campo; field sync registra esito/versione e valore verificato.
- Pubblicazione: codice letto, manuale e separato; verifica solo Headless, non tutti i canali/mercati.
- Nessun job di pubblicazione registrato per questa Yucca; flussi legacy/import/batch esterni all'Admin non modificati né certificati da questo audit.

## Correzione proposta
1. Completare audit remoto tramite accesso ufficiale autorizzato: stesso Product/Variant, tutte le definizioni e i valori metafield paginati, canali e mercati. Nessuna scrittura.
2. Nella create DRAFT includere solo campi richiesti, autorizzati e confermati; validare mapping e tipi effettivi prima dell'invio. Campo senza mapping/fonte o incompatibile: errore o esclusione esplicita da approvare, mai omissione silenziosa.
3. Rileggere ogni valore richiesto dopo l'invio e mostrare esiti per campo. Una scheda con errori non è completamente sincronizzata. Riconciliare esiti incerti senza ricreare prodotti.
4. Confronto Admin/Shopify con origine, conferma, tipo, valore e timestamp distinti; periodi senza informazioni affidabili vuoti o da confermare. Nessuna deduzione botanica automatica.
5. Conservare separazione sincronizzazione/pubblicazione. Mostrare canale preciso e stato corrente; eventuale futuro set di canali richiede approvazione esplicita e capability, userErrors e rilettura di ciascun esito.

## Dettagli tecnici
- API: `_shared/admin-operational-service.ts`, `_shared/admin-v2-shopify-field-sync.ts`, `_shared/admin-v2-field-policy.ts`; riuso dei controlli versioni/digest, serializzatori e read-back esistenti.
- Admin: riepilogo nuova bozza, operazioni, confronto campi e anteprima pubblicazione; soltanto `src/adminv2`.
- Nessuna migration inclusa. Se la persistenza delle attestazioni richiede modifica RPC/schema, presentare prima una decisione separata.
- Per il prodotto già creato usare futura sincronizzazione selettiva autorizzata, non una nuova create.

## Collaudo e gate
Test con mock: esistente/nuova DRAFT, testo/JSON/lista, non mappato, tipo incompatibile, fonte botanica assente, Editor negato, ACTIVE senza publication, stock zero, errori parziali, read-back errato e prevenzione duplicati.

**L'approvazione di questo piano autorizza solo la preparazione del candidato e test isolati.** Non autorizza scritture Shopify/DB, ampliamento permessi, deploy o Publish. Dopo PASS, richiedere autorizzazioni separate per `product-admin-api` e per i soli messaggi frontend Admin. Nessun cambio homepage/catalogo/PDP/navbar/checkout/pagamenti/inventario/prezzi/varianti o nuovo backend.

**METAFIELD_SYNC: FAIL come workflow completo; DEPLOY_REQUIRED: sì per il futuro fix; FRONTEND_PUBLISH_REQUIRED: sì per i messaggi proposti. NO-GO accettazione/rilascio; PENDING_CLIENT_ACCEPTANCE**, SAL invariata 57,75%.
