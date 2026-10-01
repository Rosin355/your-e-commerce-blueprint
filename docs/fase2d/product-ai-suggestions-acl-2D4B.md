# Fase 2D.4B — ACL `product_ai_suggestions`

Stato: **FIX FORWARD-ONLY PRONTA PER REVIEW — NON APPLICATA LIVE**

Baseline Git dopo il riallineamento 2D.4C:
`origin/main@85a895a6caaec391d5f760eb694f6e6b3811aa72`

Branch: `codex/admin-ai-suggestions-acl-fix`

Questa remediation è separata dalla PR #23, già mergiata con commit
`85a895a6caaec391d5f760eb694f6e6b3811aa72`, che restringe i privilegi della
tabella `product_ai_generation_reservations`. Non modifica runtime, frontend,
policy RLS, default privileges o migration già applicate.

## 1. Evidenza e rischio

Il preflight live della Fase 2D.4A ha riportato su
`public.product_ai_suggestions`:

- `authenticated = ALL`;
- `service_role = ALL`;
- RLS attiva;
- una sola policy `SELECT` per `authenticated` tramite
  `public.can_edit_products(auth.uid())`;
- nessuna policy `INSERT`, `UPDATE` o `DELETE`.

La policy rende la lettura compatibile con RLS e impedisce le write di riga
senza policy, ma non riduce l'ACL. In particolare `TRUNCATE`, `REFERENCES` e
`TRIGGER` non sono operazioni row-level e non vengono governate dalle policy
RLS. L'ACL `ALL` costituisce quindi un rischio reale anche quando i DML di riga
sono respinti.

La migration storica del repository prevedeva `SELECT` per `authenticated` e
`ALL` per `service_role`; il grant live più ampio di `authenticated` è evidenza
Lovable, non una condizione ricostruita da Codex sul database di produzione.

## 2. Audit delle dipendenze

| Categoria | Chiamante | Ruolo database | Operazioni richieste | Escluse |
|---|---|---|---|---|
| Browser Admin V2 | `src/adminv2/lib/adminApi.ts` | nessun accesso tabella diretto | invoca `product-admin-ai` con JWT | tutte le operazioni SQL dirette |
| Edge Function | `product-admin-ai/service.ts` | `service_role` dopo autenticazione server-side | `SELECT`, `INSERT`, `UPDATE` | `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` |
| RPC reservation | `reserve_product_ai_generation(...)` | `service_role`, `SECURITY INVOKER` | `SELECT` per verificare una suggestion pending | tutte le write sulla tabella suggestion |
| `product-admin-api` | capability e comando di accept | `service_role` | nessuna query diretta alla tabella; la suggestion è gestita dal service AI | tutte |
| AI Writer legacy | `products.ai_enrichment_json` e pipeline enrichment | servizi legacy separati | nessuna | tutte |
| Shopify/import/Storage | pipeline separate | ruoli separati | nessuna | tutte |
| Test e docs | fixture/static analysis | PostgreSQL isolato | nessuna dipendenza live | tutte |

Flussi verificati nel service AI:

- lista pending e lookup per id: `SELECT`;
- generazione: `INSERT ... RETURNING`, quindi `INSERT` e `SELECT`;
- reject, stale/superseded e accept finale: `UPDATE ... RETURNING`, quindi
  `UPDATE` e `SELECT`;
- nessun ramo esegue `DELETE`.

Il browser usa sempre le Edge Functions `product-admin-ai` e
`product-admin-api`; il client Supabase autenticato non interroga direttamente
`product_ai_suggestions`. Non esiste quindi una dipendenza runtime che richieda
un grant a `authenticated`.

## 3. Policy conservate

Stato previsto dal repository e verificato nella fixture isolata:

| Proprietà | Valore |
|---|---|
| RLS | enabled |
| FORCE RLS | no |
| `ai_suggestions_read` | permissive, `FOR SELECT`, `TO authenticated` |
| `USING` | `public.can_edit_products(auth.uid())` |
| `WITH CHECK` | assente |
| policy INSERT/UPDATE/DELETE | assenti |

La policy SELECT viene deliberatamente conservata. Dopo la revoca dell'ACL a
`authenticated` resta inattiva perché PostgreSQL richiede sia il privilegio
tabella sia una policy applicabile. Non la si rimuove in questo task per evitare
di mescolare hardening ACL e modifica del modello RLS; una futura eliminazione
richiederà un audit dedicato.

## 4. ACL target e migration

Target minimo:

