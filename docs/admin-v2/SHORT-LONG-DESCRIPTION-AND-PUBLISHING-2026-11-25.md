# Online Garden — descrizioni distinte e pubblicazione Shopify
Data: 25 novembre 2026 · Stato: **CANDIDATO IN REVISIONE** · SAL contrattuale **57,75% invariata**.

## Segnalazione e screenshot

Durante il collaudo dell'Admin V2 AI su `onlinegarden.it`, l'operatore osserva che i testi definiti come descrizione breve/estesa o come descrizione alternativa/ottimizzata appaiono uguali o conflittuali. Nella schermata della scheda `Quercus robur`, la card **Descrizione ottimizzata** mostra il testo lungo e l'avviso **«Campo o mapping Shopify non disponibile»**. Non è stato eseguito alcun invio a Shopify durante questa osservazione. Questo screenshot non dimostra quale contenuto risulti salvato nella descrizione Shopify pubblica.

### Cosa dice il codice pubblicato

- `src/adminv2/components/FieldCard.tsx`: per le chiavi `description` e `optimized_description` viene mostrato «Questa descrizione e la descrizione alternativa aggiornano lo stesso testo sul sito. Scegli quale inviare; nessun invio automatico.» Sono dunque **due campi editoriali che potenzialmente puntano allo stesso contenuto Shopify**, non due descrizioni Shopify indipendenti.
- `src/adminv2/lib/newDraft.ts`: `ProductDraft` della creazione include `description` e metadati SEO, non definisce automaticamente due campi nativi Shopify lungo/breve.
- `src/adminv2/components/ProductOperations.tsx`: **Crea bozza Shopify** visibile per un'operazione `LOCAL_DRAFT` solo in presenza dei permessi `canManageDraft` e `canSendDraft`, oltre all'approvazione specifica quando richiesta. L'azione richiede conferma e crea una bozza Shopify **non pubblicata**.
- `src/adminv2/components/CatalogActions.tsx`: **Verifica pubblicazione** e **Pubblica sul sito** sono disponibili soltanto quando `ordinaryCatalog`, `canPublish`, `canSync` e i controlli commerciali lo consentono. I prodotti marcati `technical` sono esplicitamente non pubblicabili.
- Le normali modifiche nel gestionale non pubblicano né sincronizzano automaticamente Shopify.

### Comportamento da realizzare

1. **Descrizione breve**: 1–3 frasi distinte, concise, presenti nella card alta della PDP. Evitare di copiare l'intera descrizione estesa; costruire soltanto dai fatti verificati, con revisione esplicita.
2. **Descrizione estesa**: contenuto completo, strutturato e verificato, nella sezione dettagli della PDP.
3. **SEO title** e **SEO description** sono metadati di ricerca separati, non copie obbligate della descrizione breve; usare le proposte AI già autorizzate con fallback sicuro.
4. **Shopify mapping**: `ProductInput.descriptionHtml` è il campo nativo esteso; Shopify non espone un secondo `shortDescription` nativo nello stesso input. Valutare un metafield prodotto dedicato (`custom.short_description` **solo se namespace/key e tipo sono approvati e non esiste una definizione equivalente**). La definizione deve consentire lettura `access.storefront=PUBLIC_READ` se la vetrina headless deve recuperarla. Verificare mapping bidirezionale, escaping/sanitizzazione HTML, autorizzazioni, store API e rendering responsive senza introdurre nuovi campi in produzione prima dell'approvazione.
5. **Prevenzione collisioni**: `description` e `optimized_description` non devono sincronizzare silenziosamente entrambi su `descriptionHtml` senza scelta; il campo `short_description` deve usare un target distinto e verificabile. Se il mapping manca, mostrare un messaggio utile e mantenere la bozza interna, senza dichiarare sincronizzazione completata.
6. **Qualità AI**: una generazione multi-campo quando tecnicamente valida; mai inventare botanica e caratteristiche commerciali, conservare i fatti confermati, consentire anteprima e approvazioni indipendenti. Nei fallback brevi applicare un limite di caratteri coerente con il design, non troncare frasi a metà.
7. **Test**: creazione e modifica di bozza; brevità/lunghezza realmente diverse; persist after reload; sync e rilettura metafield/dati descrizione Shopify su DRAFT autorizzato; rendering della PDP mobile/desktop; regressioni prezzo, varianti, checkout, SEO, permessi Editor e pubblicazione senza effetti collaterali.
8. **Release**: PR mirata con GO separati backend / frontend / eventuale metafield / Publish; rollback; non modificare prodotti reali senza autorizzazione.

## Come rispondere ora a Marco: pubblicazione del prodotto

1. In `https://onlinegarden.it/admin` salva una **bozza interna** e riaprila da **Prodotti**.
2. Espandi **Operazioni Shopify e storico** nella scheda. Se il comando è attivo e i dati sono verificati, premi **Crea bozza Shopify** e conferma. Controlla **Bozza Shopify verificata / DRAFT**. Questa azione **non** mette il prodotto in vendita.
3. L'operatore con `canPublish` e `canSync` apre **Operazioni su Shopify → Verifica pubblicazione** e controlla stato, varianti/prezzi, logistica, stock e canale. Poi conferma separatamente **Pubblica sul sito**. La conferma non garantisce disponibilità acquistabile se inventario/stato canale sono non idonei: verificare sempre la PDP pubblica.
4. Se i pulsanti non sono visibili o sono disabilitati, **non** assegnare automaticamente nuovi privilegi: richiedere intervento all'operatore autorizzato e indicare quale condizione manca. La bozza di test Quercus robur usata nella PR #73 è tecnica, quindi resta `NON PUBBLICARE`.
5. Evitare un secondo invio nel caso di risposta incerta: usare **Recupera stato senza ricreare**.

## Design suggerito per un futuro miglioramento UX

Mostrare nella scheda una barra di avanzamento con stati chiari e permessi effettivi: **1. Bozza interna → 2. Bozza Shopify → 3. Verifica commerciale → 4. Pubblicato**. Descrivere chi può premere ciascun pulsante e distinguere `DRAFT su Shopify` da `visibile sul sito` e `acquistabile`. Nessuna pubblicazione automatica.

## Fonti tecniche

- Codice verificato sul commit pubblicato `7806725b9a51b669e9a77eaa6ebd7cd83e5ae253` e verbale `docs/release/PR73-CHIUSURA-AI.md`.
- Shopify: [ProductInput](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/ProductInput) e [Metafields Storefront](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/metafields).
- Confrontare screenshot con prova autenticata prima di chiudere il bug. **Non segnare PASS prima di un test su bozza e Shopify con un account autorizzato.**

## Esito dell’intervento nel candidato

La descrizione breve usa il metafield esistente custom.short_intro, già pubblico per la Storefront API. La descrizione estesa usa descriptionHtml. SEO title e meta description conservano i loro mapping. Il registro autorizza un solo campo scrivibile per ciascuna destinazione. Il browser ha verificato la riapertura delle due descrizioni e della PDP. La sincronizzazione è stata esercitata con risposte Shopify simulate. Il collaudo reale richiede una bozza esplicitamente designata. [Verbale, collaudo e rollback](../release/MARCO-EDITOR-SHOPIFY-2026-11-25.md)
