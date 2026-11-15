# Online Garden — piano pilota clienti, 15 novembre 2026

**PLAN_ONLY / NO-GO alle scritture.** Proposta: primo lotto di **5** account; estensione fino a **10 totali** soltanto con un secondo go/no-go e autorizzazione esplicita. Questa PR contiene documentazione e un modello di test esclusivamente sintetico: nessun writer, payload clienti, esportatore, connessione al negozio o flag di attivazione.

## Evidenza di partenza e confini

Letti i documenti remoti della PR #53 al commit `6d6cd5d6905931f0e83168d54dcf08e148912aab`, inclusi gli aggiornamenti del 15 novembre. Il [report reale](customers-real-email-only-preflight-2026-11-13.md) e il [JSON originale](customers-real-email-only-preflight-2026-11-13.json) restano invariati: 849 candidati alla review, 7 quarantene, 1 match email; manifest v2; `proposedNew=0`, `productionAuthorized=false`, `status=BLOCKED`.

La CLI reale è stata eseguita sul commit `65131b6`; `ffa8702` ne ha pubblicato gli aggregati. Il dato 12 clienti Shopify è una fotografia del 13 novembre, non un conteggio attuale. Al 15 novembre lo snapshot ha superato 24 ore: non può autorizzare selezione finale o creazione. Nessuna nuova lettura di clienti reali, selezione nominativa o acquisizione privata effettuata in questa preparazione.

La nuova branch nasce dalla #53; la nuova PR ha come base `codex/customers-offline-preflight` per mostrare soltanto il piano e i test aggiuntivi. La #53 resta aperta e immutata. Prima di un futuro merge occorre decidere l'ordine d'integrazione e ricontrollare il diff; nessun merge, deploy o autorizzazione deriva da questa struttura.

## Selezione privata deterministica

1. Il responsabile recupera, in archivio cifrato esterno a Git, gli input minimizzati e le prove di provenienza/integrità. Se non sono più disponibili, nuova acquisizione autorizzata degli stessi estratti, mai workbook completo. Non presumere che le vecchie copie temporanee esistano ancora.
2. Ricostruire privatamente la classificazione per record con le stesse regole del preflight e riconciliarla agli aggregati. Il JSON pubblico **non contiene la lista dei 849** e non è una allowlist: non scegliere righe in base al solo totale. La classificazione nominativa deve essere prodotta/revisionata separatamente in ambiente privato, senza cambiare la CLI aggregata della #53 o esportare CSV importabili.
3. Identificare privatamente i 849 di quella revisione; congelare come esclusi i sette casi in quarantena, il match esistente e qualsiasi ruolo diverso da `customer`, incluso staff con ordini. I sette restano esclusi da **questo** pilota anche se chiariti in seguito; un loro recupero richiederà un'altra decisione. Tutti gli altri non selezionati restano fuori ambito.
4. Acquisire un nuovo snapshot completo e ripetere il preflight. Usare solo l'intersezione fra i candidati originari e quelli ancora candidati nella nuova verifica. Qualsiasi anomalia globale di fonte, join o snapshot è NO-GO; la quarantena dei sette non viene cancellata per ottenere exit 0. Un'autorizzazione futura del campione sarà un documento separato, non una modifica a `productionAuthorized` del report.
5. Ordinare gli ID storici canonici **numericamente crescenti**, confrontandoli come interi senza perdita di precisione, mai per email, spesa, telefono o ordine del CSV. A parità/duplicato ID: stop, non sort arbitrario. L'ordinamento usa solo ID nel registro privato; nessuno viene pubblicato.
6. In quell'ordine, revisionare individualmente ogni account secondo la matrice sotto. Un esito ignoto o negativo esclude la riga e ne registra privatamente il motivo; continuare con il successivo finché sono pronti **5** account. Se meno di 5 sono verificabili: NO-GO, nessun abbassamento dei criteri. Se si propone direttamente un limite superiore, deve essere un intero esplicitamente approvato tra 5 e 10, senza fallback implicito.
7. Bloccare lista, ordine, campi e digest del pacchetto nel manifest privato del pilota, con due verificatori nominativi (responsabile dati e operatore). Una modifica alla lista richiede nuova review e nuova approvazione. Durante l'esecuzione futura nessuna sostituzione automatica di un record saltato o in errore.

La scelta è riproducibile a parità di input e decisioni documentate. È un campione prudente, **non statisticamente rappresentativo** dei 849. Non è necessario completare la review dei 849 per preparare cinque casi, ma ogni singolo account che si trasferirà dovrà superarla.

