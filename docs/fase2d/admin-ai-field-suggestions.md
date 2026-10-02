# Fase 2D — Admin AI field-by-field

Stato: **2D BACKEND DATABASE READY / EDGE DEPLOY BLOCCATO FINO AL MERGE 2D.6 / AI NON LIVE**

Baseline implementazione: `origin/main@193135224886e8d022e17ddf6e1b4d16f9dc8629`

Baseline integrazione: `origin/main@81f6a98148fc15b80dd50c6d7762fa7b2d5e34e9`

Branch isolato: `codex/admin-ai-field-suggestions`

Branch hardening ACL suggestion: `codex/admin-ai-suggestions-acl-fix`, basato
e riallineato su `origin/main@85a895a6caaec391d5f760eb694f6e6b3811aa72`.

## Architecture note

La nuova funzione usa un endpoint dedicato `product-admin-ai`. Il browser invia soltanto
`productId`, `fieldKey`, `baseVersion` e, per accettare, il valore revisionato e una chiave
di idempotenza. Il server ricostruisce identità, ruoli, definizione campo, valore corrente,
snapshot e contesto: il client non può scegliere prompt, contesto o modello.

La proposta viene salvata in `public.product_ai_suggestions`; la generazione non aggiorna
`product_current_values` e non richiama Shopify. L'accettazione passa dallo stesso
`executeCommand(... action: update_field ...)` usato da Admin V2, quindi conserva controllo
`expectedVersion`, command log, history e idempotenza della RPC atomica. Rifiuto e stale
modificano soltanto lo stato della proposta.

### Riuso sicuro

- riusati: `authenticate`, ruoli/canary, `getFieldDefinition`, `getCurrentValue`,
  `validateCommand`, `executeCommand`, serializer e codec tipizzati Admin V2;
- riusata solo la configurazione server-side `LOVABLE_API_KEY` e il protocollo compatibile
  OpenAI del gateway Lovable;
- non riusati: `create-product-ai`, AI Writer legacy, `shopify-admin-proxy`, pipeline bulk,
  fallback mock e qualunque funzione di publish/update Shopify;
- nessun import del client Shopify è presente nel nuovo endpoint.

### Compatibilità schema e migration 2D.2

`product_ai_suggestions` possiede già `id`, `product_id`, `field_key`, valore proposto
(`suggestion_text`/`suggestion_json`), `base_version`, `prompt_version`, `model`, `status`,
`created_by` e timestamp. Queste colonne restano invariate.

La review concorrente ha però dimostrato che la tabella suggestion non può
riservare uno slot **prima** del provider: la riga nasce soltanto dopo la
risposta AI. Un contatore Edge o un check seguito da insert non sarebbe sicuro
tra isolate distribuiti. La migration incrementale
`20260930152426_harden_product_admin_ai_concurrency.sql` è quindi necessaria e
introduce soltanto:

- `product_ai_generation_reservations`, audit tecnico di reservation
  `reserved/completed/failed`, senza contenuti del prompt o del prodotto;
- indici per attore/tempo e target/versione/tempo;
- `reserve_product_ai_generation(...)`, RPC `SECURITY INVOKER` che mantiene una
  sezione critica PostgreSQL breve con advisory transaction lock, prenota al
  massimo 5 call/attore/60 secondi e deduplica target equivalenti;
- RLS attiva, nessuna policy client, grant tabella/RPC solo a `service_role`;
  `anon` e `authenticated` non possono leggere o invocare la primitive.

La reservation avviene subito prima della chiamata provider. Nessun polling,
sleep, retry automatico o lock rimane aperto durante la chiamata esterna. Una
reservation fallita conta comunque nel limite anti-abuso del minuto, ma non
impedisce una nuova generazione dello stesso target. La migration 2D.2 risulta
applicata live una sola volta tramite Lovable e non deve essere riapplicata. La
forward migration reservation della PR #23 risulta applicata una volta e
verificata secondo Lovable; Edge Functions e frontend 2D non sono stati
distribuiti.

