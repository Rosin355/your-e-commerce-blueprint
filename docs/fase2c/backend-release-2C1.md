# Fase 2C.1 — Backup, migration e deploy backend (28/09/2026)

PR #15 aperta, non mergiata. Commit applicativo `01b43137381cc19136a41e37d12c6bedfca48544` (1 commit avanti a main, 0 indietro).

## Preflight live
PASS completo (turno precedente), nessun drift. Ricontrollato prima della migration: 2.706 prodotti, 24.466 current values, 68 definizioni, 0 righe history, 0 righe command log; RPC SECURITY DEFINER, `search_path=""`, ACL `postgres, service_role, sandbox_exec` (nessun anon/authenticated/PUBLIC). md5 definizione pre: `2f8d2027…6082`.

## Backup privato
- Percorso: `csv-pipeline/backups/fase2c1/20260928/backup-2c1.json` (bucket privato; accesso anonimo → 400).
- 13.759 byte, SHA-256 `6ebdc349177cd0f0ba38704b80ad32d043f461cc4c06f19c2ddb115794d73fa6`.
- Contenuto: definizione completa RPC (SHA-256 testo `48a546bb…c1b4`), ACL/SECURITY DEFINER/search_path/firma, registry dei 5 manual_only (`colore_fiore, colore_foglia, curiosita, ibridatore, nome_comune`: botanical, both, editable, manual_only, ai_allowed=false, protected_on_reimport), righe current `OG_264361` nome_comune/colore_fiore, history del prodotto (vuota), conteggio command log (0). Nessun export del catalogo.

## Migration
- `20260926150609_allow_admin_manual_locked_field_edits.sql`, SHA-256 riverificato `b7f1fdaf…a2b898` (identico a GitHub e alla copia in `supabase/migrations/`).
- Applicata una sola volta con lo strumento Lovable → `drizzle/migrations/0002_allow_admin_manual_locked_field_edits.sql`; journal Drizzle con 3 voci, 1 sola per questa migration. Nessuna registrazione manuale altrove.
- Post: firma identica, SECURITY DEFINER true, `search_path=""`, ACL identici; md5 nuova definizione `7e0b4821…7f59`. Conteggi 2.706 / 24.466 / 68 invariati; 29 valori locked invariati; history e command log a 0. Nessun current value creato.

## Deploy product-admin-api
Solo questa funzione, file dalla stessa revisione: 6 modificati (capabilities, commands, index, permissions, serializers, validation), 3 invariati (auth, queries, types). Nessun altro deploy, frontend non pubblicato.

## Verifiche read-only post-deploy (sessione Admin)
- Anonimo/chiave pubblica: 401.
- Contesto: canary, write gate esistente attivo, azioni `update_field/confirm/reject` (nessun clear), campi editabili = 6 descrittivi + 5 manual_only.
- Dashboard 2.706 (404 simple, 1.114 variable, 1.188 variation).
- OG_393883 (solo lettura): 5 manual_only `isLocked=true`, `canUpdate=true` (allowed), versione 1, AI disabilitata.
- Strutturali (sku, handle, category_effective, inventory) `definition_readonly`; price `canary_field_not_allowed`; campi AI invariati (`phase_2c`, canSuggestAi=false).
- Validazione: `expectedVersion mancante` rifiutato; creazione di valore assente richiede `expectedVersion=0` (validation.ts e RPC).
- `sourceState=original_absent`, source_snapshot_id NULL.
- Nessuna scrittura: conteggi ancora 24.466 / 0 / 0.

Limite: ruolo editor non testabile live (unico utente Admin); comportamento solo Admin/Tech Admin coperto da RPC (`user_roles`) e test offline della PR.

## Fixture proposte (NON eseguite)
Prodotto: `OG_264361` — Hemerocallis "Rosy", simple, attivo, non golden, non OG_393883, nessuna history.

| | A — UPDATE locked | B — CREATE assente |
|---|---|---|
| SKU / tipo | OG_264361 / simple | OG_264361 / simple |
| field_key | nome_comune | colore_fiore |
| valore corrente | `Hemerocallis "Rosy" - Giglio Diurno Rosa` (locked, approved) | ASSENTE |
| versione | 1 | 0 |
| valore test | `Hemerocallis "Rosy" - Giglio Diurno Rosa [test 2C.1]` | `rosa` |
| expectedVersion | 1 | 0 |
| esito atteso | v2, is_locked resta true | nuova riga v1, locked, manual/approved |

Rollback:
- A: `update_field` con valore originale esatto ed `expectedVersion=2` (→ v3, stesso testo, locked). History/command log restano come audit.
- B: nessun delete via API; rollback logico concordato = mantenere `rosa` (dato corretto per un emerocallide rosa) oppure rimozione manuale approvata della sola riga creata dopo verifica. Si consiglia di scegliere un valore veritiero.

Sicurezza: prodotto non pubblicato da questa pipeline (nessuna sync Shopify), valori testuali coerenti col prodotto, un solo campo per fixture, prodotto senza storico precedente, backup delle righe già salvato.

## Stato
Migration applicata, backend distribuito, scritture smoke NON eseguite. In attesa di approvazione fixture. Nessun merge, AI, import o Shopify sync.
