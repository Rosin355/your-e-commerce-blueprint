# Shopify Location Access Recheck (read-only) — 2026-10-03

- App installata: "OnlineGardenInventoryOttobre", **stesso ID** gid://shopify/App/380922265601 dell'app precedente (rinominata, non nuova installazione).
- Token Admin salvato e nuovo token client credentials (generato ora, scade in 24h): scope **identici**: read_products YES, write_products YES, read_inventory YES, write_inventory YES, **read_locations NO**. Anche `currentAppInstallation.accessScopes` non contiene read_locations.
- Location 117678014804 e livelli inventario OG_257799: ACCESS_DENIED (manca read_locations). Ultimi valori noti (preflight precedente): variant 55507146146132, inventoryItem 56346278953300, tracked=false, policy DENY, available 0, on_hand 0.
- Capability (solo per scope, nessuna mutation): tracking ON e policy DENY → possibili (write_products/write_inventory); set quantity=20 → richiede locationId: l'ID è noto, ma senza read_locations la verifica della location non è possibile → bloccato per gate.
- Diagnosi: A NO (token salvato ha gli stessi scope dell'installazione), B NO (il client credentials riflette l'installazione), **C SÌ**: l'installazione non ha recepito la versione con read_locations; serve **E** (approvazione merchant degli scope aggiornati) e, se Shopify non la propone, **D** (reinstallazione).
- Funzione diagnostica temporanea deployata, usata una volta e cancellata. Nessuna scrittura.
