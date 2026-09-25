# Fase 2C.0 — Accessi alle tabelle legacy di arricchimento

Data: 25 settembre 2026. Stato: finalizzata e verificata per PR; applicazione
live subordinata a preflight e approvazione separata.

Branch: `codex/admin-legacy-security`.
Worktree: `/private/tmp/online-garden-admin-legacy-security`.
Baseline dopo fetch: `origin/main@767c32d0211bf47ae9c470a14f0f86ebe6d35ba8`.

## 1. Esito e provenienza delle verifiche

Le due tabelle segnalate in `docs/fase2b/publish-frontend-2B6.md:12` sono
esattamente `public.product_enrichment_runs` e
`public.product_enrichment_run_items`. Sono storico tecnico di arricchimento,
non le schede canoniche `products` né i current values.

La migration versionata consente a ogni sessione `authenticated` di leggere,
inserire e aggiornare tutte le righe. Non serve il ruolo applicativo Admin.
La proposta chiude l'accesso SQL/Data API diretto e conserva il percorso
esistente Admin → `enrichment-run` → `service_role`.

**Codex ha verificato direttamente** il codice dell'ultimo main, la migration
versionata, i chiamanti, la proposta su PostgreSQL isolato e la suite applicativa.
**Lovable ha riferito** i finding live e i precedenti smoke test nel report 2B.6.
In questa fase non è stato interrogato il database live: ACL, membership, policy,
viste, funzioni e deployment effettivi richiedono il preflight prima di applicare
la proposta. Un risultato locale positivo non certifica assenza di drift live.

Artefatti:

- `supabase/migrations/20260925075756_restrict_legacy_enrichment_access.sql`:
  unica transazione finale, generata localmente con `supabase migration new`;
- `legacy-enrichment-security-preflight.sql`: sole query ai cataloghi di sistema;
- `scripts/test-legacy-enrichment-security.mjs`: runner PostgreSQL riproducibile,
  che applica esattamente il file migration finale;
- `scripts/tests/enrichment-run-security.test.ts`: nove test dell'handler reale
  con client/service e autorizzazione mockati, senza rete.

Non sono cambiati comportamento runtime, schema dati, RPC atomica, feature flag,
modalità canary/full, import, AI o Shopify. La sola modifica TypeScript in
`enrichment-run` annota il tipo degli item per risolvere due errori Deno
preesistenti; il JavaScript emesso è identico alla baseline. Commit e PR sono
autorizzati per la consegna; nessun merge o deploy è eseguito.

## 2. Finding prioritari

### LEGACY-001 — Critico: run accessibili a tutti gli utenti autenticati

Evidenza: `supabase/migrations/20260611195412_a1b0efb5-e810-4558-ae48-ff1e6ea33e07.sql:15`
concede SELECT/INSERT/UPDATE/DELETE ad `authenticated`; le righe 19–24 definiscono
SELECT `USING (true)`, INSERT `WITH CHECK (true)` e UPDATE con entrambe le
espressioni `true`.

Impatto: un normale account può leggere identità iniziatore/note/stato delle
run e alterarne stato, contatori o contenuto; il controllo Admin della UI/Edge
Function non protegge l'accesso diretto alle tabelle.

Correzione proposta: revoca dei privilegi client e rimozione delle tre policy,
mantenendo RLS abilitata e `service_role` invariato.

### LEGACY-002 — Critico: dettagli run accessibili a tutti gli autenticati

Evidenza: stessa migration, righe 46–55, stessi grant e policy su
`product_enrichment_run_items`.

Impatto: lettura e alterazione di SKU, errori e `metafields_report` di altre run,
con perdita di affidabilità dello storico tecnico. Non equivale di per sé a
scrivere `products` o ad attivare Shopify: le due tabelle sono distinte.

Correzione proposta: identica a LEGACY-001, limitata a questa seconda tabella.