## Verifica individuale: evidenza richiesta, non semplici spunte

| Controllo | Evidenza privata e decisione |
| --- | --- |
| Identità storica | Collegamento ID → account customer → ordine storico verificato su fonte autorizzata; riscontri sufficienti a distinguere omonimi, utenze condivise e riassegnazioni. Il solo numero di ordini non basta. Registrare fonte, revisione, data, revisore e motivazione. |
| Email | Sintassi e concordanza tra recapiti autorizzati; trim/lowercase solo per confronto, mai rimozione di punti o alias `+`. Evidenza disponibile di titolarità e attualità; email condivisa, dismessa o titolarità incerta = esclusione. Nessuna email di prova, OTP, reset, SMTP probe o contatto al cliente in questa preparazione. |
| Recapiti alternativi | Verificare, soltanto per i casi revisionati e nei campi approvati, eventuali email/telefoni di fatturazione, ordini o altre fonti pertinenti. Registrare “verificato e assente” separatamente da “non disponibile”. Mancata copertura rilevante = NO-GO per il record, non assenza presunta di collisioni. |
| Telefoni | Conservare ogni valore originale; nessun prefisso dedotto. Usare i numeri disponibili come indizi di confronto anche se non saranno trasferiti. Numeri condivisi/simili richiedono chiarimento; un nazionale leggibile non è automaticamente un errore d'identità. |
| Shopify | Confronto su tutti i profili, incluse email assenti, recapiti alternativi pertinenti e profilo phone-only osservato nel precheck. Match email/telefono certo = esclusione; sospetto o conflitto fra email e telefono = stop/review. Una ricerca puntuale senza risultati non prova copertura completa. |
| Approvazione | Due revisori, esito motivato per tutti i controlli, finalità/campi approvati, riferimenti di evidenza e digest della revisione. Nessuna approvazione dedotta dal superamento dei test o dai 849 aggregati. |

La review può richiedere letture minime aggiuntive autorizzate, mai l'estrazione massiva di nomi/indirizzi. Non raccolte in questa attività. Se le prove disponibili non bastano senza contattare il cliente, il record non entra nel pilota; l'eventuale contatto è una decisione futura separata.

## Campi del primo pilota

Proposta da approvare: **creazione del solo profilo con email**, mantenendo i telefoni esclusivamente nel confronto privato. È una scelta di minimizzazione, non la cancellazione di telefoni dall'archivio o dal controllo duplicati.

| Campo/informazione | Disponibilità attuale e trattamento proposto |
| --- | --- |
| Email | Presente nel CSV minimo; unica proprietà di anagrafica da inviare dopo review. Non dichiararla verificata solo perché sintatticamente valida. |
| ID, ruolo, contatore ordini | Presenti per selezione/journal privato; mai inviati come ID Shopify, note, tag o storico acquisti. |
| Telefono originale | Disponibile per confronto; **omesso** dalla creazione, anche quando internazionale. Nessun prefisso automatico. |
| Nome/cognome, indirizzi, azienda, lingua | Non inclusi negli input minimizzati; non è attestata la loro assenza nel workbook originale. Omettere, senza inventare valori o ricavarli dall'email; estrazione separata solo se indispensabile e approvata. |
| Titolarità attuale, recapiti alternativi, evidenza d'identità | Non certificati dai CSV: necessari alla review, ancora da documentare. |
| Password/hash/sessioni, fiscalità, note, ordini/spesa storici | Fuori ambito; nessuna lettura, ricostruzione o trasferimento. I 953 ordini non compariranno per effetto di questo pilota. |
| Consensi marketing | Nessuna prova trasferibile nel pacchetto; omettere tutti gli input di consenso, non impostare `SUBSCRIBED` o `PENDING`, non inventare date di consenso o revoca. Nessuna operazione di aggiornamento consensi. |

Il contratto [CustomerInput](https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/CustomerInput) distingue email, telefono, campi opzionali e consensi; `id` è destinato all'aggiornamento e deve essere vietato dall'allowlist del futuro writer. Il primo contratto applicativo consentirà **soltanto `email`**. Non usare flag REST come `send_email_invite`/`send_email_welcome` nel GraphQL: non sono campi del tipo ispezionato. Nessun payload GraphQL eseguibile è incluso in questa PR.

## Importatore futuro create-only — specifica, non implementazione

