# Registro SQL e permessi Marco — 26/11/2026

Esecuzione tramite strumenti database nativi Lovable Cloud, ramo `codex/rilascio-admin-v2-isolato-20261124` @ `8a4794d`.
Nessun dato personale o identificativo in questo documento.

## Baseline verificata (prima delle scritture)
- `admin_update_product_field` md5 `2621cc0e…dc4ac3` ✔, `admin_claim_catalog_approval` md5 `35742108…dc753d` ✔
- Vincolo journal approvazioni md5 `64e1d5e8…5cc` ✔; approvazioni presenti 8, tutte COMPLETE (nessuna in corso)
- `short_description` mapping vuoto; `short_intro` = metafield `custom.short_intro` ✔
- Due account con capability: Marco (solo ruolo editor, 3 opt-in AI) e proprietario (admin+editor)
- Snapshot privato (definizioni funzioni, vincolo, righe capability, mapping) salvato fuori repository

## Interventi applicati (ognuno verificato subito)
| # | Script | Esito |
|---|---|---|
| 1 | marco-editor-registry (migration 0021) | PASS — tag ammessi nelle bozze, descrizione breve → `custom.short_intro` |
| 2 | marco-editor-actions (0022) | PASS — immagini/formati nel journal, vincolo validato |
| 3 | marco-product-lifecycle (0023) | PASS — rimozione/archivio/ripristino; tabella autorizzazioni cancellazione con RLS, nessun accesso utenti |
| 4 | grant `tags`, `product_gallery`, `product_formats` (3 transazioni) | PASS |
| 5 | grant `product_unpublish`, `product_archive` (2 transazioni) | PASS |

Conversione: solo parametri psql → letterali; guardie MD5, ruoli e `set_config` nella stessa transazione invariati.

## Stato finale Marco
Capability: edit, sync, drafts, images, categories, prices, publish, ai.
Abilitazioni aggiunte: tags, product_gallery, product_formats, product_unpublish, product_archive.
**product_delete: NON AUTORIZZATO** (cancellazione definitiva riservata al proprietario via Shopify Admin).

## Controlli finali
- Altro account: capability/campi/timestamp invariati ✔ — ruoli invariati ✔
- RLS attiva su tabelle coinvolte ✔; journal approvazioni conservato (8 righe) ✔
- Nessuna scrittura Shopify, nessun prodotto pubblicato/archiviato/eliminato ✔
- Nessun deploy funzioni, nessun Publish ✔

## Da completare
- Deploy `product-admin-api` / `product-admin-ai` (autorizzazione separata)
- Collaudo con la sessione di Marco

## Rollback
Script originali con `direction=restore`, in ordine inverso: grant reversibili → grant tag/galleria/formati → lifecycle → actions → registry.