Per entrambi i finding, la gravità critica riprende il report Lovable ed è
sostenuta dalla riproduzione locale dell'accesso autenticato indiscriminato.
Non è stata dimostrata una lettura anonima live: la baseline non contiene
policy per `anon`. Default grant e stato reale vanno verificati, non dedotti.

## 3. Matrice RLS/GRANT

Vale per entrambe le tabelle. La colonna baseline descrive la migration
versionata, non un nuovo inventario live.

| Identità/canale | Baseline | Dopo proposta |
|---|---|---|
| `anon` diretto | nessun grant esplicito; nessuna policy applicabile | nessun privilegio effettivo, accesso negato |
| `authenticated`, utente normale | SELECT/INSERT/UPDATE su tutte le righe | SELECT/INSERT/UPDATE/DELETE negati con SQLSTATE 42501 |
| Admin con JWT utente, diretto | come ogni `authenticated` | negato: Admin è un ruolo applicativo, non un ruolo PostgreSQL separato |
| Admin tramite `enrichment-run` | ammesso dopo verifica JWT + `user_roles.role=admin` | ammesso attraverso lo stesso client server `service_role` |
| `service_role` | GRANT ALL; BYPASSRLS atteso dalla piattaforma | grant e attributi invariati; SELECT/INSERT/UPDATE/DELETE consentiti |
| proprietario/superuser DB | privilegi amministrativi PostgreSQL | invariati, non sono identità client |

`DELETE` merita una distinzione: è concesso dalla ACL baseline, ma non esiste
una policy DELETE; i test restituiscono `DELETE 0`. La correzione revoca anche
quel grant. `TRUNCATE`, `REFERENCES` e `TRIGGER` non sono operazioni protette
allo stesso modo dalla RLS: la proposta revoca **tutti** i privilegi client
sulle due tabelle e verifica tutti e sette i privilegi tabella.

La revoca da `PUBLIC` evita accessi ereditati dal ruolo pubblico; non modifica
default privileges globali, privilegi sullo schema o altre tabelle.
Non viene introdotta una policy `has_role(...)`: i chiamanti correnti non
necessitano di accesso diretto Admin al DB. Nessun nuovo ruolo DB, helper
SECURITY DEFINER o dipendenza da claim `user_metadata`.

## 4. Inventario delle dipendenze

Ricerca repository completa per i due nomi tabella e per `enrichment-run`,
con verifica dei moduli condivisi e dei chiamanti frontend. È emersa **una sola
Edge Function con dipendenza diretta**: `enrichment-run`.

| Componente | Accesso alle due tabelle / conseguenza |
|---|---|
| `enrichment-run/index.ts:16` | client separato con service key, nessun JWT utente inoltrato come Authorization |
| `enrichment-run/index.ts:60` | `await assertAdminRequest(req)` precede ogni action e l'accesso DB |
| action `start` (riga 78) | INSERT run e items; SELECT della run creata |
| `update_item` (riga 117) | UPDATE item, SELECT stati, UPDATE contatori run |
| `finish` (riga 147) | UPDATE stato run |
| `get_open_run` (riga 159) | SELECT run per iniziatore e items della run |
| `get_run` (riga 177) | SELECT run/items per ID; accesso a tutte le run per Admin già previsto |
| `get_catalog_status` (riga 193) | legge `product_sync_csv_products`, non le due tabelle |
| `_shared/admin-auth.ts:12` | verifica utente con `auth.getUser()`, poi lookup server-side `user_roles` (righe 37–41) |
| `src/admin/lib/aiWriterEngine.ts:275` | invoca esclusivamente `enrichment-run` per persistenza/stato run |
| `src/admin/hooks/useProductEnrichment.ts` | chiama start/update/finish/resume tramite il wrapper; nessuna query diretta alle due tabelle |
| `EnrichmentCatalogStatus.tsx:59`, `ProductEnrichmentPanel.tsx` | dashboard legacy tramite wrapper/API, percorso conservato |
| `product-admin-api` / Admin V2 | legge `products` e tabelle lossless; nessuna dipendenza dalle due tabelle |
| `shopify-admin-proxy` | dipendenza funzionale dal pannello (draft/metafield); usa `product_ai_drafts` e `product_sync_csv_products`, non run/items |
| `create-product-ai`, `ai-enrich-products` | percorsi AI nel flusso legacy, nessun riferimento alle due tabelle |
| `start-product-sync`, `process-product-sync`, `get-product-sync-dashboard` e moduli `_shared/job-repo.ts`, `_shared/product-catalog-repo.ts` | job/import/catalogo su altre tabelle; nessun grant modificato dalla proposta |
| `woo-enrichment-pipeline` | storage/pipeline_jobs, nessuna dipendenza dalle due tabelle |
| `export-shopify-native-csv`, `export-complete-products-csv`, `export-enriched-csv` | leggono il catalogo CSV, non run/items |
| `src/integrations/supabase/types.ts:615` | tipi generati, nessuna operazione runtime |
| `scripts/backup-catalog.mjs:31,77` | legge le due tabelle con publishable key: dopo hardening l'accesso è esplicitamente negato |

