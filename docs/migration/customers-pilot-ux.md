# Online Garden — UX del pilota clienti, 15 novembre 2026

**Specifica da approvare; nessuna interfaccia modificata o pubblicata, nessuna comunicazione inviata.** Il [piano operativo](customers-pilot-plan-2026-11-15.md) riguarda inizialmente cinque profili email-only, con sette quarantene e il match esistente esclusi. Il cliente non deve ricevere promesse di recupero password o storico ordini.

## Decisione sul percorso di accesso

Proposta: accesso ospitato da Shopify Customer Accounts con email e codice monouso, su iniziativa del cliente. [Shopify documenta](https://help.shopify.com/en/manual/customers/customer-accounts/sign-in-options) il codice a sei cifre e l'assenza di password. La modalità effettivamente abilitata e il relativo URL ufficiale del negozio **non sono stati verificati qui**. Non inventare URL di login o pubblicare un pulsante prima del collaudo.

Nel codice remoto esaminato (`6d6cd5d`), `/auth` usa `useAuth` e `/account` dipende dallo stesso contesto; il callback Shopify aggiorna invece `customerStore`. Sono presenti due flussi differenti. È una lettura statica del repository, non una certificazione del runtime distribuito. **Creare un profilo Shopify non crea un'identità nell'autenticazione del sito.** Il designer e il developer devono scegliere un percorso unico comprensibile o spiegare la separazione, con modifica futura dedicata e autorizzata. Il pilota non modifica Supabase/Lovable né risolve implicitamente il login del sito.

Alternative da decidere:

| Percorso | Impatto e gate |
| --- | --- |
| Customer Accounts Shopify ospitati, proposto | Nessuna password legacy; URL/tipo account/brand verificati, flusso di accesso e assistenza collaudati in ambiente autorizzato. |
| Accesso dall'attuale sito | Richiede revisione separata dell'integrazione e delle identità; non dichiarare il pilota pronto all'uso finché il percorso non è chiarito. |
| Account legacy con password | Non proposto; inviti/attivazioni e vecchie password non rientrano nel pilota. Nessun cambio di impostazione effettuato. |

## Gate prima di costruire un importatore

Shopify documenta che, con i **nuovi Customer Accounts**, un cliente che effettua il login con una email non ancora presente può ottenere automaticamente un profilo ([fonte ufficiale](https://help.shopify.com/en/manual/customers/customer-accounts/upgrade/customization-options)). **Se l'obiettivo è esclusivamente permettere ai clienti storici di tornare ad acquistare**, l'import preventivo di 849 email potrebbe essere superfluo. Il profilo auto-creato non contiene però gli ordini WooCommerce e non corrisponde automaticamente alla sessione Supabase del portale. La modalità effettivamente abilitata per Online Garden deve essere verificata senza toccare account reali.

Una decisione UX/owner deve precedere il writer: **(A)** ingresso volontario Shopify passwordless con creazione eventuale al primo accesso oppure **(B)** creazione anticipata di 5 email giustificata da requisiti aggiuntivi espliciti. In entrambi i casi serve un percorso di accesso unico sul sito, con test di callback → area personale, logout, mobile, assistenza e comunicazioni su account **di prova autorizzati**. Non applicare questa modifica al runtime nell'attuale PR documentale.

**Incongruenza statica confermata:** il callback Shopify (`AccountCallback`) naviga verso `/account` dopo aver scritto in `customerStore`, ma `Account.tsx` usa `useAuth`/Supabase e rimanda a `/auth` senza relativa sessione. Aprire un intervento UI/auth separato soltanto dopo aver deciso il flusso. Nessuna correzione automatica, nessuna operazione su utenti live.

## Percorso futuro, solo dopo approvazione

1. Il cliente sceglie volontariamente «Accedi al tuo account» sul percorso verificato. Nessun redirect automatico, invito o email di benvenuto generato dal lotto.
2. Inserisce la propria email. Il codice di autenticazione è una comunicazione transazionale richiesta dal cliente, distinta da una campagna; questa preparazione **non lo provoca** e non effettua prove impersonando clienti reali.
3. Completa l'accesso sul dominio Shopify corretto. Nessuna richiesta della password WordPress; nessun reset dell'autenticazione del sito suggerito come scorciatoia.
4. Vede i dati effettivamente disponibili. Nel pilota email-only possono mancare nome, indirizzo e telefono; non inserire segnaposto personali o dati dedotti. Non promettere la presenza dei 953 ordini WooCommerce.
5. Se cambia email o non ha più accesso alla casella, assistenza su iniziativa dell'utente e verifica d'identità separata. Non unire profili automaticamente, non usare il solo telefono come prova, non rivelare l'esistenza di account a terzi.

Secondo la [documentazione Customer accounts](https://help.shopify.com/en/manual/customers/customer-accounts), un accesso con email non associata può creare un nuovo profilo. Quindi anche una prova di login live può costituire una scrittura: nessun test su clienti o negozio reale in questa attività. Il cliente con email già presente continua a usare il proprio profilo; il cliente senza email richiede gestione privata e non viene “completato” dal pilota.

## Testi di interfaccia proposti, non pubblicati

| Stato | Testo da sottoporre a revisione UX |
| --- | --- |
| Accesso Shopify confermato | «Accedi con la tua email. Riceverai un codice monouso: non serve la password del vecchio sito.» |
| Informazione sullo storico | «Gli ordini del precedente sito non sono disponibili in quest'area.» Da usare solo se coerente con il percorso finale. |
| Difficoltà di accesso | «Se non puoi accedere alla tua email, contatta l'assistenza. Ti aiuteremo a verificare i dati del tuo account.» |
| Errore generico | «Non è stato possibile completare l'accesso. Riprova più tardi o contatta l'assistenza.» Nessun ID, token, stack o dettaglio su altri utenti. |

Nessun testo di campagna, sconto, consenso pre-selezionato, messaggio “migrazione completata” o invito è approvato. Il flusso gestito da Shopify va verificato per messaggi effettivi e accessibilità; questi testi non implicano che ogni schermata sia personalizzabile.

## Accettazione UX e operativa

- [ ] Proprietario approva tipo account e URL ufficiale; chiarita la distinzione con `/auth` e `/account` del sito.
- [ ] Designer verifica mobile, tastiera, focus, etichette, errori, lingua, brand, ritorno al negozio e assistenza; nessun dato legacy mancante presentato come recuperato.
- [ ] Developer collauda in ambiente autorizzato con identità controllate: accesso volontario, OTP, profilo corretto, uscita e sessione; nessuna impersonificazione o accesso a account reali.
- [ ] Operatore verifica notifiche, Flow, app/webhook e code: zero messaggi provocati dalla creazione; OTP soltanto dopo azione volontaria in un flusso separatamente autorizzato.
- [ ] Consensi marketing non acquisiti, attivati o modificati dal pilota; nessuna comunicazione agli account esclusi.
- [ ] Assistenza dispone di procedura privata per casella non più accessibile, omonimie, recapiti alternativi e conflitti, senza merge o aggiornamenti automatici.

Tutte le caselle restano aperte. La verifica UX non è stata eseguita sul sito pubblico; nessun deploy è incluso nella PR del piano.