La tabella ammette gli stati DB `pending`, `accepted`, `discarded`, `superseded`. Il contratto
API espone rispettivamente `pending`, `accepted`, `rejected`, `stale`; questa mappatura evita
una modifica retroattiva del CHECK live. `model` registra `provider/modello` e `prompt_hint`
registra la strategia, senza memorizzare chiavi o prompt completi.

Il preflight live 2D.4A ha rilevato su `product_ai_suggestions` privilegi `ALL`
sia per `authenticated` sia per `service_role`. RLS blocca le write di riga
senza policy, ma non governa `TRUNCATE`, `REFERENCES` e `TRIGGER`. La remediation
2D.4B della PR #24 revoca tutti i grant per-oggetto a `PUBLIC`, `anon`,
`authenticated` e `service_role`, poi concede soltanto `SELECT`, `INSERT`,
`UPDATE` a `service_role`. La policy SELECT `ai_suggestions_read` resta
deliberatamente invariata ma inattiva senza ACL; il trigger
`assert_ai_field_allowed` resta una seconda difesa sugli INSERT server-side.

### Confini di sicurezza

- capability AI autoritativa sul server: `editable`, `visible`, `ai_allowed`, non
  `manual_only`, applicabilità entity, gruppo/chiave non strutturale, strategia supportata;
- i cinque campi manuali (`nome_comune`, `ibridatore`, `colore_fiore`, `colore_foglia`,
  `curiosita`) restano esclusi;
- una proposta parte sempre dalla versione corrente e non può superarne una più recente;
- nessuna generazione automatica, bulk, retry della write o side effect Shopify;
- segreto provider esclusivamente nell'ambiente Edge; log redatti e limite richieste server.

## Campi idonei

Il registry resta la prima fonte (`visible`, `editable`, `ai_allowed`,
`manual_only`, `applies_to`), ma non basta da solo. Il server richiede anche:

- current value esistente, non vuoto, non locked e in formato supportato;
- chiave non strutturale e gruppo modificabile;
- strategia prompt esplicita;
- ruolo di scrittura e gate della modalità corrente.

Strategie disponibili:

- testo: `title`, `commercial_title`, `description`, `short_description`,
  `optimized_description`, `short_intro`, `promo_text`, `titolo_sezione_faq`,
  `care_guide`, `care_info`, `come_prendersene_cura`,
  `conosci_meglio_la_tua_pianta`, `seo_title`, `seo_description`;
- liste: `key_benefits`, `key_features`, `special_bullets`, `image_alt_texts`,
  `keywords_suggested`, `internal_links_suggestions`;
- struttura canonica: `faq` come array ordinato di `{question, answer}`.

In canary la capability effettiva è ulteriormente limitata a `title`,
`short_description`, `description`, `seo_title`, `seo_description` e
`optimized_description`. Non occorre cambiare la UI per ampliare una strategia:
la decisione arriva dal server.

Restano sempre esclusi i cinque manual-only, identità/GTIN/handle, prezzo,
inventario, tipo entità, relazioni, stato pubblicazione, stato Shopify e campi
botanici fattuali senza strategia verificata.

## Contratto API

Endpoint `product-admin-ai`, solo JWT utente verificato e ruoli caricati dal DB.

| Action | Input | Effetto |
|---|---|---|
| `get_ai_suggestions` | `productId` | legge le pending; espone `stale` se la versione corrente è cambiata |
| `generate_ai_suggestion` | `productId`, `fieldKey`, `baseVersion` | una call provider e una riga separata; nessun current value modificato |
| `reject_ai_suggestion` | `suggestionId` | `discarded`/`rejected`; nessuna history prodotto |
| `accept_ai_suggestion` | `suggestionId`, valore revisionato, `expectedVersion`, idempotency key | normale `update_field`, poi stato `accepted` |

