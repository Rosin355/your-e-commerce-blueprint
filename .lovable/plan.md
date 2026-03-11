

## Piano: Fase 1 (Schema + Parsing) e Fase 2 (AI SEO con Lovable AI)

### Stato attuale — Problema confermato

Su 2.706 prodotti nel DB, **solo SKU e title sono popolati**. Tutti gli altri campi (description, price, tags, images, category, ecc.) sono vuoti. Il motivo: il CSV WooCommerce usa header italiani (`Nome`, `Descrizione`, `Immagini`, `Categorie`, `Breve descrizione`, `Meta: esposizione_pianta_acf`, ecc.) che il parser non riconosce perché cerca solo header Shopify-style (`title`, `body_html`, `variant_price`...).

Il normalizer `normalizeWooProduct` in `sync/lib/product-normalizers.mjs` gestisce già tutti questi header italiani — ma quel codice è usato solo nello script CLI, non nel flusso browser → Edge Function.

---

### Fase 1 — Ampliare schema DB + fix parsing WooCommerce

**1a. Migrazione DB** — Aggiungere colonne a `product_sync_csv_products`:

```sql
ALTER TABLE product_sync_csv_products
  ADD COLUMN IF NOT EXISTS handle text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS vendor text,
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS parent_sku text,
  ADD COLUMN IF NOT EXISTS metafields jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS optimized_description text,
  ADD COLUMN IF NOT EXISTS ai_enriched_at timestamptz;
```

**1b. Aggiornare `CsvProductRow`** (sia in `product-sync-types.ts` che nel tipo locale in `productSyncEngine.ts`) con i nuovi campi: `handle`, `shortDescription`, `vendor`, `productType`, `parentSku`, `metafields`.

**1c. Aggiornare i parser CSV** — Aggiungere gli header WooCommerce italiani alla funzione `pick()`:
- `"Nome", "Name"` → title (già ok)
- `"Slug", "Permalink"` → handle
- `"Breve descrizione", "Short description"` → shortDescription
- `"Marchi", "Brand", "Vendor"` → vendor
- `"Tipo", "Type"` → productType
- `"Genitore", "Parent"` → parentSku
- `"Descrizione", "Description"` → description
- `"Immagini", "Immagine", "Images"` → imageUrls (split su `|` e `,`)
- `"Categorie", "Categories"` → productCategory
- `"Tag", "Tags"` → tags (split su `|` e `,`)
- `"Prezzo di listino", "Regular price"` → price
- `"Prezzo in offerta", "Sale price"` → compareAtPrice
- `"GTIN, UPC, EAN, o ISBN"` → barcode
- `"Peso (kg)"` → weight (convertito kg→g)
- `"Magazzino", "Stock"` → inventoryQuantity
- `"Meta: esposizione_pianta_acf"` → metafields.exposure
- `"Meta: tipo_terreno_acf"` → metafields.soil
- `"Meta: irrigazione_acf"` → metafields.watering
- `"Meta: tossicita_per_animali_acf"` → metafields.petSafe
- `"Meta: altezza_massima_pianta_acf"` → metafields.heightCm

Questo va fatto sia nel parser lato browser (`productSyncEngine.ts`) sia in quello Edge Function (`csv-parser.ts`).

**1d. Aggiornare `product-catalog-repo.ts`** per salvare i nuovi campi nell'upsert.

**1e. Re-importare il CSV** — Dopo il fix, sarà sufficiente ricaricare lo stesso file per popolare tutti i campi.

---

### Fase 2 — Rigenerazione SEO con Lovable AI

**2a. Creare Edge Function `ai-enrich-products/index.ts`** che:
- Accetta `{ batch_size: number, seed_style: string }` 
- Legge N prodotti dal DB dove `ai_enriched_at IS NULL`
- Per ciascuno, chiama Lovable AI Gateway (`google/gemini-3-flash-preview`) con il prompt SEO botanico
- Salva `seo_title`, `seo_description`, `optimized_description` + `ai_enriched_at` nel DB
- Restituisce conteggio processati/rimanenti

**Prompt utilizzato** (versione migliorata del tuo):

```
Sei un botanico e copywriter SEO italiano per e-commerce di piante.
Tono: caldo, competente, naturale; micro-poetico ma pratico.
Brand voice: "Online Garden – più che semplici piante."
NON inventare dati non forniti. NON fare promesse mediche.
Se un dato manca, scrivi in modo generico e corretto.

Dati prodotto:
- Nome: {{title}}
- Categoria: {{product_category}}
- Descrizione originale: {{description}}
- Breve descrizione: {{short_description}}
- Tags: {{tags}}
- Metadati pianta: {{metafields}}

Genera OUTPUT JSON con:
{
  "seo_title": "max 60 caratteri",
  "seo_description": "max 155 caratteri", 
  "optimized_description": "HTML 400-800 parole con H2",
  "h1_title": "",
  "short_description": "max 260 caratteri",
  "key_benefits": ["5 bullet"],
  "care_guide": { "light":"", "watering":"", "soil":"", "temperature":"", "notes":"" },
  "faq": [{"q":"","a":""},{"q":"","a":""},{"q":"","a":""},{"q":"","a":""}],
  "keywords_suggested": ["8-12 keyword long-tail"],
  "image_alt_texts": ["3-6 alt text"],
  "internal_links_suggestions": ["2-4 categorie correlate"]
}
```

Miglioramenti al prompt rispetto al tuo:
- Rimosso lo `slug` (lo generiamo dal codice, non serve AI)
- Il `meta_title` e `meta_description` rinominati `seo_title`/`seo_description` per coerenza col DB
- Aggiunto contesto `metafields` (esposizione, terreno, irrigazione) per output più accurato
- Usato tool calling per output JSON strutturato invece di chiedere JSON nel prompt

**2b. Usare tool calling** per estrarre JSON strutturato (più affidabile del prompt "rispondi in JSON"):

```typescript
body.tools = [{
  type: "function",
  function: {
    name: "generate_seo_content",
    parameters: { /* schema con tutti i campi */ }
  }
}];
body.tool_choice = { type: "function", function: { name: "generate_seo_content" } };
```

**2c. UI nel pannello admin** — Aggiungere una sezione "Genera testi SEO" nel `ProductSyncPanel` con:
- Contatore prodotti senza AI (`ai_enriched_at IS NULL`)
- Selezione seed style (Pratico, Narrativo, Minimal, Step-by-step)
- Pulsante "Genera testi SEO" con progresso batch
- Pulsante annulla

**2d. Config** — Aggiungere la funzione al `config.toml` con `verify_jwt = false`.

---

### File da modificare/creare

| File | Azione |
|------|--------|
| Migrazione SQL | Nuove colonne |
| `supabase/functions/_shared/product-sync-types.ts` | Nuovi campi `CsvProductRow` |
| `supabase/functions/_shared/csv-parser.ts` | Header WooCommerce italiani |
| `supabase/functions/_shared/product-catalog-repo.ts` | Upsert nuovi campi |
| `src/admin/lib/productSyncEngine.ts` | Parser browser + tipo aggiornato |
| `supabase/functions/ai-enrich-products/index.ts` | **Nuovo** — Edge Function AI |
| `src/admin/components/ProductSyncPanel.tsx` | Sezione AI enrichment UI |
| `supabase/config.toml` | Aggiungere `ai-enrich-products` |

