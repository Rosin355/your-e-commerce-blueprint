# Accessi catalogo e preparazione della prova cliente

Aggiornamento: 13 novembre 2026, dopo l'abilitazione autorizzata di Romesh. Email, UUID personali e credenziali non sono conservati qui. Questa nota attesta la configurazione dei permessi riletta sul server, non un salvataggio o una pubblicazione dalla sessione del proprietario.

## Abilitazione eseguita

Il proprietario ha chiesto esplicitamente le stesse funzioni catalogo di Marco per modificare e aggiungere prodotti, confermando il mantenimento del proprio ruolo admin. Riferimento del consenso registrato nel grant: `OWNER-ROMESH-CATALOG-PARITY-20261113`.

Preflight in sola lettura attraverso il progetto Lovable `95cad199-55fd-4870-9d5c-a2653edf88f5`: entrambi gli account univoci e con email verificata; Marco editor con grant attivo, Romesh admin senza grant. Controllati colonne, vincoli e assenza di trigger applicativi sulle due tabelle interessate.

Il codice esistente `supabase/functions/_shared/admin-catalog-policy.ts` richiede sia un grant nominativo abilitato sia il ruolo editor. Per questo e stato aggiunto editor a Romesh, senza rimuovere admin. Non sono stati cambiati codice, modello globale di autorizzazione o configurazione canary.

Una sola istruzione DO atomica ha:

- verificato le identita e bloccato le righe pertinenti;
- confrontato il grant sorgente con le sette capability e i 14 campi concordati;
- aggiunto il solo ruolo editor al proprietario, preservando admin;
- inserito un grant proprietario attivo, con le stesse capability e field_keys di Marco e un riferimento di consenso proprio;
- verificato le postcondizioni e confrontato digest dello stato ruoli/grant degli altri account, invariato;
- evitato sovrascritture di un grant concorrente non coincidente.

La rilettura SELECT indipendente dopo la scrittura conferma il seguente stato. Timestamp della modifica: **2026-11-13T11:00:44.972932Z**, corrispondente alle **12:00:44 CET**.

| Account | Esistente e email verificata | Ruolo applicativo | Grant catalogo |
| --- | --- | --- | --- |
| Marco | Si | editor | Presente e attivo, sette capability e 14 campi; invariato |
| Romesh | Si | admin + editor | Presente e attivo, stesse sette capability e stessi 14 campi |

La parita di enabled/capabilities/field_keys e stata verificata direttamente tra le due righe. Zero grant catalogo attivi al di fuori di questi due account. Il record di Marco conserva il timestamp `2026-11-12T09:13:55.220093Z` e il proprio riferimento di approvazione. RLS della tabella capability rimane attiva; anon e authenticated non hanno privilegi INSERT/UPDATE/DELETE sulla tabella dei grant. Nessuna policy o ACL modificata.

Capability comuni: `edit`, `sync`, `drafts`, `images`, `categories`, `prices`, `publish`.

Campi comuni: `title`, `description`, `short_description`, `optimized_description`, `seo_title`, `seo_description`, `nome_botanico`, `nome_comune`, `periodo_di_fioritura`, `periodo_di_messa_a_dimora`, `periodo_di_raccolta`, `periodo_ottimale_di_potatura`, `difficolta_di_coltivazione`, `faq`.

## Perimetro e limiti

Sono cambiate esclusivamente una nuova assegnazione editor e una nuova riga di capability per Romesh. Nessun cambiamento a Marco o agli altri account, password, verifica email, secret, flag globali, catalogo, prezzi, inventario, ordini, pagamenti, spedizioni, Sendcloud o infrastruttura. Nessuna migration, creazione prodotto, sincronizzazione, pubblicazione o deploy eseguiti.

Il backend carica ruoli e grant per l'utente autenticato. `catalogAllowed`/`catalogMode` derivano il percorso operativo ordinario dal ruolo editor e dal grant attivo; non e stato impostato globalmente full e il vecchio canary non e stato riaperto. Le conferme UI, approvazioni persistite, controllo versione, idempotenza e protezioni per prodotto restano quelle distribuite.

