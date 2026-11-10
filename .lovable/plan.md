# Verifica tecnica in sola lettura: product-admin-api (nessuna modifica eseguita)

## 1. Versione distribuita e sorgente recuperabile
- I metadati di distribuzione a cui ho accesso NON espongono uno SHA Git né l'hash del bundle in esecuzione. Non posso rileggere il codice runtime.
- Riferimento noto: ultimo deploy da me eseguito da `main@4f5bdef` (contiene `4fe0a14`), impronta del pacchetto inviato `b0f66cc3…437af3`. Dimostra cosa è stato inviato, non cosa gira ora (eventuali deploy successivi fuori da questa chat non sono rilevabili).
- Stato repository locale: HEAD `1324f05`; ultimo commit che tocca la funzione `4fe94d1` (2026-11-09).
- Metodo reale per conservare/ridistribuire il precedente senza credenziali: la cronologia Git del repository è l'unica sorgente recuperabile. Registrare ora lo SHA approvato come "precedente" e, in rollback, ridistribuire la sola funzione da quel commit. Non esiste export del bundle runtime.

## 2. Strumento per distribuire SOLO product-admin-api
- Lo strumento interno di deploy funzioni accetta un elenco esplicito di nomi (`["product-admin-api"]`) e distribuisce soltanto quelle, senza toccare altri backend.
- Limite: distribuisce il codice presente nel checkout del progetto, non uno SHA arbitrario. Va prima verificato che il checkout corrisponda allo SHA approvato (`git rev-parse HEAD` + diff vuoto sulla cartella). Non posso fare checkout di un altro commit (comandi Git di stato vietati).

## 3. Atomicità SQL
- Il trasporto SQL di modifica invia la query come un unico payload; per uno script BEGIN...COMMIT senza meta-comandi psql l'esecuzione è in una singola connessione/statement batch e un errore annulla tutto. Non verificato con test (DDL di prova vietato): va trattato come atteso, non provato.
- Non supporta meta-comandi psql (`\set`, `\if`), già osservato in precedenza. La via raccomandata per DDL resta lo strumento migration, che è transazionale.
- Il ruolo psql di sola lettura non ha permessi di scrittura.

## Snapshot
- Lo snapshot 2026-11-10 05:26:11 UTC copre solo il database, non il codice delle funzioni; `restoreVerified=false` non è verificabile da qui.

Esito: VERIFICA COMPLETATA — SHA runtime NON DISPONIBILE; rollback possibile solo via Git + deploy mirato.
