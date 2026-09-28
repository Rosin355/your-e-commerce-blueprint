# Fase 2C.1 — Backup, migration e deploy backend (28/09/2026)

PR #15 mergiata su `main` con merge commit
`3f674b48210908b115aa72f55bf692e4a3e85c35`. Commit applicativo:
`01b43137381cc19136a41e37d12c6bedfca48544`.

## Stato Git consolidato

Al fetch Codex del 28 settembre, `origin/main` è
`3f674b48210908b115aa72f55bf692e4a3e85c35` e contiene migration,
registrazione Drizzle, moduli runtime, test e documentazione 2C.1. Il merge
della PR non ha autorizzato né richiesto una seconda applicazione della
migration o un nuovo deploy.

Le verifiche Git, gli hash e il confronto dei file sono `CODEX VERIFIED`. I
risultati di preflight, backup, migration, deploy e smoke read-only riportati
nelle sezioni seguenti sono `LOVABLE REPORTED`, non interrogazioni live ripetute
direttamente da Codex.

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

## Fixture approvate originariamente

La prova A è stata successivamente eseguita e ripristinata come documentato in
fondo al report. La prova B non è stata eseguita.
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

## Stato prima dello smoke

Migration applicata e backend distribuito; a questo punto del report le
scritture non erano ancora state eseguite. Nessun merge, AI, import o Shopify
sync.

## Smoke test live autorizzato — Prova A (UPDATE only) — 2026-09-28 14:38 UTC

Solo prova A su OG_264361 (`d6492fb1-…ff12`, simple), campo `nome_comune`.
Prova B (`colore_fiore`) NON eseguita; OG_393883 non toccato. La prova è
precedente al successivo merge documentale/applicativo della PR #15.

**Preflight (PASS)**: valore `Hemerocallis "Rosy" - Giglio Diurno Rosa`, version 1, manual_only, is_locked=true, manual/approved/protected, `source_snapshot_id` NULL, `source_batch_id` 1a44397e…; ruolo `admin`, writesEnabled, writeMode `canary`, `nome_comune` in allowlist. History/command log globali: 0.

| Passo | Richiesta | Esito |
|---|---|---|
| UPDATE | expectedVersion 1, key `smoke-2c1-A-e3166b…` | 200 APPLIED, version 2 |
| Replay stessa key | identica | 409 VERSION_CONFLICT (currentVersion 2); nessuna v3, nessuna history/log duplicata |
| Conflitto | nuova key, expectedVersion 1 | 409 VERSION_CONFLICT; nessun dato cambiato |
| Ripristino | expectedVersion 2, key `smoke-2c1-R-8818f7…` | 200 APPLIED, version 3 |

**Stato finale**: valore originale, version 3, is_locked=true, manual/approved/protected, lineage invariata (snapshot NULL, stesso batch). History: 2 righe `manual_update` 1→2 e 2→3. Command log: 2 righe APPLIED (A, R).

**Nota idempotenza**: il replay viene fermato dal controllo expectedVersion nella Edge Function prima di arrivare alla RPC, quindi risponde 409 invece di restituire l'esito originale. Nessun effetto duplicato (requisito rispettato), ma un retry client dopo timeout vedrebbe un conflitto anziché un successo: possibile forward-fix (consultare command log per idempotencyKey prima del version check).

**Integrità**: prodotti 2.706, values 24.466, AI suggestions 0, publication jobs 0, sync job 36, pipeline job 1, import batch 1; nessun altro current value aggiornato (max updated_at altri prodotti 2026-08-17). Nessuna chiamata AI/import/Shopify/storefront.
