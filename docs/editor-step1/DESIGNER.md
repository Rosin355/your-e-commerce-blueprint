# Step 1 — UX di verifica

Implementata nell'editor esistente, non pubblicata. Stato complessivo PARZIALE/BLOCCATO per il collaudo live; [limiti tecnici](DEVELOPER.md).

Descrizione: area visuale con toolbar e link etichettato; nessun HTML. Contenuto non rappresentabile senza perdita: avviso e conservazione dell'originale, senza conversione automatica. Editor bloccato non equivale a contenuto vuoto.

Card: azione Modifica in alto, testo Modificabile/In modifica, Bozza interna al posto di Solo Admin. Salva bozza cambia solo il locale; Aggiorna sul sito richiede conferma. Annulla non scrive. Confronti chiusi sotto Dettagli e confronto. Descrizioni alternative indicano che aggiornano lo stesso testo Shopify.

Liste: Punti di forza, Caratteristiche principali, Altri punti utili; una voce per riga, aggiunta/rimozione e su/giù utilizzabili da tastiera. Nessun JSON. Mancata autorizzazione deve produrre una spiegazione, non un pulsante che sembra rotto.

Formati: scelta iniziale Un solo formato/Più formati, esempi esplicativi non precompilati, SKU proposti solo per nuove varianti. Prezzi in euro con virgola, prezzo precedente facoltativo; nessun valore inventato. AI non è necessaria per comprendere il modulo.

Proposta AI: richiesta volontaria, valore corrente e proposta, modifica/scarto/applicazione confermata. Applicare non aggiorna il sito. Su campi vuoti e nuove bozze è presente “Aiutami a compilare”: fatti verificati per riga, conferma non preselezionata, richiesta volontaria, proposta modificabile, Scarta/Applica alla compilazione. Modificare i fatti invalida conferma e proposta; senza dati sufficienti spiegazione e manuale. Il modello organizza soltanto le frasi confermate, senza nuovi claim. Applicare non salva, sincronizza o pubblica.

Test Chromium a 1280 e 390 pixel e tastiera nel percorso sintetico; nessuna certificazione completa WCAG, Safari, screen reader o sessione reale. Prima dell'accettazione: verificare focus, lettura dei messaggi, target touch, descrizioni legacy complesse e contrasto nella sessione autorizzata.

Step 1A: verificato offline; GO al preflight in lettura dopo CI verde, nessuna disponibilità live attestata. Nuovo test browser: campo vuoto e nuova bozza, input insufficiente senza invocazione del provider simulato, scarto, revisione e applicazione visuale.

## Step 1C-1 — caratteristiche e conferma singolo campo

Conservare editor a voci e riordino. Per i tre elenchi separare Salva bozza da Aggiorna sul sito: niente azione combinata mentre si modifica. Solo la versione salvata può essere inviata, dopo dialogo di conferma e approvazione server nuova. La proposta AI non comporta sync. La UI segue le capability per campo del server: se baseline/definizione/tipo non sono verificabili nasconde l’azione e mostra un messaggio accessibile di blocco. Esito incerto: stop e richiesta di verifica, mai invito a riprovare alla cieca. Non comunicare disponibilità live prima del collaudo.

## Step 1C-2 — formato multilinea senza conversioni silenziose

key_features e special_bullets conservano l’editor a voci; la serializzazione a righe avviene solo sul server. Una voce non può contenere una nuova riga in questo formato. Mostrare blocco comprensibile per valori legacy ambigui e preservare l’originale; niente rimozione automatica di righe/spazi. key_benefits resta bloccato sul negozio finché non è approvata una definizione compatibile. Nessuna modifica al parser o al layout storefront. Versione non distribuita: non comunicare disponibilità live.
