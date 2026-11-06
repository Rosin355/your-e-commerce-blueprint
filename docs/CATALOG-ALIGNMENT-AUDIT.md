# Audit catalogo — aggiornamento Admin operativo

31 ottobre 2026. Nessuna attestazione di completezza/mapping del catalogo; aggiunta una lettura Admin limitata a fine sessione.

## Evidenze storiche e pubbliche, mantenute distinte

| Fonte | Risultato verificato nel relativo audit | Limite |
| --- | --- | --- |
| Storico Fase 3B | 903 famiglie; 821 assegnate; 82 NEEDS_REVIEW | Non è lo stato Admin live attuale |
| Storefront pubblico, 30 ottobre 2026 | 1.348 Product GID; 1.346 esclusi due test; 23 collezioni canoniche; 364 senza canonica pubblica; 191 senza alcuna collezione pubblica; 1.961 membership | Non include necessariamente bozze, tutti i canali o mapping Supabase |
| Admin privato e Supabase | Conteggi Admin limitati verificati a fine sessione; Supabase non verificato | Manca ancora la riconciliazione ID/SKU e l’export storico |
| 82 storici | Da riconciliare/verificare | Nessuno dichiarato risolto o ancora aperto senza match per identità |

L'[audit completo e la matrice prodotti-collezioni](https://github.com/Rosin355/your-e-commerce-blueprint/blob/243406976f8a8fe70879103460bc23772b7dc227/docs/CATALOG-ALIGNMENT-AUDIT.md) e le [evidenze CSV](https://github.com/Rosin355/your-e-commerce-blueprint/tree/243406976f8a8fe70879103460bc23772b7dc227/docs/catalog-audit-evidence/2026-10-30) restano nel branch dedicato. Non sono duplicati né caricati nell'applicazione come dati correnti.

## Cosa cambia con l'Admin V2

La pagina categorie legge le tabelle interne attraverso l'API autenticata. I conteggi riguardano famiglie attive e assegnazioni canoniche **approvate**, non varianti o categorie raw importate. Le letture percorrono tutte le pagine; un errore o superamento del limite esplicito non diventa un conteggio zero. Le query non sono una snapshot transazionale: la UI dichiara questa limitazione.

Le 23 handle canoniche provengono dalla precedente configurazione di allineamento. Gerarchie, ID e nomi arrivano dal DB: nessuna categoria viene generata dal titolo. Una collezione con zero assegnazioni interne non è dichiarata vuota su Shopify. Il menu è confrontato separatamente con `src/config/categories.ts`.

Per un'assegnazione, l'anteprima interna viene distinta dal confronto delle membership Shopify: se mapping o connessione non sono disponibili, non è eseguibile. Quando abilitata e autorizzata, l'applicazione preserva le collezioni non canoniche e modifica solo quelle manuali validate. La conferma interna avviene soltanto dopo la rilettura Shopify.

## Prossima verifica completa, senza bloccare lo sviluppo

Ottenere connessione Admin read-only allo store corretto, accesso Supabase al progetto corretto e manifest storico dei 903/82. Enumerare prodotti/varianti/pubblicazioni, confrontare SKU normalizzati e GID esatti, distinguere parent e varianti, verificare tutti i menu handle, riconciliare i casi storici con evidenze individuali. Nessuna proposta automatica di categoria, nessuna riassegnazione massiva.


## Addendum — Shopify Admin disponibile a fine sessione

Connessione verificata sul dominio corretto; query read-only per stato con precisione `EXACT`:

| Stato Admin | Prodotti |
| --- | ---: |
| ACTIVE | 1.348 |
| DRAFT | 16 |
| ARCHIVED | 0 |
| UNLISTED | 0 |
| Totale aritmetico delle quattro risposte | 1.364 |

Collezioni Admin: **55**, conteggio esatto. Le letture per stato non sono una snapshot transazionale. Non sono stati esclusi prodotti test da questi conteggi; non è stata enumerata la nuova matrice GID/SKU/varianti. La coincidenza dei 1.348 attivi con il precedente conteggio pubblico non prova da sola la stessa composizione o le stesse pubblicazioni. I 903 storici e gli 82 restano da riconciliare.

La connessione Admin ora disponibile rimuove il precedente impedimento di accesso Shopify per il successivo audit, ma non sostituisce Supabase autorizzato e manifest storico. [Query e risposta sanificata](admin-v2-evidence/2026-10-31/shopify-read-only-summary.json).
