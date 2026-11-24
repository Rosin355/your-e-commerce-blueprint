# Consegna operativa Online Garden · 22 novembre 2026

| Attività | Dove intervenire | Evidenza da conservare |
|---|---|---|
| Vetrina React/Vite | GitHub per codice, Lovable per Publish autorizzato. Verificare formato, carrello e checkout dal dominio | SHA Git, ID Publish, nome asset e SHA-256 riletti da onlinegarden.it |
| Pagamenti, ordini, informative | Shopify Admin nel negozio Online Garden. Le informative Shopify alimentano il checkout. L’account cliente è ospitato da Shopify | Rilettura della configurazione, controlli sul checkout senza riferimenti personali |
| Personale, catalogo e AI | /admin con accesso individuale Supabase. Admin V2 r2 usa la Edge di produzione. Usare la bozza tecnica, salvare e riaprire. Per galleria e struttura dei formati di prodotti esistenti usare l’accesso staff Shopify | Prima/dopo sulla sola bozza autorizzata, autore e data nel registro privato |
| Logistica | Shopify Markets definisce il prezzo. In Sendcloud controllare il negozio collegato, l’origine, i metodi associati, resi, sincronizzazione e automazioni di etichettatura | Mappa metodo checkout → servizio, stato connessione e prova di ricezione controllata |
| Assistenza | info@onlinegarden.it per gli acquisti correnti e la ricerca privata degli ordini vecchi. Usare la procedura di verifica della titolarità | Esito della pratica nel canale privato. Pubblicare solo aggregati |

## Unica checklist di accettazione personale

Marco usa il proprio dispositivo. Registrare data, browser, esito, eventuale errore e responsabile. Le caselle sono intenzionalmente aperte.

- [ ] Aprire /admin, accedere col proprio account e trovare la bozza tecnica TEST-OG-AI-001. Verificare ruolo e comandi personali.
- [ ] Annotare il valore iniziale di un campo ammesso. Modificare la sola bozza tecnica, salvare, riaprire, confrontare lo storico e ripristinare il valore iniziale.
- [ ] In AI Editor generare una proposta sul campo autorizzato, confrontarla e scartarla. Se si desidera provare l’accettazione, rileggere lo storico e ripristinare il testo della bozza.
- [ ] Controllare immagini, anteprima e formati della bozza. Aprire Shopify Admin col proprio accesso staff per galleria e varianti esistenti. Non pubblicare il prodotto.
- [ ] Da Safari sul proprio iPhone, poi da desktop, provare ricerca, selezione formato, carrello e ritorno. Controllare gli importi A/B e misto di Livorno, Portoferraio e Lipari nel verbale. Registrare eventuali eccezioni.
- [ ] Due titolari autorizzati provano a turno il proprio account cliente, OTP personale, proprio ordine e dettaglio, uscita, nuovo accesso e rientro dopo scadenza. Ciascuno vede soltanto i propri dati. Annotare esiti senza numeri ordine o codici.
- [ ] Leggere i cinque candidati legali, controllare contatti, regole e percorso di recesso anche per acquisto ospite. Registrare versioni approvate nel fascicolo e verificare footer e checkout solo dopo effettiva pubblicazione.
- [ ] Aprire in Shopify **Impostazioni → Notifiche**. Verificare mittente/autenticazione, destinatari staff, lingua, anteprime di conferma ordine, pagamento, spedizione/tracking, annullamento e rimborso. Confermare l’associazione Sendcloud senza creare etichetta.
- [ ] Eseguire l’ordine controllato soltanto nella finestra autorizzata sotto. Registrare ricezioni nelle sole caselle concordate, procedura rimborso, recupero stock e assenza di etichette indesiderate.
- [ ] Firmare l’esito per singola area ed elencare le eventuali riserve. La firma personale è distinta dall’esito tecnico.

## Ordine end-to-end proposto · pronto per autorizzazione

1. Concordare con Marco finestra, responsabile, un solo prodotto e quantità, indirizzo e sole caselle di test, importo massimo e modalità sandbox. Verificare in Sendcloud se import/etichetta/ritiro e invii automatici potrebbero partire. Se non isolabili, usare l’ambiente di prova già disponibile oppure rinviare. Nessun cambio globale a Shopify Payments nel negozio aperto.
2. Fotografare privatamente stock disponibile, regole notifiche e stato del test. Percorrere il checkout come ospite con il metodo di test ammesso. Registrare prezzo articolo, spedizione, totale, stato pagamento e una sola creazione ordine. Per una transazione con denaro vero occorre un diverso consenso con importo e commissioni.
3. Controllare sequenza eventi e consegna effettiva di conferma al cliente di prova e notifica staff. In Sendcloud verificare importazione o mancata importazione attesa dei test, metodo e assenza di spedizione. Eseguire attività di tracking solo in ambiente idoneo e con destinatari approvati. Controllare il link all’ordine, il recesso elettronico in due passaggi e la ricevuta durevole.
4. Se il pagamento è soltanto autorizzato, annullare l’autorizzazione dove possibile. Se acquisito in sandbox, rimborsare una volta sullo stesso metodo. Verificare importo, stato in Shopify e nel gateway, eventuale notifica e ripristino una sola volta della quantità. Annullare l’ordine secondo lo stato di evasione. Rileggere l’esito di ciascuna operazione prima di ritentare. Un rimborso reale richiede approvazione esplicita anche se segue un acquisto.
5. Confermare zero addebiti reali nella prova sandbox, nessun costo etichetta/ritiro e nessun destinatario esterno. Registrare solo esiti tecnici e verificare configurazione e checkout standard dopo il test. Le tre conferme `mail_sent` già documentate attestano un evento piattaforma. Restano da provare ricezione e contenuto del messaggio. [Audit notifiche](../SHOPIFY-EMAIL-NOTIFICATIONS-AUDIT.md)

## DNS, posta e redirect · procedura di attivazione e ripristino

