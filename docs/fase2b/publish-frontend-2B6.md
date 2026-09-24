# Fase 2B.6 — Pubblicazione frontend Admin V2 (PR #4)

Data: 2026-09-24 (UTC ~18:10)

## Gate
| Gate | Esito |
|---|---|
| Sincronizzazione | HEAD Lovable = `b129489e4dadd2fcd2bbc058bfaf6b4e27513805` = `origin/main`. Nessun commit successivo. Working tree pulito. |
| Anteprima | build OK (18:06:18Z). |
| Test | 9/9 test Admin V2 field editing verdi (bun); altri 36 verdi. Il runner `node --experimental-strip-types` fallisce solo per sintassi TS non supportata (parameter property in `AdminApiError`), non per regressione. |
| Contratto FE/BE | Il frontend usa `capabilities`, `sourceState`, `FaqEditor`, editor tipizzati (`fieldValueCodecs`), `expectedVersion` + `idempotencyKey`: tutti presenti nella risposta della funzione distribuita (verificato live). |
| Sicurezza | 2 finding critici preesistenti su tabelle legacy `product_enrichment_run_items` / `product_enrichment_runs` (policy `USING (true)`), non introdotti da questa release; il workspace non blocca la pubblicazione. Da trattare in fase dedicata. |

## Rollback frontend
- Versione pubblicata prima: bundle `/assets/index-DqJZeloj.js`.
- Versione pubblicata ora: bundle `/assets/index-DOvAj1oB.js` (lovable.app e romeshbigbird.com).
- Ripristino: History di Lovable → versione precedente al merge PR #4 → Publish. Solo frontend; la funzione admin resta compatibile in modo additivo.

## Smoke test autenticati (read-only, sito pubblicato)
- Login Admin V2: OK (`get_admin_context`, `get_dashboard_stats` 200).
- Catalogo: `list_products` 200, 25 elementi per pagina.
- OG_393883: 200, variabile, 67 campi, titolo "Rosa Rugosa Hansa…".
- Cinque campi manuali (nome_comune, ibridatore, colore_fiore, colore_foglia, curiosita): locked, manualOnly, canUpdate=false (`current_value_locked`), AI non ammessa.
- title / seo_title: canUpdate=true (canary allowlist), valori stringa.
- applies_to: presente (`both`).
- source_snapshot_id: NULL su tutti i campi; sourceState = `original_absent` su 67/67.
- FAQ: OG_393883 non ha valore FAQ (canary_field_not_allowed); nel DB non esiste alcun current value `faq`, quindi FAQ canoniche/opache non verificabili su dati reali: coperte solo dai test unitari.
- Console: solo 2 "Failed to fetch" della homepage negozio, interrotte dalla navigazione del test; nessun errore nel pannello.
- Nessun comando di scrittura inviato.

## Integrità dati (prima = dopo)
products 2.706 · snapshots 2.706 · current_values 24.466 · source_snapshot_id valorizzati 0 · history 0 · ai_suggestions 0 · impronta valori `1cacd372df633e566847a6c087590b21` identica.

## Limiti osservati
- La colonna "Originale WordPress" mostra "assente" per tutti i campi: nessun snapshot collegato (backfill non eseguito) e la baseline non collegata non viene mostrata. Comportamento coerente con `source_snapshot_id` NULL, non una regressione di dati.

## Stato Fase 2C
Non avviata. Candidati: backfill dei 14.295 MATCH_READY, esposizione baseline non collegata, dati FAQ reali, fix policy legacy, uscita dal canary. Richiede nuova approvazione.
