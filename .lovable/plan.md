

## Logica attuale delle sezioni

La homepage fa **una sola chiamata** `fetchProducts(12)` che recupera i primi 12 prodotti da Shopify senza filtri. Poi li divide con `slice()`:

```text
products[0..3]  → "I più amati" (Best Sellers)
products[4..7]  → "Perfette per iniziare" (Easy Care)
products[8..11] → "Novità di stagione" (Seasonal)
```

Non c'è nessun filtraggio reale — sono semplicemente i primi 12 prodotti nell'ordine restituito dalla Storefront API.

## Problema

La maggior parte dei prodotti ACTIVE ha prezzo €0.00 (importati da WooCommerce). Solo 3 prodotti "Piante da Interno" (Monstera €29.90, Pothos €18.90, Ficus €27.90) e pochi altri (Wigginsia €3.00, Echinopsis €3.00, Dalia €5.00) hanno prezzi reali. Molti altri sono `variable` o `variation` type con prezzo 0.

## Piano

### 1. Fare 3 fetch separati con filtri per product_type

Modificare `HomepageV3.tsx` per fare 3 chiamate `fetchProducts` con query diverse:

- **"I più amati"**: `product_type:"Piante da Interno"` — i 3 prodotti classici con prezzo reale (Monstera, Pothos, Ficus)
- **"Perfette per iniziare"**: nessun filtro, primi 4 prodotti (mantiene il comportamento attuale)
- **"Novità di stagione"**: `product_type:variable` oppure `tag:woo-import` — per mostrare i nuovi prodotti importati dal catalogo WooCommerce

### 2. Gestire loading e stato separatamente

Ogni sezione avrà il suo stato di loading indipendente, così le sezioni che caricano più velocemente appaiono subito.

### 3. File da modificare

- `src/components/storefront/HomepageV3.tsx` — refactor del fetch in 3 chiamate parallele con query diverse

### Nota importante

Molti prodotti ACTIVE hanno prezzo €0.00. Le sezioni mostreranno comunque questi prodotti. Se vuoi nascondere i prodotti con prezzo zero dalla homepage, posso aggiungere un filtro client-side. Fammi sapere se preferisci questa opzione.