La funzione legacy ammette esclusivamente `user_roles.role='admin'`.
Un utente con solo `tech_admin` o `editor` Admin V2 non acquisisce accesso al
legacy per effetto di questa modifica. La policy applicativa esistente resta
invariata; non viene promessa una nuova compatibilità tra sistemi di ruoli.

Il vecchio script di backup non è un canale amministrativo affidabile: nella
baseline RLS senza policy anon potrebbe già restituire zero righe o un errore,
a seconda dei grant di piattaforma. Non viene mantenuta un'eccezione pubblica
per farlo funzionare. Per il backup utilizzare un export amministrativo già
autorizzato e privato; non introdurre service key nel frontend o nel report.

Le dipendenze SQL/views/RPC aggiunte live e non versionate non sono verificabili
dal solo codice. Il preflight include `pg_depend`, sorgenti delle funzioni,
viste e pubblicazioni Realtime. Gli eventuali risultati inattesi sono un gate.

## 5. Correzione minima e controlli di drift

Le uniche modifiche effettive della proposta sono la revoca dei grant client sulle
due tabelle e la rimozione nominativa delle sei policy legacy. RLS resta
abilitata senza policy client (default deny); il backend conserva BYPASSRLS.

La transazione acquisisce i lock sulle due tabelle con `lock_timeout=5s`.
Se le tabelle sono occupate il rilascio deve essere riprogrammato, senza
aumentare arbitrariamente il timeout. Nessuna riga viene aggiornata.

Prima delle modifiche si controllano RLS, permessi service, policy note con
espressioni/ruoli attesi e ACL di colonna client. Dopo la revoca si verificano
privilegi effettivi tabella/colonna e attributi per anon/authenticated e il
mantenimento del CRUD service. Policy sconosciute, grant ereditati residui,
ACL di colonna o perdita del canale service fanno fallire atomicamente la
transazione. La seconda applicazione sulla configurazione già corretta è
idempotente. Nessun `CASCADE` nei REVOKE/DROP POLICY.

`service_role` rimane un'identità privilegiata: RLS non sostituisce i controlli
nelle Edge Functions. La verifica dell'helper reale usa mock offline e non
invia richieste a Supabase.

## 6. Test riproducibili e risultati

Comando: `node scripts/test-legacy-enrichment-security.mjs` dopo `npm ci`.
Requisiti: Node/TypeScript del lockfile e `initdb`, `pg_ctl`, `psql` nel PATH.

Il runner crea un cluster PostgreSQL nuovo con socket Unix in directory privata,
TCP disabilitato, ruoli sintetici e la migration originale delle due tabelle.
Non legge `.env`, non accetta URL DB e rimuove le variabili `PG*` ereditate.
Le sole fixture sono inventate; il cluster viene arrestato nel `finally`.
I file temporanei sintetici sono conservati fuori dal repository.

