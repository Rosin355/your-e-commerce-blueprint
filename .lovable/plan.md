# FASE 1 — Audit Admin prodotti Online Garden

Nessun file modificato, nessuna query di scrittura, nessuna migration, nessun deploy, nessuna chiamata AI o mutation Shopify.

## 1. Architettura attuale rilevata

Rotte admin (in `src/App.tsx`): solo due, `/admin/import` e `/admin/settings`, entrambe servite da `AdminGuard` (auth Supabase + ruolo `admin` da `user_roles`, più whitelist email lato Edge Function).

`AdminLayout` non ha un vero menu: header "Admin Tools" con un solo bottone toggle Import/Settings, email utente, logout. Tutta l'operatività vive dentro `AdminImport` come 6 tab:

| Tab | Componente | Righe | Note |
|---|---|---|---|
| Import Clienti | CsvUploader + validator + importEngine | ~300 | usato raramente |
| Import Prodotti | stessa pipeline | — | superato da Woo pipeline |
| AI Writer | AiWriterPanel | 349 | duplica funzioni di Arricchimento |
| WooCommerce → Shopify | WooPipelinePanel | 405 | parsing client + batch |
| Catalogo DB | ProductSyncPanel | 1238 | dashboard/manutenzione/export |
| Arricchimento | ProductEnrichmentPanel | 1393 | cuore attuale: AI 19 campi + publish |

Impostazioni: link diretto a Shopify Admin, `CollectionHandlesChecker`, `MetafieldsConfigPanel` (namespace/key/type) — tutti strumenti tecnici oggi visibili al cliente.

Backend: 20 Edge Function. `shopify-admin-proxy` (1416 righe) è un monolite con ~25 azioni miste: clienti, prodotti, metafield, draft AI, diagnostica collezioni, migrazione collezioni, lettura DB con service role.

## 2. Flusso dati attuale

```text
CSV Woo -> parsing nel browser -> batch -> process-woo-job
   -> UPSERT product_sync_csv_products (una riga = un prodotto, colonne piatte)
   -> Arricchimento: enrichment-run / ai-enrich-products (Lovable AI)
       -> scrive ai_enrichment_json + seo_* + optimized_description SULLA STESSA RIGA
   -> Pubblicazione: shopify-admin-proxy -> productUpdate + metafieldsSet
       -> riscrive shopify_* sulla stessa riga
```

Conseguenza: **esiste un solo livello di valore per campo**. Originale CSV, valore corrente e proposta AI condividono la stessa riga; l'unica separazione è `ai_enrichment_json` come blob opaco. Nessuno storico, nessun ripristino, nessun batch di import tracciato con checksum, nessuna tabella di definizioni campo.

## 3. Mappa database (esistente)

- `product_sync_csv_products` — chiave `sku`, ~2.706 righe, mescola: dati sorgente, `metafields` jsonb, campi AI (`ai_enrichment_json`, `ai_enriched_at`, `ai_seed_style`, `seo_*`, `optimized_description`), campi Shopify (`shopify_product_id`, stato, contatori metafield). RLS: solo `service_role`.
- `pipeline_jobs`, `product_sync_jobs` — job import/sync, report jsonb.
- `product_enrichment_runs` / `product_enrichment_run_items` — run AI e stato per SKU (unica traccia storica parziale oggi presente).
- `profiles`, `user_roles` (enum `app_role`: admin/moderator/user), `shopify_connections`, `shopify_oauth_states`.

Mancano del tutto: batches con checksum, snapshot riga sorgente immutabile, valori correnti separati, proposte AI per campo, storico campo, definizioni campo, job di pubblicazione.

## 4. Classificazione voci Admin

| Voce | Proposta |
|---|---|
| Import Clienti | Spostare in Impostazioni avanzate (admin tecnico) |
| Import Prodotti (CSV generico) | Accorpare nel nuovo modulo Importazioni |
| WooCommerce → Shopify | Diventa "Importazioni" (lossless, multi-profilo) |
| Catalogo DB | Accorpare: parte utile → Dashboard/Prodotti; export e manutenzione prezzi → avanzate |
| AI Writer | Rimuovere dalla UI cliente: sostituito da AI campo-per-campo nella scheda prodotto |
| Arricchimento | Smontare: generazione massiva → nascosta; pubblicazione → nuovo modulo Pubblicazioni |
| Settings: link Shopify Admin, checker collezioni, config metafield | Nascondere al cliente, solo admin tecnico |

Menu proposto: **Dashboard · Prodotti · Importazioni · Categorie · Pubblicazioni · Impostazioni** (+ "Strumenti tecnici" visibile solo al ruolo tecnico).

## 5. Gap analysis rispetto ai requisiti

