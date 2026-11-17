# Online Garden — preparazione definizione Shopify `custom.key_benefits`

**Data: 17 novembre 2026 — stato: PREPARATA, NON CREATA, NO-GO alla scrittura live.**
Fonte: letture in sola lettura del negozio Shopify collegato Online Garden, verifica del codice `main` e PR #56; nessuna mutation, deploy, publish, cambio grant o login.

## Esito della verifica consumer (prima della definizione)

| Consumer/percorso | Verifica sulla PR #56 e main | Implicazione |
| --- | --- | --- |
| Shopify Admin definizione PRODUCT | `custom.key_benefits` **non presente**. `key_features` e `special_bullets` sono `multi_line_text_field`, con `access.storefront=PUBLIC_READ` | Una nuova definizione è tecnicamente coerente con le due esistenti, ma non basta per rendere visibile il campo |
| Shopify PRODUCT valori | Ricognizione precedente dell'intero catalogo, 1.348 ACTIVE + 17 DRAFT: **0** valori per `custom.key_benefits` | Nessuna conversione storica rilevata; ripetere il controllo puntuale prima di una scrittura futura |
| `src/hooks/useProduct.ts` / `PRODUCT_BY_HANDLE_QUERY` | Query Storefront seleziona `custom.key_features` e `custom.special_bullets`, **non** `custom.key_benefits` | **Consumer pubblico NON PRONTO**: aggiungere solo dopo review un alias `keyBenefits` con `value`/`type` |
| `src/lib/shopify.ts` / `ShopifyProduct` | Tipi `keyFeatures` e `specialBullets` presenti, `keyBenefits` assente | Estensione tipizzata richiesta nella PR #56 |
| `src/components/storefront/Pdp.tsx` | Render condizionale di “Cosa lo rende speciale” e “Caratteristiche principali”; nessuna sezione Punti di forza | **Consumer UX NON PRONTO**: render solo se valorizzato, evitando duplicazioni e rispettando la grafica approvata; designer deve verificare collocazione e microcopy |
| `src/components/storefront/pdpMetafields.ts` | `parseMultilineMetafield` separa per LF, trimma e scarta righe vuote | Compatibile per valori nuovi reversibili a una voce per riga, senza CR/LF interni, righe vuote o spazi esterni; dati ambigui devono restare bloccati |
| `supabase/functions/_shared/editorial-list-codec.ts` | Codec reversibile già usato per gli altri due elenchi | Riutilizzabile sotto controlli stretti; test su ordine, duplicati, caratteri speciali |
| `supabase/functions/_shared/admin-v2-shopify-field-sync.ts` | Condizione `target.key !== 'key_benefits'` esclude esplicitamente `multi_line_text_field` | **Sync NON PRONTO per `key_benefits`**, anche se la definizione fosse creata oggi; serve modifica circoscritta, nuova revisione di approvazione e test |

**Conclusione:** il tipo è appropriato, ma la compatibilità end-to-end NON è ancora attestata. Nessuna definizione deve essere creata in Shopify soltanto sulla base dei due campi esistenti.

## Definizione proposta — scheda per approvazione esplicita

| Proprietà | Valore preparato |
| --- | --- |
| Shop | Online Garden, `ecom-blueprint-gen-6ud1s.myshopify.com` |
| Proprietario | `PRODUCT` (metafield prodotto, non variante) |
| Namespace | `custom` (merchant-owned, coerente con i campi esistenti) |
| Key | `key_benefits` |
| Nome merchant | `Punti di forza` |
| Tipo | `multi_line_text_field` |
| Descrizione | `Elenco dei punti di forza del prodotto: una voce verificata per riga.` |
| Lettura Storefront | `PUBLIC_READ`, necessaria per la PDP headless |
| Accesso Admin | Merchant read/write coerente con gli altri campi `custom`, senza allargare ruoli del gestionale |
| Valore iniziale | **Nessuno**: creare la definizione non deve creare o popolare metafield prodotto |
| Regole dati | Una voce per riga con LF; niente CR/LF dentro una voce, righe vuote, spazi esterni, conversioni automatiche; ordine e duplicati conservati |
| Unicità preflight | Rileggere `metafieldDefinitions(ownerType: PRODUCT, namespace: custom, key: key_benefits)`; se non è ancora assente o se esiste altra definizione incompatibile: STOP |
| Operazione futura | Una sola creazione **esplicitamente approvata**, con readback definizione (owner/type/namespace/key/access), senza valori né creazioni prodotto |
| Recupero | Non cancellare la definizione in automatico se l'esito è ambiguo; rileggere prima, valutare eventuali consumer e valori, niente retry cieco |

### Sequenza autorizzabile, **non eseguita**

1. Codex implementa **nella sola PR #56** i tre consumer Storefront (query, tipo TS, render condizionale) e l'allowlist sync per `key_benefits` con lo stesso codec rigoroso, più test Node/Storefront e UI desktop/mobile. Non modificare prodotti o Shopify. Etichetta visiva **Punti di forza**, senza sostituire `key_features` o `special_bullets`; designer verifica assenza di ridondanza.
2. CI e review del diff risultano PASS; poi controllare in sola lettura che non esistano nuove definizioni o valori e confermare l'accesso Storefront richiesto.
3. Ottenere un'autorizzazione proprietario **D-BENEFITS**, separata da M/B/G/F-M/F-P/T/A/S: creare la sola definizione proposta sul negozio corretto, senza impostare alcun valore prodotto. Registrare approvatore, scope, data e contesto privato fuori da GitHub.
4. Solo dopo approvazione, l'operatore autorizzato crea la definizione come dato **merchant-owned**, verifica il readback del tipo e `PUBLIC_READ`; se differente, STOP. Nessuna migrazione massiva.
5. Le migrazioni Supabase 0016/0017, il deploy Edge, i grant nominativi, il merge/Publish e il collaudo con Marco restano operazioni **separate**, secondo `ATTIVAZIONE-STEP1C.md` e `AUTORIZZAZIONI-STEP1C.md`. Per provare un valore serve una DRAFT tecnica, conferma nuova v2 (o nuova revisione se cambia il server) e consenso S mirato.

## UX / accettazione per designer e cliente

- **Prima della scrittura:** su tutte le PDP il nuovo blocco è assente; il comportamento attuale resta invariato.
- **Dopo il futuro rilascio del consumer:** il blocco Punti di forza compare solo su prodotti con valore valido. Non deve confondersi con “Cosa lo rende speciale” o “Caratteristiche principali”; nessun testo AI inserito automaticamente.
- **Per Marco:** un elenco ordinabile e modificabile senza JSON; `Salva bozza` non aggiorna Shopify; `Aggiorna sul sito` richiede permesso, nuova approvazione per il singolo campo, CAS e readback; non utilizzare prodotti commerciali per i primi test.
- **Criterio GO finale:** definizione realmente leggibile dal canale Storefront, consumer e sync distribuiti nella versione verificata, schema/grant/backend autorizzati, richiesta AI reale solo se autorizzata e collaudo umano di Marco PASS. Fino ad allora **PARZIALE/NO-GO consegna**.

Fonti ufficiali: [Shopify — Metafield definitions](https://shopify.dev/docs/apps/build/metafields/definitions), [Shopify — Retrieve metafields in the Storefront API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/metafields). Nessuna chiamata di modifica Shopify eseguita.