| Verifica | Esito |
|---|---|
| installazione `npm ci` | PASS, 386 pacchetti |
| PostgreSQL 16.15 reale isolato | PASS, 68 verifiche |
| handler `enrichment-run` offline | PASS, 9/9: sei action usano client service senza JWT utente, auth negativa/pendente non crea client |
| `deno check` enrichment-run e product-admin-api | PASS |
| riproduzione vulnerabilità baseline | SELECT/INSERT/UPDATE authenticated consentiti su entrambe; DELETE 0 |
| anon, utente, Admin diretto, claim admin falsificato | tutte le quattro operazioni negate su entrambe le tabelle |
| service_role | tutte le quattro operazioni consentite su entrambe |
| workflow run | start/item update/counters/finish/read e cascade parent-items conservati |
| integrità | digest JSON dati sintetici invariato; colonne/FK/indici/trigger invariati; UNIQUE/FK effettivi |
| idempotenza e rollback | PASS; ACL e policy originali ripristinate da ROLLBACK |
| drift | policy ignota/modificata, ACL colonna, grant ereditati, service grant/BYPASSRLS e RLS mancanti causano abort |
| helper auth reale con mock offline | header assente, JWT invalido, utente non Admin, errore ruoli negati; Admin da DB consentito |
| `npm run typecheck` | PASS |
| `npm run test:catalog` | PASS, 62/62 (53 esistenti + 9 enrichment) |
| `npm run build` | PASS, 1.907 moduli |
| `git diff --check` e verifica whitespace dei nuovi file | PASS |

Il primo avvio PostgreSQL è stato bloccato dal sandbox sulla memoria condivisa;
il test autorizzato fuori sandbox ha usato comunque solo il cluster locale.
Durante lo sviluppo il caso ACL di colonna ha evidenziato che REVOKE ALL può
rimuoverla: è stato aggiunto un controllo preventivo per fermarsi sul drift,
poi la suite è stata rieseguita integralmente.

Warning build preesistenti: classi Tailwind arbitrarie ambigue e chunk >500 kB.
I test non sono smoke HTTP live: non è stata eseguita AI, import, Shopify o una
scrittura prodotto. Compatibilità SQL provata; collaudo integrato live ancora
da eseguire, dopo approvazione, con sole letture.

## 7. Rollback

Prima dell'applicazione approvata acquisire un backup privato verificato e
salvare ACL, policy, owner, attributi RLS e definizioni delle dipendenze.
Il preflight da solo è un inventario, non un backup dei dati.

- **Prima del COMMIT:** qualsiasi errore, drift o timeout deve terminare con
  ROLLBACK. Il test locale prova il ripristino esatto di ACL/policy e dati.
- **Dopo il COMMIT:** nessun rollback dati è necessario, perché il change non
  modifica righe o strutture. In caso di errore del backend verificare prima
  credenziale server, ruolo e deployment; non restituire accesso pubblico.
- **Ripristino esatto degli accessi precedenti:** richiedere un'approvazione
  specifica perché ricrea la vulnerabilità. Usare esclusivamente DDL inverso
  ricostruito dall'inventario live salvato; non rieseguire la migration CREATE
  TABLE originale e non assumere che la baseline Git sia identica al live.
  Eventuali interfacce legacy dipendenti da query dirette vanno sospese durante
  il ripristino e corrette verso il canale Admin prima della riapertura.
- **Recupero preferito:** una correzione mirata del canale server autorizzato,
  mantenendo chiuso l'accesso client alle due tabelle. Niente RLS disabilitata,
  GRANT ALL a PUBLIC o policy `true` usate come workaround.

## 8. Checklist Lovable prima del rilascio