Questa e una verifica persistita lato database e una lettura delle guardie nel codice, non una richiesta HTTP autenticata come Romesh. La sessione personale e le operazioni di catalogo devono essere verificate dal proprietario con le proprie credenziali; nessuna impersonificazione o token acquisito. Master e altri flag non sono stati riletti in questa modifica, ne cambiati.

Romesh mantiene privilegi amministrativi preesistenti: le funzioni catalogo sono equivalenti, ma la sua interfaccia non e necessariamente identica al profilo solo editor di Marco. Il test di Romesh non sostituisce l'accettazione dalla sessione cliente.

## Accesso dopo la modifica

Aprire `https://onlinegarden.it/admin` dal dominio pubblico, non dalla preview. Per aggiornare lo stato visualizzato, uscire e rientrare con il proprio account e controllare la modifica campi abilitata in Impostazioni. Il grant e stato assegnato nel database esistente: non richiede un Publish frontend o una nuova build. Se il permesso visualizzato o un'azione non corrispondono alla configurazione attestata, segnalare l'esito concreto senza cambiare globalmente modalita o ruoli.

## Publish e confronto sorgenti precedente

Nella lettura precedente Lovable riportava ultimo commit editor `b5f3793cde264c91c25946574424ab0f3c84a197`. Il confronto GitHub con il rilascio `2d1cee558ff1e292f5d8f34e9d0f86b87b5ce6fb` mostrava due commit successivi con differenze esclusivamente sotto docs/. Non era una nuova verifica HTTP del deployment. La presente modifica aggiorna i permessi persistiti e questo documento, non i sorgenti applicativi; nessun Publish effettuato.

## Percorso da comunicare a Marco e usare per il test del proprietario

1. Cercare un prodotto esistente e controllare la scheda. Salvare e sincronizzare soltanto una correzione reale concordata, verificando la rilettura; prezzi da cambiare solo se commercialmente richiesto, non per provocare un test.
2. Inserire un articolo reale che si vuole aggiungere: nome, SKU univoco, varianti e prezzi reali, foto dal computer e categoria editoriale certa. Se la categoria e dubbia, lasciare la bozza da classificare. Salvare, chiudere e riaprire la scheda per verificare persistenza e immagine. Con dati confermati, creare la bozza Shopify e controllare l'esito. Non creare duplicati o nuovi SKU per ritentare un errore.
3. Pubblicare soltanto un prodotto commerciale completo che il cliente ha deciso esplicitamente di mettere in vendita; eseguire la verifica pubblicazione e controllare scheda e categoria sul sito. La DRAFT tecnica TEST ADMIN - NON PUBBLICARE resta esclusa. Se il prodotto non e pronto, fermarsi alla bozza e registrare pubblicazione non provata.

Sono operazioni sul catalogo reale, non una sandbox. Una sincronizzazione su un prodotto gia pubblicato puo avere effetti sul sito; non usare valori inventati o testi provvisori su prodotti in vendita. Non modificare handle, SKU esistenti, inventario, spedizioni o pagamenti per il test.

Riscontro minimo: SKU, operazione eseguita, esito dopo ricaricamento ed eventuale messaggio/screenshot di errore con orario e browser. Screenshot senza credenziali o dati personali non necessari. Nessuna password o token da condividere. Se un campo o una funzione rimane bloccato, segnalare il blocco e non aggirarlo.

## Revoca circoscritta eventuale

La revoca non e stata eseguita. Su nuova richiesta del proprietario, disabilitare esclusivamente il suo grant e valutare la rimozione della sola assegnazione editor aggiunta in questo change, dopo controllo di eventuali utilizzi successivi. Preservare admin, l'account Marco e gli altri account. Nessun rollback generale del database o del sito.

## Esito

**ACCOUNT PROPRIETARIO CONFIGURATO E RILETTO: PARITA CATALOGO CON MARCO.** Accesso e scritture dalla sessione personale del proprietario non eseguiti in questo intervento. Il collaudo operativo cliente e la pubblicazione commerciale restano da documentare dopo le azioni effettivamente riuscite.
