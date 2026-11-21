# Online Garden — chiusura area clienti e riconciliazione storica (21/11/2026)

## Perimetro attuale verificato da repository

- **Area clienti nuova:** `/auth` e `/account` usano il **Shopify Customer Account ospitato** come percorso predefinito. Il flag `VITE_SHOPIFY_CUSTOMER_AUTH_ENABLED` è disattivato per default; il client OAuth SPA opzionale non va attivato senza nuova registrazione/decisione. Supabase Auth rimane **solo staff/Admin**.
- **Rilascio:** Admin V2 r2 e storefront pubblicati; il report `docs/admin-v2/RELEASE-REPORT.md` riporta test anonimi di `/auth`, `/account` e apertura checkout. Una sessione autenticata precedente ha mostrato un ordine Shopify esistente del proprio cliente; la nuova release **non** certifica ancora da due identità controllate logout/isolamento/cambio account e comportamento Safari/iOS.
- **Storico clienti:** ultimo preflight documentato 20 novembre: 857 acquirenti con ruolo customer, 848 candidati a review, 8 quarantene, 1 match email da confermare. **Zero clienti Woo creati/associati, zero identità approvate**. Snapshot Shopify alla data 14 profili (non un conteggio live). Non dare per verificata la titolarità tramite solo email o telefono approssimato.
- **Storico ordini:** 953 ordini conteggiati ma dati transazionali individuali **non disponibili** nel backup troncato; **0/953 importati**. Stato: `BLOCKED_SOURCE_UNAVAILABLE`. Non inventare date/importi/righe e non generare ordini storici fittizi.
- **Preflight storico:** `sync/customers-sync-shopify.mjs` è attualmente uno strumento **offline-only** senza writer. `sync/lib/customer-preflight.mjs` prepara analisi e review; non è un'autorizzazione a creare profili.
- **Sicurezza:** gli ordini di un cliente devono essere ottenuti **solo dall'identità autenticata Shopify**, mai da email arbitraria inviata nel payload; non esporre token o dati personali in output/report.

## Prossimo intervento Codex — criteri di accettazione

1. Fare una revisione mirata **non distruttiva** del percorso `/auth`, `/account`, link nell'header/mobile, ritorno al negozio, sessione, logout e error state; confrontare con la modalità hosted reale. Conservare checkout Shopify Payments e frontend pubblicato.
2. Aggiungere/regredire test sintetici per isolamento clienti, uscita, cambio account, sessione scaduta e accesso diretto ai percorsi; provare Safari/iPhone quando disponibile. I test mock non sostituiscono prova live con due identità autorizzate; segnare `PENDING_REAL_SESSION` se mancano.
3. Verificare che `get-customer-orders` risulti ritirata e non referenziata dal bundle attuale; nessuna riattivazione di API per email.
4. Preparare un report **aggregato** per la riconciliazione delle 857 identità con quarantena, deduplica, stato delle fonti e piano di eventuale **pilota di massimo 5**, **senza eseguire scritture, notifiche, inviti o email marketing**. Richiedere autorizzazione distinta prima di qualunque accountCreate/customerUpdate.
5. Non creare dashboard clienti duplicate in Supabase. La gestione clienti e ordini correnti resta in Shopify Admin; eventuale miglioramento UX deve essere necessario e autorizzato.
6. Concludere con una sola PR per eventuali fix non controversi e aggiornare `docs/PROJECT_STATUS.md`, `docs/client-status.md`, `docs/developer-handoff.md`, `docs/release/SAL-2026-11-21.md`, questo file. Identificare esplicitamente funzionalità PASS, LIMITATE, PENDING_CLIENT_TEST, BLOCKED_SOURCE_UNAVAILABLE.
7. Nessun deploy automatico di Edge Functions, migrazione SQL o Publish in assenza di un fix verificato e autorizzato. Non creare ambienti Supabase e non modificare il perimetro Admin V2 già rilasciato.

## Contesto per Marco

**Si può usare l'area clienti nuova e consultare gli ordini Shopify realmente associati ai rispettivi profili. Non è stata eseguita alcuna migrazione dei vecchi clienti né degli ordini WooCommerce.** Per una presa in carico commerciale è necessario distinguere il percorso volontario di primo accesso tramite Shopify dalla migrazione storica, che richiede approvazione e fonti affidabili.

**SAL originale:** 57,75% ≈ 58%; non varia in assenza di una prova di consegna aggiuntiva o di decisione formale sul perimetro storico.

## Riferimenti

- [Migrazione clienti e ordini](../migration/woocommerce-history-2026-11-20.md)
- [Preflight aggregato 20/11](../migration/customers-reconciliation-2026-11-20.json)
- [Rilascio Admin V2 e storefront](../admin-v2/RELEASE-REPORT.md)
- [SAL](../release/SAL-2026-11-21.md)
