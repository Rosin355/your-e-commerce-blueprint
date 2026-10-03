# 3B.2 — Product creation scale-out (report cumulativo)

Stato: **STOPPED al gate ledger (passo 4)** — nessuna scrittura Shopify, nessun deploy, nessun DRY_RUN.

## Export editoriale deterministico
- Generatore: `scripts/build-3b2-editorial-export.py` (regole owner-approved: handle da titolo ORIGINAL, description ORIGINAL con `\n` → newline e HTML minimo, option `Formato` da suffisso, immagini solo `www.onlinegarden.it/wp-content/uploads/` con http→https, HEAD 200 `image/*` stesso path; nessuna AI, nessun campo publishBlocked).
- Output privato (non versionato): `/tmp/3b2/content.json`, `/tmp/3b2/class.csv`.
- Famiglie CREATE_VARIABLE_PARENT 3B.1C: 941
  - SAFE_CREATE: 903
  - SKIPPED_AMBIGUOUS_OPTIONS: 36 (23 valori opzione duplicati, 7 suffisso non derivabile, 6 handle duplicati tra famiglie)
  - SKIPPED_MEDIA: 2
  - SKIPPED_CONTENT / STRUCTURAL / EXISTING_MAPPING: 0 (già esclusi a monte da 3B.1C e denylist)

## Canary OG_111899 — SAFE
- Child: `OG_111899-01`, prezzo 23.5, ORIGINAL legacy_db_baseline, publishBlocked=false su title/description/immagine.
- Handle `pyrus-communis-martinsecco-pero`; `Formato = Ø Vaso 24cm - Altezza Pianta 180cm`.
- Immagine `https://www.onlinegarden.it/wp-content/uploads/2023/01/pyrus-communis-martinsecco-pero.jpg` → 200 image/*.
- Nessun mapping Shopify. Manifest privato `shopify-create-3b2-canary-001` generato (`/tmp/3b2/canary-001.json`).

## Ledger migration
- `20261003163930_create_shopify_creation_ledger.sql` (SHA-256 `720a2669…525725f`) applicata una volta, registrata come `drizzle/migrations/0006_create_shopify_creation_ledger.sql`.
- Tabella presente, RLS attiva, 0 righe.
- anon / authenticated: nessun privilegio — PASS.
- service_role: SELECT/INSERT/UPDATE **più DELETE, TRUNCATE, REFERENCES, TRIGGER** — **FAIL**.
  Causa: i default privileges dello schema `public` concedono ALL a service_role; la migration fa solo `grant`, non `revoke`.

## Fix proposto (non applicato, richiede approvazione)
```sql
revoke delete, truncate, references, trigger on table public.shopify_creation_ledger from service_role;
```
Migration additiva separata, nessun impatto sui dati o sull'executor (usa solo select/insert/update).

## Gate EXECUTE
`SHOPIFY_CREATE_EXECUTE_ENABLED` assente; `SHOPIFY_CREATE_BATCH_MANIFEST_JSON` non configurato; `shopify-create-batch` non distribuita.
