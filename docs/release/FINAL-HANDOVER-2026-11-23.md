# Online Garden · consegna del 23 novembre 2026

**Decisione di rilascio: NO-GO per la PR #69.** Il consenso del candidato funziona, anche al passaggio al checkout. La finalità di alcuni invii Shopify rimane da documentare. Il proprietario ha spento Visitor Analytics e due prove indipendenti sul dominio pubblico hanno riscontrato zero richieste al suo collettore. Il frontend servito è ancora il rilascio r2. Base di lavoro GitHub `91c89f4107ddb6769274d616b5fc3be84b6066e8`, candidato consenso `a5f319ace864b398f43285bb9471d6cd5bd1ef12`. Costo incrementale dello sprint **0 €**. [PR #69](https://github.com/Rosin355/your-e-commerce-blueprint/pull/69)

## A. Completato e pubblicato

| Area e stato GitHub | Prova e stato pubblico | Prossima responsabilità e ripristino |
|---|---|---|
| Vetrina, catalogo, prodotto e carrello su main | Su onlinegarden.it, Chromium desktop e mobile hanno aperto catalogo e prodotto, aggiunto un bulbo, ritrovato la riga dopo la ricarica e raggiunto il checkout corretto. Su Safari iOS 26.3 simulato la variante di Aucuba cambia e lo stato accessibile si aggiorna. Home e prodotto rientrano nella larghezza dello schermo. | Il designer verifica sul dispositivo fisico di Marco testo, selezione e comandi. Per regressione ripristinare la precedente versione Lovable approvata e riprovare la stessa riga di carrello. |
| Checkout Shopify e Customer Accounts, integrazione su main | Checkout ospite con il prodotto atteso e accesso alla privacy italiana. L’ingresso clienti arriva al modulo Shopify su Chromium desktop/mobile, Safari macOS privato e Safari iOS simulato. La prova si arresta prima di creare l’ordine. | Marco verifica l’intero ciclo di pagamento/notifica col metodo di test concordato. Per regressione di ingresso o carrello ripristinare la vetrina di riferimento e verificare il dominio checkout. |
| Admin V2 r2, PR #62 integrata | Modulo staff pubblico presente nei due formati Chromium. Entry pubblica `index-DSQ4UzGV.js`, SHA-256 `4f603cd21fdfae105489a165b8986bfea2b3a636f73585cfe21d85ef7c73e0fa`, identica al rilascio già collaudato. Le operazioni autenticate sulla bozza sono documentate nel verbale r2. | Marco esegue l’accettazione personale e il recupero. Ripristino applicativo al riferimento Lovable `1e2d8f2f-2040-4398-99dd-048201ea3be5` se una revisione successiva introduce una regressione. [Verbale Admin](../admin-v2/RELEASE-REPORT.md) |
| Visitor Analytics, impostazione hosting effettuata dal proprietario | Nuove sessioni isolate Chromium 159, desktop e Pixel 7 emulato. Trenta secondi iniziali per sessione e navigazione fino a checkout, account e login staff. Zero richieste a `/__l5e/trackevents`, zero loader versionati, nessuna sostituzione di rete. Le risorse hosting necessarie hanno continuato a rispondere. | Operatore ripete questa sonda dopo il Publish. Project monitoring resta distinto. In caso di regressione ripristinare il frontend approvato mantenendo Visitor Analytics spenta. [Evidenze e comando](PRIVACY-NETWORK-VERIFY-2026-11-23.md) |

## B. Completato nel codice e stato del Publish

| Attività | Prova, GitHub e produzione | Dipendenza, responsabile e rollback |
|---|---|---|
| Banner e passaggio della scelta | PR #69 aperta. I tre controlli GitHub sono verdi. Nuovo collaudo su Chromium, regione Shopify IT34. Accetta, Declina, preferenze granulari, persistenza e revoca funzionano. Il checkout su altro host legge i tre rifiuti. Fetch conserva la propria identità. Le prove Safari precedenti sono documentate sullo stesso candidato. Il pubblico serve ancora r2. | NO-GO al merge e al Publish. Tre POST Monorail prima della scelta e 26 richieste classificate dal rilevatore come misurazione/diagnostica dopo rifiuto nel checkout. Il referente Shopify risponde alla richiesta unica, il titolare privacy documenta la decisione. Un eventuale flusso opzionale richiede un controllo ufficiale verificato. [Analisi e richiesta](PRIVACY-NETWORK-VERIFY-2026-11-23.md#richiesta-unica-al-fornitore) |
| Archivio WooCommerce e pagina staff | Il registro locale e la copia privata sono già verificati. 858/858 account archiviati, 953/953 acquisti nei conteggi, zero ordini individuali importati. La route `/admin/storico-acquisti` è su main tramite PR #68, pronta al prossimo rilascio autorizzato. I due test mirati hanno escluso ospite/editor e provato il ruolo admin, l’isolamento del frame e zero richieste dal frame durante la lettura di un file sintetico. | Tecnico e Marco verificano i ruoli dopo il Publish. I file restano sotto custodia privata. Se il controllo ruolo o il vincolo di rete fallisce, ritirare la versione della pagina e ripristinare il frontend r2. La consultazione locale resta disponibile. [Verbale registro](FINAL-DELIVERY-2026-11-22.md) |

