

## Analisi del flusso Import Clienti → Shopify

Ho verificato tutti i componenti del flusso. Ecco lo stato:

### Cosa funziona correttamente
- **Secret `SHOPIFY_ACCESS_TOKEN`**: configurato nel backend
- **Edge Function `shopify-admin-proxy`**: gestisce search, create, update per clienti e prodotti
- **Import engine**: batch processing con rate limit, dry run, progress tracking
- **CSV parser e validator**: validazione email, sanitizzazione campi sensibili
- **Mapper Shopify**: trasforma righe CSV in input Shopify (nome, cognome, email, telefono, indirizzo)

### Problema trovato: API Version non aggiornata

La Edge Function `shopify-admin-proxy` usa la versione API `2025-01` (riga 9), mentre il resto del progetto usa `2025-07`. Questo potrebbe causare incompatibilità o errori con endpoint deprecati.

### Piano di fix

**`supabase/functions/shopify-admin-proxy/index.ts`** — Aggiornare la costante `API_VERSION`:
```typescript
// DA:
const API_VERSION = '2025-01';
// A:
const API_VERSION = '2025-07';
```

Nessun'altra modifica necessaria. Il flusso è completo: CSV upload → parsing → validazione → dry run (simulazione) → sync reale via Edge Function → Shopify Admin API.

