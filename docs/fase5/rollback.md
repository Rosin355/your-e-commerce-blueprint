# F5 — Rollback

Il rollback F5 **non tocca F3/F4**: non cancella current values, storico, snapshot, definizioni o tassonomia.

## 1. Stop immediato delle scritture (secondi)
Impostare il secret server-side:

```
PRODUCT_ADMIN_WRITES_ENABLED = false
```

Effetto immediato: ogni command risponde `WRITES_DISABLED`, nessun UPDATE, nessuna history. Le letture restano attive.

## 2. Rimozione dell'Edge Function
Eliminare `product-admin-api` (cartella `supabase/functions/product-admin-api/` e deploy).
Nessun'altra funzione dipende da essa: `shopify-admin-proxy`, pipeline import e funzioni AI restano intatte.

## 3. Rollback dello schema (opzionale, non necessario)
Gli oggetti F5.1 sono additivi e inerti se l'API non esiste:

```sql
DROP FUNCTION IF EXISTS public.admin_update_product_field(uuid, text, uuid, text, jsonb, integer, text, text, text);
DROP TABLE IF EXISTS public.product_admin_command_log;
-- Colonne additive: lasciarle. La rimozione NON è raccomandata perché perde tracciabilità.
-- ALTER TABLE public.product_current_values DROP COLUMN version;
-- ALTER TABLE public.product_field_history DROP COLUMN previous_origin, ... ;
```

## 4. Ripristino dei grant (solo se strettamente necessario)
La revoca dei permessi di scrittura diretta ad `authenticated` è una restrizione di sicurezza: non va annullata.
Se un flusso legacy dovesse risultarne bloccato, ripristinare **solo** la tabella interessata:

```sql
GRANT INSERT, UPDATE ON public.<tabella> TO authenticated; -- documentare il motivo
```

Nota: le policy RLS non concedono comunque scritture, quindi il ripristino dei grant da solo non riapre l'accesso.

## Cosa il rollback NON fa
- non cancella current values, storico o snapshot;
- non modifica Shopify;
- non tocca inventario, categorie, immagini o storefront;
- non modifica F3/F4.
