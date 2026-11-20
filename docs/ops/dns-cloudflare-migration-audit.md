# Online Garden — passaggio DNS a Cloudflare per redirect SEO 301

**Aggiornato:** 2026-11-20 (con evidenza screenshot Cloudflare 17:47)  
**Stato:** redirect 301 Cloudflare già configurati; attivazione DNS/NS non ancora confermata.  
**Riferimento operativo:** configurazione comunicata da **Lovable**, che il cliente indica come interlocutore per la gestione del dominio.

> Questo documento conserva lo stato comunicato dal cliente: non è una scansione live dei DNS né autorizza modifiche infrastrutturali. **Non ricominciare da zero** la configurazione dei redirect già preparati.

## Decisioni e ruoli

- **Lovable:** riferimento operativo del cliente per la gestione del dominio e piattaforma che ospita il frontend di Online Garden. Per i record necessari, usare i valori forniti da Lovable.
- **Cloudflare:** DNS da attivare e regole di redirect HTTP 301 **già predisposte** per i vecchi URL verso `/products/...`.
- **IONOS:** server di posta indicati da Lovable; la sua risposta elenca anche nameserver della famiglia `ui-dns` come delega attuale. Questa informazione tecnica non va confusa con il rapporto operativo tra cliente e Lovable: l'operazione concreta di cambio NS andrà svolta dal pannello/gestore che può effettivamente modificare la delega.
- **Shopify:** checkout, ordini e pagamenti; nessun cambiamento previsto.

Non proporre di rifare i 301; non chiedere al cliente di ricostruire la stessa configurazione partendo da IONOS.

## Zona DNS fornita da Lovable (fonte di riferimento scelta dal cliente)

| Tipo | Nome | Valore | Priorità | Nota |
| --- | --- | --- | --- | --- |
| A | `@` | `185.158.133.1` | — | Lovable web |
| A | `www` | `185.158.133.1` | — | Lovable web |
| MX | `@` | `mx00.ionos.it` | 10 | Mail IONOS |
| MX | `@` | `mx01.ionos.it` | 10 | Mail IONOS |
| TXT | `@` | `v=spf1 include:_spf-eu.ionos.com ~all` | — | SPF |
| CNAME | `autodiscover` | `adsredir.ionos.info` | — | Mail, DNS only |
| CNAME | `_dmarc` | `dmarc.ionos.it` | — | Configurazione dichiarata, DNS only |

Nameserver attuali **dichiarati da Lovable**: `ns1037.ui-dns.org`, `ns1041.ui-dns.biz`, `ns1098.ui-dns.de`, `ns1126.ui-dns.com`.

Nel confronto del thread precedente A, MX, autodiscover e _dmarc risultavano corrispondenti a Cloudflare. Non sono però stati ri-verificati in questa sessione. SPF non ancora confrontato integralmente; DKIM, DNSSEC e altri record non confermati.

## Evidenza visuale Cloudflare — 2026-11-20 17:47

Screenshot del cliente: pagina **DNS Setup: Full**, testo **“Your traffic is almost ready to proxy”**, pulsante **“Continue to activation”** ancora visibile.

Record riscontrati:
- A `onlinegarden.it` → `185.158.133.1` — **Proxied**, TTL Auto, simbolo di avviso arancione da ispezionare.
- A `www` → `185.158.133.1` — **Proxied**, TTL Auto, simbolo di avviso arancione da ispezionare.
- CNAME `autodiscover` → `adsredir.ionos.info` — **DNS only**.
- CNAME `_dmarc` → `dmarc.ionos.it` — **DNS only**.
- CNAME `_domainconnect…` → `_domainconnect.io…` — **DNS only**, nuovo record rispetto all'elenco iniziale di Lovable; **conservare e verificare valore completo**.
- MX `onlinegarden.it` → `mx00.ionos.it` e `mx01.ionos.it`, entrambi priorità **10**.
- TXT `onlinegarden.it` → valore SPF **troncato in UI**, non verificabile integralmente dallo screenshot.
- Nessun record DKIM visibile nella tabella mostrata; verificare prima se già esistenti sotto altri nomi e, se assenti, inserire i 3 CNAME documentati da IONOS.

### Interpretazione e prossimo passo