Processo distinto da conversione/sync della #53, avviabile solo dall'operatore nel futuro ambiente autorizzato. Nessun auto-avvio, trigger CI, task schedulato, modalità upsert, bulk o concorrenza. Allowlist operazioni: letture revisionate e singola `customerCreate`; proibiti customerUpdate/customerSet, merge, inviti, attivazioni e aggiornamenti dei consensi. Scopes e permessi minimi vanno verificati: `write_customers` non è un permesso server “solo create”, quindi il vincolo deve essere anche nel codice revisionato e nei test.

Prima di ogni eventuale lotto:

- Approvazione privata legata a shop ID + dominio canonico atteso `ecom-blueprint-gen-6ud1s.myshopify.com`, numero e lista esatta, campi, digest, commit writer, versione API, operatori, finestra UTC e scadenza. Al momento nessun manifest autorizzativo compilato.
- Versione API del futuro writer da fissare e validare; per questa progettazione consultata la documentazione 2026-10 e lo schema connesso, **senza eseguire mutation**. Non copiare esempi che abilitano marketing.
- Nuovo snapshot v2 e letture aggiuntive approvate per i recapiti alternativi. Tutte le pagine, ID distinti, conteggi esatti prima/dopo, nessun filtro; incongruenze o letture parziali = stop. Non forzare il conteggio a 12.
- Audit privato delle automazioni e prova sintetica in ambiente di test dedicato, da autorizzare separatamente. Mancata prova dell'assenza di comunicazioni/consensi automatici = NO-GO.
- Backup pre-lotto protetto dei soli dati necessari a rilevare cambiamenti sui profili esistenti, baseline per ID, journal durevole e recupero provato. Acquisizione/retention devono essere esplicitamente approvate.

Sequenza per record, una richiesta alla volta:

1. Riconfermare negozio, autorizzazione non scaduta, digest immutati, esclusioni, stato del journal e lock esclusivo. Il lock impedisce due istanze locali, non gli interventi esterni sul negozio.
2. Completare immediatamente prima del tentativo un controllo live integrale dei profili rilevanti e dei recapiti, includendo phone-only e alternativi. Policy proposta: lettura terminata da **non oltre 60 secondi**, e nessuna pausa/errore intermedio; se scade, ripetere. È una soglia operativa proposta, non garanzia Shopify. Se la lettura completa richiede troppo o è incompleta, fermarsi; non ridurre la copertura per rispettare il tempo.
3. Qualunque match/conflitto o variazione non spiegata: segnare stop nel journal e fermare l'intero lotto. Non aggiornare il preesistente, non saltare avanti o sostituire il candidato automaticamente. Il delta tra check e create resta una race possibile: l'API può respingere un'email duplicata, ma non certifica l'unicità della persona o dei telefoni omessi.
4. Persistenza e flush del record `INTENT` **prima** della richiesta. Se journal/lock non sono disponibili, nessuna richiesta. Payload minimo costruito da allowlist, senza log del body.
5. Una sola richiesta `customerCreate`. Risposta con ID e nessun errore non basta: salvare subito `CREATED_UNVERIFIED`, poi rileggere il profilo e verificare corrispondenza, campi, assenza di subscription e baseline. Solo dopo evidenza coerente registrare `VERIFIED`. Il primo account è una sentinella: checkpoint dell'operatore prima dei restanti quattro, già approvati nominativamente.
6. Se timeout, disconnessione, errore 5xx, GraphQL parziale, ID insieme a errori, crash o impossibilità di salvare la risposta: `UNKNOWN`/esito incerto e stop. Mai assumere che l'account non sia stato creato; mai retry automatico di una write. Riconciliazione read-only privata tra intento, baseline, ID risposto se disponibile e profili correnti; in caso di dubbio nessuna cancellazione o nuova creazione.
7. Errore applicativo certo o duplicato: `REJECTED`, stop senza upsert. Anche un 429 ferma il pilota; ripresa solo con nuovi controlli e decisione dell'operatore. Le letture possono usare retry limitati e backoff; una write incerta non viene ripetuta per effetto di una policy generica HTTP.
8. Una nuova esecuzione carica journal e lock: qualsiasi `INTENT` pendente, `UNKNOWN`, `CREATED_UNVERIFIED`, `REJECTED` o stop precedente impedisce nuove write. Un record `VERIFIED` non viene ricreato. Non presumere supporto di idempotency key su questa mutation: il journal è un controllo locale, non una transazione distribuita.

