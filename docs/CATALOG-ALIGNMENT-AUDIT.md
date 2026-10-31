# Audit catalogo — aggiornamento Admin operativo

31 ottobre 2026. Nessuna nuova attestazione live di completezza del catalogo in questa fase.

## Evidenze storiche e pubbliche, mantenute distinte

| Fonte | Risultato verificato nel relativo audit | Limite |
| --- | --- | --- |
| Storico Fase 3B | 903 famiglie; 821 assegnate; 82 NEEDS_REVIEW | Non è lo stato Admin live attuale |
| Storefront pubblico, 30 ottobre 2026 | 1.348 Product GID; 1.346 esclusi due test; 23 collezioni canoniche; 364 senza canonica pubblica; 191 senza alcuna collezione pubblica; 1.961 membership | Non include necessariamente bozze, tutti i canali o mapping Supabase |
| Admin privato e Supabase | Non verificati live in questa fase | Manca accesso autorizzato completo ed export storico ID/SKU |
| 82 storici | Da riconciliare/verificare | Nessuno dichiarato risolto o ancora aperto senza match per identità |

L'[audit completo e la matrice prodotti-collezioni](https://github.com/Rosin355/your-e-commerce-blueprint/blob/243406976f8a8fe70879103460bc23772b7dc227/docs/CATALOG-ALIGNMENT-AUDIT.md) e le [evidenze CSV](https://github.com/Rosin355/your-e-commerce-blueprint/tree/243406976f8a8fe70879103460bc23772b7dc227/docs/catalog-audit-evidence/2026-10-30) restano nel branch dedicato. Non sono duplicati né caricati nell'applicazione come dati correnti.

## Cosa cambia con l'Admin V2

La pagina categorie legge le tabelle interne attraverso l'API autenticata. I conteggi riguardano famiglie attive e assegnazioni canoniche **approvate**, non varianti o categorie raw importate. Le letture percorrono tutte le pagine; un errore o superamento del limite esplicito non diventa un conteggio zero. Le query non sono una snapshot transazionale: la UI dichiara questa limitazione.

Le 23 handle canoniche provengono dalla precedente configurazione di allineamento. Gerarchie, ID e nomi arrivano dal DB: nessuna categoria viene generata dal titolo. Una collezione con zero assegnazioni interne non è dichiarata vuota su Shopify. Il menu è confrontato separatamente con `src/config/categories.ts`.

Per un'assegnazione, l'anteprima interna viene distinta dal confronto delle membership Shopify: se mapping o connessione non sono disponibili, non è eseguibile. Quando abilitata e autorizzata, l'applicazione preserva le collezioni non canoniche e modifica solo quelle manuali validate. La conferma interna avviene soltanto dopo la rilettura Shopify.

## Prossima verifica completa, senza bloccare lo sviluppo

Ottenere connessione Admin read-only allo store corretto, accesso Supabase al progetto corretto e manifest storico dei 903/82. Enumerare prodotti/varianti/pubblicazioni, confrontare SKU normalizzati e GID esatti, distinguere parent e varianti, verificare tutti i menu handle, riconciliare i casi storici con evidenze individuali. Nessuna proposta automatica di categoria, nessuna riassegnazione massiva.