Una pending sulla stessa versione viene restituita come replay senza nuova call
AI. Una pending superata viene `superseded`; il nuovo tentativo produce una
nuova riga. La reservation DB atomica precede la call provider: il limite è
cinque generazioni per attore in 60 secondi anche con richieste simultanee; due
richieste concorrenti per lo stesso prodotto/campo/versione consumano una sola
provider call. Non ci sono polling, job background o retry automatici.

## Hardening 2D.2 — quattro finding P2

1. **Rate limit concorrente**: sostituito il precedente `count` non atomico con
   la reservation PostgreSQL descritta sopra. Sei richieste simultanee dello
   stesso attore producono al massimo cinque slot/provider call.
2. **Accept concorrente**: tutte le risoluzioni sono compare-and-set
   `WHERE status='pending'`. `accepted`, `discarded` e `superseded` sono stati
   terminali: una request perdente non può più degradare `accepted`. Un
   `VERSION_CONFLICT` restituito dopo l'ingresso nella RPC non marca subito la
   proposta `superseded`, perché il winner potrebbe essere nella breve finestra
   tra apply atomico e transizione `accepted`; il confronto versione continua a
   esporre la request perdente come stale senza alterare lo stato terminale.
3. **Exact replay**: dopo il lookup minimo della suggestion viene costruita
   l'identità del comando e consultato il command log. Un replay applicato torna
   prima di stato prodotto, valore AI, allowlist canary e altri gate mutabili;
   auth, ruolo e gate operativo restano invariati. Un payload diverso continua
   a restituire `IDEMPOTENCY_CONFLICT`.
4. **Prodotti inattivi**: `product-admin-api` riceve `products.is_active` nel
   calcolo server-side e restituisce `canSuggestAi=false` con
   `aiBlockReason=product_inactive`; il service conserva lo stesso blocco prima
   del provider.

## Contesto e provider

Il client non invia prompt o contesto. Il server usa solamente:

- valore corrente del campo;
- originale dello snapshot puntuale, oppure baseline esplicitamente non
  collegata quando `source_snapshot_id` è `NULL`;
- titolo, titolo commerciale, descrizioni, nome botanico e categorie correnti
  pertinenti, troncati a limiti conservativi;
- identità SKU e label del campo.

`source_snapshot_id=NULL` resta `NULL`: il sistema non inventa lineage. I prompt
vietano nuovi fatti botanici, misure, esposizione, rusticità, tossicità,
fioritura, certificazioni, disponibilità, prezzi e claim. Con evidenza limitata
la proposta può solo migliorare forma e chiarezza.

Il provider è il gateway Lovable già configurato, ma in un client nuovo senza
dipendenze Shopify. `LOVABLE_API_KEY` resta server-side; `ADMIN_AI_MODEL` e
`ADMIN_AI_TIMEOUT_MS` sono opzionali. Timeout predefinito 12 secondi, output
strutturato, temperatura 0,2 e massimo 2.000 token. I log contengono solo actor
redatto, field key, replay e consumo aggregato se disponibile.

## UX e stale handling

La FieldCard mostra il bottone solo con `canSuggestAi=true`. Gli stati sono:
idle, loading, proposal, editing, accepted, rejected, stale e provider error.
La proposta usa lo stesso editor tipizzato del campo; le FAQ non mostrano JSON.

Se `base_version` non coincide più, l'UI mostra:

> Il prodotto è stato modificato dopo la creazione di questa proposta. Genera
> una nuova proposta.

Sono disponibili soltanto Scarta e Genera nuova proposta. Non viene ritentata
la write. L'accettazione usa una idempotency key stabile per la durata della
proposta: un retry esatto ritorna il risultato già applicato senza nuova
version/history/command log; un payload diverso resta
`IDEMPOTENCY_CONFLICT`.

Layout e accessibilità offline: griglia a una colonna su 390 px e due colonne
da `md` (copre circa 820/1440 px), azioni wrappabili, focus nativo, label per
editor e `aria-live` per loading/errori. Lo smoke browser reale resta un gate
di rilascio perché il frontend non è stato pubblicato.

## Test eseguiti

