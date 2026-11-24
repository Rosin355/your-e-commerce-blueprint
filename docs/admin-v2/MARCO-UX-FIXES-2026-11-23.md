# Online Garden — Admin V2, interventi prioritari dal collaudo Marco (23 novembre 2026)

## Verifica tecnica del 24 novembre 2026

**PASS sul candidato da main `fa178bb`. Rilascio e accettazione personale di Marco in attesa.**

| Segnalazione | Causa e modifica | Prova |
| --- | --- | --- |
| Troppi campi | Il percorso iniziale richiedeva sei passaggi. Nome, descrizione, formato, prezzo, categoria e foto sono ora nella prima schermata. Il secondo passaggio verifica e salva. Le opzioni avanzate conservano i valori quando richiuse. | Chromium a 1280 e 390 px, tastiera, focus sul primo errore, associazione messaggio-campo, assenza di scorrimento orizzontale, anteprima e riapertura. |
| SKU obbligatorio a mano | La bozza partiva con due codici vuoti. Ora la nuova compilazione inizializza una famiglia `OG-NP-` con 80 bit casuali. Un formato condivide lo SKU della famiglia, più formati ricevono suffissi distinti. È disponibile la modifica manuale. | Test del validatore, due bozze, varianti, conflitto in anteprima e al salvataggio, rigenerazione esplicita conservando gli altri dati. |
| Mesi non consecutivi | L’editor inviava l’ordine dei clic e la validazione del registro richiedeva l’ordine cronologico. Gli aggiornamenti funzionali operano sul valore corrente. Il modulo e la validazione server usano `normalizeMonths`. L’ultima deselezione omette il periodo facoltativo dalla bozza. | Quattro calendari indipendenti, Febbraio/Maggio/Novembre, Dicembre/Gennaio/Aprile, clic inversi e rapidi, deselezione intermedia, cambio schermata, salvataggio e riapertura. Due schede esistenti sintetiche hanno conservato il proprio SKU. |
| AI diversa nella creazione | La chiave React dipendeva da nome e SKU. Una modifica smontava l’assistente e cancellava fatti e proposta. Anche il cambio di passaggio lo smontava. Un unico messaggio mascherava gli errori del servizio. Ora l’assistente mantiene lo stato, invalida le proposte se cambiano i fatti e distingue gli errori. | Handler HTTP reale eseguito con dipendenze sintetiche, prove UI di errori distinti, scarto, conferma esplicita e compilazione manuale. Il codice della singola anomalia osservata da Marco il 23/11 resta sconosciuto. |

### Verifiche sul catalogo e sull’AI

- **Shopify, sola lettura.** Sul negozio collegato la ricerca combinata `productVariants` ha trovato uno SKU esistente anche nel secondo termine e con maiuscole/minuscole diverse. Due codici di prova assenti hanno restituito zero risultati. Il servizio verifica catalogo locale e bozze, ripete la lettura Shopify al primo salvataggio e prima dell’eventuale invio distinto. Un risultato parziale o un servizio indisponibile blocca la verifica. Il vincolo univoco su `sku_norm` e la transazione esistente proteggono le scritture locali concorrenti. Una lettura remota non riserva il codice presso Shopify.
- **Richiesta AI.** Su nuova bozza e su campo vuoto l’azione è `suggest_confirmed_field`. Invia il campo, le frasi confermate e una chiave di richiesta. Su un campo esistente valorizzato, `generate_ai_suggestion` parte dal prodotto e dalla versione salvata. Il server controlla editor, grant AI e modifica, definizione del campo, limiti e proposta. Nel primo percorso sono ammessi soltanto frammenti identici alle frasi confermate. Il modulo distingue validazione, permessi, limite, configurazione, timeout, errore del provider e risposta malformata.
- **Riscontri sull’ambiente collegato.** Confermati in lettura definizione `description` abilitata all’AI, quattro definizioni mensili, due grant editor compatibili e presenza di tabella e RPC di prenotazione. La configurazione Lovable elenca il nome `LOVABLE_API_KEY`. Nessun valore acquisito. Due richieste anonime a `product-admin-ai` hanno ricevuto 401. La presenza della chiave e delle prenotazioni non attesta validità della chiave, credito del gateway o esito di una generazione con l’account di Marco. L’esito live resta da registrare sul candidato autorizzato.
- **Esecuzione locale.** Typecheck TypeScript, build Vite, lint dei file coinvolti e Deno check degli entrypoint superati. Suite mirate con **29 casi Playwright**, **130 test Node** e **18 test Deno**. I browser usano l’applicazione reale con trasporto controllato. Gli esiti dei controlli di integrazione e PostgreSQL sono registrati su GitHub nella PR.