**Finestra applicativa.** Il responsabile del rilascio registra commit, build, versione pubblica di ritorno e operatore. Dopo chiusura del gate Shopify, riesamina i controlli sull’esatto commit di merge, acquisisce il GO specifico al Publish e verifica l’asset servito. Sul dominio reale da profili puliti con regione Italia verificata via API deve provare prima visita, rifiuto, accettazione, granularità, ricarica, revoca da footer e nuova visita. Misurare la rete in ogni fase, leggere i consensi nel checkout, riprovare prodotto/carrello, account, login staff e guardia storico con file sintetico. Includere Safari iOS e desktop. Se cambia l’impronta dello SDK, confrontare le famiglie di eventi con la risposta del fornitore. In caso di preferenze difformi, eventi opzionali anticipati o regressione del checkout, sospendere il rilascio, ripristinare la revisione pubblica precedente e verificare nuovamente il percorso. Il ritorno alla r2 riapre il limite noto del banner headless. Tenere spento Visitor Analytics.

## C. Informative pronte per la revisione di Marco

Cinque corpi cliente r4 aggiornati nei file originari con impronte SHA-256 individuali. Preparati i contatti da inserire in Shopify e la sequenza di pubblicazione con backup e ripristino. L’Admin API di Online Garden espone ancora soltanto la Privacy del 30 ottobre 2026. Il campo telefono del negozio è valorizzato; Marco conferma il recapito destinato al pubblico. Il titolare completa i dati commerciali e il registro privacy. Per il recesso verificare concretamente la funzione e la ricevuta. Se il corpo cambia, l’operatore ricalcola l’impronta prima della firma.

**Stato GitHub e live.** R4 nel branch di consegna. Quattro informative nei tipi nativi Shopify, una pagina Cookie e il blocco contatti da pubblicare nella sessione approvata, con controllo dei singoli URL e dei collegamenti applicabili nel footer e nel checkout. In caso di esito parziale l’operatore ripristina i precedenti testi e collegamenti. [Cinque testi, impronte, contatti e pubblicazione](../legal/CLIENT-LEGAL-PUBLICATION-CHECKLIST.md)

## D. Spedizioni da attivare

**Preparazione completata. Attivazione BLOCKED.** Matrice esistente 69/69 in isolamento e 42/69 conformi nel checkout; i 27 scarti identificano nove località per tre carrelli. Un nuovo controllo circoscritto sugli stessi due prodotti ha letto i preventivi reali Storefront in euro. Subtotali A 18,50 €, B 5,00 €, misto 23,50 €. In ciascun caso il negozio offre una sola opzione.

| Destinazione | A | B | Misto |
|---|---:|---:|---:|
| Livorno, importo osservato e approvato | 8,90 € | 5,90 € | 11,90 € |
| Portoferraio, importo osservato | 8,90 € | 5,90 € | 11,90 € |
| Portoferraio, importo speciale approvato | 9,60 € | 6,90 € | 12,50 € |

Il Dev Dashboard del profilo disponibile mostra un elenco negozi vuoto. Serve l’accesso operativo al **solo Online Garden Shipping Test**. Il codice della prova e le matrici sono su main. Resta da dimostrare su Grow la selezione fra opzioni già prezzate nel checkout Dev, compresi CAP condivisi, località, frazioni, carrelli A/B/misti e wallet, preservando continente e Sicilia/Sardegna. Il responsabile verifica una prova di disattivazione con ritorno ai preventivi iniziali nel Dev prima di proporre una configurazione live. Nessuna modifica a listini o profili di produzione. [Contratto dei 69 casi](PROVE-ISOLATE-SPEDIZIONI-ANALYTICS-2026-11-22.md)

## E. Accettazione personale