| Gate | Esito |
|---|---|
| `npm ci` | PASS, lockfile invariato |
| test AI mirati | PASS 34/34; la numerazione descrittiva arriva a 36 per due titoli accorpati |
| PostgreSQL isolato concorrente | PASS; 6 simultanee → 5 reservation e 1 rate limit; target equivalente → 1 reservation |
| PostgreSQL isolato ACL suggestion | PASS; authenticated negato su 7 operazioni, service_role SIU, non-drift completo |
| `npm run test:catalog` | PASS 249/249 dopo i 5 regression test packaging 2D.6 |
| `npm run typecheck` | PASS |
| `deno check product-admin-ai` | PASS |
| `deno check product-admin-api` | PASS |
| `npm run build` | PASS; soli warning preesistenti Tailwind/chunk size |
| `git diff --check` | PASS |

I test non chiamano provider, database, AI o Shopify live. Provider e repository
sono fixture sintetiche; la migration viene applicata soltanto a un cluster
PostgreSQL effimero locale. Il test statico impedisce import di client Shopify o
publish legacy nel nuovo endpoint.

## Piano di rilascio

1. review del diff e preflight read-only di tabella/RPC/ACL live;
2. non riapplicare la migration 2D.2, già registrata una volta secondo Lovable;
3. integrare la PR #24 e applicare una sola volta, in ordine, la forward
   migration 2D.4A della PR #23 e la remediation 2D.4B della PR #24;
4. verificare RLS, ACL esatti e registro migration senza manipolarlo;
5. confermare `LOVABLE_API_KEY` e scegliere `ADMIN_AI_MODEL` senza esporre i
   valori;
6. deploy `product-admin-ai` dalla revisione approvata;
7. deploy `product-admin-api` dalla stessa revisione, mantenendo canary;
8. smoke read-only di auth, capability e lista suggestion;
9. pubblicare il frontend della stessa revisione;
10. test di generazione su un campo/fixture approvati: verificare una sola riga
   pending e zero variazioni di current/history/command log;
11. STOP prima di Accetta finché non è autorizzata la scrittura;
12. dopo approvazione, test accept/replay/conflict e verifica esplicita di zero
   chiamate Shopify.

Non pubblicare il frontend se uno dei due endpoint non è disponibile. Le due
remediation ACL sono prerequisiti del runtime 2D e non devono essere applicate
finché le rispettive PR e il piano di rilascio non sono approvati.

## Rollback

- mettere temporaneamente il frontend precedente, così il bottone sparisce;
- ripristinare `product-admin-api` alla revisione precedente compatibile;
- rimuovere/disabilitare `product-admin-ai` soltanto dopo il rollback frontend;
- le suggestion già create restano dati separati e non modificano il catalogo;
- non cancellare suggestion/history e non toccare Shopify per il rollback.
- la tabella reservation può restare inertizzata senza impatto se l'Edge viene
  ritirata; un eventuale `DROP` richiede una nuova migration approvata, solo
  dopo rollback Edge e verifica che non esistano reservation attive.

## Stato conclusivo

- migration 2D.2: **APPLICATA LIVE UNA SOLA VOLTA** secondo evidenza Lovable;
- migration 2D.4A: **PREPARATA / NON APPLICATA LIVE**;
- deploy/frontend publish: **NON ESEGUITI**;
- AI live: **NON CHIAMATA**;
- database live da Codex in 2D.4A: **NON TOCCATO**; la sola applicazione 2D.2
  resta evidenza Lovable preesistente;
- Shopify/storefront: **NON TOCCATI**.

**2D.2 CODE MERGED — DEPLOYMENT BLOCCATO DAI GATE ACL 2D.4A**

## Fase 2D.4 — Controlled live rollout (30/09/2026) — BLOCKED

