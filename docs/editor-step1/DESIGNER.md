# Step 1 — UX di verifica

Implementata nell'editor esistente, non pubblicata. Stato complessivo PARZIALE/BLOCCATO per il collaudo live; [limiti tecnici](DEVELOPER.md).

Descrizione: area visuale con toolbar e link etichettato; nessun HTML. Contenuto non rappresentabile senza perdita: avviso e conservazione dell'originale, senza conversione automatica. Editor bloccato non equivale a contenuto vuoto.

Card: azione Modifica in alto, testo Modificabile/In modifica, Bozza interna al posto di Solo Admin. Salva bozza cambia solo il locale; Aggiorna sul sito richiede conferma. Annulla non scrive. Confronti chiusi sotto Dettagli e confronto. Descrizioni alternative indicano che aggiornano lo stesso testo Shopify.

Liste: Punti di forza, Caratteristiche principali, Altri punti utili; una voce per riga, aggiunta/rimozione e su/giù utilizzabili da tastiera. Nessun JSON. Mancata autorizzazione deve produrre una spiegazione, non un pulsante che sembra rotto.

Formati: scelta iniziale Un solo formato/Più formati, esempi esplicativi non precompilati, SKU proposti solo per nuove varianti. Prezzi in euro con virgola, prezzo precedente facoltativo; nessun valore inventato. AI non è necessaria per comprendere il modulo.

Proposta AI: richiesta volontaria, valore corrente e proposta, modifica/scarto/applicazione confermata. Applicare non aggiorna il sito. Su campi completamente vuoti la compilazione AI resta bloccata: richiedere fatti verificati, non creare contenuto automaticamente.

Test Chromium a 1280 e 390 pixel e tastiera nel percorso sintetico; nessuna certificazione completa WCAG, Safari, screen reader o sessione reale. Prima dell'accettazione: verificare focus, lettura dei messaggi, target touch, descrizioni legacy complesse e contrasto nella sessione autorizzata.
