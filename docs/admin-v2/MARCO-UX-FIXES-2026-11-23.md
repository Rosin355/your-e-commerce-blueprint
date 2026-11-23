# Online Garden — Admin V2, interventi prioritari dal collaudo Marco (23 novembre 2026)

**Stato:** problemi segnalati dall'utente durante una sessione di collaudo in produzione; analisi statica GitHub del 23/11, **FIX NON IMPLEMENTATI** e nessun nuovo Publish autorizzato. Conservare il collaudo sul prodotto nuovo come evidenza, evitando dati personali o SKU completi del cliente negli esempi. DNS/IONOS sospeso per mancanza dell'accesso autorizzato; nessun cambio NS o record.

## Evidenze della sessione

Screenshots del flusso `https://onlinegarden.it/admin/products/new`, descrizione *Quercus rubra*, periodi botanici, anteprima e conferma. L'anteprima mostra una **bozza interna fuori vendita**, con foto e codice SKU di test, seguita da schermata «Bozza interna — non inviata». Questo **non attesta pubblicazione Shopify** e non dimostra che tutte le selezioni mensili siano state persistite in backend. Marco segnala:
1. L'assistente AI ha talvolta funzionato sulla scheda prodotto esistente ma **non nel flusso Nuovo prodotto**; il form mostra un errore AI unico e non diagnostico.
2. Il wizard espone troppi campi amministrativi/tecnici; l'utente non sa quali compilare. Richiede **modalità semplice come default**, dettagli avanzati su espansione.
3. Nella creazione, mesi selezionati in ordine sparso/non consecutivi sembrano non essere acquisiti, a differenza dei flussi di modifica.
4. Marco non conosce gli SKU: chiede **generazione automatica** all'inizio del wizard senza doverli conoscere.

## Riscontro di codice (stato attuale)

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
