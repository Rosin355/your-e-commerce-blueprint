# Evidenze Step 1 — 16 novembre 2026

**Stato PARZIALE/BLOCCATO per il collaudo personale e la consegna live.** Questi esiti riguardano codice e dati sintetici nella branch, non operazioni effettuate sul negozio.

| Verifica eseguita | Esito |
| --- | --- |
| Typecheck React/TypeScript | PASS |
| Build frontend | PASS; warning preesistenti Tailwind/Browserslist e dimensioni bundle |
| Lint frontend modificato e moduli server verificati con no-ignore | PASS |
| Suite dominio Node | 429 PASS, inclusi nuovi casi e regressioni SEO/Admin/catalogo |
| Suite dominio Deno | 106 PASS, lockfile congelato, nessun permesso rete runtime |
| Typecheck Deno product-admin-api e service AI | PASS con lockfile esistente |
| Chromium desktop 1280 px e mobile 390 px | 3 PASS: editor/lista/formati/AI simulata, concorrenza/sync esplicito, primo valore dal sito/cancel |
| Diff e link documentali | Verificati; nessun dato reale o artefatto browser incluso |

I test browser avviano Vite locale e abortiscono tutte le richieste non dirette a 127.0.0.1. Repository di bozza, ordini di salvataggio/sync e proposta AI sono simulati: nessuna richiesta Shopify/Supabase/provider. Il test desktop/mobile comprende uso tastiera dell'azione Modifica, accessibilità tramite ruoli/etichette e assenza di overflow sul percorso verificato. Non è una certificazione completa WCAG o Safari.

La suite AI preesistente usa provider HTTP simulato: malformed output, timeout/errore, versioni, replay/idempotenza e rate/reservation. Nuovi controlli verificano grant AI esplicito, isolamento della proposta altrui e rifiuto di accept/reject da un altro attore senza alcuna write. Non effettuata una generazione reale; credito/modello/secret non verificati. La proposta visualizzata nel browser è inventata dalla fixture.

HTML: paragrafi/grassetto/elenchi conservati nel cancel, sanitizzazione e rifiuto server di script/eventi/protocolli pericolosi; formati opachi restano bloccati e originali. La normalizzazione lecita dei paragrafi dentro le voci di elenco non viene più scambiata per perdita di contenuto. Preview e editor non sono una correzione massiva dell'HTML storico.

Migrazione SQL nuova non applicata in un DB di verifica/live: la prova attuale verifica equivalenza del corpo atomico precedente salvo allowlist finita e corrispondenza copia Drizzle. La CI PostgreSQL preesistente verifica i contratti esistenti, non sostituisce il collaudo della nuova migrazione. Un controllo diretto dell'entry AI con --no-npm è limitato dal suo import npm CORS preesistente; service AI e API controllati separatamente. Non dichiarare test dell'entrypoint live.

Login/ruoli/RLS, checkout, spedizioni, SEO pubblico, sitemap e nuova autenticazione clienti non modificati. La guard coppia SEO della PR #52 non è stata riscritta; le regressioni relative restano nella suite. Nessun login di Marco o modifica a prodotto commerciale effettuato. PR #53/#54/#55 escluse dal lavoro.

Prima della consegna: risolvere i blocchi della [checklist](CHECKLIST.md), registrare generazione reale autorizzata e prova nella sessione personale. L'assistenza AI su valori vuoti rimane non implementata e non viene dichiarata disponibile.