- Le nuvole arancioni di `@`/`www` sono **coerenti con l'uso dei 301 Cloudflare**: Cloudflare Single/Bulk Redirects richiede traffico proxied. Non trasformarle in grigio per l'obiettivo SEO.
- La presenza di “Continue to activation” segnala un **passaggio di attivazione ancora pendente** nella UI; la presenza di record nel pannello non garantisce da sola che i NS siano già stati cambiati.
- Cliccare su SPF > Edit per confrontare il valore integrale con `v=spf1 include:_spf-eu.ionos.com ~all`; non modificarlo se coincide.
- Verificare/aggiungere i tre DKIM IONOS come CNAME DNS only (`s1-ionos._domainkey`, `s2-ionos._domainkey`, `s42582890._domainkey`) prima dell'attivazione, evitando duplicati.
- Esaminare l'avviso arancione accanto ai due A, **senza attribuirgli una causa non confermata**.
- Verificare DNSSEC/DS, poi collaudare origin Lovable/TLS con proxy e le regole 301 prima del cambio di delega.
- Non cancellare `_domainconnect`: IONOS documenta questo record per integrazioni di dominio con servizi esterni (https://www.ionos.it/aiuto/domini/collegare-un-dominio-ad-un-sito-web-esterno/collegare-un-dominio-11-ionos-ad-un-account-di-posta-elettronica-mailjet/).

Fonti: https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/ ; https://developers.cloudflare.com/rules/url-forwarding/single-redirects/create-dashboard/ ; https://www.ionos.it/aiuto/domini/configurare-un-server-di-posta-e-i-relativi-record/autenticazione-delle-e-mail-con-dkim/

## Verifica SPF — evidenza screenshot del 20 novembre 2026 alle 17:48

Nel form di modifica Cloudflare, il record TXT apex presenta contenuto **`"v=spf1 include:_spf-eu.ionos.com ~all"`**. Il valore tra virgolette corrisponde esattamente a quello comunicato da Lovable e citato nella documentazione IONOS. **SPF: confronto testuale PASS** (non implica test DNS pubblici o autorizzazione al cutover).

Le doppie virgolette visualizzate sono normali delimitatori di una stringa TXT per Cloudflare: la documentazione ufficiale specifica che il pannello Cloudflare aggiunge automaticamente le virgolette quando assenti in salvataggio e richiede virgolette bilanciate. **Non eliminare le virgolette**; uscire dalla modifica con Cancel, non salvare senza necessità.

Fonte ufficiale: https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/ ; https://developers.cloudflare.com/dns/changelog/

**Prossimo controllo:** cercare record DKIM nella zona Cloudflare già predisposta (filtrando `_domainkey`) e verificare DNSSEC; nessuna modifica ai record correnti.

## Verifica DKIM — ricerca Cloudflare 2026-11-20 alle 17:50

Screenshot del cliente, filtro Cloudflare `_domainkey`: **No DNS records**. **DKIM: assenti nella zona Cloudflare predisposta**, non necessariamente nella zona DNS attiva presso il provider dei nameserver. Lo stato di migrazione rimane **pre-attivazione** con pulsante `Continue to activation` visibile.

La guida ufficiale IONOS conferma che le mailbox IONOS richiedono, **quando i DNS sono gestiti da un altro provider**, i tre CNAME:

| Tipo | Nome in Cloudflare | Target | Proxy | TTL |
| --- | --- | --- | --- | --- |
| CNAME | `s1-ionos._domainkey` | `s1.dkim.ionos.com` | DNS only | 1 ora |
| CNAME | `s2-ionos._domainkey` | `s2.dkim.ionos.com` | DNS only | 1 ora |
| CNAME | `s42582890._domainkey` | `s42582890.dkim.ionos.com` | DNS only | 1 ora |

**Azione concordata:** aggiungere questi tre record nella zona Cloudflare per `onlinegarden.it` e verificare che compaiano nella ricerca `_domainkey`. Non cambiare gli A Proxied, MX, SPF, DMARC, autodiscover o le regole redirect 301. Non cliccare ancora `Continue to activation`: restano da verificare DNSSEC/DS e il proxy/TLS verso Lovable.

**Distinzione stato:** guida IONOS verificata; assenza nella zona Cloudflare verificata tramite screenshot; inserimento e propagazione DKIM **non ancora verificati**.

Fonte: https://www.ionos.it/aiuto/domini/configurare-un-server-di-posta-e-i-relativi-record/autenticazione-delle-e-mail-con-dkim/

## Evidenza 2026-11-20 ore 17:53 — tre DKIM inseriti

Screenshot Cloudflare fornito dal cliente: nella zona in fase di preparazione compaiono tre **CNAME DNS only** destinati a `s1.dkim.ionos.com`, `s2.dkim.ionos.com` e `s42582890.dkim.i...` (ultimo **troncato dall'interfaccia**). Si vedono anche i due A web in **Proxied**, i due MX IONOS con priorità 10, autodiscover e DMARC DNS only, e il TXT SPF già confrontato.

**Stato:** DKIM aggiunti e visibili nella UI, ma il nome e il valore completi del terzo non sono interamente leggibili. Verificarli nel form prima di attestare il PASS completo. Nessuna evidenza di test reali di firma email e nessuna conferma di attivazione nameserver: il pulsante `Continue to activation` è ancora visibile.

**Prossimo gate:** verifica DNSSEC/DS e gestione della delega nameserver dal soggetto che la controlla; successivamente collaudo compatibilità Lovable/Cloudflare proxy e redirect, senza alterare i 301 esistenti.

## Decisione operativa — DNSSEC differito, 2026-11-20

Il cliente non dispone attualmente dell'accesso al pannello di delega del dominio. È stato concordato di **continuare l'onboarding Cloudflare senza cambiare i nameserver**: il pulsante `Continue to activation` porta alle istruzioni/ai nameserver assegnati, ma non esegue da solo la modifica della delega al registrar.

**DNSSEC è un gate obbligatorio prima del cambio effettivo dei nameserver, non un blocco per visualizzare il passo successivo.** Se il registro contiene un vecchio DS, la delega a Cloudflare senza rimuoverlo/coordinare le chiavi può generare `SERVFAIL` e rendere irraggiungibili sito e posta. Non attestare che DNSSEC sia inattivo senza un controllo del record DS pubblico o del pannello del registrar. Un tentativo di interrogare DNS pubblici da questa sessione è fallito per assenza di rete DNS nel runtime: nessun risultato di DNSSEC è stato ottenuto.

**Passo successivo richiesto al cliente:** aprire `Continue to activation`, fornire screenshot dei nameserver proposti da Cloudflare e **non** modificarli ancora nel pannello che controlla la delega.

Riferimenti: https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/ ; https://developers.cloudflare.com/dns/dnssec/

## Verifiche residue senza riaprire la configurazione

1. **Cloudflare:** verificare che la zona riporti esattamente i sette record della tabella, con MX corretti, TXT SPF completo, eventuali altri record da preservare. Non cambiare le regole 301 esistenti.
2. **Posta:** controllare se sono presenti CNAME DKIM IONOS anche se non compaiono nel riepilogo Lovable. Come riferimento, la guida IONOS cita `s1-ionos._domainkey → s1.dkim.ionos.com`, `s2-ionos._domainkey → s2.dkim.ionos.com`, `s42582890._domainkey → s42582890.dkim.ionos.com`. **Non aggiungerli automaticamente** prima di controllare la configurazione effettiva e i selector.
3. **DNSSEC:** verificare eventuali DS attivi al registro; un DS non coordinato con la nuova delega può rendere il dominio irraggiungibile.
4. **Redirect:** per eseguire i redirect di Cloudflare, gli host web interessati devono attraversare il proxy Cloudflare (nuvola arancione). In `DNS only` il DNS risolve, ma le Redirect Rules non vengono applicate. Verificare il comportamento HTTPS e la compatibilità con Lovable prima di attivare il proxy.
5. **Cambio delega:** agire solo sul pannello autorizzato a modificare i nameserver; distinguere l'interfaccia di gestione Lovable dai NS `ui-dns` riferiti da Lovable. Non assumere che sia necessario trasferire la registrazione del dominio.
6. **QA post-attivazione:** testare homepage `@` e `www`, HTTPS, 301 veri (risposta HTTP), canonical, sitemap, catalogo, PDP, carrello, checkout Shopify, ricezione/invio email, SPF/DKIM/DMARC.

## Stato operativo per cliente, designer e developer

- [x] Scelta Cloudflare per i redirect 301
- [x] Configurazione iniziale redirect 301 (secondo il cliente)
- [x] Confronto preliminare A/MX/autodiscover/_dmarc riportato nel precedente thread
- [x] Confermata dal cliente la preferenza di usare **Lovable come fonte operativa** per i record DNS
- [x] Confronto testuale SPF Cloudflare–Lovable, screenshot 2026-11-20
- [x] Tre record DKIM inseriti nella zona Cloudflare e visibili nello screenshot
- [ ] Confermare valore e host completi del terzo DKIM, altri record necessari
- [ ] Verifica DNSSEC/DS e possibilità effettiva di modificare NS
- [ ] Verifica compatibilità proxy Cloudflare/Lovable e TLS
- [ ] Cutover nameserver quando sicuro e autorizzato
- [ ] Collaudo sito, 301, checkout e posta

**NO-GO:** DNSSEC incerto, email non verificata, origin TLS/proxy non collaudati, record necessari mancanti.

## Documentazione di riferimento

- https://docs.lovable.dev/features/custom-domain
- https://developers.cloudflare.com/rules/url-forwarding/
- https://developers.cloudflare.com/dns/troubleshooting/email-issues/
- https://www.ionos.it/aiuto/domini/configurare-un-server-di-posta-e-i-relativi-record/autenticazione-delle-e-mail-con-dkim/

**Gestione modifiche:** aggiornamento documentale su branch dedicato; nessun cambio DNS, Cloudflare, Lovable o Shopify eseguito.
