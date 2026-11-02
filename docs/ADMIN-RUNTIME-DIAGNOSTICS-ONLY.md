# Admin V2 — diagnostica runtime isolata

## Scopo e prova disponibile — 2 novembre 2026

Questo branch nasce da `main@04ae6d4` e aggiunge soltanto una vista di lettura in `/admin/settings`. La PR #42 resta separata: nessuna sua migration, nuova azione operativa, mutation o logica Shopify è importata.

**Contratto backend:** l'ultima distribuzione di `product-admin-api` documentata nel progetto Lovable è del 10 ottobre 2026, dalla revisione `main@4f5bdef` (messaggio Lovable `main:agent#00000000349542#don:FVP7IKNL`). La distribuzione della revisione precedente `main@889d6ce` è registrata anche in `docs/PROJECT_STATUS.md`. Il file `supabase/functions/product-admin-api/index.ts` è identico fra `4f5bdef` e `main@04ae6d4`; l'azione `get_admin_context` include `writesEnabled`, `writeMode` e `shopifySyncEnabled`. Il backend verifica il JWT tramite Supabase Auth e carica i ruoli da `user_roles` prima di rispondere. Non servono endpoint, modifiche backend o migration per questa UI.

**Limite dell'evidenza:** il connettore Supabase disponibile non dà accesso al progetto Online Garden; non è stata eseguita una lettura autenticata della funzione Edge attualmente in esecuzione. Il registro di distribuzione e l'identità del codice supportano la compatibilità, ma non provano l'assenza di un redeploy esterno o di drift runtime. La UI tratta risposta mancante, errore e campi inattesi come **NON VERIFICATO**. Questa PR non chiude il gate dei valori effettivi dei flag.

## Sicurezza e comportamento

- La sezione è visibile solo se `get_admin_context` restituisce il ruolo `admin` o `tech_admin`. Gli account `editor` e `publisher` conservano le pagine Admin precedenti ma non vedono la diagnostica. L'API esistente può già restituire il contesto a tali ruoli; la PR non amplia né cambia la sua policy. La UI non è il controllo di sicurezza delle mutation, che resta server-side.
- La lettura usa `callAdminApi` con la sessione Admin esistente; non sono introdotti endpoint pubblici, credenziali, secret, campi di input o comandi di modifica.
- **READ-ONLY** richiede una risposta completa e valida con `writesEnabled=false` e `shopifySyncEnabled=false`. Se uno dei due è `true`, appare **SCRITTURE ABILITATE**. `writeMode` è mostrato come `canary` o `full`, ma da solo non è un interruttore.
- Se la richiesta fallisce, è ancora in corso, manca un campo o la risposta contiene tipi/ruoli inattesi, appare **NON VERIFICATO**. Il refresh non lascia visibile un precedente `false`. La cache del contesto Admin è separata per ID utente.
- L'origine della pagina e l'ora dell'ultima lettura valida aiutano a distinguere produzione da preview. Il pannello visualizza solo i tre campi richiesti; gli altri valori della risposta non sono riportati in UI o nei documenti.

## Pubblicazione futura e rollback — non eseguiti

**QA locale su `main@04ae6d4` più il solo diff diagnostico:** installazione `npm ci --offline` dal lock, typecheck, lint mirato e build PASS; 343 test Node e 92 test Deno PASS. Dieci scenari browser con risposte API simulate e tutte le richieste esterne bloccate PASS a 1440 e 390 px: anonimo, `editor`/`publisher` senza sezione, `admin`/`tech_admin`, scritture/sync ON, risposta incompleta, errore iniziale e refresh fallito. Zero page error. I warning Vite su Browserslist, classi Tailwind e dimensione del chunk principale erano già presenti nella base e non impediscono la build. Nessuna lettura o scrittura live è stata eseguita dai test. La CI GitHub deve essere confermata sull'HEAD della PR.

1. Ottenere review della PR isolata e CI/GitGuardian verdi sul suo HEAD finale. Confrontare il diff con `main`: soltanto frontend Admin, test, lint e documentazione. Non includere la PR #42.
2. Con autorizzazione distinta, integrare la sola PR diagnostica. Verificare che la sincronizzazione Git con Lovable non sia scambiata per pubblicazione. Pubblicare esplicitamente soltanto il frontend dalla revisione approvata; nessuna Edge Function o migration deve essere distribuita in questo percorso.
3. Un `admin` o `tech_admin` autorizzato apre `/admin/settings` sul dominio esatto, preme **Aggiorna stato** e registra soltanto origine, data/ora, ruolo e i tre campi mostrati. Non usare DevTools, HAR, cookie o token. Se la vista è **NON VERIFICATO**, fermarsi e indagare il contratto runtime senza attivare flag.
4. Soltanto una lettura autenticata dell'ambiente corretto con `writesEnabled=false` e `shopifySyncEnabled=false` può chiudere il gate read-only della PR #42. Una lettura della preview non equivale alla produzione. `writeMode` va registrato, non interpretato come OFF.

**Rollback:** in caso di errore della sola vista, effettuare un revert revisionato del commit diagnostico su `main` e ripubblicare il frontend della revisione corretta. Non usare reset/force push, non toccare Edge Function, database, Shopify o secret. Confermare poi che `/admin/settings` sia tornata alla schermata precedente e che storefront e checkout funzionino. Il rollback della UI non cambia il valore dei flag.

**Gate aperti:** review e approvazione della PR; eventuale pubblicazione autorizzata; lettura autenticata produzione; attivazione Admin V2 della PR #42 e validazione commerciale restano percorsi separati.