- [ ] approvazione del presente SQL e del modello Admin via Edge Function;
- [ ] nuovo fetch e confronto con la baseline `767c32d`; riesame se il perimetro cambia;
- [ ] eseguire `legacy-enrichment-security-preflight.sql` tramite canale autorizzato;
- [ ] confrontare le sei policy, ACL, RLS, membership e BYPASSRLS con la proposta;
- [ ] verificare assenza di grant indiretti, viste/RPC SECURITY DEFINER o funzioni
  non versionate che espongano le due tabelle; fermarsi in caso di differenze;
- [ ] verificare sorgente distribuita `enrichment-run`: autenticazione attesa con
  `await`, lookup Admin sul DB, client service separato senza JWT utente;
- [ ] confermare che dashboard/import usino il wrapper e non query dirette;
- [ ] backup amministrativo privato verificato, inventario ACL/policy salvato e
  conteggi/impronte pre-change senza esportare dati in Git;
- [ ] riesaminare la migration finale presente nella PR e applicarla tramite il
  normale processo approvato una sola volta; nessuna manipolazione manuale del registro;
- [ ] verificare se merge/sync Lovable attivano applicazioni automatiche della
  migration: trattenere il merge finché preflight, backup e finestra sono approvati;
- [ ] applicare nella finestra approvata la sola transazione, senza deploy AI,
  Shopify, frontend o cambio modalità full;
- [ ] ripetere il preflight e confrontare impronte/conteggi dei dati;
- [ ] test Data API read-only anon e utente normale: nessun dato accessibile;
- [ ] test Admin read-only `get_open_run`, `get_run` su ID autorizzato e
  `get_catalog_status`; pannello legacy e Admin V2/OG_393883 caricabili;
- [ ] confermare i cinque manuali locked e modalità canary invariati;
- [ ] collaudo delle scritture solo su fixture in staging autorizzato, non su
  prodotti reali: non avviare AI/import/publish per verificare la RLS;
- [ ] aggiornare lo stato cliente e chiudere i due finding solo dopo evidenze live.

## 9. Rilievo separato emerso dalle dipendenze

**LEGACY-003 — Alto, distinto dalla correzione delle due tabelle:**
`start-product-sync/index.ts:25`, `process-product-sync/index.ts:14` e
`get-product-sync-dashboard/index.ts:16` chiamano l'helper asincrono
`assertAdminRequest` senza `await`. La chiamata al repository privilegiato può
quindi procedere prima della decisione di autorizzazione e la rejection non è
gestita dal try/catch sincrono. I moduli condivisi usano service_role.

Non è stato tentato uno sfruttamento live; le eventuali protezioni del gateway
e i deployment correnti non sono verificati. Questi endpoint lavorano su altre
tabelle e non sono protetti dalla migration presente. La correzione è stata
preparata nel branch indipendente `codex/admin-async-auth`: tre await e test
degli handler per anon/non Admin/Admin, Promise pendenti e rifiutate. I due
interventi hanno PR distinte e non richiedono l'uno il merge dell'altro.

## 10. Stato cliente e fonti

Correzione finalizzata per PR, provata su dati sintetici. Il sito e i prodotti
non sono stati modificati. Prima dell'applicazione occorrono approvazione e
confronto del preflight con lo schema live; dopo, smoke test amministrativi
read-only. Non dichiarare i finding live risolti prima di tale passaggio.

Le skill Supabase/PostgreSQL e di revisione sicurezza hanno guidato la verifica
distinta di GRANT e RLS, la conservazione del canale server e i test per ruolo.
Changelog Supabase consultato: il cambiamento sull'esposizione automatica delle
tabelle non permette di dedurre i grant di un progetto esistente.

Fonti primarie:

- [PostgreSQL 16 — Row security](https://www.postgresql.org/docs/16/ddl-rowsecurity.html):
  RLS default deny, privilegi separati e BYPASSRLS;
- [Supabase — RLS](https://supabase.com/docs/guides/database/postgres/row-level-security):
  anon/authenticated, client service e policy;
- [Supabase changelog](https://supabase.com/changelog): verifica aggiornamenti.
