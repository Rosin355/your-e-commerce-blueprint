# Online Garden — delivery gate rapido per Marco (20 novembre 2026)

## Obiettivo
Preparare **una singola PR** per rendere l'Editor Step 1C utilizzabile da Marco nel minor numero di passaggi possibile, senza introdurre regressioni ai prodotti in vendita. Riferimenti: [Backlog UX Marco](BACKLOG-UX-MARCO.md), [Collaudo live](COLLAUDO-MARCO-STEP1C.md), [Guida Marco](GUIDA-MARCO.md). Questo documento e' un brief, non attestazione di codice gia' corretto o prodotto distribuito.

## P0 non negoziabili
1. **AI su descrizione esistente.** `AiSuggestionCard.generate()` ignora `suggestion` restituita, `useAiSuggestions` ha `enabled:false`. Fix del flusso proposta immediata + pending persistita/recuperabile, nessuna doppia chiamata pagata, test `Scarta`/`Modifica`/`Applica` su bozza locale e nessun sync Shopify.
2. **Readback `LOCAL_DRAFT`.** `admin_save_new_draft` riceve `p_payload` completo ma il dettaglio field-by-field mostra falsamente `Nessun valore` su prezzo, tag, categorie, vendor e SKU. Offrire riepilogo read-only della bozza persistita (da fonte sicura, accesso autorizzato), senza riscrivere il catalogo operativo o duplicare in maniera rischiosa i campi.
3. **Stati distinti.** `Attivo` proviene da `products.is_active`, non significa pubblicato Shopify. Spiegare `record interno`, `LOCAL_DRAFT`, `Shopify DRAFT`, `ONLINE` separatamente, senza inventare live status.
4. **Safety remote.** Proteggere `Crea bozza Shopify`, `Aggiorna sul sito`, `Pubblica` dietro consensi/permessi reali, con test negativi per il prodotto `TEST-OG-AI-001`. Nessuna mutazione Shopify o pubblicazione durante il fix.

## P1 ad alta utilita' se P0 chiusi
HTML sanitizzato in anteprima (mai raw), riduzione rumore visuale, indicatori `Puoi modificare qui`, spiegazioni semplici per `AI` e salvataggio, categorie senza slug, prezzi/varianti e immagini con stati chiari, botanica e SEO sezioni progressive, anteprima completa con differenza tra bozza e sito. Mantenere tutti gli input accessibili e reversibili. Conservare manual-only per informazioni botaniche non verificate.

## Test obbligatori
- Unit/integration per proposta AI immediate, pending reload, stale, reject, accept una volta, nessuna rete AI reale nei test; osservare costo solo via log del provider eventualmente disponibile.
- Unit/readback per `LOCAL_DRAFT` con SKU TEST, 10.00 EUR, `Aromatiche da esterno`, descrizione AI, immagine e SEO, con permessi server testati; nessun `Nessun valore` ingannevole.
- Build, typecheck, lint, test pertinenti, verifiche autorizzazione server, regressioni HTML rich text e no Shopify writes.
- E2E solo in ambiente sintetico/mock o collaudo di lettura sulla DRAFT interna gia' creata; nessun prodotto commerciale e nessun invio Shopify.

## Gate di rilascio
Lavorare in branch e PR revisionabile, non alterare stati/grant/migrazioni Supabase Lovable senza necessità e autorizzazione. Nessun nuovo ambiente Supabase. Non eseguire merge, Lovable Publish o scritture sul negozio senza conferma del responsabile. In caso di blocco P0, NON dichiarare `READY`: indicare `NO-GO` e un follow-up concreto. Emettere esito P0/P1, test con comandi e risultati, commit, PR, file modificati, istruzioni di collaudo e rollback. Aggiornare `BACKLOG-UX-MARCO.md`, `COLLAUDO-MARCO-STEP1C.md`, `DESIGNER.md`, `DEVELOPER.md`, `GUIDA-MARCO.md` per quanto effettivamente cambiato.

## Suggerimento Codex
GPT-6.2 Astra xhigh per diagnosi multi-file e fix P0/P1; scegliere `high` se la latenza del ragionamento impedisce le verifiche entro la finestra di consegna. Evitare una seconda sessione se non necessaria.