### Rilascio e ripristino

Dopo review e approvazione, distribuire prima `product-admin-api` con i moduli condivisi del commit approvato. In una nuova anteprima autorizzata verificare il segnale `shopifySkuVerified: true` e la rilettura dei mesi. La nuova UI blocca il salvataggio quando risponde la vecchia Edge. Distribuire il frontend su Lovable solo dopo autorizzazione distinta. Il gateway AI e lo schema database esistenti sono sufficienti. Per il ripristino riportare prima il frontend e poi la Edge alle rispettive versioni precedenti. Conservare le bozze interne già salvate e i loro SKU. Una nuova bozza è in memoria fino al salvataggio, quindi avvisare gli operatori prima di ricaricare la pagina.

Il collaudo personale si conclude con una bozza interna e l’esito dell’AI registrato per l’account di Marco. [Checklist della sessione](../release/MARCO-ACCEPTANCE-SESSION-2026-11-23.md)

**Rilevazione iniziale del 23 novembre.** Problemi segnalati dall'utente durante una sessione di collaudo in produzione; analisi statica GitHub del 23/11, **FIX NON IMPLEMENTATI** e nessun nuovo Publish autorizzato. Conservare il collaudo sul prodotto nuovo come evidenza, evitando dati personali o SKU completi del cliente negli esempi. DNS/IONOS sospeso per mancanza dell'accesso autorizzato; nessun cambio NS o record.

## Evidenze della sessione

Screenshots del flusso `https://onlinegarden.it/admin/products/new`, descrizione *Quercus rubra*, periodi botanici, anteprima e conferma. L'anteprima mostra una **bozza interna fuori vendita**, con foto e codice SKU di test, seguita da schermata «Bozza interna — non inviata». Questo **non attesta pubblicazione Shopify** e non dimostra che tutte le selezioni mensili siano state persistite in backend. Marco segnala:
1. L'assistente AI ha talvolta funzionato sulla scheda prodotto esistente ma **non nel flusso Nuovo prodotto**; il form mostra un errore AI unico e non diagnostico.
2. Il wizard espone troppi campi amministrativi/tecnici; l'utente non sa quali compilare. Richiede **modalità semplice come default**, dettagli avanzati su espansione.
3. Nella creazione, mesi selezionati in ordine sparso/non consecutivi sembrano non essere acquisiti, a differenza dei flussi di modifica.
4. Marco non conosce gli SKU: chiede **generazione automatica** all'inizio del wizard senza doverli conoscere.

## Riscontro di codice precedente alla correzione

- `src/adminv2/pages/NewProductPage.tsx`: `initial.sku=''`, `initial.variants[0].sku=''`, in step 0 campo manuale `SKU famiglia`; `update` resetta `preview`, `confirmed`, `key` in qualunque modifica; form HTML ad alta densità; bottone AI sulla descrizione montato condizionalmente a `canUseAi` e definizione/allowlist. Non identificata da screenshot una causa univoca di errore runtime.
- `src/adminv2/components/ConfirmedAiAssistant.tsx`: `catch` mostra sempre «Informazioni insufficienti, richiesta non autorizzata o provider non disponibile» e reimposta la casella; non distingue `VALIDATION_ERROR`, `FORBIDDEN`, `RATE_LIMITED`, `AI_NOT_CONFIGURED`, `AI_PROVIDER_ERROR` e altri codici. Richiede facts confermati, 1–12 righe e 12–500 caratteri per riga. Evitare richieste AI ripetute in serie.
- `src/adminv2/components/FieldEditor.tsx`: `month_multiselect` aggiunge `[...selected, month]` nell'ordine di clic, con un `selected` derivato dalle props correnti. L'inserimento rapido/sfalsato può meritare una verifica di stale state, integrazione parent e serializzazione; **non è stata dimostrata la causa runtime**.
- `supabase/functions/_shared/admin-v2-field-policy.ts`: `normalizeMonths` già ordina Gennaio → Dicembre e deduplica; il backend deve usare la stessa logica per ogni fase di nuovo prodotto e modifica esistente. `validateDraft` in `supabase/functions/_shared/admin-operational-core.ts` conserva `botanical` generico e impone SKU famiglia e varianti coerenti. Non generare mesi automaticamente o campi botanici non verificati.
- `src/adminv2/components/VariantEditor.tsx`: SKU famiglia singolo propagato al formato unico; più varianti usano suffissi `-1`, `-2` ecc., ma il codice iniziale dipende ancora da input manuale.

