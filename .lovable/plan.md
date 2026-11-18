# Attivazione editor AI di Marco (PR #56) sul progetto esistente

## Stato verificato oggi
- Il progetto Lovable sincronizza solo il ramo `main` (checkout `d1016b9`). Il branch `codex/marco-product-editor-step1` della PR #56 non è presente qui.
- Il database ha le migrazioni fino alla 0015. La 0016 e la 0017 non esistono in questo checkout.
- Lo strumento migrazione nativo applica **una** migrazione per chiamata, in un'unica transazione, e scrive da solo la cronologia Drizzle. Non accetta `BEGIN`/`COMMIT` nel testo.

## Percorso operativo
1. **Merge della PR #56 su `main` (tu, su GitHub).** È l'unico modo per portare il codice qui: Lovable non legge altri branch. Il sito live non cambia finché non si fa Publish.
2. **Controlli offline (io, senza scritture):** SHA del checkout uguale al merge, SHA-256 di 0016/0017 uguali a quelli indicati, funzioni e dipendenze della stessa revisione, compatibilità del backend attuale con il nuovo schema.
3. **Migrazione (richiede tua autorizzazione specifica):** un'unica chiamata nativa con il contenuto di 0016 + 0017 concatenato, così è una sola transazione con i controlli ACL fail-closed della 0017 dentro. Limite da accettare: la cronologia Drizzle registrerà **una** voce combinata (es. `0016_marco_editor_ai_delivery`), non due file 0016/0017 separati. Le alternative che violano il mandato (due chiamate separate o SQL manuale) sono escluse. Se vuoi due voci distinte, non posso garantirlo in modo atomico: mi fermo.
4. **Verifica dopo il commit (sola lettura):** tabelle, RLS, ACL service-only, owner di `admin_confirmed_ai_requests`, nessun grant AI ad altri utenti.
5. **Deploy (autorizzazione separata):** solo `product-admin-api` e `product-admin-ai` dal merge verificato. Le versioni precedenti restano recuperabili da Git (`cb7fc57` / `096a435`).
6. **Permessi Marco (autorizzazione separata):** solo l'estensione nominativa (capability AI e tre campi editoriali), sul suo account esistente, preservando i permessi attuali. Senza credenziali né letture Auth da parte mia.
7. **Collaudo:** prima i controlli non distruttivi (sito pubblico, login, checkout raggiungibile). Prova AI reale solo con un tuo via libera.
8. **Documenti:** aggiornati nella PR #56, separando ciò che è preparato da ciò che è attivo. Le PR #53–#55 non vengono toccate.

## Prima operazione reale da autorizzare
Dopo il merge: migrazione combinata 0016+0017 in un'unica transazione nativa, sul database Online Garden, dal checkout verificato. Il recupero avviene con una migrazione correttiva forward-only, senza restore distruttivo.
