# Fase 2C.1 — salvataggi manuali protetti, backend

Data: 26 settembre 2026. Stato: implementazione locale verificata, pronta per
review. Nessuna migration o scrittura live, nessun deploy, import, AI, Shopify
sync o cambio della modalità canary/full.

Baseline: `origin/main@3fca5af8067dd8032f1ad4775e3f634de7af45ad`.
Branch: `codex/admin-manual-locked-backend`.

## Obiettivo e perimetro

La modifica consente a un Admin o Tech Admin autorizzato di salvare
manualmente un campo `manual_only=true` anche quando il current value è
`is_locked=true`. Il lock non viene rimosso: dopo il salvataggio resta `true`,
così re-import, AI, editor e canali non autorizzati continuano a non poter
sovrascrivere il valore.

È supportata anche la creazione atomica del current value quando il registry
definisce il campo ma la riga non esiste. La creazione richiede
`expectedVersion=0`; una riga esistente parte da versione 1 e continua a usare
la concorrenza ottimistica precedente.

Non cambiano pipeline Smart Sync, Storage, storefront, Shopify, AI, schema
delle tabelle, dati esistenti, RLS o privilegi. Originali WordPress e snapshot
sorgente restano in sola lettura.

## Contratto backend

### Autorizzazione

L'Edge Function continua a verificare JWT e ruoli tramite `user_roles`. La
capability speciale per un valore locked o mancante è vera solo per
`admin`/`tech_admin` e solo quando la definizione è `manual_only`, visibile,
editabile, applicabile al tipo prodotto e ammessa dal write gate corrente.

La RPC verifica nuovamente il ruolo dell'attore in `user_roles`; non accetta
ruoli o flag di override dal payload. La firma SQL precedente resta identica e
`EXECUTE` resta revocato a `PUBLIC`, `anon` e `authenticated`, con accesso solo
al `service_role` usato dalla Edge Function.

### Update di un valore esistente

- `expectedVersion` deve coincidere con la versione corrente;
- un lock non manuale resta sempre bloccante;
- un lock `manual_only` è superabile solo da Admin/Tech Admin e solo per
  `update_field` o, fuori dalla canary corrente, `clear_field` confermato;
- `is_locked` non viene modificato;
- `source_snapshot_id`, `source_batch_id` e riferimenti originali non vengono
  aggiornati;
- il valore diventa `origin/value_origin = manual`, `approved`, protetto dal
  re-import e incrementa la versione di uno;
- storico e command log sono inseriti nella stessa transazione.

### Creazione di un valore mancante

- ammessa soltanto per `update_field`, `manual_only`, Admin/Tech Admin;
- richiede `expectedVersion=0`;
- applica `applies_to` a `simple`, `variable` e `variation` anche nella RPC;
- deriva SKU, tipo e parent dal prodotto canonico, mai dal client;
- crea versione 1, `is_locked=true`, `protected_on_reimport=true`, origine
  manuale e review approvata;
- `source_snapshot_id` e `source_batch_id` restano `NULL`: nessun collegamento
  sorgente viene inventato;
- lo storico registra `previous_value=NULL`, `previous_version=0` e
  `new_version=1`.

Una race sulla creazione usa il vincolo `(product_id, field_key)` e restituisce
`VERSION_CONFLICT`; non sovrascrive la riga vincente.

### Idempotenza

L'hash applicativo canonicalizza ricorsivamente tutte le chiavi degli oggetti.
L'ordine degli array è preservato perché significativo per FAQ e liste. Due
payload strutturalmente identici con chiavi annidate in ordine diverso hanno lo
stesso hash; un retry con la stessa chiave e payload restituisce il risultato
registrato senza nuova versione o history. Stessa chiave e payload diverso
restituisce `IDEMPOTENCY_CONFLICT`.

## Matrice permessi

| Canale / ruolo | Valore manual_only locked | Valore manual_only mancante | Campo locked non manuale | Originali/snapshot |
|---|---|---|---|---|
| anon | negato prima del DB | negato | negato | sola lettura non disponibile |
| authenticated senza ruolo Admin V2 | negato | negato | negato | nessuna scrittura |
| editor, modalità full | negato se locked | negato | negato | nessuna scrittura |
| publisher | negato | negato | negato | nessuna scrittura |
| Admin / Tech Admin con write gate attivo | update manuale consentito | create con versione 0 | negato | invariati |
| re-import | lock/protezione invariati | nessun uso di questa RPC | bloccato | nessuna modifica |
| AI | `manual_only` mantiene AI disabilitata | nessun uso di questa RPC | bloccato | nessuna modifica |
| service_role diretto | identità tecnica privilegiata, non esposta ai client | idem | idem | uso operativo vietato fuori Edge Function |

La modalità canary resta invariata: `clear_field` non è abilitato; sono ammessi
solo i command e campi già previsti. La migration non attiva scritture: servono
ancora `PRODUCT_ADMIN_WRITES_ENABLED=true` e il ruolo previsto.

## Migration proposta

`20260926150609_allow_admin_manual_locked_field_edits.sql` sostituisce con
`CREATE OR REPLACE FUNCTION` la sola RPC atomica, mantenendone firma, modello
`SECURITY DEFINER`, `search_path=''` e privilegi. Non contiene `UPDATE`,
backfill, nuove colonne, drop o modifiche RLS.

Il file è stato creato tramite `supabase migration new` come richiesto dal
workflow Supabase. Il preflight read-only
`admin-manual-locked-preflight-2C1.sql` controlla firma, owner, privilegi,
drift del registry/manual lock, lineage nullable, valori mancanti aggregati e
assenza di grant diretti ai client.

