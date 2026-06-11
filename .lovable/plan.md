## Problema

Pubblicando un prodotto il banner mostra "Shopify ✓" ma il chip **MF 0/10** indica che zero metafield sono stati scritti. Su Shopify infatti i campi `custom.*` restano vuoti. Gli errori `userErrors` di `metafieldsSet` non sono visibili in maniera immediata, e la causa più frequente è un disallineamento tra il `type` che inviamo e quello realmente definito su Shopify (es. inviamo `single_line_text_field` ma la definizione esistente è `multi_line_text_field`, o viceversa per liste).

## Obiettivo

1. Capire subito quali metafield falliscono e perché.
2. Far sì che la pubblicazione si auto-adatti ai tipi realmente presenti su Shopify, in modo che i 16 campi vengano scritti senza dover editare manualmente la mappa.

## Cosa farò

### 1. Self-healing dei tipi (server)
- Nuova funzione `fetchLiveMetafieldDefinitions()` nel `shopify-admin-proxy` che interroga `metafieldDefinitions(ownerType: PRODUCT)` filtrando `namespace: "custom"` e costruisce una mappa `key -> liveType`.
- `setProductCustomMetafields` userà come tipo, in ordine di priorità:
  1. il `liveType` di Shopify se esiste,
  2. il tipo locale `METAFIELD_TYPES` (fallback).
- `normalizeMetafieldValue` esteso per gestire anche `list.multi_line_text_field` e per accettare correttamente sia stringhe sia JSON array.
- Cache in memoria della funzione (TTL 60s) per non rifare la query a ogni pubblicazione.

### 2. Retry intelligente su type mismatch
- Se `metafieldsSet` restituisce per una key un errore tipo `Type must match the definition` o `INVALID_TYPE`, ricarico le definitions live, rimappo il tipo per quella key e rilancio SOLO le key fallite (max 1 retry "tipologico", oltre ai retry transienti già esistenti).

### 3. Visibilità errori (UI)
- Nel `ProductEnrichmentPanel` il chip `MF x/y` diventa cliccabile e colorato:
  - verde se `failed == 0 && written > 0`
  - giallo se `skipped > 0 && failed == 0`
  - rosso se `failed > 0`
- Click sul chip apre direttamente il pannello `MetafieldsReport` (oggi è dietro un altro pulsante meno evidente).
- Aggiungo, sotto al banner giallo del CSV, un secondo banner rosso che compare solo dopo "Pubblica tutti" se ci sono prodotti con `failed > 0`, con link "Vai al primo prodotto fallito".

### 4. Verifica preventiva in Settings
- In `MetafieldsConfigPanel`, dopo "Verifica su Shopify" se ci sono `type_mismatch` mostro un bottone "Allinea automaticamente la mappa locale ai tipi Shopify" che chiama una nuova action `get_metafield_config_live` e mostra in tabella il `type` effettivo che verrà usato in pubblicazione (così sai cosa sta succedendo senza dover editare codice).

### 5. Debug più utile
- Quando "Debug metafield" è attivo, includo nel log anche la lista delle definitions live trovate per namespace `custom`, così vedi subito se manca proprio la definition o se è solo un tipo diverso.

## Dettagli tecnici

File modificati:
- `supabase/functions/shopify-admin-proxy/index.ts`
  - aggiunta query GraphQL `metafieldDefinitions`,
  - cache in modulo,
  - logica di rimappatura tipo + retry mirato,
  - nuova action `get_metafield_config_live`.
- `src/admin/lib/aiWriterEngine.ts`
  - tipi e wrapper per `get_metafield_config_live`,
  - nuovo campo `liveTypeUsed?: string` in `MetafieldDetail`.
- `src/admin/components/MetafieldsReport.tsx`
  - mostra `liveTypeUsed` accanto allo status quando differisce dal tipo locale.
- `src/admin/components/ProductEnrichmentPanel.tsx`
  - chip MF colorato e cliccabile, secondo banner per errori batch.
- `src/admin/components/MetafieldsConfigPanel.tsx`
  - colonna "Tipo effettivo usato" + bottone "Allinea mappa".

## Cosa NON tocco

- Il prompt AI, gli stili di scrittura, lo storefront, il checkout, l'export CSV.
- La logica di publish di body HTML / SEO (che già funziona, badge verde).
- La tabella `product_ai_drafts` e tutto ciò che riguarda il salvataggio bozze.

## Verifica

1. Apro Settings → "Verifica su Shopify": confermo (o correggo) eventuali type_mismatch.
2. Su un prodotto già pubblicato (Wigginsia) clicco "Pubblica" con Debug ON: il chip MF deve passare da 0/10 a 10/10 (o segnalare in rosso quali campi mancano come definition).
3. Su Shopify Admin, sezione "Metafield del prodotto", verifico che i 10 campi non vuoti siano ora popolati.
4. Lancio "Pubblica tutti" su un sottoinsieme: se ci sono fallimenti compare il banner rosso con link al prodotto.