- main = `d16b575` (merge PR #22). Migration `20260930152426_harden_product_admin_ai_concurrency.sql` (SHA-256 `f6889fab…a9bb2`) applicata **una volta**, byte-identica, via Lovable → Drizzle `0003` (registro 3 → 4 voci).
- Pre/post: suggestions 0/0, current values 24.467/24.467, history 5/5, command log 5/5, prodotti 2.706, reservation 0.
- PASS: tabella, 3 indici, RLS attiva, anon/authenticated senza privilegi su tabella e RPC; RPC firma `(uuid, uuid, text, integer)`, SECURITY INVOKER, `search_path=''`, EXECUTE solo service_role.
- **FAIL**: service_role ha `arwdDxtm` (anche DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) invece di soli SELECT/INSERT/UPDATE, per default privileges dello schema `public`; la migration non fa `revoke all ... from service_role`.
- Nota preesistente: `product_ai_suggestions` concede `arwdDxtm` ad `authenticated` (mitigato da RLS, da verificare).
- Per regola del gate: **Edge Functions NON deployate**, nessuno smoke, frontend non pubblicato, AI non chiamata, Shopify intatto, canary attivo.
- Stato: 2D BACKEND NOT LIVE — migration applicata, funzioni non distribuite.

## Fase 2D.4A — forward-fix ACL reservation e audit suggestion (01/10/2026)

### Causa e correzione minimale

La migration 2D.2 eseguiva un `GRANT SELECT, INSERT, UPDATE` a
`service_role`, ma PostgreSQL tratta `GRANT` in modo additivo. Al momento della
creazione, il default ACL live dello schema/owner aveva già assegnato
`arwdDxtm`; il grant ristretto non poteva rimuovere `DELETE`, `TRUNCATE`,
`REFERENCES`, `TRIGGER` e `MAINTAIN`.

La nuova migration incrementale
`20261001130202_restrict_product_admin_ai_reservation_privileges.sql` contiene
esclusivamente:

```sql
revoke all privileges
on table public.product_ai_generation_reservations
from public, anon, authenticated, service_role;

grant select, insert, update
on table public.product_ai_generation_reservations
to service_role;
```

Non modifica la migration 2D.2 già applicata, dati, owner, schema, RLS, policy,
indici, FK, RPC, `search_path`, execute ACL o default privileges. La seconda
applicazione offline produce lo stesso ACL, ma in produzione deve comunque
essere registrata e applicata una sola volta dal canale Lovable.

### ACL attesa dopo la forward migration

| Oggetto / ruolo | Privilegi attesi |
|---|---|
| reservation / `PUBLIC` | nessuno |
| reservation / `anon` | nessuno |
| reservation / `authenticated` | nessuno |
| reservation / `service_role` | `SELECT`, `INSERT`, `UPDATE` soltanto |
| RPC reservation / `service_role` | `EXECUTE`, invariato |
| RPC reservation / altri ruoli | nessuno, invariato |

Il runtime richiede esattamente questi tre privilegi: la RPC `SECURITY
INVOKER` legge e inserisce reservation; `product-admin-ai` risolve una
reservation con un update condizionale. Nessun codice runtime esegue delete,
truncate, reference o trigger management.

### Audit `product_ai_suggestions`

Audit repository `CODEX VERIFIED`:

- `product-admin-ai` esegue SELECT per lista/dettaglio, INSERT della proposta e
  UPDATE condizionale dello stato; non esegue DELETE o TRUNCATE;
- la RPC reservation esegue soltanto SELECT per riconoscere una pending ancora
  valida;
- Admin V2 invoca la Edge Function, senza accesso diretto browser alla tabella;
- AI Writer e pipeline legacy usano `products.ai_enrichment_json` e le tabelle
  enrichment, non `product_ai_suggestions`;
- non risultano dipendenze Shopify, import o Storage su questa tabella.

Classificazione rispetto all'ACL live riferita `authenticated = arwdDxtm`:

| Superficie | Classificazione | Motivo |
|---|---|---|
| SELECT authenticated | `SAFE_BY_RLS` | La policy limita la lettura a `can_edit_products(auth.uid())`. |
| INSERT/UPDATE/DELETE authenticated | `OVERPRIVILEGED_BUT_BLOCKED` | Non esistono policy write per `authenticated`; RLS nega le righe. |
| TRUNCATE/REFERENCES/TRIGGER authenticated | `ACTUAL_SECURITY_GAP` | RLS non governa questi privilegi; eventuali FK o limiti di schema sono difese incidentali, non il contratto autorizzativo. |
| Service role ALL | `LEGACY_DEPENDENCY_REQUIRES_REVIEW` | Il runtime osservato usa SIU, ma il grant storico esplicito è più ampio e va corretto in una migration separata approvata. |

La classificazione complessiva è quindi **ACTUAL_SECURITY_GAP**. La forward
migration 2D.4A non lo corregge perché il perimetro autorizzato è esclusivamente
la tabella reservation. Edge e frontend AI restano bloccati finché il preflight
live non conferma owner/policy/default ACL e non viene approvata una remediation
separata per `product_ai_suggestions`.

### Default ACL e preflight live

Il repository non contiene `ALTER DEFAULT PRIVILEGES`; la causa live è quindi
esterna alla migration Git. Il file read-only
`docs/fase2d/product-ai-privilege-audit-2D4A.sql` distingue:

- owner effettivo delle tabelle;
- ACL per-oggetto correnti;
- default ACL per owner e schema `public`;
- policy RLS, RPC, trigger e FK dipendenti.

Il connettore disponibile non autorizza l'accesso al project ref Online Garden:
Codex non ha eseguito il preflight live. Lovable deve eseguirlo prima
dell'applicazione. In questa fase non si esegue `ALTER DEFAULT PRIVILEGES`; il
rischio futuro resta che nuove tabelle ereditino privilegi ampi finché i default
ACL non saranno corretti in un task separato.

### Test offline 2D.4A

- PostgreSQL isolato: riprodotto default ACL ampio → migration 2D.2 → ACL
  `service_role` eccessivo → forward migration → solo SIU;
- dati reservation, RLS, indici, vincoli, funzione, function ACL e default ACL
  invariati;
- RPC ancora operativa e concorrenza invariata: 6 tentativi → 5 RESERVED + 1
  RATE_LIMITED; doppio target → 1 RESERVED + 1 GENERATION_IN_PROGRESS;
- seconda applicazione offline stabile;
- prova RLS: INSERT senza write policy negato, TRUNCATE su tabella-probe con
  grant esplicito consentito, confermando che RLS non copre quel privilegio;
- preflight read-only validato sintatticamente su PostgreSQL isolato;
- nessun accesso o modifica live, nessuna call AI, Shopify o deploy.

### Gate di rilascio

1. backup di ACL tabella/RPC e output del preflight read-only;
2. conferma owner e default ACL reali;
3. applicazione una sola volta della forward migration tramite Lovable;
4. verifica ACL esatta SIU e Drizzle registry senza editing manuale;
5. remediation separata di `product_ai_suggestions`;
6. soltanto dopo, deploy coordinato Edge Functions → frontend e smoke
   read-only; STOP prima di chiamate AI o scritture prodotto non autorizzate.

**2D.4A: FORWARD FIX RESERVATION MERGIATA; MIGRATION NON APPLICATA LIVE.**

## Fase 2D.4B — remediation ACL suggestion (01/10/2026)

- audit repository: il browser passa sempre da `product-admin-ai`; il service
  usa `SELECT`, `INSERT`, `UPDATE`; la RPC reservation usa soltanto `SELECT`;
  nessun flusso usa `DELETE`;
- target ACL: nessun privilegio a `PUBLIC`, `anon`, `authenticated`; soltanto
  `SELECT`, `INSERT`, `UPDATE` a `service_role`;
- policy `ai_suggestions_read` conservata e inattiva senza grant tabella;
- nuova migration forward-only
  `20261001131926_restrict_product_ai_suggestion_privileges.sql`;
- PostgreSQL isolato: test positivi/negativi e non-drift PASS;
- dettagli, rollout e rollback in
  `docs/fase2d/product-ai-suggestions-acl-2D4B.md`;
- migration live, deploy, AI live e write dati: **NON ESEGUITI**.

## Fase 2D.5 — Live ACL remediation (2026-10-02)

- main: `eee8f43d4bbcc5030f3ca152b347b688d37c68ef`
- 2D.4A `20261001130202_…` (sha256 `8b64dfdc…120ada`) applicata una volta → drizzle `0004`. Reservation: service_role = SELECT,INSERT,UPDATE; PUBLIC/anon/authenticated nessun privilegio; RLS ON; 3 indici, 7 vincoli, 0 righe; default ACL md5 `61e1d4c7…cf09a` invariato.
- 2D.4B `20261001131926_…` (sha256 `2a57fc58…69cd7d`) applicata una volta → drizzle `0005`. Suggestions: service_role = SELECT,INSERT,UPDATE; authenticated rimosso; RLS ON; policy `ai_suggestions_read` e 1 trigger invariati.
- Registro Drizzle: 4 → 6 entry.
- Conteggi prima = dopo: products 2.706, current values 24.467, history 5, command log 5, suggestions 0, reservation 0.
- Warning: ruoli piattaforma `sandbox_exec*` mantengono INSERT,SELECT (non gestiti dalla migration).
- Deploy Edge `product-admin-ai` + `product-admin-api`: **FALLITO al bundling, nulla distribuito**. Import cross-function (`product-admin-ai/index.ts` → `../product-admin-api/auth.ts`; `product-admin-api/capabilities.ts` → `../product-admin-ai/ai-core.ts`) non inclusi nel bundle. Online resta la `product-admin-api` precedente. Forward-fix richiesto: spostare i moduli condivisi in `supabase/functions/_shared/`.
- Smoke auth/capability/get_ai_suggestions: non eseguiti. Frontend non pubblicato, provider AI non chiamato, Shopify non toccato, canary attivo.

Stato: 2D.5 BACKEND LIVE — BLOCKED (deploy Edge).

## Fase 2D.6 — packaging indipendente Edge (02/10/2026)

Il deploy 2D.5 non ha distribuito alcuna funzione perché il pacchetto di ogni
Edge Function non comprende le cartelle sibling. Il grafo precedente conteneva
11 import cross-function: `product-admin-ai` dipendeva da auth, permission,
command, query, type e validation di `product-admin-api`; in senso inverso, le
capability Admin dipendevano da `product-admin-ai/ai-core.ts`.

Il fix 2D.6 rende autoritative in `supabase/functions/_shared/` le primitive
realmente condivise:

- `admin-v2-auth.ts`, distinto dal precedente `admin-auth.ts` legacy;
- `admin-v2-types.ts`, `admin-v2-permissions.ts`, `admin-v2-commands.ts`;
- `admin-v2-queries.ts`, `admin-v2-validation.ts`;
- `admin-ai-core.ts`, limitato a eligibility, strategie e validazione pura.

Provider, segreti, parsing provider e orchestrazione restano locali a
`product-admin-ai`; handler e serializer restano locali alla rispettiva
funzione. Le facade nei percorsi storici di `product-admin-api` conservano i
contratti di import e riesportano la stessa implementazione condivisa. Il grafo
ricorsivo di entrambi gli entrypoint risolve soltanto moduli propri, `_shared` e
dipendenze esterne: import sibling = zero.

Nessuna semantica di auth, ruoli Admin/Tech Admin, canary, capability,
idempotenza, replay, expectedVersion, lock, eligibility AI, rate limit o
isolamento Shopify è cambiata. Nessuna migration è stata aggiunta.

I ruoli tecnici live `sandbox_exec*` non sono nominati da alcuna migration del
repository. Senza evidenza read-only su membership, owner e default ACL live,
la classificazione resta `UNKNOWN_NEEDS_LIVE_VERIFICATION`: plausibilmente
platform-managed, ma non revocabili in questo task. Non costituiscono un
blocco del packaging in assenza di esposizione applicativa dimostrata.

Stato operativo: migration ACL live già applicate; Edge Functions e frontend
non pubblicati; AI non chiamata; nessuna write live.
