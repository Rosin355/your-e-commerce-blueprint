# Step 1 — checklist di chiusura

16 novembre 2026. **PARZIALE / BLOCCATO per consegna e collaudo live Marco.** Nessun merge/deploy/Publish, prodotto commerciale, pagamento AI o modifica a permessi live.

- [x] Riprese PR #22/#50/#51/#52 integrate; branch isolata da main.
- [x] Editor visuale e cancel conservativo; preview/sanitizzazione e rifiuto server HTML non sicuro.
- [x] CTA, badge, dettagli/confronto, avviso descrizioni con destinazione condivisa.
- [x] Tre liste e ordine; whitelist e grant esatto richiesti.
- [x] Prima bozza esplicita da Shopify, versione zero e rilettura hash nel flusso approvazione.
- [x] Formati singoli/multipli, confronto opzionale, prezzi EUR con virgola.
- [x] Proposta AI simulata mostrata e applicata soltanto dopo conferma; nessun autosync.
- [ ] Applicare e verificare migrazione in DB di verifica: non eseguito da questo task.
- [ ] Verificare/autorizzare nominativamente tre campi e capability AI: non modificati live.
- [ ] Provider/modello/credito/limiti e generazione reale autorizzata: NON PROVATA.
- [ ] AI per campi completamente vuoti/nuove bozze con contesto confermato: NON IMPLEMENTATA, BLOCCATO.
- [ ] Accettazione personale Marco, Safari e screen reader: NON PROVATI.
- [ ] Sincronizzazione su DRAFT tecnica reale autorizzata e verifica readback: NON PROVATA.
- [ ] Decisione owner su rilascio: NON AUTORIZZATO.

La prova sintetica usa un repository/provider simulato: non dimostra accesso del cliente al provider live. Le sezioni storiche della documentazione restano cronologia; nessuna spunta live deriva da CI verde.

## Sequenza di chiusura — solo Step 1, un gate alla volta (16 novembre)

1. **Step 1A — completamento offline, stessa PR #56:** implementare AI per valore vuoto/nuova bozza **solo** da fatti esplicitamente forniti e confermati dall'operatore, con preview, scarto, conferma e senza salvataggio/pubblicazione automatica. Se non ci sono fatti verificati, mostrare spiegazione e compilazione manuale, non generare claim. Preparare una migrazione additiva e testata in DB locale isolato per la capability nominativa `ai` senza nuovi grant live, mantenendo controlli RLS e revoche. Verificare che la migrazione del primo valore sia agganciata al percorso effettivo; non applicare in produzione. CI completa + review di sicurezza. **GO al passo seguente solo con codice e schema verificati offline.**
2. **Step 1B — preflight live in sola lettura:** verificare il progetto corretto, lo schema realmente distribuito, grant di Marco e dei soli operatori autorizzati per i tre elenchi, versione reale delle Edge Functions, presenza (non valore) della configurazione provider, disponibilita modello/credito e scope. Nessuna modifica a permessi o dati. Produrre matrice differenze e i soli interventi minimi da approvare. **Stop se identita, schema o autorizzazioni sono ambigui.**
3. **Step 1C — rilascio condizionato e collaudo:** solo con autorizzazioni separate per migration, deploy backend/frontend, grant nominativi, una chiamata AI a costo limitato e uso di una DRAFT tecnica approvata. Deploy nell'ordine corretto; poi con la sessione di Marco verificare HTML visuale, elenco, formato/prezzo, salvataggio/rilettura, proposta AI reale/accettazione e sync soltanto se esplicitamente permesso. Safari e controlli accessibilita documentati. **Nessun prodotto commerciale toccato automaticamente.**
4. **Step 1D — decisione proprietario:** rendere disponibile l'editor solo dopo prove live e accettazione. Aggiornare questa checklist e il closeout con SHA, CI, versione frontend e backend effettive, timestamp delle prove, owner e stato *sviluppato/collaudato/pubblicato/accettato* separati. Se manca un gate, mantenere *PARZIALE/BLOCCATO*.

**Vincoli trasversali:** non iniziare gli Step 2–4 del piano generale, non toccare #53/#54/#55, login Marco, checkout, SEO/redirect, shipping o Shopify commerciale. Nessun nuovo account, secret in Git, charge AI o grant non esplicitamente autorizzati. Non trasformare la rinuncia a una funzione richiesta in un PASS fittizio.