## Requisiti del fix (priorità alta)

### A. Wizard Marco «essenziale» per default

Mostrare sempre nome, descrizione/verifica AI facoltativa, prezzo e almeno un formato, categoria e immagini, con indicatore `necessario`/`facoltativo`, progressivo e messaggi chiari. Mettere SKU, vendor, tipo tecnico, SEO, tag e dettagli botanici/FAQ in uno o più `<details>` accessibili «Altre informazioni / Opzioni avanzate», preservando dati e permessi server-side quando si chiude/riapre. Non nascondere un campo che impedisce un salvataggio senza spiegarne la necessità; default sicuri solo se documentati, mai prezzi inventati, stock, dati botanici, certificazioni o publish automatico. Preservare editor completo per operatori esperti.

### B. SKU automatico, stabile e collision-safe

Generare al primo ingresso in `/admin/products/new` un **identificativo famiglia neutro e leggibile** con suffisso casuale a entropia adeguata (es. `OG-NP-<suffix>`), in memoria di bozza e associato alla variante singola; per varianti multiple usare codici correlati distinti. Non rigenerarlo a ogni digitazione/step, solo per nuovo prodotto oppure richiesta esplicita `Rigenera` in sezione avanzata prima del salvataggio. Verificare in modo affidabile collisioni tra bozze e Shopify, con preflight e rigetto comprensibile in caso di conflitto; nessuna mutazione automatica su SKU esistenti o pubblicazioni. Non basarsi solo su `Date.now()` o nome prodotto. Controlli server-side conservati.

### C. Mesi indipendenti e persistenti

Usare stato consistente e update funzionali per togliere o aggiungere mesi arbitrari e non adiacenti. Normalizzare per l'output cronologico e deduplicato `normalizeMonths`, senza perdere i mesi durante navigazione tra step, preview, salvataggio, riapertura o sincronizzazione Shopify. Testare `Febbraio + Maggio + Novembre`, selezione inversa `Dicembre + Gennaio + Aprile`, deselezione intermedia, click rapidi e quattro campi stagionali, non solo intervalli consecutivi. Non imporre mesi consecutivi. Errori field-level.

### D. AI Nuovo prodotto vs modifica

Confrontare stessa API `product-admin-ai`, field definitions, permessi Marco e payload su due percorsi, senza esporre token; conservare scelta di fatti verificati, proposta separata e applicazione solo esplicita. Fare diagnosi in ambiente autorizzato, distinguere errori `VALIDATION_ERROR`, `FORBIDDEN`, `AI_NOT_CONFIGURED`, `AI_PROVIDER_ERROR`, `RATE_LIMITED` con messaggi utili senza segreti e log tecnici sanitizzati. Non attribuire a priori la causa al provider. La generazione deve **riorganizzare soltanto fatti verificati**, senza inventare contenuti. Nessun auto-publish/auto-sync.

## Test e accettazione

- Test component per user journey: nuovo prodotto, wizard semplice/avanzato, SKU automatico con formato unico/multiplo, editing senza modificare SKU, collisione e retry, mesi casuali rapidi/trasversali, preview e salvataggio; test su eventuali fallimenti della funzione AI. Includere 2 schede prodotti esistenti come regressione.
- Test Edge Function e permessi con identità controllate: editor Marco vs guest, nessun allargamento RLS/grants, nessuna scrittura Shopify non autorizzata.
- UI mobile/desktop, tastiera/accessibilità, pagina in italiano.
- CI typecheck/build + test mirati; branch dedicato, PR e review, nessun Publish automatico.
- Collaudo **con l'account di Marco** prima di dichiarare `ACCEPTED`; usare bozza tecnica reversibile, non modificare prodotti live. Testare il salvataggio e poi riaprire gli stessi mesi e lo SKU. Non confondere bozza interna con DRAFT Shopify o pubblicazione catalogo.
- Documentare differenze fra `implemented/tested/merged/published/accepted`; lasciare SAL ufficiale 57,75% finché non viene chiuso un criterio ponderato esistente.

## Fuori scope

DNS/Cloudflare, Shopify shipping, cookie PR #69, informative, ordini WooCommerce. Non creare nuovo ambiente Supabase, non fare deploy Edge o Lovable senza autorizzazioni distinte.
