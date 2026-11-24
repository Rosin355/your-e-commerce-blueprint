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