[customerCreate](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/customerCreate) documenta scope e coppia `customer`/`userErrors`; HTTP 200 da solo non è successo. Risposte, errori e stack possono contenere PII: logging pubblico limitato a conteggi, stati e codici interni fissi. Nessun messaggio API grezzo, body, email, ID, digest individuale o token nei log/telemetria.

## Journal e recupero privati

Registro cifrato, fuori da Git/CI, accesso nominativo, directory 0700/file 0600 più verifica ACL; persistenza append-only con flush, controllo integrità e lock. Campi privati: run e sequence, shop ID/dominio, commit/API, digest input e allowlist approvata, ID legacy, email approvata, esiti/evidenze della review e check live, ID Shopify restituito, timestamp, stati, operatore, riferimento autorizzazione, riconciliazione. Nessuna password, token o risposta completa. Il manifest pubblico contiene solo aggregati; hash di email non diventano dati pubblici “anonimi”.

In caso di errore dopo alcuni successi: fermare la coda, non compensare automaticamente; rendicontare verificati, creati non verificati, incerti, respinti e non tentati. Conservare prove e aprire recovery privato. Nessuna promessa di rollback automatico: creazione, notifiche, automazioni e attività del cliente non costituiscono una transazione unica.

Eventuale rimozione futura: identificare esclusivamente gli ID sicuramente creati dal lotto, verificare assenza di nuovi ordini, modifiche o altre associazioni e ottenere autorizzazione specifica per ciascuna operazione. Se attribuzione o attività sono dubbie, intervento manuale concordato. Mai cancellare il match preesistente, il profilo senza email, un insieme cercato per tag o tutti i clienti aggiunti dopo una data. Una comunicazione già inviata non è ritirabile. Nessun comando delete o recovery eseguibile è presente qui.

## Inviti, marketing e accesso

La creazione del profilo non deve essere usata per avviare comunicazioni. Vietare inviti/activation-link, reset password, login automatico, OTP provocati dall'operatore, email/SMS/WhatsApp, tag/segmenti per campagne e retry di invii. [L'invito Shopify](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/customerSendAccountInviteEmail) è un'operazione distinta per account legacy e non va chiamato.

L'assenza della chiamata di invito e l'omissione dei consensi **non provano l'assenza di effetti esterni**. Il responsabile deve inventariare Shopify Flow, automazioni marketing, app CRM/loyalty, webhook `customers/create`, notifiche, sincronizzazioni e code differite, verificando anche sistemi che inviano messaggi senza controllare la subscription. [Flow dispone di trigger per nuovi clienti](https://help.shopify.com/en/manual/shopify-flow/reference/triggers/customer-created). Non sono stati ispezionati né disattivati in questa attività. Se servono modifiche alle automazioni, occorre una proposta e autorizzazione separate: nessuno switch live implicito nel pilota.

Verifica futura obbligatoria in ambiente di test autorizzato: creazione minima senza input marketing; email non iscritta, SMS/WhatsApp assenti/non iscritti, nessun evento di invio immediato o accodato. Prima della produzione definire finestra di osservazione che copra il massimo ritardo configurato nelle automazioni; se sconosciuto = NO-GO. Stato `SUBSCRIBED`, `PENDING`, canale illeggibile/inatteso o comunicazione = stop e incidente, non correzione automatica dei consensi. Il modello offline testa questa decisione, non il comportamento reale di Shopify.

Strategia UX proposta: **Customer Accounts Shopify senza password**, solo su iniziativa del cliente, con codice monouso inviato all'email approvata. La documentazione [Customer accounts](https://help.shopify.com/en/manual/customers/customer-accounts) descrive accesso al profilo esistente e creazione automatica se l'email non esiste: anche “provare il login” sul negozio può avere effetti e non è consentito ora. Nessuna password WooCommerce o reset dell'autenticazione del sito. Account legacy e inviti non sono la strategia proposta; il tipo realmente abilitato nel negozio deve ancora essere verificato.

Il codice del branch ha due percorsi distinti: `src/pages/Auth.tsx`/`src/hooks/useAuth.tsx` e `src/pages/Account.tsx` usano l'autenticazione del sito; `src/pages/AccountCallback.tsx` e `src/lib/shopify-customer-auth.ts` prevedono Shopify OAuth. Questo è un riscontro statico, non un test del sito distribuito. Serve scegliere e collaudare separatamente il percorso pubblico: il solo nuovo profilo Shopify non abilita l'accesso via `/auth`. Vedere [specifica UX](customers-pilot-ux.md). Nessun file runtime, database o impostazione account modificato.

