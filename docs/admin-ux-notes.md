# Online Garden — note Admin UX

Aggiornamento: 29 settembre 2026

## QA finale 2C.2

Esito: **ADMIN V2 UX — GO-LIVE READY**.

Verificato live in sola lettura: navigazione, lista/ricerca/dettaglio, fixture `OG_264361` v5, fixture `OG_365676.colore_fiore = "viola"` v1, cinque manual-only su `OG_393883`, campi strutturali read-only, responsive 1440/820/390, loading/error/empty state e console senza errori bloccanti.

Correzioni P3 applicate: Salva solo su dirty state; "Valore non ancora inserito" per current assente; rimossa terminologia "RPC" da due messaggi; errori collegati ai field con `aria-describedby`.

Coperti da codice/test, non live: VERSION_CONFLICT UX, replay/idempotency conflict UI, FAQ editor e FAQ legacy/opache. Non bloccanti: nomi tecnici in cronologia e ruolo Editor non provato live.

## Fase 2D — “Migliora con AI” (code ready, non live)

Per un campo con `canSuggestAi=true` la card mostra “Migliora con AI”. Il click
non cambia il prodotto: apre una proposta con confronto Attuale/Proposta e le
azioni Modifica proposta, Rifiuta e Accetta.

| Stato | Esperienza |
|---|---|
| idle | pulsante “Migliora con AI” |
| loading | “Sto preparando una proposta…” con `aria-live` |
| proposal | confronto a due colonne da tablet/desktop, una colonna su mobile |
| editing | stesso editor tipizzato del campo; FAQ come domanda/risposta |
| accepted | conferma salvataggio e refresh del valore/versione |
| rejected | conferma che il prodotto non è stato modificato |
| stale | avviso, “Scarta” e “Genera nuova proposta”; nessun Accetta |
| provider error | errore leggibile, proposta/current invariati |

Il bottone non compare per i cinque campi manuali, identità, prezzo,
inventario, Shopify, relazioni parent/variation o campi senza strategia sicura.
Il layout usa griglie responsive (`md:grid-cols-2`), azioni `flex-wrap`, label
esplicite, focus nativo dei controlli e regioni `aria-live`; la verifica in
questo task è offline/statica + build, non uno smoke browser live.


## Obiettivo dell'interfaccia

La scheda Admin deve permettere di capire, per ogni campo, cosa arriva dalla
sorgente, qual è il valore corrente, chi può modificarlo e perché un'azione è
bloccata. L'interfaccia non deve ricostruire i permessi: usa esclusivamente le
capability restituite da `product-admin-api`.

## Editor

| Tipo campo | Esperienza prevista |
|---|---|
| testo / testo lungo | Input o textarea, senza conversioni implicite. |
| numero | Input numerico; il payload resta un numero. |
| booleano | Controllo sì/no; il payload resta booleano. |
| select / multiselect | Opzioni del registry; array conservati come array. |
| FAQ | Repeater domanda/risposta, senza JSON manuale. |
| JSON non riconosciuto | Sola lettura: nessuna conversione distruttiva. |

Le FAQ legacy sono normalizzabili solo quando il formato è riconoscibile senza
perdita. Un valore opaco o con proprietà aggiuntive resta invariato finché
l'utente non sceglie esplicitamente una sostituzione canonica.

## Originale, corrente e lineage

Ogni campo mostra separatamente:

- valore corrente;
- originale WordPress, se disponibile;
- provenance e stato di revisione;
- versione corrente;
- stato della sorgente.

Gli stati sorgente sono:

- `linked_snapshot`: collegamento puntuale verificato;
- `unlinked_baseline`: originale disponibile come confronto, ma non collegato
  alla singola riga;
- `original_absent`: nessun originale affidabile disponibile.

`source_snapshot_id=NULL` è valido e non deve produrre errore né attribuire una
provenienza inventata.

## Campi protetti

- `editable=false`, campi strutturali, inventario e stato Shopify: sola lettura;
- `manual_only`: nessuna proposta AI e protezione dal re-import;
- `is_locked`: il lock resta visibile e attivo anche quando un Admin può salvare
  un campo manuale;
- campo non applicabile al tipo `simple`, parent o `variation`: non mostrarlo
  come modificabile.

Il messaggio UX per un manual-only locked deve distinguere “protetto da
import/AI” da “non modificabile”. Dopo 2C.1 il server può concedere
`canUpdate=true` all'Admin mantenendo `isLocked=true`.

## Salvataggio e creazione

- riga esistente: inviare la versione letta come `expectedVersion`;
- valore corrente mancante: il primo salvataggio usa `expectedVersion=0`;
- nessun retry automatico dopo un conflitto;
- nessun pulsante Salva quando la capability server-side lo vieta;
- un salvataggio non deve avviare AI, import, Shopify o pubblicazione storefront.

## Conflitto di versione

In caso di `VERSION_CONFLICT`:

1. preservare la bozza locale;
2. mostrare la nuova versione server;
3. disabilitare un secondo Salva automatico;
4. offrire un ricaricamento esplicito senza overwrite;
5. richiedere all'utente un nuovo confronto prima di salvare.

## Stato visibile al cliente

Già disponibile:

- editor tipizzati;
- FAQ domanda/risposta;
- originale e corrente distinti;
- provenance, versione e stato sorgente;
- errori di versione senza overwrite;
- motivazione dei campi read-only.

Da collaudare:

- comparsa del Salva sui manual-only locked dopo la capability 2C.1;
- creazione di un valore mancante al primo salvataggio;
- messaggio di replay: oggi un retry identico dopo il successo viene mostrato
  come conflitto di versione, pur senza creare duplicati;
- distinzione UX tra replay già applicato e vero conflitto concorrente.

Già verificato secondo il report Lovable: update e ripristino controllati hanno
mantenuto `is_locked=true`, lineage e protezione, producendo due sole voci di
history per le due modifiche effettivamente applicate.

`OG_393883` resta prodotto golden di sola lettura fino ad approvazione esplicita.


## Fase 2C.2 — QA finale Admin V2 (2026-09-29)
ADMIN V2 UX — GO-LIVE READY (canary attivo). Backend 2C.1 CLOSED; create expectedVersion=0 live PASS; OG_365676.colore_fiore="viola" permanente; current values 24.467, history 5, command log 5. Due fix UX P3 (Salva solo con modifiche, niente "versione 0"). Dettagli: `docs/fase2c/qa-finale-admin-2C2.md`.
