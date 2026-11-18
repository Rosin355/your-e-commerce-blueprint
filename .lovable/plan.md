# Risposta tecnica: compatibilità migrazioni PR #56 con la cronologia Drizzle

Fonti lette (sola lettura): parametri dello strumento migration nativo, `drizzle.config.ts`, `drizzle/migrations/meta/_journal.json`, `node_modules/drizzle-orm/migrator.js`, `node_modules/drizzle-orm/pg-core/dialect.js`. Nessuna modifica effettuata.

## Risposte

1. **hash** — `sha256` (hex) dell'intero contenuto del file `drizzle/migrations/<tag>.sql`, letto con `fs.readFileSync(...).toString()`: tutti i byte del file come stringa UTF-8, inclusi commenti, marcatori `--> statement-breakpoint` e newline finale. Qualsiasi differenza di byte (anche CRLF o newline finale) cambia l'hash.
2. **created_at** — è il campo `when` della voce nel `_journal.json` (`folderMillis`). Con lo strumento nativo il valore non si può scegliere: la voce viene creata da `drizzle-kit generate --custom` al momento della chiamata (timestamp corrente).
3. **Parametri dello strumento** — solo `name` (suffisso del nome file), `query` (SQL scritto verbatim nel file), `description`. Non accetta tag, indice, `when`, hash né identificativo canonico. Il numero `NNNN_` è assegnato in sequenza (prossimo: `0016_<name>`).
4. **Atomicità** — il migratore esegue in un'unica `session.transaction` tutte le migrazioni pendenti: SQL di ciascuna e `INSERT` in `drizzle.__drizzle_migrations` stanno nella stessa transazione; un errore annulla tutto. Lo strumento in più annulla file e voce di journal in caso di errore. Per questo il payload non deve contenere `BEGIN/COMMIT`.
5. **Doppia applicazione** — Drizzle non confronta gli hash: legge solo l'ultima riga per `created_at` e applica ogni voce con `when` maggiore. Riproporre lo stesso SQL con lo strumento crea una *nuova* migrazione (nuovo tag, nuovo `when`) e la rieseguirebbe: la protezione deve stare nell'SQL stesso (guardie di preflight / `IF NOT EXISTS`) o nel processo.
6. **Compatibilità futura** — sì: la riga scritta è esattamente quella del migratore ufficiale (`hash`, `created_at = when`), a condizione che nel repository restino i file prodotti dallo strumento (SQL, snapshot, journal) e che ogni voce futura abbia `when` crescente.

## Conseguenza
Applicare i file 0016/0017 della PR così come sono, con hash e `when` canonici, **non è possibile passando il loro SQL nel parametro `query`**: lo strumento genererebbe una nuova voce con nome e timestamp propri, e i file della PR resterebbero come doppioni pendenti (verrebbero rieseguiti).

## Modalità supportate (scegliere una)

**A — Consigliata: file canonici della PR applicati dal migratore**
Il migratore applica *tutte* le voci pendenti del journal nella stessa transazione. Quindi:
- Codex porta su `main` i file `0016_*.sql`, `0017_*.sql`, i relativi `meta/0016_snapshot.json`, `meta/0017_snapshot.json` e le voci nel `_journal.json` con `idx` 16/17, `when` > `1794322722595` e crescenti, `prevId` dello snapshot 0016 = `id` dello snapshot 0015. Niente `BEGIN/COMMIT`, statement separati da `--> statement-breakpoint`, LF, contenuto finale definitivo (l'hash sarà quello del file).
- Io eseguo una sola chiamata allo strumento con un SQL innocuo e idempotente (es. `COMMENT ON TABLE public.admin_confirmed_ai_requests IS '...'`), che diventa `0018_*`. Nella stessa transazione vengono applicati 0016, 0017 e 0018 con hash/`when` canonici; errore = rollback completo.
- I file generati (0018, snapshot, journal) vengono segnalati come diff da includere su GitHub.

**B — Alternativa: una sola migrazione generata dallo strumento**
- Codex rimuove 0016/0017 dalla PR e prepara un unico corpo SQL (contenuto 0016 + 0017, senza `BEGIN/COMMIT`, con preflight anti-collisione).
- Io lo applico con `name` concordato (es. `admin_ai_editor_delivery`) → `0016_admin_ai_editor_delivery`.
- Codex poi adotta in GitHub esattamente i file prodotti (SQL, snapshot, journal) dal commit di sistema, senza riformattarli.

In entrambi i casi: nessun progetto nuovo, nessuna prova, stesso Lovable Cloud.

## Limiti
- Identità del ruolo runner/owner della tabella non osservabile da qui (già dichiarato).
- Il checkout attuale si ferma alla 0015; la PR #56 deve essere su `main` prima di procedere.
