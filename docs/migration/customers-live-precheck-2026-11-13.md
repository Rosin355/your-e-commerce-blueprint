# Online Garden — precheck reale read-only email-only (13 novembre 2026)

> **Esplorazione aggregata, NON esecuzione del preflight CLI e NON autorizzazione a importare.** Nessun import, export CSV, writer, merge, deploy o modifica di Shopify/Drive. Nessun dato personale o ID cliente in questo documento.

## Origine e metodo

- Riletti esclusivamente i campi necessari dalle due schede storiche Google Sheets, usando intervalli di colonne selettivi per ID, email, ruolo, telefono e contatore ordini (join per ID); non è stata scaricata la cartella né la scheda contenente hash password o token di sessione.
- Riletti in sola lettura i profili Shopify del negozio Online Garden; conteggio amministrativo esatto `customersCount(limit: null) = 12` (13/11/2026).
- Confronto esplorativo in memoria: email con trim/minuscole, telefoni con la stessa logica concettuale delle chiavi internazionali, nazionali e somiglianze per suffisso introdotta nella PR #53; nessuna chiave o recapito persistito.
- **Non** è stato generato lo snapshot `Email,Phone` né il manifest v2 con catena di cursori, conteggio iniziale/finale e SHA-256; non è stato eseguito lo script `sync/customers-convert.mjs --email-only` su file reali.

## Conteggi aggregati osservati

| Voce | Valore |
|---|---:|
| Account storici selezionati | 1.108 |
| Account con ordini nella selezione | 858 |
| Somma degli ordini associati | 953 |
| Account con ordini e ruolo `customer` | **857** |
| Account con ordini e ruolo `author` | **1 (escluso)** |
| Profili Shopify nel negozio connesso | **12** |
| Profili Shopify con email | **11** |
| Profili Shopify senza email, ma con telefono | **1** |
| Match email fra customer storici con ordini e Shopify | **1** |
| Customer storici con ordini senza match email | **856** |
| Telefoni E.164 tra i 857 customer acquirenti | **90** |
| Telefoni nazionali riconoscibili tra i 857 | **766** |
| Telefoni malformati tra i 857 | **1** |
| Telefoni assenti tra i 857 | **0** |
| Customer con ordine coinvolti in somiglianze telefoniche nella selezione legacy | **6** |
| Customer con ordine con match telefono esatto/somigliante verso Shopify | **0** |
| Customer con ordine con email duplicata nella selezione | **0** |
| Customer senza match email e senza conflitti telefono rilevati dai controlli esplorativi | **849** |

I 6 casi di somiglianza sono da revisionare **privatamente**, non sono duplicati confermati. Il telefono malformato è da bloccare/revisionare. Le categorie potrebbero sovrapporsi in altri export/versioni; il valore **849** deriva dai controlli effettuati qui su email/telefono/ruolo, e **non è un conteggio di clienti importabili**. Il numero finale potrà essere inferiore dopo controlli di identità, qualità anagrafica, coerenza snapshot, permessi e review.

## Cosa dimostra e cosa NO

- Dimostra che il campo `orders` può essere ricongiunto per ID alle anagrafiche selezionate e che i totali storici tornano, senza accedere alle colonne `user_pass` o `session_tokens`.
- Indica che l'approccio email-only, con gestione prudente dei telefoni, è una strada praticabile per ottenere una **lista di eccezioni**.
- Non certifica la completezza storica di tutti gli ordini (es. guest), né l'identità delle persone, né disponibilità/validità delle email, né opt-in marketing.
- Non sostituisce il preflight privato della PR #53: lo snapshot v2 e il join input reale minimizzato devono ancora essere verificati con lo script previsto. Il report `emailOnlyReviewCandidates` è un aggregato di review e `proposedNew` deve restare **0**.
- Non autorizza nessuna modifica a clienti Shopify, database, email transazionali, marketing, checkout o sito pubblico.

## Azione successiva e responsabilità

1. Un operatore autorizzato prepara **fuori da Git** `sheet2-minimo.csv` (solo colonne approvate, inclusi telefono originale/ruolo/email/ID) e `id-orders.csv` (solo ID e orders) con revisioni coerenti.
2. Un operatore autorizzato prepara lo snapshot Shopify minimizzato `Email,Phone` e il manifest v2, con conteggio completo esatto, tracciamento della paginazione e data UTC recente. Il negozio destinatario verificato è `ecom-blueprint-gen-6ud1s.myshopify.com`; il numero 12 è solo quello osservato oggi e può cambiare.
3. Eseguire localmente `--email-only` nella branch della PR #53, senza rete/scritture ai provider, tenendo i file in cartella privata cifrata, e produrre **solo il report aggregato**. Atteso exit 2 per review obbligatoria anche quando non vi sono errori tecnici.
4. Esaminare in privato i 6 sospetti e il telefono malformato, senza modificare automaticamente recapiti o scartare record per forzare il risultato.
5. Prima di qualsiasi futura creazione di account: approvazione di finalità e dati, piano accesso clienti, consenso marketing disattivato, writer separato revisionato, backup/journal e autorizzazione esplicita a un lotto pilota.

**Stato complessivo: precheck informativo verificato, preflight formale reale ancora da eseguire; nessun merge o deploy.**
