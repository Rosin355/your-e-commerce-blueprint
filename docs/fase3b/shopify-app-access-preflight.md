# Shopify App Access Preflight (read-only) — 2026-10-03

- App in uso: **Online Garden Backend** (gid://shopify/App/380922265601), via `SHOPIFY_ADMIN_API_TOKEN` e via client credentials (`SHOPIFY_CLIENT_ID/SECRET`), stessi scope. `SHOPIFY_ACCESS_TOKEN` → 401 (credenziale obsoleta).
- Scope concessi (access_scopes): read_products YES, write_products YES, read_inventory YES, write_inventory YES, **read_locations NO**.
- Locations: ID leggibile (gid://shopify/Location/117678014804, unica), nome negato (ACCESS_DENIED read_locations) → FAIL parziale.
- Inventory read OG_257799: variant 55507146146132, inventoryItem 56346278953300, tracked=false, policy DENY, available 0, on_hand 0 → PASS.
- Inventory write: scope presente (AVAILABLE per scope), non provato.
- Fix: la versione dichiarata con read_locations non è quella concessa all'installazione → rilasciare la versione e far approvare/aggiornare l'installazione nell'admin Shopify; il token client credentials si rigenera da solo, il `SHOPIFY_ADMIN_API_TOKEN` statico va rigenerato e aggiornato nei secret.
Nessuna modifica eseguita.
