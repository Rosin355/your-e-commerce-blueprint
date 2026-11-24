# Online Garden — Check di rilascio (sola lettura)

Nessun intervento eseguito. Controlli fatti ora nel repo: checkout locale `9a89cda` (PR #72); `50e02a5` e `ca9050d` presenti; **`5a37f71` NON presente** nel repo sincronizzato.

## 1) Identità / revisione / sorgente / log di product-admin-api
- BLOCCATO: revisione attiva, fingerprint runtime, deployment ID e download del sorgente distribuito non sono esposti né in UI né dagli strumenti a disposizione (verificato nei deploy precedenti: lo strumento accetta solo il nome funzione e non restituisce ID).
- VERIFICATO: percorso UI elenco funzioni: More → Database → Manage → Edge functions (log e stato, non sorgente/versione).
- DA VERIFICARE: i log mostrano eventi recenti, ma non provano quale codice gira.
- BLOCCATO: rollback runtime nativo non esiste; "rollback" = redeploy dal commit approvato (es. `ca9050d` per r2). Prova del codice inviato = hash del pacchetto locale, non del runtime.
- Per attestare la revisione attiva serve supporto Lovable (testo: "fornire revisione/hash del bundle attivo di product-admin-api sul progetto").

## 2) Isolamento branch 5a37f71
- BLOCCATO ora: il commit non è nel repo sincronizzato (push mancante o branch non raggiunto).
- DA VERIFICARE: il branch picker (Project settings → Git) cambia il branch su cui lavora l'editor; il Publish pubblica ciò che è in quel branch. Usarlo solo se il branch contiene esattamente `5a37f71`.
- Controlli prima del Publish: SHA checkout = `5a37f71`; diff vs `9a89cda` senza file di sessioni cliente/storico staff/#69/#70; build OK; preview: home, catalogo, ricerca, PDP, carrello→checkout Shopify, /admin dashboard, filtri origine/SKU, bozza TEST-OG-AI-001.

## 3) Deploy solo product-admin-api con sicurezza JWT
- VERIFICATO: `verify_jwt=false` a livello piattaforma (scelta per CORS); l'autorizzazione è nel codice (verifica token + ruolo nel DB). Non va cambiato config.toml.
- Deploy nativo accetta `["product-admin-api"]` e usa il checkout corrente con il suo `_shared`: nessun'altra funzione toccata.
- Conferma umana: autorizzazione esplicita con SHA sorgente + impronte attese prima del deploy.
- Ritorno a r2: checkout `ca9050d`, verifica impronte, redeploy della sola funzione (nuova autorizzazione).

## 4) Sequenza minima GO/NO-GO (nessun passo ora)
1. Gate sorgente: `5a37f71` sincronizzato, diff limitato al perimetro. NO-GO se assente.
2. Edge: deploy solo product-admin-api da SHA approvato; OPTIONS 200, no-auth 401, lettura Admin 200. Rollback: redeploy da `ca9050d`.
3. Preview: controlli punto 2. NO-GO su errori Admin o checkout.
4. Publish: un solo Publish; registrare asset index nuovo vs `index-DSQ4UzGV.js`. Rollback: Cronologia Lovable / versione precedente.
5. Collaudo Marco: con sua sessione sul dominio pubblico, solo letture e bozza di test. Stop su regressione.

## 5) Supabase esterno
- VERIFICATO: backend Lovable Cloud, progetto originale unico (preview e produzione). NON creare un nuovo Supabase esterno.
