

## Piano: Fix Build Errors

Ci sono 6 errori di compilazione in 3 file. Ecco le correzioni necessarie:

### 1. `supabase/functions/_shared/product-sync-processor.ts` (3 errori)

La funzione `verifyCatalogIntegrityCsvOnly()` usa `csvBySku` che non è definito. Deve creare la mappa localmente dalle righe CSV caricate:

```typescript
export async function verifyCatalogIntegrityCsvOnly(): Promise<SyncReportState["integrity"]> {
  const csvRows = await loadCsvRows();
  const csvBySku = mapCsvBySku(csvRows);  // <-- aggiungere questa riga
  const missingInShopify: string[] = Array.from(csvBySku.keys());  // <-- tipo esplicito
  // ... resto invariato
}
```

### 2. `supabase/functions/process-product-sync/index.ts` (1 errore)

Il log entry ha `level: string` invece di `level: "error"`. Serve un cast esplicito:

```typescript
level: "error" as const,
```

### 3. `supabase/functions/process-woo-job/index.ts` (2 errori)

La funzione `finalizeJob` ha il tipo del parametro `supabase` troppo restrittivo. Cambiare la signature per usare `any`:

```typescript
async function finalizeJob(supabase: any, job: Record<string, unknown>, jobId: string) {
```

Questo risolverà entrambi gli errori di tipo sulle chiamate a `finalizeJob` alle righe 579 e 715.

### Riepilogo

| File | Errore | Fix |
|------|--------|-----|
| `product-sync-processor.ts` | `csvBySku` non definito | Creare mappa locale con `mapCsvBySku(csvRows)` |
| `product-sync-processor.ts` | `unknown[]` vs `string[]` | Tipo esplicito su `missingInShopify` |
| `process-product-sync/index.ts` | `string` vs `"error"` literal | `as const` |
| `process-woo-job/index.ts` (×2) | Tipo `SupabaseClient` incompatibile | Parametro `any` |