Marco e i due titolari di collaudo registrano gli esiti degli accessi effettivi, della scadenza OTP, del logout e dell’isolamento tra identità. Marco verifica il recupero staff, una modifica reversibile della bozza in Admin V2, proposta e scarto AI, iPhone fisico e ordine end-to-end con ricezione alle sole caselle concordate. Queste verifiche richiedono account personali o effetti esterni. Per la prova commerciale serve una finestra con addebito reale massimo 0 €, controllo preventivo automazioni e possibilità di annullare l’ordine di test. [Scheda operativa di Marco](FINAL-CLIENT-APPROVALS.md)

## F. DNS e redirect

**READY_FOR_DNS_RELEASE per la programmazione separata. Delega BLOCKED.** Il manifest dei 16 mapping è su main. Superate 384 combinazioni simulate e le esclusioni. Nel controllo del 23/11 i sedici URL storici apex rispondono ancora 200 al primo GET, quindi **0/16 redirect 301**. Sitemap e robots pubblici HTTP 200, con 1.349 voci nella sitemap.

Google DNS e Cloudflare DNS concordano sui quattro NS IONOS, i due MX IONOS, SPF, DMARC e assenza di DS. Le letture dirette della zona IONOS e dei due NS Cloudflare coincidono per MX, alias DMARC e due selettori DKIM. Il terzo, `s42582890._domainkey`, restituisce NXDOMAIN su IONOS e un CNAME su entrambi i Cloudflare. Il proxy web e il servizio email vanno verificati separatamente. Nel repository e fra gli export individuabili sul Drive del progetto non è emersa una coppia di zone ripristinabili con le regole. Il pannello Cloudflare nella sessione disponibile richiede accesso. Le risposte DNS pubbliche non ricostruiscono un export integrale.

Registrar/gestore posta custodiscono export completi di entrambe le zone e regole, verificano in privato il selettore in una firma autentica e concordano caselle per continuità bidirezionale. Prima della delega verificano TTL, proxy solo web, TLS, accesso al ripristino e rileggono il DS. Dopo il cambio validano entrambi i resolver, primo salto dei 16, checkout e posta. Per errore limitato disabilitare la regola interessata. Per guasto di delega/posta, ripristinare i quattro NS IONOS a zona e DS compatibili mantenendo entrambe le zone per i TTL. [Procedura DNS e posta](PRODUCTION-HANDOVER.md)

## G. SAL e readiness del nuovo negozio

**SAL originale 57,75%, variazione 0 punti.** I nuovi riscontri non completano ulteriori voci ponderate del contratto. L’archivio aggregato è completo nel proprio perimetro. La SAL continua a distinguere i 953 ordini individuali indisponibili. [Pesi contrattuali](SAL-2026-11-21.md)

**Readiness commerciale 4/10 criteri pienamente verificati, 40%.** Indicatore binario di consegna adottato per questo sprint, a pesi uguali e senza credito parziale o storico WooCommerce. Esprime quanti criteri hanno tutte le prove richieste, indipendentemente dal volume di codice già scritto.

| Criterio di consegna | Esito e prova mancante se aperto |
|---|---|
| 1. Vetrina, catalogo, scelta variante usabili su desktop/mobile | PASS pubblico |
| 2. Carrello persistente e checkout ospite con prodotto e importo | PASS pubblico fino al checkout |
| 3. Admin V2 r2 distribuito e identificabile | PASS tecnico, confronto asset e prove r2 |
| 4. Indicizzazione del nuovo catalogo | PASS tecnico per robots, sitemap e canonical campionati nel verbale precedente; il posizionamento non è oggetto del test |
| 5. Tariffe corrette in tutte le 69 combinazioni | BLOCKED, 27 scarti nella matrice pubblica |
| 6. Consenso verificato su vetrina pubblica e checkout con trattamenti classificati | BLOCKED, classificazione Shopify e Publish |
| 7. Cinque informative, contatti e recesso fruibili | BLOCKED, dati, funzione verificata e pubblicazione |
| 8. Accettazione nominativa di clienti, staff e iPhone fisico | BLOCKED, prove personali e recupero staff |
| 9. Ordine completato e ricezione delle notifiche previste | BLOCKED, ordine e caselle di prova autorizzati |
| 10. Sedici redirect effettivi e continuità email verificata | BLOCKED, finestra DNS dedicata |

## H. Unica richiesta finale

Marco raccoglie dati e decisioni nella [scheda unica](FINAL-CLIENT-APPROVALS.md). Include la sola abilitazione Dev per le spedizioni, il riscontro tecnico/privacy, le approvazioni puntuali di policy e Publish, la finestra di accettazione con destinatari di test e la finestra DNS separata. Per ciascun punto si procede solo quando la relativa condizione è documentata. Il team conserva in privato le prove contenenti identità o dati di sessione.
