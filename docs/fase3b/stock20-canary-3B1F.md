# Fase 3B.1F — Stock-20 Canary (OG_257799) — 2026-10-03

Prodotto gid://shopify/Product/15357630415188, variant 55507146146132, inventoryItem 56346278953300.
Location usata: gid://shopify/Location/117678014804 (accettata da Shopify, nessuna ricerca/creazione location).

| | Prima | Dopo |
|---|---|---|
| tracked | false | true |
| inventoryPolicy | DENY | DENY |
| available | 0 | 20 |
| on_hand | 0 | 20 |
| Storefront availableForSale | true (overselling, tracking off) | true (stock reale 20) |
| Prezzo / titolo / immagini | 15.00 / invariato / nessuna | invariati |

Mutation: `inventoryItemUpdate(tracked:true)`, poi `inventorySetQuantities` assoluto (available=20, reason correction). userErrors: nessuno. Delta riportato +20/+20.
Quantità numerica non esposta dallo storefront (nessun uso di quantityAvailable nel frontend).
Duplicati creati: 0. Altri prodotti modificati: 0. DB write, AI, Smart Sync, ordini: nessuno.
Funzione temporanea con chiave monouso deployata, usata e cancellata.
Nota: `products(query:"sku:...")` dello Storefront non filtra per SKU, quindi il controllo duplicati si basa sull'assenza di mutation di creazione.
Avvertenza: `totalInventory` del prodotto risultava ancora 0 subito dopo (aggiornamento asincrono Shopify).
Esito: **PASS / READY FOR PERMISSION FIX + BATCH**.
