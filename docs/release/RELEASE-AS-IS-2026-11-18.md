# Online Garden — consegna immediata AS-IS (18 novembre 2026)

## Decisione
Il proprietario richiede di **uscire con cio' che e' gia' disponibile sul progetto Lovable Cloud Online Garden esistente**. Non creare un secondo progetto Supabase. Questa e' una scelta di *perimetro di consegna*, non un'autorizzazione automatica a migrazioni/deploy/merge/Publish o a dichiarare collaudate funzioni non provate.

**Stato: CONSEGNA PARZIALE DA VALIDARE IN SESSIONE MARCO.** Il negozio e' gia' online: non e' necessario ripubblicare la PR #56 per utilizzare la versione corrente. Non dire che l'AI editor e' live.

## Cio' che risulta gia' pubblicato da evidenze precedenti

- Sito Online Garden su dominio attuale; home, catalogo, ricerca, PDP, carrello e collegamento al checkout Shopify nativo. Ultimo smoke test documentato in [PROJECT-CLOSEOUT-CHECKLIST.md](PROJECT-CLOSEOUT-CHECKLIST.md) (12/11/2026). Quell'evidenza non e' una verifica in tempo reale del 18/11.
- Rilascio SEO P1 del 12/11: sitemap, robots, canonical e JSON-LD; sitemap statica da rigenerare dopo variazioni rilevanti.
- Accesso Admin gia' esistente: login personale Marco/ruolo editor, sette capability e 14 campi assegnati secondo l'ultima lettura documentata. **Non e' il nuovo editor Tiptap + AI della PR #56**. Permessi attivi non equivalgono a collaudo delle singole azioni.
- Shopify Payments e checkout Shopify gia' scelti/configurati nel percorso corrente; nessun nuovo gateway richiesto da questa decisione.
- Definizione Shopify `PRODUCT/custom.key_benefits` creata/verificata il 17/11: e' una *definizione dati*, non prova di visualizzazione PDP o editor AI live.

## Cio' che NON va dichiarato consegnato

- **PR #56** (`codex/marco-product-editor-step1`) rimane DRAFT, non unita al main, non pubblicata. Contiene editor semplificato Tiptap, AI e gestione dei tre elenchi/nuovi sync, testati solo offline. Il Cloud live e' ancora Drizzle **0015**; 0016/0017 assenti, capability `ai` e nuova RPC non attive. Non fare merge/Publish di #56 come scorciatoia: frontend nuovo su backend vecchio non funzionerebbe correttamente.
- Attestazioni runner/Edge e batch live M: NO-GO. E' stato confermato backup visibile (15 restore point nel pannello, ultimo 18/11 ore 05:28:12 UTC) ma **non un restore collaudato**; runner che esegue davvero un singolo batch Drizzle sul Cloud non identificato. Nessuna migrazione autorizzata.
- Shopify Customer Accounts della PR #55: flag OFF, non in rilascio; import clienti storici/ordini Woo ancora non terminato.
- Redirect 301 di vecchi URL non attestati live: non promettere recupero dei permalink.
- Tariffe specifiche per tutte le isole minori, consegna notifiche email, accettazione testi legali/cookie, Safari/iOS: punti aperti nel closeout generale.
- **Non** promettere a Marco che prezzi, liste e caratteristiche siano editabili in forma semplificata finche' non e' pubblicata e collaudata la nuova versione.

## Collaudo minimo per la consegna parziale — da fare con Marco, senza modifiche commerciali

1. Registrare URL e versione live effettiva (non dedurla dal solo ultimo commit Lovable). Desktop e Safari/mobile.
2. Con Marco aprire login abituale, area Admin e un prodotto accessibile. Verificare quali pulsanti e campi sono davvero attivi. **Niente impersonazione, credenziali condivise o grant nuovi**.
3. Se esiste una bozza tecnica gia' autorizzata e un campo modificabile in sicurezza, verificare un'operazione semplice con approvazione esplicita; altrimenti fare solo lettura e segnare SAVE NON PROVATO.
4. Verificare storefront home, ricerca, scheda prodotto, carrello e apertura checkout *senza finalizzare ordini*.
5. Verificare privacy/contatti e condizioni di spedizione applicate; segnalare come NON VERIFICATI i costi/isole minori e il recapito email quando non provati.
6. Registrare PASS/FAIL/NON TESTATO, data, versione e riscontro di Marco. Consegnare soltanto le funzioni provate. Nessun test AI a pagamento, sync Shopify o Publish.
7. Se una funzione commerciale critica non funziona, **STOP all'accettazione di quella funzione**; non trasformare il report in full GO.

## Sequenza futura, non eseguita

Per offrire a Marco il nuovo editor richiesto: identificare runner/operatore del **medesimo Cloud**, approvare M separatamente (un solo batch Drizzle 0016→0017 con guard ACL fail-closed), postcheck, poi autorizzazioni distinte a backend B, grant G, merge F-M, Publish F-P e collaudo T/A/S. Nessun secondo Supabase necessario; il blocco e' **il meccanismo operativo di migrazione**, non il numero dei database.

## Comunicazione sintetica al cliente
«Online Garden e' gia' online: possiamo utilizzare e verificare insieme le funzionalita' presenti oggi, con il tuo accesso abituale. La nuova interfaccia semplificata per le schede prodotto e i suggerimenti AI sono ancora un aggiornamento separato non attivato. Ti confermeremo singolarmente le funzioni collaudate, senza farti lavorare su procedure non verificate.»

Vedi anche [guida verifica Marco AS-IS](../clienti/MARCO-COLLAUDO-AS-IS-2026-11-18.md), [closeout generale](PROJECT-CLOSEOUT-CHECKLIST.md) e [gate PR #56](../editor-step1/CHECKLIST.md).
