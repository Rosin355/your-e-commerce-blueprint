# Online Garden — Verifica DNS IONOS → Cloudflare (redirect SEO 301)

**Ultimo aggiornamento:** 2026-11-20  
**Stato:** configurazione Cloudflare dei redirect 301 già predisposta; cambio nameserver NON ancora eseguito (secondo il resoconto della conversazione precedente).  
**Scopo:** completare la verifica DNS prima di attivare la delega Cloudflare, senza interrompere email IONOS, hosting Lovable o checkout Shopify.

> Questa nota sintetizza esclusivamente il contesto riportato dal cliente e i controlli già descritti nel thread precedente. Non attesta una nuova verifica live della zona IONOS/Cloudflare. Nessuna modifica infrastrutturale è autorizzata da questo documento.

## Decisioni già prese

- **Cloudflare è stato scelto** per effettuare redirect HTTP 301 dagli URL storici ai nuovi URL dei prodotti, perché il setup Lovable corrente non li gestisce come richiesto.
- La configurazione dei redirect 301 su Cloudflare **è già stata preparata**; non bisogna proporre di rifarla.
- Il dominio resta registrato su **IONOS**; nameserver e DNS attuali sono ancora IONOS secondo il resoconto.
- Il frontend resta ospitato su **Lovable**; non usare l'opzione “Let Lovable manage your domain”.
- Il checkout e i pagamenti continuano su **Shopify**.
- Il cliente utilizza la posta **IONOS**.
- Nel precedente flusso è stata data l'indicazione di **non premere “Continue to activation”** finché non sarà completato il controllo DNS.

## Confronto già eseguito nel thread precedente

| Record | Valore dichiarato | Risultato del confronto riportato |
| --- | --- | --- |
| A `@` | `185.158.133.1` | corrisponde |
| A `www` | `185.158.133.1` | corrisponde |
| MX `@` principale | `mx00.ionos.it` | corrisponde |
| MX `@` secondario | `mx01.ionos.it` | corrisponde |
| CNAME `autodiscover` | `adsredir.ionos.info` | corrisponde |
| CNAME `_dmarc` | `dmarc.ionos.it` | corrisponde |
| TXT SPF | `v=spf1 include:_spf-eu.ionos.com ~all` | **confronto integrale ancora necessario** |
| DKIM | da inventariare | **non confermato** |
| DNSSEC/DS | da verificare | **non confermato** |
| Sottodomini, altri TXT e servizi terzi | da inventariare | **non confermati** |

Nameserver IONOS riportati da Lovable (non re-verificati in questa nota): `ns1037.ui-dns.org`, `ns1041.ui-dns.biz`, `ns1098.ui-dns.de`, `ns1126.ui-dns.com`.

## DKIM — valori confermati dalla documentazione ufficiale IONOS

La guida IONOS Italia per caselle email con DNS esterno indica esplicitamente questi tre **CNAME** (TTL 1 ora), da mantenere **DNS only** su Cloudflare:

| Host | Target |
| --- | --- |
| `s1-ionos._domainkey` | `s1.dkim.ionos.com` |
| `s2-ionos._domainkey` | `s2.dkim.ionos.com` |
| `s42582890._domainkey` | `s42582890.dkim.ionos.com` |

**Non dedurre dall'assenza nella risposta Lovable che questi record non esistano già in IONOS o Cloudflare.** Confrontare i valori del provider prima di aggiungerli, per non creare record duplicati o in conflitto.

Fonte: https://www.ionos.it/aiuto/domini/configurare-un-server-di-posta-e-i-relativi-record/autenticazione-delle-e-mail-con-dkim/

## Prossimo passaggio pratico

Richiedere dal pannello IONOS **Domini e SSL → onlinegarden.it → DNS** uno screenshot o export **completo** della zona, inclusi record DKIM ed eventuali pagine supplementari; quindi aprire la sezione DNSSEC e verificare se esistono chiavi/DS pubblicati. Non apportare modifiche a IONOS, Lovable o Cloudflare durante l'audit.

Confrontare uno a uno con la zona Cloudflare già preparata:
- tutti i record SPF (garantire un unico SPF efficace);
- i record DKIM IONOS (valori reali dei CNAME), evitando assunzioni sui selector;
- DMARC, record di mail autodiscover, eventuali ulteriori servizi e TXT di verifica;
- configurazione DNSSEC/DS per evitare interruzioni dopo la sostituzione NS.

Non confondere **DNS only** (nuvola grigia) con **Proxied** (nuvola arancione): il traffico deve attraversare il proxy per eseguire le regole 301 di Cloudflare. Pianificare separatamente test SSL/TLS, compatibilità Lovable e condizioni di attivazione della nuvola arancione, senza modificare arbitrariamente ciò che è stato già configurato.

## Checklist di controllo per design, sviluppo e cliente

- [x] Scelta Cloudflare per i redirect 301
- [x] Preparazione regole 301 nel pannello Cloudflare (riportata dal cliente)
- [x] Confronto preliminare A, MX, autodiscover, _dmarc tra Lovable/IONOS dichiarati e Cloudflare (riportato dal thread)
- [ ] Screenshot/export DNS completi direttamente da IONOS
- [ ] Conferma SPF integrale ed eventuali altri servizi mittenti
- [ ] Conferma di tutti i record DKIM
- [ ] Conferma DNSSEC/DS
- [ ] Confronto completo IONOS ↔ Cloudflare senza record mancanti
- [ ] Verifica configurazione HTTPS e proxy per esecuzione redirect
- [ ] Attivazione nameserver su IONOS, solo dopo revisione
- [ ] QA post-cutover: DNS, invio/ricezione email, SPF/DKIM/DMARC, sito `@`/`www`, certificati, 301, canonical, prodotti, carrello e checkout Shopify

## Criteri GO/NO-GO

**GO:** inventario completo, posta verificata, DNSSEC definito, configurazione Lovable/HTTPS verificata, redirect con test di risposta HTTP 301, rollback disponibile.

**NO-GO:** DKIM/SPF mancanti o ambigui, DNSSEC non risolto, problemi di compatibilità con il proxy, rischi per email o acquisti.

## Riferimenti ufficiali

- Cloudflare URL forwarding: https://developers.cloudflare.com/rules/url-forwarding/
- Cloudflare Email DNS troubleshooting: https://developers.cloudflare.com/dns/troubleshooting/email-issues/
- Lovable custom domain: https://docs.lovable.dev/features/custom-domain
- IONOS: https://www.ionos.it/aiuto/

**Nota:** i risultati già citati dal thread precedente sono preservati come *stato riportato*, non come nuovi test realizzati in questa sessione.
