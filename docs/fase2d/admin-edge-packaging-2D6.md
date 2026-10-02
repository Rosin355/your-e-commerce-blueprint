# Fase 2D.6 — packaging indipendente delle Edge Functions Admin

Data: 2 ottobre 2026

Stato: **READY FOR REVIEW — NO DEPLOY / NO LIVE WRITE**

Baseline Git verificata dopo `git fetch`: `origin/main@436d048cdb7ec06bffa9a08834c390e0711cf379`.
La baseline dichiarata `eee8f43d4bbcc5030f3ca152b347b688d37c68ef`
è un suo antenato; i quattro commit successivi registrano le migration ACL in
Drizzle e aggiornano il report 2D.5, senza modificare i runtime Edge.

## Stato live riferito da Lovable

- migration reservation 2D.2 applicata una volta;
- remediation reservation 2D.4A applicata una volta;
- remediation suggestion 2D.4B applicata una volta;
- entrambe le tabelle AI: nessun privilegio a PUBLIC/anon/authenticated e solo
  SELECT/INSERT/UPDATE a `service_role`;
- conteggi dati invariati: products 2.706, current values 24.467, history 5,
  command log 5, suggestions 0, reservations 0;
- deploy Edge fallito durante il packaging, prima della distribuzione;
- frontend non pubblicato, provider AI non chiamato, canary invariato.

Queste sono evidenze Lovable; Codex ha verificato direttamente repository,
grafo import e test offline, ma non ha interrogato né modificato il live.

## Causa del blocco

Ogni Edge Function viene impacchettata come unità indipendente. Il codice 2D
importava file dalla cartella sibling dell'altra funzione; tali file non erano
presenti nel pacchetto Lovable/Supabase.

### Grafo precedente — 11 import vietati

| Chiamante | Dipendenza sibling |
|---|---|
| `product-admin-ai/index.ts` | `product-admin-api/auth.ts` |
| `product-admin-ai/index.ts` | `product-admin-api/permissions.ts` |
| `product-admin-ai/index.ts` | `product-admin-api/commands.ts` |
| `product-admin-ai/index.ts` | `product-admin-api/types.ts` |
| `product-admin-ai/service.ts` | `product-admin-api/commands.ts` |
| `product-admin-ai/service.ts` | `product-admin-api/queries.ts` |
| `product-admin-ai/service.ts` | `product-admin-api/types.ts` |
| `product-admin-ai/service.ts` | `product-admin-api/validation.ts` |
| `product-admin-ai/ai-core.ts` | `product-admin-api/types.ts` |
| `product-admin-ai/ai-core.ts` | `product-admin-api/validation.ts` |
| `product-admin-api/capabilities.ts` | `product-admin-ai/ai-core.ts` |

## Soluzione condivisa

Le sole primitive usate da entrambi i runtime sono ora autoritative in
`supabase/functions/_shared/`:

| Modulo | Responsabilità |
|---|---|
| `admin-v2-auth.ts` | `authenticate`, `AuthError`, `AuthContext` tramite types, role loading e `serviceClient` |
| `admin-v2-types.ts` | contratti Admin V2 e tipi catalogo |
| `admin-v2-permissions.ts` | matrice ruolo/azione, Admin e Tech Admin |
| `admin-v2-commands.ts` | canary, hash canonico, replay e RPC atomica |
| `admin-v2-queries.ts` | query catalogo read-only |
| `admin-v2-validation.ts` | editor type, lock, manual-only ed expectedVersion |
| `admin-ai-core.ts` | eligibility pura, deny list, strategie e shape dei valori AI |

Il precedente `_shared/admin-auth.ts` non è stato sostituito: serve funzioni
legacy con un contratto Admin-only differente. Il nuovo nome
`admin-v2-auth.ts` rende esplicita la distinzione e preserva esattamente
autenticazione, errori, ruoli e service client di Admin V2.

I file storici sotto `product-admin-api/` sono facade di compatibilità che
riesportano i moduli shared. Provider, segreti, parsing e orchestrazione AI
restano locali a `product-admin-ai`; handler, capability e serializer restano
locali alla rispettiva funzione.

