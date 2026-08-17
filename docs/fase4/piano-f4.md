# FASE 4 — Tassonomia categorie · PIANO PREPARATO, NON APPLICATO

Stato: **preparato**. Nessun seed eseguito, nessun prodotto riclassificato,
nessuna collezione Shopify creata o modificata, nessuna modifica allo storefront.

## Prerequisito

Applicare prima `docs/fase3/003-taxonomy-additive-F3.1.sql` (migration additiva,
attualmente **non applicata**): il modello F3 non contiene alcuna rappresentazione
delle categorie.

## Requisiti coperti da F3.1

| Requisito | Copertura |
|---|---|
| ID stabile | `product_categories.id` (uuid) + `stable_key` logico |
| Nome visualizzato modificabile | `display_name` (mutabile senza toccare id/relazioni) |
| Slug/handle interno | `slug` |
| Parent | `parent_id` (self-FK, RESTRICT) |
| Livello | `level` |
| Percorso completo | `path_keys[]` |
| Ordinamento | `sort_order` |
| Stato attivo | `is_active` |
| Visibilità Admin / storefront | `visible_admin`, `visible_storefront` |
| Versione tassonomia | `taxonomy_version` |
| Alias legacy | `legacy_aliases[]` |
| Mapping categoria sorgente | `product_category_source_map` (molti-a-molti, stati proposed/approved/rejected/ambiguous/unmapped) |
| Mapping collezione Shopify + stato | `product_category_shopify_map.map_status` |
| Approvazione manuale | `approved_by` / `approved_at` su tutte le tabelle di mapping |
| Override per prodotto | `product_category_assignments.origin = 'manual_override'` |
| Molti-a-molti prodotto/categoria | `product_category_assignments` |

## Sequenza F4 (da autorizzare separatamente)

1. Applicare F3.1 (solo strutture, tabelle vuote).
2. Seed tassonomia (`docs/fase4/seed-tassonomia.sql`) — idempotente su `stable_key`.
3. Caricare il mapping legacy come **proposto/ambiguo**, mai approvato in automatico.
4. Dry-run categorie read-only: per ogni SKU, categoria sorgente → target proposto,
   conteggi per stato, elenco ambigui, elenco SKU senza mapping.
5. Revisione manuale in Admin e approvazione mapping.
6. Solo dopo approvazione: assegnazione prodotti (`product_category_assignments`),
   ancora senza alcuna mutation Shopify.
7. Mapping collezioni Shopify verificato in sola lettura (`map_status`), pubblicazione
   collezioni in fase successiva e separata.

## Test previsti in F4

- Seed eseguito due volte → nessun duplicato (idempotenza su `stable_key`).
- Rinomina `display_name` → id, parent e mapping invariati.
- Assegnazione con due categorie primarie approvate → bloccata dall'indice unico.
- Mapping ambiguo → non produce assegnazioni.
- SKU Bulbi → conserva sempre `botanical_type`.

## Rollback logico

Nessuna cancellazione automatica. Rollback = disattivare le categorie
(`is_active = false`) e riportare i mapping a `rejected`/`proposed`.

## Aggiornamento post-audit F3.1 (17 ago 2026)

**Blocco rilevato**: non esiste un'entità canonica prodotto. `sku` è testo libero
in sei tabelle senza alcuna foreign key. F3.1 **non è stata applicata**.

Prerequisito aggiunto: `docs/fase3/003a-product-canonical-F3.1.sql` crea
`public.products` (id uuid stabile, `sku` UNIQUE, disattivazione logica, RLS,
nessun popolamento). Le assegnazioni categoria e la matrice Bulbi referenziano
`products.id`, non lo snapshot di import (un prodotto ha più import nel tempo).

Correzioni introdotte in `003-taxonomy-additive-F3.1.sql` (revisione 2):

- trigger anti-ciclo con risalita degli antenati (il solo `id <> parent_id` non basta);
- `level` e `path_keys` derivati dal parent e ricalcolati sui discendenti al cambio
  di parent o `stable_key`; il percorso usa solo chiavi stabili, mai il nome visualizzato;
- `stable_key` univoca globalmente; indici parziali distinti per root (`parent_id IS NULL`)
  e per fratelli, perché una UNIQUE con NULL non impedirebbe root duplicate;
- `product_category_source_map`: sistema sorgente, profilo CSV, percorso originale e
  normalizzato, metodo, confidenza, stato `unmapped`, molti-a-molti consentito;
- `product_category_shopify_map`: GID collezione, handle, stato, ultima verifica, errore;
- matrice Bulbi con stati `unclassified/proposed/approved/rejected/needs_review`;
- RLS per ruolo: Editor/Publisher leggono e propongono, Admin/Tech Admin approvano
  e configurano il mapping Shopify, anon nessun accesso;
- tutte le FK in `RESTRICT` o `SET NULL`, nessuna cascata.

## Conteggio tassonomia

8 categorie principali e **14** sottocategorie (Esterno 4, Rose 5, Frutto 2, Bulbi 3).
La richiesta indicava 13: la differenza va confermata prima del seed.
