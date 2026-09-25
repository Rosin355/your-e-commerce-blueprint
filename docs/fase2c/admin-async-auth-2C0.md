# Fase 2C.0 — Attesa dell'autorizzazione nelle Edge Functions legacy

Data: 25 settembre 2026. Branch: `codex/admin-async-auth`.
Baseline: `origin/main@767c32d0211bf47ae9c470a14f0f86ebe6d35ba8`, nessuna
divergenza al fetch iniziale. Correzione destinata a PR separata verso main,
senza merge o deploy in questa fase.

## Finding confermato

L'helper `supabase/functions/_shared/admin-auth.ts:12` è asincrono: prima
verifica il JWT con `getUser()`, poi consulta `user_roles` tramite client server.
Le seguenti chiamate non attendevano la sua Promise:

| Handler | Linea | Effetto della baseline |
|---|---|---|
| `start-product-sync/index.ts` | 25 | `createSyncJob` poteva partire prima dell'autorizzazione e riceveva una Promise come iniziatore |
| `process-product-sync/index.ts` | 14 | GET/POST potevano raggiungere lettura job, aggiornamenti e upsert prima della decisione Admin |
| `get-product-sync-dashboard/index.ts` | 16 | GET/POST potevano leggere il repository privilegiato prima della decisione Admin |

Gravità alta: i repository usano credenziali server privilegiate. Una Promise
rifiutata senza await non viene gestita dal try/catch dell'handler. Il test
offline riproduce il difetto su tutte e cinque le combinazioni endpoint/metodo;
non è stata effettuata alcuna prova di sfruttamento live. Lo stato del gateway
e il codice effettivamente distribuito non sono certificati da questo test.

## Correzione minima

Aggiunto `await` alle sole tre chiamate. L'handler accede ai repository solo dopo
la risoluzione positiva dell'helper; il rifiuto torna attraverso il catch già
esistente. L'Admin continua a essere identificato da `user_roles.role='admin'`,
non da metadata modificabili dall'utente. Non vengono aggiunti ruoli o permessi.

Conservati metodi, payload, CORS/OPTIONS e codici HTTP esistenti:

- `start-product-sync`: errore nel catch → 400;
- `process-product-sync`: errore nel catch → 401;
- `get-product-sync-dashboard`: errore nel catch → 400.

L'uniformazione futura a 401/403 è separata: qui tutti gli esiti di auth fallita
sono non-2xx e non effettuano chiamate ai repository. L'identità Admin risolta è
una stringa sia nel job iniziale sia nella risposta GET di process-product-sync.

Il controllo Deno ha rilevato anche un errore TS2352 preesistente in
`_shared/product-catalog-repo.ts:139`: PostgREST non inferisce le colonne della
SELECT costruita dinamicamente. Il cast passa ora esplicitamente da `unknown`.
Il confronto del JavaScript emesso con la baseline, rimuovendo solo i commenti,
è identico: nessuna variazione di query, upsert o comportamento import.

## Test

`scripts/tests/admin-async-auth.test.ts` esegue il codice reale dei tre handler,
dell'helper auth e del formatter HTTP in un contesto isolato. Import Supabase,
server HTTP e repository sono mock a elenco chiuso: niente rete, `.env`, token
reali, import o scritture DB.

| Caso | Esito |
|---|---|
| anon senza header | negato, zero accessi repository |
| JWT invalido | negato, zero accessi repository |
| authenticated non Admin, anche con `user_metadata.role=admin` | negato dal lookup ruoli |
| Admin da `user_roles` | autorizzato; identità stringa e percorso repository attesi |
| Promise di `getUser` rifiutata | errore gestito, zero accessi repository |
| Promise lookup ruoli rifiutata | errore gestito, zero accessi repository |
| auth pendente, poi Admin / non Admin | nessuna risposta o operazione prematura |
| mutazione in memoria che rimuove await | riproduce l'accesso prematuro, dimostra che il test rileva la regressione |
| OPTIONS | nessuna auth o chiamata repository, contratto CORS conservato |

Risultati della finalizzazione:

- suite auth dedicata: **48/48 PASS**;
- `deno check` dei tre endpoint, incluse dipendenze: **PASS**;
- `npm ci`: **PASS**, lockfile invariato;
- `npm run typecheck`: **PASS**;
- `npm run test:catalog`: **101/101 PASS** (53 esistenti + 48 auth);
- `npm run build`: **PASS**, 1.907 moduli;
- `git diff --check`: **PASS**.

Warning build preesistenti: classi Tailwind arbitrarie e chunk >500 kB.
Le autorizzazioni SQL delle tabelle enrichment sono testate nella PR RLS
indipendente (68 verifiche PostgreSQL), non modificate da questa PR.

## Preflight e checklist Lovable

Prima di un eventuale rilascio separatamente autorizzato:

- [ ] verificare HEAD, nuovi commit e sorgenti effettivamente distribuite dei
  tre endpoint e dell'helper auth;
- [ ] salvare privatamente codice/versione precedente e configurazione gateway
  (solo riferimenti ai secret, mai valori in Git o report);
- [ ] confermare che gli utenti operativi previsti abbiano `user_roles.admin`;
  questa correzione può evidenziare utenti che prima accedevano grazie al bug;
- [ ] mantenere invariati JWT gateway, secret, ruoli, flag e modalità canary;
- [ ] provare gli handler in staging isolato con i casi negativi/positivi e
  fixture sintetiche; non avviare import reali per provare l'autorizzazione;
- [ ] dopo autorizzazione, distribuire i soli tre endpoint dallo stesso commit;
  non serve migration DB né pubblicazione frontend;
- [ ] verificare in sola lettura dashboard e GET process con un job autorizzato;
- [ ] verificare assenza di 2xx e accessi repository per richieste non autorizzate
  nell'ambiente di collaudo, inclusa indisponibilità del servizio Auth;
- [ ] confrontare conteggi/log dei job per confermare nessuna creazione o
  elaborazione durante gli smoke test read-only;
- [ ] annotare deployment e controlli live solo dopo evidenze dirette.

## Backup e rollback

Non serve backup dati per questa modifica di controllo del flusso: nessuna
colonna, tabella o record viene modificato dal rilascio del codice. Serve la
copia privata/versione della precedente funzione per recovery e tracciabilità.

Prima del deploy la PR può essere semplicemente trattenuta. Dopo un deploy,
preferire una correzione mirata di auth/ruoli mantenendo l'await. Ripristinare il
codice precedente riaprirebbe il difetto: richiede approvazione esplicita e
isolamento temporaneo degli endpoint. Non disabilitare auth o RLS per recuperare
disponibilità. Nessun rollback DB, grant aggiuntivo o modalità full.

## Separazione delle PR e stato cliente

Questa PR contiene solo i tre await, una correzione di tipo senza effetto runtime,
test auth e questo documento. La PR `codex/admin-legacy-security` contiene RLS,
preflight, test PostgreSQL e verifica del client service di `enrichment-run`.
Entrambe partono da main, sono indipendenti e non richiedono cherry-pick reciproci.

Verifica Codex completata localmente. Pubblicazione delle PR autorizzata; merge,
deploy Edge, AI, Shopify sync, import, backfill e modalità full restano esclusi.
