

## Piano: Aggiornamento Token Storefront API

### Modifica

Un singolo file da modificare:

**`src/lib/shopify.ts`** — Riga 4: sostituire il valore di `SHOPIFY_STOREFRONT_TOKEN`:

```
// DA:
export const SHOPIFY_STOREFRONT_TOKEN = '2567c84a97b802506f2b1b3759f7b286';

// A:
export const SHOPIFY_STOREFRONT_TOKEN = '1d883bcf6107ac5e5389c7914625e55e';
```

Nessun'altra modifica necessaria. Tutti i file che usano questo token importano già la costante da questo file.

