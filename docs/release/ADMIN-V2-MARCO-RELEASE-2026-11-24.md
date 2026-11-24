# Admin V2 per Marco — registro di rilascio e rollback (24/11/2026)

Branch `codex/rilascio-admin-v2-isolato-20261124`, candidato `5a37f71d02070f51a5b2e841d15bf7cda3b72747`
(HEAD Lovable `2325274` differisce solo per `.lovable/plan.md`). PR #69/#70 escluse.

## Fase 1 — verifiche reali (VERIFICATO)
- Diff da r2 `ca9050d`: 10 file `src/adminv2` + 3 moduli `_shared`; nessun file clienti/checkout/cookie/storico.
- Typecheck frontend: 0 errori.
- Test Admin (Node, rete bloccata): 270/270; `admin-operational-service` (Deno): 17/17.
- Anteprima autenticata Admin: dashboard e modulo «Nuovo prodotto» semplificato (nome, descrizione, formato+prezzo,
  categoria; sezioni facoltative richiudibili; aiuto AI facoltativo); nessuno SKU manuale richiesto. Nessun salvataggio.
- La preview chiama la `product-admin-api` di produzione (ancora r2).

## Non verificato (rischio residuo)
- Salvataggio/riapertura bozza, mesi non consecutivi persistiti, AI reale: richiedono backend candidato + scrittura.
- Revisione runtime Edge: Lovable Cloud non espone hash/ID; si registra solo l'hash del pacchetto inviato.
- Compatibilità frontend r2 pubblico ↔ backend candidato: coperta da test di contratto, non da prova live.

## Rollback backend (preparato, non eseguito)
1. `git restore --source=ca9050d004da3b27f2aff0cb8020bf58ab87d63d -- supabase/functions/product-admin-api supabase/functions/_shared`
2. Deploy nativo della sola `product-admin-api`; smoke `get_admin_context` marker `admin-delivery-20261121-r2`.
3. `git restore --source=HEAD -- supabase/functions` per tornare al branch.
Rollback frontend: Cronologia Lovable → versione con asset `index-DSQ4UzGV.js`.

## Sequenza GO
- GO A: deploy solo `product-admin-api` da `5a37f71`; smoke OPTIONS/401/lettura Admin; rollback se regressione.
- GO B (dopo A PASS): Publish frontend del branch; controlli home, catalogo, PDP, carrello/checkout senza acquisto,
  area clienti, Admin, nuovo prodotto.
- Collaudo Marco (vedi checklist sotto). SAL ufficiale invariata al 57,75% fino al collaudo superato.

## Checklist Marco (nessuna pubblicazione Shopify)
1. Prodotti → Nuovo prodotto.
2. Nome, descrizione, prezzo, due formati, categoria, immagine.
3. Controllare in Anteprima gli SKU generati (distinti per formato).
4. Selezionare mesi non consecutivi (es. Marzo, Giugno, Ottobre).
5. «Aiuto AI»: confermare i fatti, generare proposta.
6. Approvare il testo e salvare come bozza interna.
7. Riaprire la bozza: tutti i dati presenti; stato «bozza locale», nessun prodotto su Shopify.

## GO A — esito deploy (24/11/2026 ~15:05 UTC)
- Distribuita solo `product-admin-api` (+ `_shared`), sorgente identico a `5a37f71`.
- SHA-256 pacchetto inviato: `941e75a42795384b112123e405c943d148e3b28564d43d6b3c94908d7d8c6039`; ID runtime non esposto.
- OPTIONS 200; senza autenticazione 401; Admin: `get_admin_context`, `get_dashboard_stats`, `list_products` 200.
- Nota: il candidato mantiene il marker `admin-delivery-20261121-r2`, quindi il marker non distingue r2 dal candidato.
- Nessuna scrittura, nessun Publish. Prossimo: GO B (Publish).

