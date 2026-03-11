

## Diagnosi: Prezzi mancanti nel catalogo DB

### Causa principale

Su 2706 prodotti importati, solo 195 hanno il prezzo. Il problema è duplice:

1. **Header CSV non riconosciuto**: il parser cerca `regular_price`, `price`, `prezzo_di_listino` ma il CSV WooCommerce italiano probabilmente usa `"Prezzo regolare"` (→ `prezzo_regolare`) che non è nella lista di mappatura.

2. **Prodotti varianti WooCommerce**: i prodotti "parent" (variabili) non hanno prezzo nel CSV WooCommerce — il prezzo è solo sulle righe variante. Servono entrambi i fix.

### Soluzione senza reimportare tutto

**Fase 1 — Fix immediato nel DB (UPDATE diretto)**

Aggiornare i prezzi dei prodotti parent prendendoli dalla variante con prezzo minimo:

```sql
UPDATE product_sync_csv_products p
SET price = sub.min_price
FROM (
  SELECT parent_sku, MIN(price) as min_price
  FROM product_sync_csv_products
  WHERE parent_sku IS NOT NULL AND price IS NOT NULL
  GROUP BY parent_sku
) sub
WHERE p.sku = sub.parent_sku AND p.price IS NULL;
```

**Fase 2 — Re-parse prezzi dal CSV originale**

Creare una funzione "Aggiorna solo prezzi" che:
- Rilegge il CSV già caricato nel browser
- Estrae solo SKU + prezzo (con header italiani aggiuntivi: `prezzo_regolare`, `prezzo`, `prezzo_di_vendita`)
- Invia un batch UPDATE al DB senza toccare gli altri campi né i dati AI

**Fase 3 — Fix parser per import futuri**

Aggiungere header mancanti in entrambi i parser (browser + Edge Function):
- `prezzo_regolare`, `prezzo`, `costo` per il prezzo
- `prezzo_in_offerta`, `prezzo_di_vendita`, `prezzo_scontato` per il compare_at_price

### File da modificare

| File | Modifica |
|------|----------|
| `src/admin/lib/productSyncEngine.ts` | Aggiungere header italiani per prezzi nel `pick()` |
| `supabase/functions/_shared/csv-parser.ts` | Stessi header italiani |
| `supabase/functions/process-product-sync/index.ts` | Nessuna modifica |
| `product-catalog-repo.ts` | Nessuna modifica (già gestisce `price` correttamente) |
| `ProductSyncPanel.tsx` | Aggiungere bottone "Aggiorna prezzi da varianti" |
| DB (via insert tool) | UPDATE per propagare prezzi dalle varianti ai parent |

### Risultato atteso

- I ~1300 prodotti parent senza prezzo erediteranno il prezzo dalla variante più economica
- Le varianti senza prezzo (dove il CSV aveva un header non riconosciuto) verranno aggiornate dal re-parse
- I futuri import riconosceranno tutti gli header italiani