| Ruolo | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER | MAINTAIN |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `PUBLIC` | no | no | no | no | no | no | no | no |
| `anon` | no | no | no | no | no | no | no | no |
| `authenticated` | no | no | no | no | no | no | no | no |
| `service_role` | sì | sì | sì | no | no | no | no | no |

Migration forward-only:

`supabase/migrations/20261001131926_restrict_product_ai_suggestion_privileges.sql`

La migration:

1. revoca tutti i privilegi per-oggetto da `PUBLIC`, `anon`, `authenticated` e
   `service_role`;
2. concede di nuovo soltanto `SELECT`, `INSERT`, `UPDATE` a `service_role`.

Non cambia default ACL globali, schema, dati, RLS, policy, trigger, indici, FK o
RPC. La seconda applicazione nella fixture isolata converge allo stesso ACL;
in produzione deve comunque essere applicata e registrata una sola volta.

## 5. Test offline

Il runner `scripts/test-product-ai-suggestions-acl.mjs` crea un PostgreSQL 16
effimero, riproduce `authenticated=ALL` e `service_role=ALL`, applica la
migration e verifica:

- ACL finale esatto: nessun grant a `PUBLIC`/`anon`/`authenticated`, SIU al
  solo `service_role`;
- `authenticated`: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`,
  `REFERENCES` e `TRIGGER` tutti negati;
- `service_role`: lettura, insert e update consentiti; delete e truncate
  negati;
- `reserve_product_ai_generation(...)` continua a leggere la suggestion e a
  riservare lo slot;
- dati, colonne, RLS/FORCE, policy, indici, FK, trigger, RPC e default ACL
  identici prima e dopo;
- seconda applicazione offline stabile.

I test AI statici verificano anche che il service contenga soltanto i quattro
accessi attesi e nessuna `.delete()`. Dopo l'integrazione della PR #23, i titoli
numerati arrivano a 36 perché due test storici accorpano più requisiti; i casi
`node:test` effettivi sono **34**.

## 6. Rollout controllato

Ordine minimo raccomandato:

1. verificare la PR #23 già mergiata, senza applicarne la migration live;
2. revisionare e mergiare questa PR separata;
3. eseguire backup definizioni/ACL e preflight read-only Lovable;
4. applicare una sola volta la migration reservation della PR #23 e verificarne
   il registro;
5. applicare una sola volta la migration 2D.4B e verificare ACL esatto, policy e
   registro;
6. solo dopo entrambi i gate, distribuire `product-admin-ai` e
   `product-admin-api` dalla stessa revisione;
7. eseguire smoke read-only, pubblicare il frontend coordinato e fermarsi prima
   di qualsiasi generazione/accept non autorizzata.

La migration 2D.2 di concorrenza risulta già applicata una volta secondo il
report Lovable 2D.4A; non deve essere riapplicata.

## 7. Rollback sicuro

La revoca ad `authenticated` non richiede rollback per il frontend perché il
browser non usa la tabella direttamente. In caso di regressione:

1. fermare il rollout Edge/frontend e mantenere il canary;
2. identificare l'operazione mancante tramite log server-side e test read-only;
3. introdurre, solo se dimostrato necessario, una nuova migration forward che
   conceda il singolo privilegio al singolo ruolo;
4. non ripristinare `ALL`, non riaprire
   `TRUNCATE`/`REFERENCES`/`TRIGGER`/`MAINTAIN` e non rimuovere RLS.

Il rollback applicativo può ripristinare le Edge Functions precedenti senza
toccare l'ACL. Nessuna cancellazione di suggestion o reservation è richiesta.

## 8. Checklist per i ruoli di progetto

### Developer

- controllare hash e registro delle migration senza manipolazioni manuali;
- verificare ACL effettivo e assenza di default ACL ereditati;
- distribuire Edge Functions e frontend solo in modo coordinato;
- non usare `service_role` nel browser.

### Designer / Admin UX

- nessun cambiamento visuale previsto;
- errori di autorizzazione durante lista/generate/reject/accept bloccano il
  rollout e non vanno aggirati con accesso diretto alla tabella.

### Cliente

- nessuna proposta AI viene generata in questa fase;
- nessun valore prodotto, Shopify o storefront viene modificato;
- il canary resta attivo fino allo smoke approvato.

## 9. Limiti

- migration live: **NON APPLICATA**;
- deploy Edge/frontend: **NON ESEGUITO**;
- AI live: **NON CHIAMATA**;
- database live e dati: **NON TOCCATI**;
- Shopify, inventory, Smart Sync e storefront: **NON TOCCATI**.
