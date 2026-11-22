# Online Garden — azioni di sblocco dopo PR #67 (22 novembre 2026)

## Decisione successiva alla PR #67

La [consegna finale](FINAL-DELIVERY-2026-11-22.md) sostituisce la precedente lista operativa. Il committente ha chiuso la ricerca degli ordini individuali. La priorità 4 qui sotto documenta il contesto del mandato precedente ed è archiviata.

**Stato verificato su GitHub:** [PR #67](https://github.com/Rosin355/your-e-commerce-blueprint/pull/67) MERGED, commit `fc61e5b338d9a2b0f7accccc42676f1e19b7d2a9`. Il rilascio modifica l'importatore e la documentazione, **non richiede Publish frontend**. SAL totale originale **57,75%**, invariata. Nessuna attività di questo elenco è attestata conclusa in produzione.

## Priorità 1 — Visitor Analytics / consenso

**Decisione dell'operatore da raccogliere:** autorizzazione circoscritta a disattivare **solo** Visitor Analytics nel progetto Lovable Online Garden live, in finestra concordata, mantenendo Project monitoring e funzionalità Shopify se possibile. Documentare stato iniziale, responsabile, orario e criterio di rollback. Il laboratorio rileva POST prematuri e zero eventi del relativo loader in soppressione, ma non equivale a una disattivazione reale.

**GO soltanto dopo** prova su sito pubblico delle richieste pre-consenso e smoke cart/checkout/login, più verifica sessione Admin autenticata. Inventario separato di Shopify Customer Events, pixel e cookie; la disattivazione del servizio Lovable **non certifica da sola** la conformità GDPR. Non riabilitare automaticamente un servizio che ripristina raccolta facoltativa non ancora qualificata.

## Priorità 2 — Spedizioni nove località

**Dipendenza esterna reale:** accesso all'esistente `Online Garden Shipping Test` e matrice CAP/località del vettore con frazioni, alias, eccezioni. Il simulatore ottiene 69/69 con due opzioni prezzate in ingresso; il checkout Grow attuale espone una sola opzione. Una funzione di puro hide non può creare un prezzo che non esiste. Verificare in Dev la presenza di entrambe le tariffe e compatibilità effettiva del selettore su Grow, incluse wallet, CAP condivisi e gruppi A/B. Non installare app o modificare checkout live senza prova Dev, costo incrementale confermato a zero, backup/rollback e mandato specifico. Non estendere tariffe insulari a intere province continentali.

## Priorità 3 — Cinque informative

**Versione:** revisione 2, hash nel [fascicolo](../legal/CLIENT-LEGAL-PUBLICATION-CHECKLIST.md); tutte **NON pubblicate**. Necessari recapito telefonico commerciale pubblico, luogo di rientro dei resi e costi, tempi di preparazione e consegna, procedura recesso elettronico, registro finalità/fornitori/ruoli e tempi di conservazione, pixel e Customer Privacy. La ragione sociale `M.G. PLANT DI GERON MARCO` e la sede sono confermate dal responsabile. Dopo integrazioni e revisione legale, acquisire approvazione delle impronte dei nuovi corpi, backup della privacy Shopify esistente, pubblicazione delle policy autorizzate e verifica di footer e checkout. **Non dichiarare cinque policy attive prima del test e della firma.**

## Priorità 4 — 953 ordini WooCommerce

**Blocco non risolvibile dal codice:** nei file disponibili esistono solo conteggi per cliente; **0/953 record ordine individuali** e **0/857 identità cliente approvate/associate**. Serve esportazione Woo REST v3 ordine-per-ordine, backup coerente HPOS/classico, oppure accesso autorizzato di sola lettura al vecchio store. Chiedere al precedente fornitore di conservare e consegnare una copia integra che comprenda testate, righe, ID stabili, importi, sconti, imposte, consegna, date, pagamenti, rimborsi e legami cliente. Conservare il pacchetto **solo in archivio privato**, con provenienza/checksum.

Con fonte valida: preflight, riconciliazione cliente e reporting, lettura delle automazioni ordini/email già installate, autorizzazione **per un solo ID pilota**, verifica del risultato e **autorizzazione batch distinta** per ID verificati. Mai creare 953 ordini da contatori aggregati. Nessuno sviluppo Sendcloud è richiesto; non assumere per questo che eventuali automazioni già installate siano inattive.

## Separato — 23 novembre

Cloudflare, DNS, DKIM e 16 redirect 301 sono rinviati a domani, fuori dai task di oggi; procedere solo con backup zone e coordinamento autorizzato. Il collaudo personale Admin di Marco e le tre prove su identità Shopify restano PENDING_CLIENT_ACCEPTANCE.

**Fonti:** [rapporto PR #67](FINAL-COMMERCIAL-CLOSEOUT-2026-11-22.md), [prove isolate PR #66](PROVE-ISOLATE-SPEDIZIONI-ANALYTICS-2026-11-22.md), [approvazioni](FINAL-CLIENT-APPROVALS.md), [migrazione storica](../migration/woocommerce-history-2026-11-20.md), [SAL](SAL-2026-11-21.md).