La zona Full è stata preparata e i redirect sono già stati impostati secondo l’evidenza del cliente. I NS assegnati sono `carlos.ns.cloudflare.com` e `karsyn.ns.cloudflare.com`. Entrambi rispondono direttamente sulla zona. Il traffico pubblico rimane delegato a IONOS. Il manifest di prova nel repository è disattivato. L’esistenza di una regola nel pannello non dimostra che produca il primo salto richiesto. [Evidenze della zona preparata](https://github.com/Rosin355/your-e-commerce-blueprint/blob/cc5ee594d8ddc2ff1ecd3f5be8b8057ad75a3c48/docs/ops/dns-cloudflare-migration-audit.md)

| Controllo read-only del 22/11 | Esito |
|---|---|
| Delega, DNSSEC e web | Quattro NS IONOS: ns1037.ui-dns.org, ns1041.ui-dns.biz, ns1098.ui-dns.de, ns1126.ui-dns.com. Google e Cloudflare DNS concordano. Risposta autorevole del registro .it per DS: NOERROR, nessuna risposta DS. Nessuna DNSKEY ai due resolver. Apex e www 185.158.133.1. Nessun AAAA/CAA apex nelle letture. |
| Posta | MX 10 mx00.ionos.it e 10 mx01.ionos.it, SPF `v=spf1 include:_spf-eu.ionos.com ~all`. DMARC tramite alias dmarc.ionos.it risolve a `v=DMARC1; p=none;`. Autodiscover → adsredir.ionos.info e _domainconnect → _domainconnect.ionos.com. Confronto diretto IONOS e i due Cloudflare concordante su questi record. |
| DKIM | s1-ionos e s2-ionos puntano ai CNAME IONOS su entrambe le zone. Il selettore **s42582890** risponde NXDOMAIN su IONOS e punta a s42582890.dkim.ionos.com sui due Cloudflare. Confermare il selettore effettivamente usato con IONOS da firma privata, confrontare export completi, inclusi eventuali selettori Shopify. Nessuna aggiunta o cancellazione automatica. |
| Primo salto | 272 letture GET/HEAD, incluse ripetizioni mirate delle richieste scadute. Tutte le 64 prove sulle destinazioni hanno risposto 200. **0 su 208** prove delle URL sorgenti ha prodotto la Location finale convenuta. 32 risposte 301 normalizzano lo schema, 104 risposte 302 e 72 risposte 200. Prove offline del manifest: 384 casi positivi simulati, più guardie di esclusione. |
| Indicizzazione | robots 200 con sitemap apex, sitemap XML 200 con 1.349 URL. Canonical autosu home e PDP, catalogo di ricerca con canonical catalogo e noindex,follow. Rimangono 3 identità incerte e 1.255 altri percorsi privi di destinazione dimostrata. |

**Prima della finestra.** Il gestore della delega esporta le due zone e le regole Cloudflare, con TTL, priorità, stato proxy, selettori, record di verifica e copia recuperabile. Custodire in privato. Confrontare integralmente i record, chiedere al provider i valori TLS/origine per il dominio Lovable esistente, verificare i certificati e la precedenza delle regole predisposte prima della normalizzazione www. Risolvere la differenza DKIM. Provare lo stesso contratto del manifest su query Woo dimensione, UTM ammessi e query sconosciute. Correggere solo quanto si dimostri incompatibile, previa approvazione. Nessuna delega prima di backup, accesso al ripristino e autorizzazione dei 16 percorsi/operazione.

**Finestra autorizzata.** Rileggere DS presso .it subito prima della modifica. Coordinare qualsiasi DS col firmatario. Mantenere entrambe le zone coerenti. Preservare MX/host di posta DNS-only e abilitare il proxy solo sui web host concordati. Il gestore sostituisce i quattro NS con i due assegnati. Confermare stato Active, risoluzione da due resolver, TLS all’origine, accessi, checkout e invio/ricezione con le sole caselle autorizzate. Verificare dapprima un mapping approvato, poi i 16 sui due host. Usare `python3 infra/seo/check-redirect-http.py --expect-active` e controllare il SEO dei target. Nessun inoltro generico sui 1.258 percorsi fuori matrice.

**Rollback.** Redirect errato → sospendere la sola regola o rotta coinvolta, ripristinare export, svuotare cache interessate, provare con sessione nuova. Errore proxy/TLS → ripristinare record web e modalità origine Lovable coerente. Disservizio DNS/posta → correggere la zona attiva oppure ripristinare i quattro NS IONOS se la zona di ritorno è completa e il DS compatibile. Conservare le due zone per la durata dei TTL di delega. Riprovare posta in entrambe le direzioni, verifica firme e checkout. [Matrice dei 16](../seo/REDIRECT-301-RELEASE-GATE-2026-11-20.md) · [DNSSEC Cloudflare](https://developers.cloudflare.com/dns/dnssec/) · [Configurazione proxy Lovable](https://docs.lovable.dev/features/custom-domain-connect)

## Versione, responsabilità e ripristino applicativo

La baseline documentale è `1bac572`. Il frontend pubblico proviene dal rilascio `ca9050d`, Publish Lovable `1e2d8f2f-2040-4398-99dd-048201ea3be5`. Entry `index-DSQ4UzGV.js`, SHA-256 `4f603cd21fdfae105489a165b8986bfea2b3a636f73585cfe21d85ef7c73e0fa`, marker `admin-delivery-20261121-r2`. Riletti entry e quattro asset Admin sul dominio. Nessun nuovo Publish necessario per documenti, matrice e verificatore offline. In caso di incidente applicativo riferirsi al registro r2 e ripristinare esclusivamente il componente coinvolto dopo autorizzazione del responsabile. Nessun restore di database provato in questa consegna. [Rilascio r2](../admin-v2/RELEASE-REPORT.md) · [Accettazione clienti](../customers/FINAL-ACCEPTANCE.md)

## Riscontro operativo IONOS — screenshot DNS del 23/11/2026, ore 18:14 CET

Il responsabile ha mostrato **Impostazioni DNS su IONOS** per `onlinegarden.it`. Lo screenshot del pannello (non copiato nel repository) espone le seguenti righe: `CNAME _domainconnect → _domainconnect.ionos.com`; `A @ → 185.158.133.1`; `TXT _lovable` con verifica Lovable (valore parzialmente troncato nell'interfaccia); `A www → 185.158.133.1`; `TXT _lovable.www` con verifica Lovable (valore parzialmente troncato); `MX @ → mx00.ionos.it`; `MX @ → mx01.ionos.it`; `TXT @ → v=spf1 include:_spf-eu.ionos.com ~all`; `CNAME _dmarc → dmarc.ionos.it`; `CNAME s1-ionos._domainkey → s1.dkim.ionos.com`; `CNAME s2-ionos._domainkey → s2.dkim.ionos.com`; `CNAME autodiscover → adsredir.ionos.info`.

**Confronto:** record visibili coerenti con l'audit precedente; nessuna modifica effettuata. Il record `s42582890._domainkey` **non compare** nello screenshot IONOS, mentre nella zona Cloudflare preparata era registrato come CNAME verso `s42582890.dkim.ionos.com`; questa divergenza resta da identificare con il selettore DKIM realmente utilizzato nelle intestazioni di una mail uscente autorizzata. Non assumere errore attivo, né cancellare il record preventivamente.

**Prossimo controllo in sola lettura:** aprire `Cloudflare → onlinegarden.it → DNS → Records` e confrontare la zona completa compresi i valori non troncati dei TXT Lovable, i record web proxy/DNS-only e tutti gli MX/TXT/CNAME email. Poi controllare backup/esportazione completa della zona e il selettore DKIM prima di qualunque modifica NS. **Stop su modifica nameserver, proxy, record, DNSSEC e redirect fino al completamento delle verifiche**. SAL originaria 57,75% invariata.


## Cloudflare screenshot DNS → confronto live IONOS — 23/11/2026 ore 18:16 CET

L'operatore ha mostrato nel pannello Cloudflare **11 record** preparati, contro **12 record visibili in IONOS** nello screenshot precedente. Confronto visivo puntuale (non misura di delega pubblica): Cloudflare presenta `A onlinegarden.it → 185.158.133.1` e `A www → 185.158.133.1` entrambi **Proxied (arancione)**, `CNAME autodiscover`, `_dmarc`, `_domainconnect`, `s1-ionos._domainkey`, `s2-ionos._domainkey`, `s42582890._domainkey` tutti **DNS only**, `MX @ → mx00.ionos.it`, `MX @ → mx01.ionos.it` e `TXT @` SPF **DNS only**. Sul pannello Cloudflare sono **assenti** i due TXT verifiche dominio Lovable presenti in IONOS: `_lovable` e `_lovable.www`; i valori TXT originali sono parzialmente troncati nello screenshot IONOS e vanno riletti dal pannello e copiati **esattamente**, senza ricostruirli a mano. `s42582890._domainkey` risulta solo in Cloudflare, da correlare al selettore firmato nelle intestazioni di una mail reale uscente.

**STOP delega.** Il proprietario può fare **Export** della zona Cloudflare adesso, e salvare una copia privata della zona IONOS (ove possibile), senza cambiare DNS. Il futuro allineamento dei due TXT in Cloudflare va verificato contro i valori originali e le eventuali configurazioni Lovable; l'uso di proxy arancione sui record web richiede una prova preliminare origine/TLS/SSL con il dominio esistente e i redirect, e non implica automaticamente compatibilità o corretto HTTPS. MX, SPF e DKIM devono restare DNS only. Verificare anche l'eventuale DKIM Shopify/posta terza non rilevato nelle schermate prima di applicare la nuova delega. Nessun NS/record/proxy è stato modificato dall'assistente.

**Prossimo passo operativo unico:** cliccare `Export` su Cloudflare DNS → Records per ottenere backup privato; poi aprire i TXT `_lovable` e `_lovable.www` in IONOS e copiare i valori non troncati su canale privato (non screenshot pubblico), senza premere Salva. Solo dopo l'allineamento esatto e il controllo DKIM/posta autorizzare la migrazione.

## Allineamento verifiche Lovable: valori completi IONOS ricevuti — 23/11/2026 ore ~18:21 CET

Il responsabile ha fornito i valori non troncati di entrambi i record TXT IONOS. Mappatura corretta, senza scambiarli:

- `_lovable.onlinegarden.it` → `lovable_verify=c29dcda6f994037a481d7a2c2b1ee5c3908f9df878449f6079d0e6ce22527c34`.
- `_lovable.www.onlinegarden.it` → `lovable_verify=ed9f29114c1680e867c3317c5f05ece7f49637007d5b5ba6947cace25ef70c25`.

**Istruzione data:** aggiungere a Cloudflare DNS come **TXT** con Name `_lovable` e `_lovable.www`, rispettivi Content esatti e TTL Auto. Cloudflare aggiunge il suffisso di zona automaticamente. Il totale atteso passa da **11 a 13 record**. Nessuna modifica necessaria su IONOS. Al momento della redazione **non è stato ancora verificato il salvataggio dei due record Cloudflare**; screenshot/lettura dei 13 record richiesti per segnare questo controllo PASS.

L'export della zona Cloudflare `onlinegarden.it.txt` è stato fornito dal responsabile e include i 11 record preliminari, con SOA e NS Cloudflare; va conservato privatamente e **non importato su IONOS**. Restano da confrontare tutti i record in produzione, in particolare selettore DKIM `s42582890`, impostazioni proxy arancione dell'A/WWW, TLS/origine, backup zona IONOS e posta. **STOP al cambio NS/delega finché non sono concluse le verifiche e la finestra non è autorizzata.**


## Verifica screenshot Cloudflare dopo aggiunta TXT Lovable — 23/11/2026, ore 18:23 CET

Il gestore ha mostrato `Cloudflare → onlinegarden.it → DNS → Records` con indicazione superiore **«13 of 200»** e righe TXT presenti per `_lovable.onlinegarden.it` (valore inizia `lovable_verify=c29d…`) e `_lovable.www.onlinegarden.it` (inizia `lovable_verify=ed9f…`), entrambe `DNS only`, TTL Auto. Restano i due A `@`/`www` a `185.158.133.1` con proxy arancione; MX `mx00.ionos.it` e `mx01.ionos.it`, SPF, _dmarc, autodiscover, s1/s2-ionos e `s42582890` tutti visibili DNS only per i record che lo supportano. **Esito: presenza dei due TXT confermata visivamente; valori completi non rileggibili nello screenshot per troncamento.** La schermata mostra in basso «Showing 1-12 of 12» mentre in alto indica 13 record; contare i record effettivi tramite Export DNS post-modifica per verifica finale.

**Nessun cambio NS ancora effettuato né autorizzato.** Prossimo gate: controllare l'effettivo selettore di firma DKIM delle email uscenti da una casella IONOS, leggendo localmente nel messaggio ricevuto `DKIM-Signature: ... s=...` (non inoltrare intestazioni complete), e confrontare con i CNAME della zona preparata. Esportare nuovamente la zona Cloudflare dopo l'aggiunta dei TXT; conservare privatamente export Cloudflare e copia completa IONOS prima del passaggio. Verificare proxy/TLS del dominio custom Lovable e DNSSEC/DS prima della modifica nameserver. **Non segnare il rilascio DNS completato finché non vengono verificate delega, posta e 16 redirect HTTP 301 live.**


## Blocco mail confermato dal responsabile — 23/11/2026

Il responsabile riferisce che Marco ha comunicato che **la casella email non è ancora attiva**. Non è quindi possibile eseguire per ora la prova di invio/recapito né osservare il selettore `s=` nelle intestazioni DKIM. I record MX/SPF/DMARC/CNAME DKIM presenti nei pannelli **non attestano l'esistenza di una casella funzionante**, né garantiscono il recapito delle notifiche ordini. Verificare quando il gestore della posta attiverà la casella prevista e confermerà quali provider e selettori sono in uso. Non abilitare inavvertitamente Cloudflare Email Routing o cambiare gli MX.

**Decisione temporanea:** procedere soltanto con **preflight non distruttivo** (export Cloudflare post-aggiunta TXT, copia dei record IONOS, verifica `SSL/TLS → Overview` e compatibilità origine Lovable, regole redirect disattivate, DNSSEC/DS). **Non autorizzare ancora cambio nameserver**, proxy web o attivazione redirect finché non siano confermati provider/servizio di posta, backup ripristinabile e controllo TLS; in assenza di test mail mantenere una riserva tecnica esplicita per go-live. La decisione commerciale finale su tempi e canali mail spetta al titolare. Stato DNS/301 e SAL contrattuale invariati.


## Cloudflare SSL/TLS — screenshot 23/11/2026 ore 18:40 CET

Il responsabile ha mostrato il pannello `SSL/TLS → Overview` per `onlinegarden.it` in Cloudflare: **Current encryption mode: Full**; il grafico riporta **No requests in the last 24 hours**. **Evidenza di configurazione, non prova di traffico Cloudflare realmente servito**: il dominio continua delegato a IONOS secondo l'ultimo controllo. In modalità `Full`, Cloudflare cifra la tratta verso l'origine su HTTPS ma **non valida il certificato di origine**. `Full (strict)` richiede certificato valido, non scaduto, con nome host corretto: non impostarlo senza controllo della compatibilità dell'origine Lovable e del proxy.

**Rischio Cloudflare/Lovable da verificare prima di cambiare NS:** i record A `@`/`www` sono attualmente **Proxied** (nuvola arancione), e i 301 Cloudflare ne richiedono una gestione proxy appropriata. Verificare nel pannello domini Lovable il supporto esplicito al **traffico dietro CDN/reverse proxy** per il custom domain corrente e che l'origine risponda correttamente a Cloudflare; non convertire A/CNAME né cambiare il proxy alla cieca. Inoltre controllare lo stato del certificato di **Edge Certificates/Universal SSL**, ma non trattare eventuale pending prima dell'attivazione della zona come un certificato attivo. Nessuna modifica SSL/TLS, NS, proxy o DNS effettuata.

**Prossima verifica non distruttiva:** aprire `Cloudflare → SSL/TLS → Edge Certificates`, fotografare la riga `Universal SSL` con stato e hostname coperti; poi verificare la configurazione del dominio custom in Lovable. Ancora STOP delega e 301 fino ai gate DKIM/posta, DNSSEC, origine/TLS, zona di ritorno e autorizzazione.


## Screenshot Cloudflare Edge Certificates — 23/11/2026 ore 19:09 CET

L'operatore ha mostrato le schermate `SSL/TLS → Edge Certificates` di Cloudflare (account Free) per `onlinegarden.it`, senza modifiche:

- **Universal SSL**: non disabilitato; il pulsante visibile è «Disable Universal SSL» (indica che la funzione è abilitata, **non** che esista già un certificato attivo).
- **Manage Edge Certificates → Hosts: No certificates.** Nessun certificato Edge attivo elencato. **STOP al proxy pubblico fino alla verifica di emissione.** Cloudflare documenta che, in setup full DNS, Universal SSL può essere emesso entro 15 minuti–24 ore dall'attivazione della zona; finché il certificato non è `Active`, il proxy HTTPS può non funzionare: [guida ufficiale](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/enable-universal-ssl/).
- **SSL/TLS mode** già `Full` nella schermata precedente: HTTPS origine cifrato, certificato origine non validato. Non impostare `Full (strict)` prima della validazione dell'origine/certificato.
- `TLS 1.3` ON, `Automatic HTTPS Rewrites` ON, `Opportunistic Encryption` ON; `Always Use HTTPS` OFF; `HSTS` OFF; `Minimum TLS version` TLS 1.0 default. Mantenere per ora gli interruttori invariati. Dopo il rilascio, valutare minimo TLS 1.2 a beneficio della sicurezza, con verifica client.
- **Advanced Certificate Manager** mostrato come opzione commerciale non attiva, **non acquistare** per risolvere il preflight.
- **Rischio proxy Lovable:** i due A Cloudflare `@` e `www` sono **Proxied**. Verificare in Lovable la modalità esatta del custom domain `onlinegarden.it` e il supporto al reverse proxy; se la connessione Lovable è configurata come normale dominio diretto A/TXT, la configurazione proxy arancione è un rischio di guasto. Non convertire tipo record o disconnettere dominio senza procedura.
- **Email non attiva** secondo il titolare; mancano prova di recapito, DKIM selettore effettivo, backup zona IONOS. **No cambio NS oggi** finché mancano queste verifiche e piano di rollback.

**Prossima verifica singola e sola lettura:** `Cloudflare → Overview` per confermare lo stato zona `Pending/Active` e i nameserver richiesti. Poi `Lovable → progetto Online Garden → Settings → Domains` per leggere stato dominio e impostazioni proxy senza toccarle. Confrontare prima di preparare la finestra delega; non attivare HSTS o comprare SSL avanzato.

## Stato Cloudflare Overview — screenshots 23/11/2026 ore 19:12 CET

L'operatore ha mostrato `Cloudflare → onlinegarden.it → Overview` con **DNS setup: Full** e messaggio **“Waiting for your registrar to propagate your new nameservers”**. Il pannello richiede il cambio da NS IONOS (`ns1098.ui-dns.de`, `ns1126.ui-dns.com`, `ns1037.ui-dns.org`, `ns1041.ui-dns.biz`) a `carlos.ns.cloudflare.com` e `karsyn.ns.cloudflare.com`. **Questa schermata non conferma che la delega sia già cambiata**; segnala che la zona Cloudflare è in attesa. Non usare `Check nameservers now` come sostituto del cambio NS o come prova di attivazione.

**Certificato:** precedente pannello `Edge Certificates` mostrava `No certificates`. In setup Full Cloudflare comunica che Universal SSL viene normalmente emesso dopo attivazione della zona (15 minuti–24 ore), e per minimizzare interruzioni su siti già live consiglia di mantenere i record web **DNS only** fino all'attivazione del certificato Edge. I record A Cloudflare `@` e `www` sono invece ancora **Proxied**. Nessuna modifica effettuata. Riferimento: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/enable-universal-ssl/ .

**Gate successivo non distruttivo:** nel progetto Lovable aprire `Settings → Domains` e documentare `onlinegarden.it` e `www`: stato `Active/Needs attention`, dominio primario e indicazioni per la connessione del dominio. La documentazione Lovable afferma che HTTPS del dominio personalizzato è gestito da Lovable e che i DNS vanno gestiti dal provider dei nameserver: https://docs.lovable.dev/features/custom-domain . Verificare origine, comportamento quando il proxy Cloudflare sarà attivo, SSL e redirect prima di modificare la delega. In parallelo: aggiornare export dei **13 record** Cloudflare e backup zona IONOS; chiarire il DKIM opzionale `s42582890` e la posta non ancora attiva. **Nessun GO al cambio NS prima del piano compatibile, del rollback e dell'autorizzazione.**


## Riscontro Lovable dominio custom — 23/11/2026 ore 19:15 CET

Il responsabile mostra `Lovable → Altro → Domini` per il progetto Online Garden. **Dominio collegato `onlinegarden.it`: «Attivo · www incluso»**, con stella che identifica il dominio principale. Indirizzo di progetto `ecom-blueprint-gen.lovable.app`. Questa evidenza attesta la **connessione attuale a Lovable sotto delega IONOS**, non che l'IP Lovable tolleri già il reverse proxy Cloudflare.

**Fonti ufficiali (23/11):** [Lovable — Custom domains](https://docs.lovable.dev/features/custom-domain) chiarisce che «Active / www included» significa connessione e SSL di dominio pronti e che Lovable emette automaticamente il proprio certificato sul dominio connesso; una diversa delega DNS va mantenuta presso il provider NS attivo. [Cloudflare — Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/enable-universal-ssl/) indica che con Full DNS l'Universal SSL può essere emesso **15 minuti–24 ore dopo attivazione zona** e, per un sito in esercizio, consiglia di tenere i web record **DNS only** fino all'attivazione del certificato edge, se non si dispone già di certificato idoneo. La schermata Cloudflare precedente mostrava `No certificates` e web record `@`/`www` **Proxied**: preflight non ancora concluso.

**Prossimo passo consigliato, senza rischio per gli utenti:** in Cloudflare `DNS → Records`, valutare la modalità **DNS only (nuvola grigia)** per i soli record **A `@` e `www` prima del cambio NS**, così l'attivazione iniziale della zona non forza immediatamente il proxy privo di certificato. Questa è una **modifica della zona Cloudflare ancora non delegata**, da eseguire solo nell'ambito del piano approvato e conservando configurazione/rollback; non cambiare MX/TXT/DKIM, né `Always Use HTTPS` o `HSTS`. La scelta DNS-only temporanea **non attiva i redirect 301 Cloudflare**, i quali andranno abilitati sul traffico proxied **solo dopo** emissione/validazione Edge e test di origine/tls. **Rimangono bloccanti:** backup zona IONOS, DKIM non verificabile per casella non attiva, continuità di servizio email prima di accettazione produttiva, compatibilità origine/proxy e piano controllo SSL dopo attivazione. **Nessuna delega NS autorizzata o eseguita**.


## Cloudflare 13/13 DNS only — verifica visuale 23/11/2026, ore 19:36 CET

Nuovo screenshot del responsabile da `Cloudflare → DNS → Records`: indicatore `13 of 200`, 13 righe visibili `Showing 1-13 of 13`. I due record A `onlinegarden.it` e `www` puntano ancora a `185.158.133.1`, **entrambi DNS only** (nuvola grigia), TTL Auto. Confermati in elenco `autodiscover`, `_dmarc`, `_domainconnect`, `s1-ionos._domainkey`, `s2-ionos._domainkey`, `s42582890._domainkey` CNAME in DNS only, MX `mx00.ionos.it` e `mx01.ionos.it`, TXT `_lovable` e `_lovable.www` e SPF alla radice. La rimozione preventiva del proxy per `@`/`www` **è completata nel pannello della zona Cloudflare non ancora delegata**; nessuna conseguenza immediata sul sito finché i nameserver pubblici restano IONOS. Il comportamento del sito dopo la delega resta da collaudare.

**Prossimo gate obbligatorio prima del cambio NS:** screenshot in sola lettura dello stato **DNSSEC / DS** su IONOS. Cloudflare [richiede di disattivare DNSSEC precedente e attendere l'esaurimento del TTL DS](https://developers.cloudflare.com/dns/dnssec/) prima di delegare a un nuovo provider; se nessun DS esiste, documentarlo e non cambiare nulla. Esportare la nuova zona Cloudflare con 13 record e conservare privatamente un backup dei record IONOS; chiarire la casella mail non attiva, il selettore DKIM usato e piano di rollback. Certificato Universal SSL Cloudflare non ancora attivo: [documentazione ufficiale](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/enable-universal-ssl/) conferma che viene emesso normalmente entro 15 minuti–24 ore dall'attivazione della zona Full DNS anche con record DNS only; attivare proxy e redirect solo dopo certificato attivo e QA sito.

**Stato release:** `DNS_ZONE_PREPARED = PASS (solo screenshot)`; `DNSSEC_STATUS = UNKNOWN`; `NAMESERVER_DELEGATION = NOT_DONE`; `EDGE_CERT = NOT_ACTIVE`; `16_REDIRECTS = 0_LIVE`. Nessun aumento SAL contrattuale.

## IONOS UI DNSSEC non visibile — 24/11/2026

Il gestore ha mostrato la sezione finale del pannello `IONOS → onlinegarden.it → DNS`. Vengono visualizzati soltanto i record standard e il riquadro promozionale DNS Pro, **nessuna sezione DNSSEC visibile**. Secondo la [guida ufficiale IONOS](https://www.ionos.it/aiuto/domini/domain-guard/impostare-e-gestire-il-dnssec/) DNSSEC nel pannello richiede DNS Pro o Domain Guard; questa assenza **non dimostra** che il dominio sia unsigned presso il Registro .it. Nessuna modifica o acquisto necessario. 

**Prossimo gate read-only:** interrogare pubblicamente i record **DS** di `onlinegarden.it` nel registro .it (ad esempio `dnschecker.org` selezionando `DS`, e/o `dnsviz.net`), salvare schermata e verificare se vi siano DS di delega precedente. Se ci sono DS, organizzarne la rimozione tramite registrar prima della modifica NS e attendere la propagazione; se non ce ne sono, segnare `DNSSEC_PREVIOUS_DS_ABSENT` soltanto dopo verifica. Mantenere **STOP modifica nameserver** in attesa di export backup definitivo, compatibilità SSL/proxy, stato mail/operatore autorizzato e rollback. Stato Cloudflare preparatorio: 13 record, A `@`/`www` DNS only. 


## Tentativo verifica DS remota — 24/11/2026 (NO RESULT)

Su richiesta dell'operatore è stato tentato un controllo diretto dei record `DS onlinegarden.it` tramite Google Public DNS e Cloudflare DNS over HTTPS con la navigazione disponibile; gli endpoint hanno restituito errore di accesso dell'ambiente. La prova DNS mediante resolver di sistema/1.1.1.1/8.8.8.8 dall'ambiente di esecuzione fallisce per `Network is unreachable`. I motori di ricerca hanno restituito guide generiche ma **nessun risultato DNSSEC DS specifico e verificabile per il dominio**. L'assenza della voce DNSSEC nell'interfaccia IONOS **non attesta l'assenza di DS**. Stato dunque `DNSSEC_DS=UNVERIFIED` (non `DISABLED`). Nessuna modifica DNS/NS effettuata.

**Verifica minima richiesta su Mac del responsabile:** `dig DS onlinegarden.it @1.1.1.1 +noall +comments +answer` e, in conferma indipendente, `dig DS onlinegarden.it @8.8.8.8 +noall +comments +answer`. Solo con `status: NOERROR` e nessuna riga DS in entrambe si può marcare `DS_NOT_PUBLISHED`. `SERVFAIL`, `timeout` o errori di rete sono inconcludenti, e righe DS positive richiedono piano di rimozione dal registro prima di delega. Non condividere token, credenziali o dati privati. **STOP al cambio NS** fino al risultato e agli altri gate del preflight.


## Primo risultato DS Cloudflare resolver 1.1.1.1 — 24/11/2026

Il responsabile ha eseguito su Mac il comando di lettura DNS `dig DS onlinegarden.it @1.1.1.1 +noall +comments +answer`. Output diretto comunicato: `status: NOERROR`, `ANSWER: 0`, `AUTHORITY: 1`, `ADDITIONAL: 1`. **Esito della sola interrogazione: nessun record DS restituito dal resolver 1.1.1.1 nel momento del test**, non si presume una valutazione definitiva dello stato DNSSEC dal solo pannello IONOS. In attesa di secondo riscontro indipendente con `dig DS onlinegarden.it @8.8.8.8 +noall +comments +answer`. **Nessun record o nameserver modificato.** Mantieni il gate di cambio NS chiuso fino a backup completo e verifiche residue di proxy/TLS, posta e rollback.


## DNSSEC DS — doppia verifica PASS del 24/11/2026

Il responsabile ha eseguito in Terminale su Mac le due interrogazioni read-only richieste, condividendo integralmente i rispettivi riepiloghi:

| Query | Header | Risultato |
| --- | --- | --- |
| `dig DS onlinegarden.it @1.1.1.1 +noall +comments +answer` | `status: NOERROR, ANSWER: 0, AUTHORITY: 1` | Nessun DS restituito |
| `dig DS onlinegarden.it @8.8.8.8 +noall +comments +answer` | `status: NOERROR, ANSWER: 0, AUTHORITY: 1` | Nessun DS restituito |

**Esito: `DNSSEC_PREVIOUS_DS_ABSENT = PASS` nelle due letture pubbliche indipendenti.** Non serve acquistare DNS Pro né intervenire sui record DS in questa situazione. **Non equivale a GO per il cambio nameserver.**

**Stato migrazione DNS al 24/11:** Cloudflare in attesa delega; zona DNS preparata con 13 record, due TXT Lovable e A apex/www **DNS only**; Lovable dominio Attivo/www incluso; Cloudflare Edge Certificate ancora `No certificates`, modalità `Full`; posta titolare non ancora attiva, quindi impossibile testarne il recapito o il selettore DKIM effettivo. **Restano prima della delega:** (1) backup completo e verificato IONOS oltre all'export Cloudflare aggiornato; (2) conferma definitiva del servizio email previsto e riconciliazione `s42582890._domainkey` con le impostazioni di invio; (3) finestra/rischi/rollback autorizzati; (4) controllo della continuità Lovable HTTPS in DNS-only e successiva attivazione certificat Edge/proxy solo dopo test. I 16 redirect 301 restano 0/16 live, senza incrementi SAL. Nessuna modifica NS, DNS o posta effettuata per questa verifica.

## Procedura operativa concordata: posta da attivare in seguito, NS su IONOS (24/11/2026)

Il responsabile chiede di completare la migrazione dei nameserver IONOS e rimandare l'attivazione della casella email. **Questa intenzione NON equivale a conferma che i nameserver siano stati già cambiati**, né dimostra che nessun altro indirizzo del dominio debba ricevere posta.

**Baseline verificata:** Cloudflare 13 record DNS, A apex/www `185.158.133.1` su `DNS only`, TXT Lovable presenti, MX `mx00.ionos.it`/`mx01.ionos.it` e SPF/DMARC/DKIM presenti; Lovable `onlinegarden.it` attivo/www incluso; DS non pubblicati in interrogazioni `1.1.1.1` e `8.8.8.8`; Cloudflare zona Pending, Edge cert `No certificates` prima della delega. Vecchi NS IONOS esatti: `ns1041.ui-dns.biz`, `ns1098.ui-dns.de`, `ns1037.ui-dns.org`, `ns1126.ui-dns.com`. Nuovi NS assegnati Cloudflare `carlos.ns.cloudflare.com`, `karsyn.ns.cloudflare.com`.

**Checklist GO prima di cliccare Salva nel pannello IONOS:**

1. Copia offline integra dei 12 record IONOS (valori interi TXT, **priorità MX**, TTL) e screenshot degli NS di partenza; aggiornare l'export Cloudflare dei **13** record dopo le ultime modifiche.
2. Verificare che i record necessari ai servizi attivi del dominio siano rappresentati in Cloudflare. Se la posta di Marco non è attiva, **non attribuirle un PASS**; il gestore deve accettare il rischio di non poter testare il recapito e confermare che non esistano altre caselle operative / servizi terzi omessi. Per la futura posta di IONOS la configurazione attuale MX/SPF/CNAME è preservata, ma va verificata o aggiornata quando sarà attivata.
3. Possibilità di intervento immediato per rollback e test sito. NS cambia autorità di tutta la zona, non soltanto dei redirect.

**A questi gate soddisfatti, passaggio manuale previsto**: IONOS → Domini & SSL → onlinegarden.it → Nameserver → Utilizza name server personali → inserire come **unici** due NS `carlos.ns.cloudflare.com` e `karsyn.ns.cloudflare.com` nei campi Name server 1 e 2; lasciare 3 e 4 vuoti/eliminare precedenti se presenti → confermare, poi verificare `dig NS onlinegarden.it @1.1.1.1 +short` e `@8.8.8.8`. Non fare trasferimento del registrar, non toccare `@/www` DNS only, non comprare certificati IONOS, non attivare HSTS/proxy/redirect in questo passaggio. In caso di errore applicare rollback verso i quattro NS IONOS originari dal pannello Name server (tenendo conto della propagazione).

**Dopo cambio**: controllare Cloudflare Overview Active, HTTPS della home/catalogo/admin/account su apex e www; verificare il certificato Universal SSL al bordo (Cloudflare può impiegare da 15 minuti a 24 ore dall'attivazione della zona), prima di valutare proxy arancione e attivare i 16 redirect 301. Non attivare proxy se non esiste certificato Edge Active o se Lovable non è compatibile. Non affermare `REDIRECTS_301=PASS` prima di test live; stato SAL invariato. Codex PR #71 è intervento separato, non autorizza DNS.

**Riferimenti ufficiali:** [IONOS nameserver](https://www.ionos.it/aiuto/domini/utilizzare-un-proprio-name-server/utilizzare-un-proprio-name-server-per-un-dominio/), [.it verifica](https://www.ionos.it/aiuto/domini/informazioni-generali-sulle-impostazioni-dns/modificare-le-impostazioni-dns-per-un-dominio-it/), [Cloudflare setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/), [Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/enable-universal-ssl/).


## IONOS — modulo nameserver compilato, salvataggio non attestato (24/11/2026 11:28 CET)

Il titolare ha mostrato screenshot della pagina `Utilizza name server personali` in IONOS per `onlinegarden.it`, con `Name server 1=carlos.ns.cloudflare.com`, `Name server 2=karsyn.ns.cloudflare.com`, `Name server 3` e `Name server 4` vuoti. La configurazione inserita coincide esattamente con i due nameserver assegnati alla zona Cloudflare. Nello screenshot il pulsante `Salva` è ancora presente: **non è attestato alcun click su Salva, né il cambio effettivo della delega**. La doppia verifica DNSSEC del 24/11 è PASS (resolver 1.1.1.1 e 8.8.8.8 `NOERROR`, `ANSWER 0`). L'email commerciale è ancora da attivare: il responsabile vuole gestirla dopo. **Condizioni prima del salvataggio:** export privati IONOS/Cloudflare effettivamente conservati e conferma che il dominio non ha altre caselle attive in uso; salvare soltanto se soddisfatte. 

**Dopo il salvataggio:** osservare conferma IONOS, verificare delega tramite DNS pubblici `dig NS onlinegarden.it @1.1.1.1 +short` e `@8.8.8.8`, Cloudflare Overview `Active`, e smoke test HTTPS home, catalogo, admin, account con A `@` e `www` DNS-only. Prima di passare a proxy arancione e attivare i 16 redirect, attendere SSL Edge realmente `Active`, fare test di compatibilità Lovable/proxy e preparare rollback. Se errore, ripristinare NS IONOS originari documentati. Non confondere precompilazione con cutover effettuato. Non aggiornare SAL fino a verifica finale.


## IONOS ha accettato il cambio nameserver — 24/11/2026 ore 11:30 CET

Il responsabile ha mostrato la schermata di conferma IONOS «**Il name server è stato modificato con successo**», con messaggio «I name server personali vengono applicati» e avviso che le modifiche possono richiedere fino a 48 ore. La schermata segue l'immissione dei due nameserver assegnati Cloudflare `carlos.ns.cloudflare.com` e `karsyn.ns.cloudflare.com` (campi 3/4 vuoti). **Esito `IONOS_CHANGE_SUBMITTED=PASS`**, mentre `PUBLIC_NS_DELEGATION_VERIFIED=PENDING`, `CLOUDFLARE_ZONE_ACTIVE=PENDING`, `EDGE_CERT_ACTIVE=PENDING`, `SSL_SITE_QA=PENDING`, `REDIRECT_301=0/16`.

**Prossimi controlli operativi:** leggere Cloudflare Overview fino a stato Active; eseguire `dig NS onlinegarden.it @1.1.1.1 +short` e `dig NS onlinegarden.it @8.8.8.8 +short`; verificare home, `www`, `/admin`, `/account`, checkout fino all'apertura ma senza ordine; mantenere A `@` e `www` su **DNS only** e lasciare inalterati SSL/TLS, HSTS, record MX/DIT/TXT. Prima del proxy arancione occorre certificato Universal SSL Edge realmente Active, compatibilità Lovable e rollback. Le email sono state rinviate per decisione del titolare e non sono ancora collaudabili; la zona Cloudflare deve preservare la futura configurazione IONOS prevista.

**Il cambio NS NON è un trasferimento di proprietà o registrar del dominio.** Non considerare terminato Cloudflare finché la delega e le prove live non siano completate.


## Prima conferma NS Cloudflare da 1.1.1.1 — 24/11/2026

A seguito della conferma IONOS del cambio NS, il responsabile ha riportato il risultato del comando richiesto `dig NS onlinegarden.it @1.1.1.1 +short`:

```text
carlos.ns.cloudflare.com.
karsyn.ns.cloudflare.com.
```

**Riscontro: la delega a Cloudflare è visibile sul resolver 1.1.1.1.** Non confondere con attivazione già verificata nell'interfaccia Cloudflare o propagazione su tutti i resolver. Prossimi controlli: `dig NS onlinegarden.it @8.8.8.8 +short`, screenshot `Cloudflare → Overview` con stato `Active` e verifica HTTPS di `https://onlinegarden.it`, `https://www.onlinegarden.it`, `https://onlinegarden.it/admin`, `https://onlinegarden.it/account`. I record A apex/www restano DNS only: il sito raggiunge direttamente l'origine Lovable e i redirect Cloudflare non sono ancora applicati. Il certificato Edge Cloudflare va verificato come `Active` prima di qualsiasi modifica Proxied, e il comportamento HTTPS con Lovable deve essere collaudato; non attivare proxy, HSTS o redirect in questa fase. Stato `PUBLIC_NS_1_1_1_1=PASS`; `PUBLIC_NS_8_8_8_8=PENDING`; `CLOUDFLARE_ACTIVE=PENDING`; `EDGE_CERT_ACTIVE=PENDING`; `REDIRECT_301=0/16`. La posta resta non testata in attesa dell'attivazione.


## Doppia conferma nameserver Cloudflare — 24/11/2026

Il responsabile ha fornito output diretto dal Terminale Mac per `dig NS onlinegarden.it @8.8.8.8 +short`, che restituisce:
```text
carlos.ns.cloudflare.com.
karsyn.ns.cloudflare.com.
```
Identica risposta era stata riscontrata prima con resolver Cloudflare `1.1.1.1`. **`PUBLIC_NS_1_1_1_1=PASS`, `PUBLIC_NS_8_8_8_8=PASS`; delegazione Cloudflare riscontrata da entrambi**, senza implicare propagazione completata presso tutti i resolver o stato della zona Active. **IONOS cambio NS già confermato**; ora nessun'altra modifica al registrar per questo passaggio.

**Gate successivi:** verificare `Cloudflare Overview: Active`, `SSL/TLS → Edge Certificates: Active` per apex e `www`/wildcard prima di proxy, e un test HTTPS diretto di home, `www`, `/admin`, `/account` e checkout ospitato. A e www Cloudflare restano DNS only; Cloudflare redirect 301 ancora non attivi `0/16`. Email non attiva e recapito non collaudato. Nessuna nuova modifica del proxy o dei nameserver consigliata. Conservare backup originali e rollback. SAL ufficiale invariata finché i criteri live non sono collaudati.


## Cloudflare recheck pending e Edge Certificates vuota — 24/11/2026 ore 12:08 CET

Il gestore ha fornito screenshot contemporanei da `Cloudflare → Overview`, `SSL/TLS → Overview` e `SSL/TLS → Edge Certificates` **dopo** la conferma IONOS e la doppia risoluzione NS di `1.1.1.1` e `8.8.8.8`.

- Cloudflare Overview mostra ancora `Waiting for your registrar to propagate your new nameservers`, con banner `The verification for the nameservers of onlinegarden.it is already being re-checked. You may only submit a re-check once per hour.` Quindi la verifica Cloudflare è già in corso, **zona non attestata Active**. Non ripetere il recheck.
- `Manage Edge Certificates` mostra `No certificates`, mentre `Disable Universal SSL` è visibile: Universal SSL **abilitato come funzione**, ma **nessun Edge certificate emesso** finora. `SSL/TLS encryption mode: Full` e `No requests in the last 24 hours`: coerenti con A `@`/`www` impostati `DNS only`, poiché il traffico web non attraversa il proxy.
- `Always Use HTTPS` OFF; `HSTS` OFF; `Minimum TLS Version` TLS 1.0; `TLS 1.3` ON e `Automatic HTTPS Rewrites` ON. Non cambiare queste impostazioni mentre la zona è pending.
- Universal SSL su zone Full DNS si emette **entro 15 minuti–24 ore dopo lo stato Active**, anche per record DNS only, secondo https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/enable-universal-ssl/ . La documentazione Cloudflare sulle zone pending chiarisce che un recheck riuscito **non attiva immediatamente** la zona e la coda può impiegare minuti/ore: https://developers.cloudflare.com/dns/zone-setups/troubleshooting/pending-nameservers/ .
- Tutti i record A web devono rimanere **DNS only** fino a stato Cloudflare Active, Edge cert Active, prova HTTPS origine Lovable e piano rollback/compatibilità proxy; ancora **NO-GO proxy e redirect 301**. In questa fase i redirect Cloudflare non funzionano e i 16 vecchi URL restano in attesa di release.
- **Prossimo passo osservabile:** verificare che `https://onlinegarden.it` e `https://www.onlinegarden.it` aprano senza errori e che siano raggiungibili `/admin`, `/account` e apertura checkout ospitato; non eseguire ordini né pagamenti. Da Cloudflare attendere lo stato `Active` e poi verificare `Edge Certificates` con `Status: Active`. Se pending permane oltre la normale finestra con NS corretti, confrontare `dig +trace onlinegarden.it NS` con delega .it, poi supporto.
- Le configurazioni di posta restano non collaudate (casella Marco non ancora attiva), quindi nessun PASS per invio/ricezione mail. **Stato SAL invariato; nessuna modifica ulteriore fatta dall'assistente.**


## Conferma di accessibilità del sito e stato PR Admin — 24/11/2026

Dopo il cambio NS e la risposta concorde da `1.1.1.1`/`8.8.8.8`, il responsabile ha confermato in chat che **`https://onlinegarden.it` si apre normalmente**. Questo è uno **smoke test utente del sito**, non un collaudo automatico completo di `www`, carrello, Admin autenticato, login cliente o checkout. Mantenere `HTTPS_STOREFRONT_USER_CHECK=PASS`; `CLOUDFLARE_ACTIVE=PENDING`, `CLOUDFLARE_EDGE_CERT=PENDING`, `PROXY_AND_301=NO_GO`.

**Admin V2 in parallelo:** GitHub PR #71 `merged=true`, merge SHA `50e02a525ebb53ebfcb5c8fa6b462fb6adc8fb85`. PR #72 documentale ancora **OPEN**, mergeability `clean` al controllo; PR #69 e #70 ancora **OPEN**. Lovable progetto `95cad199-55fd-4870-9d5c-a2653edf88f5` segnala ultimo commit di editor `7f32a1c8a0879b179d2b5e2b76b08bb447ac06c4`, dato che **non attesta il Publish di quella revisione**. Il report #71 conferma frontend pubblico r2. Edge `product-admin-api` **non distribuita** come candidata; rollback revision attiva non confermata. Il connettore Supabase disponibile in questa sessione non elenca il progetto Online Garden `iekwvvihjwghosqdxrdi`: non usarlo per affermare quale revisione Edge sia attiva, né per il deploy. Occorre un operatore autorizzato sul **progetto esatto** per verificare la revisione prima del GO. Nessun Publish, deploy o cambio dati commerciali eseguito da questo aggiornamento. SAL resta 57,75%.


## Cloudflare Active e Lovable Cloud — nuovo checkpoint 24/11/2026

**Cloudflare:** screenshot fornito dal titolare mostra `Your domain is now protected by Cloudflare` in Overview, per `onlinegarden.it` (zona **ACTIVE**). In precedenza i resolver `1.1.1.1` e `8.8.8.8` avevano già confermato i NS Cloudflare e il titolare aveva confermato accessibilità della home HTTPS. Tuttavia il riquadro `Proxy DNS records` avverte che alcuni record web restano `DNS only`: **la protezione proxy e i 16 redirect non sono ancora attivi**. Occorre verificare Edge certificate `Active` e poi una finestra sicura per proxy/redirect, senza assumere che la dicitura Overview attesti il traffico proxied. Stato `CLOUDFLARE_ZONE_ACTIVE=PASS`, `EDGE_CERT_ACTIVE=PENDING`, `WEB_PROXY=PENDING`, `REDIRECTS_301=0/16`. Posta rinviata e non collaudata.

**Admin Lovable Cloud:** progetto `95cad199-55fd-4870-9d5c-a2653edf88f5` (workspace `3Pi6MGKhvyDEoTyF3hut`) usa database Lovable Cloud stack `supabase`, già abilitato; **non creare altro ambiente Supabase**. Branch editor verificato via Lovable project `9a89cda6172155e71d535260d1e3746d7677b4cd`, PR #72 già mergiata, PR #71 `50e02a5`. La verifica Lovable in plan mode ha riferito che `5a37f71d02070f51a5b2e841d15bf7cda3b72747` **non è ancora presente nel checkout editor sincronizzato**: non usare Publish dal ramo corrente; prima verificare branch picker e full SHA del ramo isolato. `product-admin-api` è protetta con `verify_jwt=false` in config per CORS e **controllo autorizzazione nel codice**, non cambiare l'impostazione per il rilascio senza audit mirato. La versione runtime Edge attiva non è dimostrata; una nuova distribuzione dalla sola sorgente r2 è rollback potenziale, ma non prova l'equivalenza con la revisione attiva. Occorre approvare separatamente distribuzione della sola Edge e Publish, con rollback e smoke test autentico. Nessun deploy/publish eseguito durante il check. SAL 57,75%.
