

## Piano: Multi-immagine CSV + Ripresa intelligente AI

### Risposta alla domanda sulla ripresa

Attualmente l'arricchimento AI **riprende automaticamente** da dove si è fermato: la query cerca prodotti con `ai_enriched_at IS NULL`, quindi quelli già elaborati vengono saltati. **Il problema**: lo stile scelto (pratico, narrativo, ecc.) NON viene salvato nel DB. Quindi se cambi stile, i prodotti già elaborati col vecchio stile non verranno ri-elaborati. Serve salvare lo stile usato per ogni prodotto.

---

### Modifiche previste

**1. Salvare lo stile AI nel DB**

Aggiungere colonna `ai_seed_style text` a `product_sync_csv_products`. L'Edge Function salverà lo stile usato per ogni prodotto arricchito.

**2. Ripresa intelligente nel frontend**

Quando l'utente clicca "Genera testi SEO":
- Se lo stile scelto è **uguale** a quello dei prodotti già elaborati → riprende da dove si era fermato (salta i già fatti)
- Se lo stile è **diverso** → mostra un dialogo: "Vuoi ri-elaborare i X prodotti già arricchiti con stile diverso, o solo quelli mancanti?"
- Opzione "Rielabora tutto": resetta `ai_enriched_at` per i prodotti con stile diverso, poi procede
- Opzione "Solo mancanti": procede normalmente, arricchisce solo quelli senza `ai_enriched_at`

**3. Multi-immagine nel CSV export**

Formato Shopify: la prima riga di un prodotto contiene tutti i dati + prima immagine. Le righe successive hanno solo `Handle` + `Image Src` (+ opzionalmente `Image Alt Text`), tutti gli altri campi vuoti.

Esempio output:
```text
Handle,Title,Body (HTML),...,Image Src,Image Alt Text
monstera,Monstera Deliciosa,<p>...</p>,...,https://img1.jpg,Monstera vista frontale
monstera,,,,...,https://img2.jpg,Monstera dettaglio foglia
monstera,,,,...,https://img3.jpg,Monstera in vaso
```

### File da modificare

| File | Azione |
|------|--------|
| Migrazione SQL | `ADD COLUMN ai_seed_style text` |
| `ai-enrich-products/index.ts` | Salvare `ai_seed_style` nell'update |
| `export-enriched-csv/index.ts` | Generare righe aggiuntive per immagini 2+ |
| `ProductSyncPanel.tsx` | Dialogo conferma cambio stile + conteggio "da ri-elaborare" |
| `product-catalog-repo.ts` | Salvare `ai_seed_style` nell'upsert enrichment |

