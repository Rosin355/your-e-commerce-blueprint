# Preparazione della prova cliente e confronto degli accessi

Data della verifica: 13 novembre 2026. Questa nota distingue il test di Marco, l'accesso tecnico di Romesh e la necessita di pubblicazione. Non attesta nuove operazioni sul catalogo e non assegna permessi. Email e UUID personali non sono conservati qui.

## Accessi riletti in sola lettura

Fonte: query SELECT sul backend del progetto Lovable `95cad199-55fd-4870-9d5c-a2653edf88f5`, con ricerca esatta degli indirizzi forniti dal proprietario e output limitato a ruolo/capability. Nessuna lettura di password, token o hash.

| Account | Esistente e email verificata | Ruolo applicativo | Grant catalogo |
| --- | --- | --- | --- |
| Marco | Si | editor | Presente e attivo, sette capability e 14 campi |
| Romesh | Si | admin | Nessun record, nessuna capability nominativa |

Capability di Marco: edit, sync, drafts, images, categories, prices, publish. Campi: title, description, short_description, optimized_description, seo_title, seo_description, nome_botanico, nome_comune, periodo_di_fioritura, periodo_di_messa_a_dimora, periodo_di_raccolta, periodo_ottimale_di_potatura, difficolta_di_coltivazione, faq.

Un ruolo admin non e una replica del profilo editor. La lettura delle righe non equivale a una nuova prova HTTP autenticata per ciascun account. Non dichiarare che Romesh vede la stessa interfaccia o puo eseguire le stesse scritture di Marco. Eventuale abilitazione catalogo del tecnico richiede un grant nominativo autorizzato, compatibile con il percorso ordinario, mantenendo il ruolo esistente e senza modificare Marco, altri account o la modalita globale. Per una prova realmente equivalente al ruolo editor, preferire una distinta identita di test autorizzata; non condividere la password di Marco e non declassare l'unico accesso amministrativo per simulare il cliente. Nessuna di queste modifiche e stata eseguita.

## Publish

Lovable riporta ultimo commit editor `b5f3793cde264c91c25946574424ab0f3c84a197`. Confronto GitHub con il commit del rilascio `2d1cee558ff1e292f5d8f34e9d0f86b87b5ce6fb`: due commit successivi, differenze esclusivamente sotto docs/, nessun sorgente o configurazione applicativa cambiati. Il rilascio precedente e descritto in `docs/seo/evidence/release-2026-11-12.json` e nella guida cliente.

Per le modifiche note non serve un altro Publish per eseguire il test. Questa verifica legge metadati e diff: non e un nuovo deploy o collaudo HTTP della produzione. Usare il dominio pubblico, non la preview dell'editor; eventuali nuove modifiche applicative successive richiedono un confronto e un rilascio specifici. La presente nota e anch'essa solo documentale.

## Percorso da comunicare a Marco

Aprire `https://onlinegarden.it/admin` con il proprio account gia abilitato. Non occorre ripetere registrazione o prova del login.

1. Cercare un prodotto esistente e controllare la scheda. Salvare e sincronizzare soltanto una correzione reale concordata, verificando la rilettura; prezzi da cambiare solo se commercialmente richiesto, non per provocare un test.
2. Inserire un articolo reale che si vuole aggiungere: nome, SKU univoco, varianti e prezzi reali, foto dal computer e categoria editoriale certa. Se la categoria e dubbia, lasciare la bozza da classificare. Salvare, chiudere e riaprire la scheda per verificare persistenza e immagine. Con dati confermati, creare la bozza Shopify e controllare l'esito. Non creare duplicati o nuovi SKU per ritentare un errore.
3. Pubblicare soltanto un prodotto commerciale completo che il cliente ha deciso esplicitamente di mettere in vendita; eseguire la verifica pubblicazione e controllare scheda e categoria sul sito. La DRAFT tecnica TEST ADMIN - NON PUBBLICARE resta esclusa. Se il prodotto non e pronto, fermarsi alla bozza e registrare pubblicazione non provata.

Sono operazioni sul catalogo reale, non una sandbox. Una sincronizzazione su un prodotto gia pubblicato puo avere effetti sul sito; non usare valori inventati o testi provvisori su prodotti in vendita. Non modificare handle, SKU esistenti, inventario, spedizioni o pagamenti per il test.

Riscontro minimo: SKU, operazione eseguita, esito dopo ricaricamento ed eventuale messaggio/screenshot di errore con orario e browser. Screenshot senza credenziali o dati personali non necessari. Nessuna password o token da condividere. Se un campo o una funzione rimane bloccato, segnalare il blocco e non aggirarlo.

## Esito di questa verifica

Preparazione del messaggio cliente e confronto accessi completati. Nessuna mutation database, assegnazione ruolo/grant, modifica secret, invio di messaggi al cliente, creazione/sync/pubblicazione prodotto o deploy. Il collaudo operativo dalla sessione di Marco resta da documentare dopo le azioni effettivamente riuscite. Il test dal profilo di Romesh, anche se successivamente autorizzato, non sostituisce quello della sessione editor del cliente.
