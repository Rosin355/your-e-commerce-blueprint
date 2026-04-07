

## Analisi: Hardcoded Values trovati

| File | Problema |
|------|----------|
| `supabase/functions/shopify-admin-proxy/index.ts` | Fallback hardcoded `"lovable-project-6tknn.myshopify.com"` |
| `supabase/functions/create-product-ai/index.ts` | Fallback hardcoded `"lovable-project-6tknn.myshopify.com"` |
| `supabase/functions/_shared/shopify-graphql.ts` | Usa `SHOPIFY_ACCESS_TOKEN` diretto (non OAuth) — diverso dal pattern OAuth degli altri file |
| `src/lib/shopify.ts` | Domain e token Storefront hardcoded (ma questo è **Storefront API**, non Admin — escluso dal piano) |
| `src/lib/shopify-customer-auth.ts` | Domain hardcoded (Customer Auth — escluso dal piano) |

**Nota**: `src/lib/shopify.ts` e `shopify-customer-auth.ts` usano la **Storefront API** (token pubblico), non la Admin API. Il piano li esclude come richiesto ("non modificare struttura progetto").

## Piano

### 1. Rimuovere fallback hardcoded nelle Edge Functions

**`supabase/functions/shopify-admin-proxy/index.ts`** (riga 10):
- Cambiare `Deno.env.get("SHOPIFY_STORE") || "lovable-project-6tknn.myshopify.com"` → `Deno.env.get("SHOPIFY_STORE") || ""`
- Aggiungere validazione all'inizio del handler: se `SHOPIFY_STORE` è vuoto, restituire errore 500

**`supabase/functions/create-product-ai/index.ts`** (riga 9):
- Stesso cambiamento: rimuovere fallback hardcoded

**`supabase/functions/_shared/shopify-graphql.ts`**: già senza fallback hardcoded — nessuna modifica necessaria.

### 2. Creare Edge Function `validate-shopify-connection`

Nuova funzione che:
- Legge `SHOPIFY_STORE`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` da env
- Esegue OAuth `client_credentials` per ottenere token
- Esegue query `{ shop { name url myshopifyDomain } }`
- Restituisce `{ success: true, shop: { name, domain } }` o `{ success: false, error: "..." }`

### 3. Aggiungere stato connessione nell'Admin UI

**`src/admin/components/AdminLayout.tsx`**:
- Aggiungere badge nell'header che mostra stato connessione Shopify (verde/rosso)
- Bottone "Test Connessione" che chiama `validate-shopify-connection`
- Mostra nome store quando connesso

### File da modificare
- `supabase/functions/shopify-admin-proxy/index.ts` — rimuovere fallback hardcoded
- `supabase/functions/create-product-ai/index.ts` — rimuovere fallback hardcoded
- `supabase/functions/validate-shopify-connection/index.ts` — nuovo
- `src/admin/components/AdminLayout.tsx` — badge connessione + bottone test

### File NON modificati
- AI Writer, Export CSV, Sync, Metafields, Migrazione — nessuna modifica
- Nessuna migrazione DB
- `src/lib/shopify.ts` — Storefront API, fuori scope