## Checklist go/no-go e decisioni mancanti

Tutte le caselle seguenti sono **aperte** per un pilota reale; i test sintetici non le completano.

- [ ] **Responsabile dati:** input/provenienza e classificazione privata verificati; campione deterministico di cinque, sette quarantene e match esclusi, due revisioni individuali, prova di recapiti alternativi e phone-only; pacchetto bloccato e digest firmati/approvati privatamente.
- [ ] **Proprietario:** finalità, unico campo email, assenza telefono/nomi/indirizzi e storico ordini, negozio, cinque destinatari esatti, finestra e responsabili approvati; custodia e retention concordate.
- [ ] **Responsabile Shopify:** negozio/tipo account confermati, snapshot nuovo, copertura completa, audit app/Flow/webhook e ritardi, nessuna comunicazione indesiderata dimostrata. Nessuna certezza basata solo sul consenso marketing disattivato.
- [ ] **Developer + reviewer:** writer separato implementato/revisionato, allowlist e safe default, niente upsert, limite 5–10, lock/journal durevoli, recovery e casi di crash provati con fixture; versione API e scopes verificati, errori/log sanitizzati.
- [ ] **Designer + developer:** percorso di accesso e assistenza approvato, login sito/Shopify chiarito e collaudo separato pianificato; nessuna promessa di password/storico recuperati.
- [ ] **Operatore:** backup privato, checkpoint sentinella, soglia live proposta 60 s, monitoraggio side effect e criteri di stop verificabili; prova recovery e passaggio di consegne.
- [ ] **Proprietario, ultima decisione:** autorizzazione scritta specifica alla creazione dei soli cinque ID del manifest privato, vincolata a commit writer, digest, campi, negozio e finestra. Zero autorizzazioni dedotte dal merge o da questa richiesta di pianificazione.

Dopo cinque successi verificati e osservazione completa senza effetti indesiderati: rendiconto aggregato e **seconda autorizzazione** per eventuali ulteriori cinque, selezionati con le stesse regole e ricontrollati. Nessuna estensione automatica ai 849. Ogni controllo sconosciuto/fallito, scadenza o variazione del pacchetto = NO-GO.

Richiesta di autorizzazione futura, da compilare soltanto dopo le evidenze: «Autorizzi la creazione dei soli account del manifest privato approvato, con email soltanto, marketing e comunicazioni disattivati, sul negozio verificato, mediante il writer revisionato indicato, nella finestra concordata, con stop e recupero descritti?». Non è richiesto né accettato un assenso generico alle scritture in questa fase.

## Test e limiti delle verifiche

`sync/tests/customer-pilot-model.mjs` è un modello senza I/O: simula ordinali e stati, non legge CSV, non costruisce payload, non usa API, adapter, segreti o credenziali. Gli input sono esclusivamente fixture in codice e il risultato dichiara sempre `productionAuthorized=false`, `customerWrites=0`, `proposedNew=0`. I contatori di tentativi/creazioni sono esplicitamente simulati. Non è il futuro importatore, né un selettore nominativo dei 849.

Comando locale: `node --require ./ci/offline-network.cjs --test sync/tests/customer-pilot-contract.test.mjs`. La CI separata esegue questo contratto e i 46 test del preflight su dati inventati, senza toccare i workflow/gate runtime della #53. Casi: ordine deterministico, limiti, esclusioni, review incompleta, manifest/finestra/shop errati, snapshot/live incompleti, email/telefono/alternativi/phone-only, race, journaling prima del tentativo, errori parziali, retry negati, ripartenza, sentinella, marketing/side effect e riconciliazione dei contatori.

Restano da eseguire, **dopo autorizzazione separata in ambiente di test**, integrazione API con soli indirizzi controllati, verifica effettiva dei default marketing, automazioni/code, journal su disco con fault injection, crash fra risposta e flush, race esterna, controllo accessi e UX. Nessun test sintetico locale dimostra consegna email, titolarità, silenzio delle app o recuperabilità di clienti reali.

Verifica locale del 15/11/2026: **18 test del modello PASS + 46 regressioni preflight PASS (64 totali)**, eseguiti con blocco della rete Node; controlli di sintassi e `git diff --check` superati. Nessun dato reale utilizzato per questi test. La CI dedicata deve confermare il commit della nuova PR; non esegue il pilota.