### Grafo finale

```text
product-admin-api/index.ts
  ├─ product-admin-api/{capabilities,serializers}.ts
  └─ _shared/admin-v2-*.ts

product-admin-ai/index.ts
  ├─ product-admin-ai/{provider,service}.ts
  └─ _shared/{admin-v2-*.ts,admin-ai-core.ts}
```

Import `product-admin-api -> ../product-admin-ai/*`: **0**.

Import `product-admin-ai -> ../product-admin-api/*`: **0**.

## Preservazione del comportamento

Il task modifica soltanto la topologia dei moduli. Restano invariati:

- JWT verificato con `auth.getUser()`, ruoli caricati da `user_roles` e
  `AuthError` tipizzato;
- Admin/Tech Admin, `writesEnabled`, `writeMode`, `canWrite` e canary;
- validation, lock/manual-only, expectedVersion e create versione zero;
- hash JSON ricorsivo, idempotenza, exact replay e gestione concorrenza;
- eligibility AI, prodotti inattivi, strategie, ordine FAQ e transizioni;
- reservation/rate limit e RPC atomica;
- assenza di provider secrets nel browser e isolamento completo da Shopify.

Le facade sono testate come riferimenti alla stessa implementazione shared;
non esistono copie divergenti della logica.

## Verifica packaging

`scripts/test-edge-function-packaging.mjs` visita ricorsivamente il grafo di
ogni entrypoint, risolve tutti gli import relativi e fallisce se un modulo esce
dalla cartella della funzione o da `_shared`.

Esito:

- `product-admin-api`: 16 moduli locali risolvibili, zero import sibling;
- `product-admin-ai`: 11 moduli locali risolvibili, zero import sibling;
- `deno check` dei due entrypoint: PASS;
- Supabase CLI `2.106.0`: non espone un sottocomando bundle-only. Il tentativo
  `functions serve` locale non ha raggiunto il bundler perché Docker Desktop
  non era attivo; nessun deploy è stato tentato.

## Test offline

| Gate | Esito |
|---|---|
| `npm ci` | PASS, lockfile invariato |
| test AI dedicati | PASS 34/34 |
| regression test packaging | PASS 5/5 |
| `npm run test:catalog` | PASS 249/249 |
| PostgreSQL reservation concurrency | PASS |
| PostgreSQL suggestion ACL | PASS |
| `deno check product-admin-api` | PASS |
| `deno check product-admin-ai` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS, soli warning preesistenti |
| `deno fmt --check` runtime modificato | PASS dopo formattazione |
| `git diff --check` | previsto nel gate finale |

I test non chiamano database, AI, Shopify o Storage live.

## Ruoli `sandbox_exec*`

Il report Lovable segnala SELECT/INSERT su entrambe le tabelle AI. L'audit del
repository non trova migration, GRANT o `ALTER DEFAULT PRIVILEGES` che nominino
ruoli `sandbox_exec*`. Il solo riferimento precedente riguarda un ACL RPC live.

Classificazione: **UNKNOWN_NEEDS_LIVE_VERIFICATION**.

È plausibile che siano ruoli interni della piattaforma, ma dal solo repository
non si possono provare owner, membership, ereditarietà o necessità per tooling
Lovable. Non vanno revocati senza preflight live read-only e indicazione della
piattaforma. Non bloccano il refactor perché non esiste evidenza di accesso da
ruoli applicativi.

## Rollout successivo, non eseguito

1. merge della PR 2D.6;
2. verificare che main contenga zero import sibling;
3. non riapplicare alcuna migration;
4. deploy coordinato di `product-admin-ai` e `product-admin-api` dalla stessa
   revisione;
5. smoke read-only di auth, capability e `get_ai_suggestions`;
6. STOP prima di chiamate provider o scritture live non autorizzate;
7. pubblicare il frontend solo dopo il gate Edge.

## Limiti confermati

- nuove migration: **NESSUNA**;
- deploy Edge/frontend: **NON ESEGUITO**;
- database live: **NON TOCCATO**;
- AI live: **NON CHIAMATA**;
- Shopify, inventory, Smart Sync e storefront: **NON TOCCATI**.