| Requisito | Stato |
|---|---|
| Import lossless con snapshot immutabile | assente |
| Checksum file + batch idempotente | assente |
| Tre livelli valore (originale/corrente/AI) | assente |
| Proposte AI per singolo campo con accetta/scarta | assente (oggi AI massiva, 19 campi in blocco) |
| Storico e ripristino | assente |
| Definizioni campo configurabili | parziale (`MetafieldsConfigPanel`, solo metafield) |
| Mapping header multi-profilo, alias, case-insensitive | parziale/rigido (bug File A `name` vs `Nome` già visto) |
| Categorie gerarchiche (path/root/leaf/collections) | assente, oggi stringa piatta |
| Colonne CSV sconosciute conservate e visibili | assente (scartate) |
| Pubblicazione selettiva con conferma e riepilogo | parziale |
| Lista prodotti con filtri richiesti | assente |
| Ruoli Cliente/Admin/Admin tecnico | assente (solo `admin`) |
| Regole Fase 0 (KEEP/SKIP_EMPTY/PROTECTED/…) | validate ma implementate solo in `product-catalog-merge.ts`, non nel percorso di import reale |

## 6. Rischi principali

1. Sorgente unica condivisa: un re-import può ancora sovrascrivere valori curati (rischio alto finché il merge Fase 0 non è nel path reale).
2. Doppie sorgenti di verità: DB locale vs Shopify per metafield manuali (già emerso con `OG_393883`).
3. Inventario: CSV Bulbi con `In stock? = 0` su tutte le righe → mai propagare stock a Shopify.
4. Concorrenza/doppio click in pubblicazione: nessun lock per prodotto.
5. Proxy monolitico: una modifica rischia di rompere flussi non correlati.
6. Nessun rollback: senza storico non è possibile ripristinare un valore.
7. RLS `service_role`-only: qualunque nuova UI dipende da Edge Function, quindi i permessi vanno progettati lato funzione.

## 7. Wireframe testuale (sintesi)

```text
PRODOTTI
[ ricerca nome/SKU/EAN ] [categoria][pubblicato][completo][AI in attesa][non pubblicati][errori][import]
foto | Nome | SKU | Categoria | Disponibilità | Contenuti | Shopify | Aggiornato | AI
selezione -> Assegna categoria | Pubblica selezionati | Esporta

SCHEDA PRODOTTO
Informazioni · Contenuti · Dati botanici · Categorie · Prezzo · Inventario ·
Immagini · SEO · Altri dati importati · Storico
Ogni campo AI: Originale | Corrente | [Migliora con AI] -> Proposta a confronto
                 [Accetta] [Scarta] [Rigenera] [Ripristina originale]
Barra: "3 modifiche non pubblicate" -> [Pubblica aggiornamenti] -> riepilogo -> conferma
```

## 8. Piano di refactor per fasi (additivo e reversibile)

- **F1** Audit (questo documento).
- **F2** Proposta tecnica + modello dati definitivo, solo documento.
- **F3** Migration additive: 7 nuove tabelle (batches, snapshots, current values, ai suggestions, field history, field definitions, publication jobs) + GRANT + RLS. Nessuna tabella esistente toccata.
- **F4** Seed delle definizioni campo e backfill in sola lettura da `product_sync_csv_products` verso i valori correnti (idempotente, dry-run prima).
- **F5** Nuovo import lossless multi-profilo con report e blocco su POTENTIAL_DATA_LOSS > 0.
- **F6** Nuovo Admin: shell con menu, lista prodotti, filtri.
- **F7** Scheda prodotto per sezioni + "Altri dati importati".
- **F8** AI campo-per-campo con proposta separata e storico.
- **F9** Pubblicazione selettiva con riepilogo, lock e retry.
- **F10** Ruoli (editor / admin / admin tecnico) e nascondere gli strumenti tecnici.
- **F11** Deprecazione UI vecchia (nascosta, non cancellata) e solo dopo validazione rimozione codice.

## 9. File coinvolti (previsione)

Nuovi: `src/admin/pages/{AdminDashboard,AdminProducts,AdminProductDetail,AdminImports,AdminCategories,AdminPublications}.tsx`, `src/admin/components/product/*`, `src/admin/lib/{fieldRegistry,csvProfiles,valueLayers}.ts`, Edge Function `product-admin-api` (nuova, senza toccare quelle in produzione).
Modificati in fase tarda: `App.tsx` (rotte), `AdminLayout.tsx` (menu), `AdminImport.tsx` (deprecato).
Non toccati in F3-F8: storefront, `shopify-admin-proxy`, funzioni in produzione.

## 10. Test necessari

Unit su merge Fase 0 e mapping header multi-profilo; test idempotenza doppio import identico; test protezione campi manuali/AI/Shopify; test separazione proposta AI; test storico e ripristino; e2e: importa → modifica → AI → accetta → salva → pubblica; verifica che nessuna mutation parta senza conferma.

## 11. Domande realmente bloccanti

1. Inventario: qual è la sorgente ufficiale delle quantità? Finché non è decisa, stock e disponibilità restano PROTECTED e non sincronizzati.
2. Il cliente può pubblicare direttamente su Shopify o serve approvazione di un admin?
3. I prodotti "variation" del Profilo A vanno gestiti come varianti Shopify complete oppure per ora solo conservati e visualizzati?
4. Le categorie Woo (`Bulbi > Tulipani`) devono creare automaticamente collezioni Shopify mancanti, o solo mappare su collezioni esistenti approvate a mano?