Il changelog Supabase del 25 settembre 2026 segnala un aggiornamento PostgreSQL
15.19/17.11; i breaking change elencati riguardano `ltree`, cifrari legacy di
`pgcrypto`, indici `btree_gist` su float e operatori custom. Questa migration
non usa tali funzionalità. Va comunque rilevata la versione live nel preflight.

## Test locali

Ambiente PostgreSQL: cluster effimero reale, socket Unix privato, TCP
disabilitato, ruoli e fixture esclusivamente sintetici. Il runner non legge
`.env` e non accetta URL database.

| Verifica | Esito |
|---|---|
| RPC anon/authenticated diretta | PASS, permission denied |
| Admin modifica manual_only locked | PASS; versione incrementata, lock e lineage conservati |
| editor/non Admin su manual lock | PASS, `FIELD_NOT_EDITABLE` |
| locked non manuale | PASS, bloccato |
| azioni AI/import sulla RPC | PASS, non ammesse |
| creazione valore mancante | PASS solo Admin/Tech Admin + versione 0 |
| conflitto expectedVersion | PASS, nessun overwrite/history |
| retry idempotente | PASS, una sola history e versione invariata |
| hash JSON ricorsivo | PASS, oggetti annidati canonicalizzati |
| FAQ canonica / precedente legacy opaco | PASS, precedente conservato nello storico |
| errore history | PASS, rollback di current value e command log |
| seconda applicazione migration | PASS, funzione/privilegi/schema invariati |
| `npm ci` | PASS, 386 pacchetti dal lockfile |
| `deno check product-admin-api` | PASS |
| `npm run test:catalog` | PASS, 204/204 |
| `npm run typecheck` | PASS |
| `npm run build` | PASS, 1.908 moduli; soli warning preesistenti Tailwind/chunk |
| `git diff --check` | PASS |

Comando PostgreSQL riproducibile:

```text
node scripts/test-admin-manual-locked-backend.mjs
```

## Piano di rilascio

1. Fetch e verifica che `main` non abbia cambi concorrenti su RPC,
   `product-admin-api`, registry o Admin V2.
2. Eseguire il preflight read-only tramite il canale Lovable autorizzato;
   fermarsi per firma/ACL/registry o funzione live differenti.
3. Salvare backup privato verificato di definizione RPC, privilegi e sole
   righe interessate al collaudo; non inserire dati nel repository.
4. Applicare una sola volta la migration tramite il normale registro Lovable;
   non eseguire manualmente `CREATE OR REPLACE` fuori dal processo migration.
5. Distribuire `product-admin-api` dalla stessa revisione della migration.
   La migration prima dell'Edge Function è retrocompatibile con il backend
   precedente; il backend nuovo prima della migration esporrebbe capability
   che la vecchia RPC rifiuta e va evitato.
6. Mantenere la modalità canary. Smoke test su prodotto/fixture approvato, non
   su dati cliente senza autorizzazione: read, validate, update locked manual,
   retry identico e conflitto stale.
7. Verificare history, versione, lock, lineage e assenza di cambi su snapshot,
   import, AI, Shopify e storefront.

## Rollback

- Prima del commit migration: qualsiasi drift o test fallito implica stop e
  rollback della transazione.
- Dopo migration ma prima del deploy Edge: la RPC nuova è retrocompatibile;
  mantenere il backend precedente e investigare.
- Dopo deploy: rollback coordinato della Edge Function e ripristino della
  precedente definizione RPC da backup, tramite una nuova migration approvata.
  Non cancellare history o command log e non abbassare versioni.
- Un salvataggio manuale già riuscito è un dato utente valido: non va annullato
  automaticamente. Eventuale ripristino usa un nuovo command versionato e
  approvato, mai un update diretto.

## Checklist sviluppatore

- [ ] confrontare funzione e ACL live con il preflight;
- [ ] confermare `manual_only` senza drift `ai_allowed`/re-import;
- [ ] backup privato e rollback SQL revisionati;
- [ ] migration registrata una sola volta;
- [ ] deploy Edge dalla stessa revisione, migration-first;
- [ ] canary e feature flag invariati;
- [ ] smoke test expectedVersion 0/N, replay e conflitto;
- [ ] nessuna scrittura diretta dal browser o service key nel frontend.

## Checklist designer

- [ ] mostrare “protetto da import/AI” senza presentarlo come sola lettura per Admin;
- [ ] per riga mancante inviare versione 0 e indicare che si sta creando il valore;
- [ ] su 409 mostrare valore/versione corrente e richiedere ricarica esplicita;
- [ ] non offrire azioni su campi strutturali o non applicabili;
- [ ] mantenere FAQ legacy opache in sola lettura finché l'utente non sceglie
  consapevolmente di sostituirle con il formato canonico.

## Checklist cliente

- [ ] approvare migration e deploy coordinato;
- [ ] scegliere prodotto/fixture e campo manuale per lo smoke test;
- [ ] confermare che nome comune, quattro manuali e FAQ abbiano il comportamento atteso;
- [ ] verificare che originali WordPress restino visibili e invariati;
- [ ] confermare che nessun import, AI o Shopify sync sia stato avviato;
- [ ] autorizzare separatamente qualsiasi passaggio oltre la canary.

## Gate di rilascio

Stato attuale: **READY FOR REVIEW, NOT DEPLOYED**.

Restano obbligatori: preflight live senza drift, backup privato, approvazione
migration, applicazione migration-first, deploy coordinato della sola Edge
Function e smoke test canary. Nessun merge o rilascio è incluso in questa fase.