## GO B — esito Publish (24/11/2026 ~15:12 UTC)
- Publish dal branch isolato (HEAD contenente `5a37f71`); scan prima: 0 Critical, 1 warning stale log email, 1 info.
- Asset live `index-jqOemgjy.js` (precedente r2 `index-DSQ4UzGV.js`).
- Home, catalogo, `/admin`, `/account` HTTP 200; PDP Dalia Purple Queen €5, aggiunta al carrello, checkout Shopify
  `/checkouts/cn/...` aperto senza acquisto; nessun errore JS.
- Admin su dominio pubblico: solo form di login visibile (nessuna sessione nel browser di test): da collaudare con Marco.
- Rollback frontend: Cronologia Lovable → versione con `index-DSQ4UzGV.js`.

## Estensione della PR #73 · scheda assistita

Ramo isolato `codex/ai-descrizione-bozza-20261124`, base PR `codex/rilascio-admin-v2-isolato-20261124`. L’estensione prosegue da `8fb057f`. Il commit della PR è il riferimento per costruire il candidato. La build operativa locale produce `index-BuUb1t_n.js`, SHA-256 `9f7dc7f1b8a09f81114ca110199b955f3c5307e8c7855f3ae17e2ce77fbada35`.

| Operazione | Giudizio e condizione |
| --- | --- |
| A · Deploy della sola `product-admin-ai` | **GO tecnico, esecuzione in attesa**. La correzione Edge della #73 appartiene a `8fb057f`. Questa estensione riusa quel pacchetto. Identificare la revisione attiva e la configurazione, verificare lo snapshot con hash e sorgenti ripristinabili, quindi ottenere autorizzazione specifica. Se la revisione candidata è già attestata in esecuzione, passare al collaudo. In caso di regressione, ripristinare lo snapshot attivo verificato. |
| B · Anteprima autenticata | **GO tecnico al collaudo controllato**, dopo verifica di branch, SHA e contratto della Edge candidata. Richiedere sessione e autorizzazione per la chiamata reale ed eventuale salvataggio della bozza tecnica. Con Marco verificare una richiesta, fonte della proposta, scelta parziale, rifiuto della sovrascrittura, riprova, eventuale blocco del tipo e riapertura dei due formati. Il backend verifica gli SKU in lettura. Fermarsi alla bozza interna. Registrare esito e riferimento tecnico senza registrare i fatti inseriti. |
| C · Publish Lovable | **NO-GO** in attesa di collaudo autenticato, accettazione dell’eventuale tipo lasciato vuoto e autorizzazione al Publish sullo SHA verificato. Per il rollback ripubblicare dalla cronologia la versione con `index-jqOemgjy.js`, SHA-256 `74449f1d0f5cf1f834a076535f8e04681e9598160486ab81c2144b8ab3a10c4e`, e verificare caricamento Admin e compilazione manuale. |

**Tipo prodotto.** Il registro letto il 24 novembre è privo di un dominio mappato al campo Shopify. Per attivare i suggerimenti del tipo serve un elenco verificato dal responsabile e un’integrazione del registro autorizzata. Il tester può già verificare il motivo mostrato e il completamento degli altri campi in anteprima.

Typecheck, build operativa, lint mirato, Deno check, 83 test Node, un test HTTP su sette scenari e dieci test Chromium superati sul candidato. La prova con il provider e con la sessione personale di Marco è pendente. **SAL ufficiale 57,75%**. [Verbale tecnico e risultati](../admin-v2/AI-ERROR-LIVE-2026-11-24.md)

## Piano definitivo PR #73 · qualità SEO

Candidato su `codex/ai-descrizione-bozza-20261124`. Base isolata pubblicata `codex/rilascio-admin-v2-isolato-20261124` a `f6a3362926682cd0d1ac63000f36d5753d7217be`. Questa revisione sostituisce il pacchetto candidato della Edge e l’entry di build riportati nella sezione precedente. Asset candidato locale `index-BVKTmXhO.js`, SHA-256 `53138a4151354cd8f8e750d2903d9d38cb70bd805e2695ff7d1857113b6ed2d0`.

