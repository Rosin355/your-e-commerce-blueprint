# Fase 3B.1G — STOCK-20 live DRY_RUN

Data: 2026-10-03 (UTC) · Revisione distribuita: `main@916b6794388541b6831e2246a26bcbbad1a9e9b8`

## Input (privati, non in Git)
| Input | Record | SHA-256 | Timestamp UTC |
|---|---|---|---|
| CSV 3B.1C `manifest-3B1C-shopify-final.csv` | 2.706 (313 eleggibili) | `15e386d0c9f5f71a47691673c347f05fe6f0c2adc349282c2576c7531ba47c71` (= approvato) | 2026-10-03T09:22 (file) |
| Inventory read-only (35 candidati, Admin GraphQL 2026-01) | 35 | `7974818a16fc8e1e465d94b61be634ddf62af626bb5d731ec23c44ff3b1fb1bd` | 2026-10-03T13:27:04Z |
| Inventory filtrato (senza famiglia OG_152965) | 34 | `3f4707588f42f41b8405398d557af80608ae5d21433c876f41b16007d5536da6` | 2026-10-03T13:27Z |
| Manifest batch #1 | 25 | `53d44d24fc7d92408fa710bbecb10ec256190eb19b20475f29f85f01237aca22` | 2026-10-03T13:27Z |
| Report DRY_RUN | 25 risultati | `725ac74e07478f2d30575f381b06f995938dfe1b35b2474d15c6a4fcdff8c2dc` | 2026-10-03T13:28:20Z |

Export inventory ottenuto con una funzione temporanea read-only (solo query, accesso admin/tech_admin), distribuita e cancellata subito dopo l'uso; il codice non è nel repository.
Esclusione cautelativa: `OG_152965-01` (sorella del denylisted OG_152965) rimossa dall'input, non corretta.

## Batch `stock20-3b1g-batch-001`
OG_113165, OG_123411, OG_123928, OG_124436, OG_124436-01, OG_124436-02, OG_125937, OG_128815-01, OG_128815-02, OG_129881-02, OG_134564, OG_139828, OG_143783, OG_145376, OG_151499-01, OG_151499-02, OG_152798, OG_154569, OG_159857, OG_161222, OG_163159, OG_163159-01, OG_163159-02, OG_172978, OG_178428.

Verifica manuale: 25 SKU e 25 inventory item univoci; tutti prodotti a variante unica, location `gid://shopify/Location/117678014804`, livello presente; stato attuale tracked=true, DENY, available=0 per tutti.

## Configurazione server
- `SHOPIFY_STOCK20_BATCH_MANIFEST_JSON` impostato con il manifest compatto.
- `SHOPIFY_STOCK20_EXECUTE_ENABLED` assente (verificato sull'elenco secret).
- Deploy della sola `shopify-stock20-batch`.

## Esito DRY_RUN (unica invocazione, senza `confirm`)
HTTP 200, `ok=true`, `stopped=false`.
- plannedMutations: `SET_AVAILABLE_20` per ognuno dei 25 SKU.
- Totali: ENABLE_TRACKING 0 · SET_POLICY_DENY 0 · SET_AVAILABLE_20 25.
- MANIFEST_STATE_DRIFT 0 · FAILED 0 · errori sistemici 0 · BATCH_STOPPED 0.
- SKIPPED 25, tutti `DRY_RUN_WOULD_UPDATE` (stato atteso del dry-run).

## Zero write
appliedMutations totali = 0. Inventory, tracking, policy e prodotti: 0 write (il ramo DRY_RUN non chiama mutation). DB: 0 write. Nessuna AI/Smart Sync.

## Stato
EXECUTE ancora disabilitato. Per eseguire: approvazione owner, abilitazione temporanea del gate, una sola EXECUTE con `confirm`, disabilitazione immediata.

3B.1G LIVE DRY-RUN — PASS / READY FOR EXECUTE
