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