| Passo | Decisione e operazione |
| --- | --- |
| 1 · Merge sul ramo isolato | **GO tecnico alla revisione per il merge.** Acquisire il GO con lo SHA esatto della #73. Rileggere HEAD, base, integrabilità e controlli remoti. Integrare la sola #73 nella base isolata, registrare lo SHA risultante e verificare il contenuto applicativo rispetto al candidato collaudato. |
| 2 · Snapshot | **BLOCKED per lo snapshot della revisione realmente attiva.** Le letture del connettore Supabase su `iekwvvihjwghosqdxrdi` hanno restituito `INVALID_ARGUMENT`. Dal gestore autorizzato aprire Edge Functions → `product-admin-ai`, registrare revisione, data, entrypoint, import map, verifica JWT e nomi delle opzioni. Esportare la versione distribuita con i suoi moduli condivisi da Lovable Cloud o dall’accesso di gestione collegato. Archiviare privatamente il bundle, calcolare SHA-256, estrarlo in una directory pulita e verificare la risoluzione degli import con Deno. Registrare come ripristinare quella revisione, senza salvare valori segreti. |
| 3 · Deploy Edge | **GO tecnico con modalità editoriale disattivata**, esecuzione dopo snapshot verificato e GO specifico. Distribuire soltanto `product-admin-ai` e le sue dipendenze. Mantenere l’opzione editoriale assente o disabilitata. Verificare OPTIONS, rifiuto senza sessione, compatibilità del payload precedente e funzione del fallback su sessione autorizzata. In caso di errore ripristinare lo snapshot e ripetere i controlli. |
| 4 · Autorizzazione editoriale | **NO-GO all’attivazione diretta con i permessi attuali.** Per una prova autentica di SEO generata, ottenere autorizzazione separata al contratto in revisione e all’elenco esatto di Editor e campi. Verificare RLS/ACL, assenza di opt-in impliciti, grant esplicito e flag del registro per ciascun campo, poi abilitare l’opzione in modo controllato. I tag richiedono inoltre una decisione su `tags.ai_allowed` e sul relativo grant. Rifiuto o rinvio conserva il fallback e si registra il limite nel collaudo. Per arrestare la nuova selezione, disabilitare l’opzione e revocare gli opt-in autorizzati conservando il journal. |
| 5 · Anteprima autenticata | **GO tecnico per una prova controllata** quando SHA editor e Edge sono attestati. Richiedere la sessione di Marco e il GO per una richiesta reale e una bozza tecnica interna. Provare un nome e due fatti verificati, almeno un alias, due formati e un titolo già scritto. Controllare fonte per campo, leggibilità, conservazione delle precisazioni, annullamento di una sostituzione, approvazione parziale, salvataggio e riapertura. Confrontare costo e consumo effettivi disponibili sul provider per la singola richiesta. Il caso modello resta aperto finché una riga autorizzata non mostra davvero la selezione del modello. |
| 6 · Publish Lovable | **NO-GO** fino ad accettazione di Marco sul perimetro effettivamente provato e GO esplicito del responsabile. Verificare che l’editor punti alla revisione approvata e che non ci siano cambiamenti estranei. Dopo Publish verificare il bundle servito e l’ingresso Admin. Se necessario ripubblicare la versione con `index-jqOemgjy.js`, SHA-256 `74449f1d0f5cf1f834a076535f8e04681e9598160486ab81c2144b8ab3a10c4e`, e verificare login e compilazione manuale. |

La decisione sulle etichette del tipo prodotto è indipendente dal collaudo SEO. Il progetto conserva la **SAL ufficiale 57,75%**. [Verbale, test e lista da approvare](../admin-v2/AI-ERROR-LIVE-2026-11-24.md)
