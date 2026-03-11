

## Analisi: Prezzi mancanti — Situazione attuale

### Dati dal DB

| Categoria | Conteggio |
|-----------|-----------|
| Totale prodotti | 2706 |
| **Con prezzo** | **356** |
| **Senza prezzo** | **2350** |
| — di cui parent (senza `parent_sku`) | 1161 |
| — di cui varianti (con `parent_sku`) | 1189 |

### Il prezzo era nel CSV originale?

**Sì, quasi certamente.** Il file WooCommerce (`Prodotti wp import - wc-product-export-28-2-2026...csv`) contiene sicuramente una colonna prezzo — tipicamente chiamata `"Prezzo di listino"` o `"Prezzo regolare"`.

**Il problema**: quando il CSV è stato importato la prima volta, il parser NON aveva ancora gli header italiani (`prezzo_regolare`, `prezzo`, `prezzo_di_vendita`). Questi sono stati aggiunti dopo. Quindi i prezzi c'erano nel file ma non sono stati riconosciuti durante l'import.

### Soluzione: Ri-caricare il CSV e usare "Aggiorna prezzi da CSV"

Non serve reimportare tutto. Il flusso è:

1. **Caricare di nuovo lo stesso CSV** nel pannello "Catalogo DB" (drag & drop)
2. **Cliccare "Aggiorna prezzi da CSV"** — il parser ora riconosce gli header italiani
3. Verranno aggiornati solo i campi `price` e `compare_at_price`, senza toccare titoli, descrizioni o dati AI
4. **Cliccare "Propaga prezzi varianti → parent"** per i parent rimasti senza prezzo

### Problema potenziale: header esatto

Per sicurezza, propongo di aggiungere una **diagnostica header** nel flusso: quando l'utente carica il CSV, mostrare gli header trovati e quali colonne sono state mappate a "prezzo". Così si vede subito se l'header è riconosciuto o meno.

### Modifiche previste

| File | Modifica |
|------|----------|
| `ProductSyncPanel.tsx` | Mostrare un riepilogo header dopo il caricamento CSV: "Colonna prezzo trovata: `prezzo_di_listino`" oppure "⚠️ Nessuna colonna prezzo riconosciuta" |
| `productSyncEngine.ts` | Aggiungere funzione `detectPriceColumn(headers)` che restituisce quale header è stato mappato al prezzo |

Questo permette di verificare immediatamente se il CSV ha i prezzi e se il parser li riconosce, prima di lanciare l'aggiornamento.

