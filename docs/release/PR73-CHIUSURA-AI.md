# Admin V2 · consegna assistita della nuova bozza

## Identificazione e collaudo

PR #73, base isolata `codex/rilascio-admin-v2-isolato-20261124`. Punto di partenza `9431d1d2b11c5f56f0d572bf76413ffb24fa8d83`. Il verbale distingue il candidato locale, l'attivazione sul Cloud e il collaudo personale. La SAL ufficiale è 57,75%.

| Verifica sul candidato | Evidenza ripetibile |
| --- | --- |
| Typecheck, build operativa, lint del modulo, Deno | Build Vite con Admin operativo. Entry locale `index-BcqOotvz.js`, SHA-256 `f254b4e7b2ada8527fbf99a15678a015dd9c70b3da147366d5b9e3208114c8bb`. |
| Handler e validazione | 118 test Node offline di descrizione, SEO, campi autorizzati e prodotti esistenti. Il provider simulato riceve una sola richiesta. Un identificativo prodotto o una richiesta di campi aggiuntivi nel contratto nuova bozza viene respinto prima della generazione. |
| PostgreSQL | Migrazione reale su cluster locale, doppio avvio Drizzle, rollback atomico di DDL e journal con privilegi ereditabili eccessivi, RLS, ACL effettive, revoca per campo, quota condivisa e replay. |
| Browser Chromium | 11 test superati. Descrizione vuota, errore e ripresa a 390 e 1280 px. Nel percorso completo, selezione da libreria immagini, categoria, tre mesi sparsi, due formati e relativi SKU, approvazione parziale, annullamento sovrascrittura, salvataggio e riapertura su API simulate. Nessuna chiamata di invio a Shopify. |
| Tipo prodotto | In assenza di mappatura approvata, Marco può indicare il tipo o confermare Alberi o Arbusti per la singola bozza. Le etichette tecniche importate restano escluse dalle proposte. |

## Migrazione, attivazione e recupero

Il migratore del progetto deve trovare soltanto `0020_admin_new_draft_editorial` dopo 0019. Il checksum SQL è `6cdbab67cf8fae7639e87ee02ae69e519317ef9ff2f9ee26e21bf2fe4aa2e684`, il timestamp Drizzle è `1795539011604`. Il deploy della Edge e la creazione delle abilitazioni individuali sono operazioni distinte. La migrazione crea zero abilitazioni. La routine è SECURITY INVOKER con search_path vuoto e accesso riservato a service_role. Ogni richiesta applica di nuovo il grant, il registro e la quota. Il journal memorizza i nomi dei campi, l’identificativo richiesta e l'impronta del contesto.

L’attivazione è circoscritta al solo Editor Marco già autorizzato alle bozze. Verificare l'identità contro il riferimento di approvazione già registrato e il ruolo Editor esclusivo. Inserire in transazione tre opt-in nominativi con riferimento `PR73-20261124-new-draft-only`. Per i tag serve una definizione core tag scrivibile e visibile. `tags.ai_allowed` resta falso nel registro globale. I permessi dei prodotti esistenti continuano a seguire la policy precedente. Le righe tecniche e la cronologia della migrazione si conservano durante un rollback.

Per revocare, individuare lo stesso actor e il riferimento esatto e rimuovere soltanto i tre opt-in di questo rilascio. Verificare il conteggio zero conservando gli altri riferimenti. Per arrestare tutte le nuove selezioni editoriali si può impostare il flag dedicato `PRODUCT_ADMIN_DRAFT_AI_EDITORIAL_ENABLED=false`. Nella nuova Edge, se PostgREST indica che la nuova routine manca, si usa la prenotazione limitata alla descrizione. Un errore di autorizzazione o un esito incerto blocca la generazione.

## Snapshot e procedura di ripristino

Ultimo invio tracciato della funzione AI nella cronologia nativa Lovable il 18 novembre da `3be5644d8a6a562dbd2da5f8275f3135298e4712`. La revisione binaria attiva e la configurazione JWT runtime non sono esposte dal connettore. La ricevuta riporta un’impronta abbreviata del file principale con suffisso diverso da quello ricalcolato. Per il recupero si usa il sorgente del commit documentato. L’entrypoint corrisponde byte per byte anche alla baseline frontend pubblicata `5a37f71`, mentre tre dipendenze condivise differiscono. Il pacchetto di rollback usa quelle del commit del deploy.

- Archivio privato per il ripristino `product-admin-ai-rollback.tar.gz`, SHA-256 `656f9d786ae423e57d0aa1c0933329a21c53fc4cb4c1148093bff4904cac28c9`. Include 24 moduli, lock Deno e configurazione pubblica versionata. Entrypoint SHA-256 `ed53a254bba5802e856f48b256d07a75ec383fd24f93271712fc77919631d7a4`.
- Candidato `product-admin-ai-candidate.tar.gz`, SHA-256 `dfca77d186acb649fe8ba7be79c09f930af342509553357768a30b943dc09d1f`. Include 26 moduli, lock e configurazione. Entrambi gli archivi sono stati estratti in directory pulite e controllati con Deno e lock congelato.
- Ripristinare i sorgenti da Git o archivio in un checkout temporaneo, ricalcolare il manifest e usare il deploy nativo con il solo nome `product-admin-ai`. Conservare la configurazione di autenticazione e le variabili esistenti. Verificare OPTIONS, azione di lettura anonima rifiutata e lettura staff autenticata. Prima del deploy sono stati osservati OPTIONS 200 e lettura anonima 401 con codice UNAUTHENTICATED sulla Edge pubblica. Il deploy nativo selettivo è presente nelle ricevute Lovable. Il ripristino in produzione si esegue in caso di regressione.
- Per il frontend, selezionare nella Cronologia Lovable la versione pubblicata con `index-jqOemgjy.js`, ripubblicarla e verificare l'asset SHA-256 `74449f1d0f5cf1f834a076535f8e04681e9598160486ab81c2144b8ab3a10c4e`. Verificare separatamente stato della Edge e opt-in.

## Accettazione personale

Marco apre Nuovo prodotto, indica nome e fatti verificati, due formati, prezzi, immagine e categoria. Sceglie tre mesi verificati indipendenti. Conferma i fatti, genera una sola scheda e controlla l'origine delle cinque righe. Applica una proposta, annulla una sostituzione manuale, sceglie o lascia vuoto il tipo, salva solo la bozza interna e la riapre. Annotare data, versione, esito e conferma di Marco prima di rivalutare la SAL.
