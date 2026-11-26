# Rilascio product-admin-api — 26/11/2026

## Tecnico
- Funzione: `product-admin-api` (solo questa), backend Lovable Cloud esistente.
- Commit sorgente: `f32989d` (branch `codex/rilascio-admin-v2-isolato-20261124`), deploy 26/11/2026 ~15:45 UTC.
- Impronta inviata: `04c778bd3ab3c9a847fe971c68e0e2770397b947258c426fae3e1a34d39692cd`; entrypoint `523f825e…ae0d`.
- Marker runtime verificato: `backendVersion=admin-editor-20261125`, `supportsDistinctDescriptions=true`.
- Revisione runtime non esposta da Lovable Cloud: l'attestazione si basa su marker + impronta inviata.
- Descrizione breve: `short_description` → metafield `custom.short_intro`, nessuna ulteriore migration necessaria.
- DB invariato dal deploy: 2 grant attivi, 3 opt-in AI, 24 migration registrate.

## Verifiche
| Controllo | Esito |
|---|---|
| Token non valido | 401 PASS |
| Admin `get_admin_context` | 200, ruoli admin/editor, capability preservate PASS |
| Ricerca SKU `OG_111899` | 200 PASS |
| Sessione Editor Marco | NON TESTATO (richiede il suo dispositivo) |
| Customer Shopify su API Admin | coperto da test automatici; non testato live |
| Test Node Admin/permessi | 311 PASS (3 file Deno-only) |
| Test Deno (lifecycle, descrizioni, servizio) | 28 PASS |
| Typecheck funzione | PASS |
| Scritture Shopify | NESSUNA |

## Rollback
Nuovo deploy mirato di `product-admin-api` dal commit precedente `5a37f71` (o r2 `ca9050d`).

## Checklist collaudo Marco (dispositivo personale)
1. Login Editor su onlinegarden.it/admin.
2. Dashboard e catalogo visibili.
3. Ricerca di un prodotto/SKU esistente.
4. Apertura editor.
5. Modifica su bozza autorizzata `TEST-OG-AI-001` soltanto.
6. Descrizione breve separata dalla descrizione estesa.
7. AI su vantaggi/caratteristiche/punti speciali disponibile.
8. Azioni negate: cancellazione definitiva prodotto non disponibile.
9. Logout e nuovo login.
Nessuna pubblicazione/sincronizzazione Shopify senza conferma specifica.

## Per il cliente
Il pannello Admin è aggiornato. Marco può fare il collaudo dal suo dispositivo. Nessun prodotto, prezzo o ordine è stato modificato.

## Residui
- Collaudo Marco — responsabile Marco — priorità alta.
- Test restore snapshot — responsabile tecnico — media.
- Deploy `product-admin-ai` aggiornato se richiesto — tecnico — media.
