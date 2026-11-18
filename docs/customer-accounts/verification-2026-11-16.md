# Verifiche offline — 16 novembre 2026

Base: `main` remoto `acb2f78450c86ad224d8c55786b83e16d43def28`. [Specifiche e limiti](developer.md).

| Controllo eseguito | Esito |
| --- | --- |
| Nuovi casi Customer Auth con blocco rete Node | **20 PASS**, token RSA firmati e dati sintetici |
| Suite completa dominio Node | **438 PASS**, inclusi i 20 nuovi e contratti Admin esistenti |
| Suite completa dominio Deno | **106 PASS**, lock congelato, senza permessi rete runtime; solo dipendenze pubbliche acquisite per la cache |
| `npm run typecheck` | PASS |
| `npm run build`, default flag OFF | PASS; warning esistenti Browserslist/Tailwind e dimensione bundle |
| ESLint nuovo modulo, App, AccountButton, HomeHeaderOverlay | PASS |
| Query Customer Account API | VALID contro schema Shopify 2026-10 tramite toolkit ufficiale |
| Diff Admin/Supabase/RLS/gate/checkout rispetto alla base | Nessuna differenza |
| Tre corpi legacy Auth/Account/AccountCallback | Identici alla base, salvo nome del componente usato dal wrapper |
| `git diff --check` | PASS |

Il lint esteso di Auth e AccountCallback segnala due `catch: any` preesistenti; non sono nuovi errori introdotti dal percorso Shopify. Non dichiarato PASS dell'intero lint repository.

Npm audit ha segnalato **27 advisory complessivi (18 moderate, 9 high)** su dipendenze del progetto già presenti; nessun advisory riportato per `oauth4webapi` o `jose`. Non eseguito `npm audit fix`: aggiornamenti trasversali estranei potrebbero introdurre regressioni. Questo controllo non sostituisce una review delle dipendenze prima del rilascio.

Test di protocollo: state/nonce/issuer/audience errati, firma errata, token scaduto, origine/path errati, transazione scaduta, replay, profilo API in errore, refresh concorrente, cambio Customer ID, assenza refresh senza eredità dell'account precedente, restore, paginazione, logout e risposta tardiva. Il nuovo modulo non registra errori grezzi; le fixture verificano i messaggi sanitizzati e l'assenza di accessi a Supabase/ricerche ordini Admin.

Limiti: nessun browser end-to-end, login reale del personale, OTP, creazione cliente, lettura profili/ordini live, configurazione servizi o checkout reale. La compatibilità Admin dimostrata qui è statica e coperta dai contratti sintetici esistenti, non una certificazione dell'accesso di ciascun operatore. Non eseguiti test PostgreSQL locali della CI. La CI della PR deve confermare i check del commit; link ed esito aggiornati nella descrizione della PR senza modificare questo report per attribuirgli prove live.
