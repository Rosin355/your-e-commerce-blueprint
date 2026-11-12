# Online Garden — checklist unica di chiusura

Aggiornamento: **12 novembre 2026, dopo il Publish e il controllo finale**. Scadenza richiesta dal proprietario: venerdì 13 novembre, Europe/Rome, senza un orario preciso. Nessuna promessa di lavoro in background o di ranking. Il mandato corrente autorizza il primo rilascio SEO e conserva l’Admin già operativo; nuovi prodotti, valori/prezzi e pubblicazioni commerciali richiedono una scelta esplicita. Nessun nuovo ambiente, costo, app, DNS/proxy o redesign autorizzato implicitamente.

## Concluso e realmente pubblicato

**Primo rilascio SEO concluso e verificato live il 12 novembre 2026.** [PR #49](https://github.com/Rosin355/your-e-commerce-blueprint/pull/49) MERGED, HEAD validato `91c26c11a47951b0bf822a644fd42428e8c9ae18`, main applicativo `2d1cee558ff1e292f5d8f34e9d0f86b87b5ce6fb`. [CI Storefront/PostgreSQL 17 e GitGuardian](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/43261015209) SUCCESS sul candidato; nessuna CI push main configurata. Publish Lovable `539ca523-c5ec-4fd0-b5de-3792c605d28d`, versione realmente servita su `onlinegarden.it`: **`seo-p1-20261112-r1`**, asset `/assets/index-7LGwLIzQ.js`. Il merge GitHub e il Publish sono stati verificati separatamente.

**Admin operativo preservato:** modulo live `readOnlyRelease-DRvoVRBm.js` HTTP 200, byte identici alla build validata, `readOnly=false`, marker `admin-delivery-20261110-r1`. Nessun cambiamento a sorgenti Admin/backend, configurazione operativa, grant, flag, migration o prodotti. Ruolo editor e sette capability nominative di Marco restano quelli già assegnati; accesso personale già confermato, senza ripetere login o canary. Questa verifica di continuità non certifica nuove operazioni dalla sessione cliente.

**Postcondizione server dopo il Publish, 12/11 ore 18:17:47 CET:** un solo account corrispondente, email verificata, solo ruolo `editor`, grant attivo con le sette capability e 14 campi; zero altri grant attivi. RLS sulle tre tabelle catalogo attiva e zero privilegi client. Lettura aggregata tramite connettore Lovable sul progetto corretto, senza email/UUID personali nell’output o nel repository; nessuna assegnazione ripetuta. Non è una nuova sessione cliente né una prova di scrittura.

**Sitemap e robots:** `/sitemap.xml` HTTP 200, XML valido con **1.349 URL (1.346 prodotti pubblici + 3 pagine)**, DRAFT tecnica esclusa. `/robots.txt` HTTP 200 con direttiva sitemap apex. Canonical renderizzati autoriferiti su catalogo/PDP/contatti; ricerca `noindex,follow`, PDP pubblica `index,follow`. Fotografia generata il 12/11 alle 16:27:20 UTC. Non è una garanzia di indicizzazione/ranking o una nuova URL Inspection Google.

**Verifica finale:** home, catalogo (1.346 prodotti), ricerca, PDP Rosa Jasmina, canonical/indexazione, offerte JSON-LD reali, breadcrumb/correlati con href, carrello e apertura checkout PASS. Desktop 1280×720 e mobile reale 390×844 senza overflow; override ripristinato. Preventivo standard Roma: €18,50 + €8,90 = €27,40, senza ordine/addebito o dati di contatto; carrello svuotato. Contatti e link Privacy presenti. Safari/iOS non verificati: il controllo Safari non ha risposto. Nessuna nuova prova di pagamento, consegna email o pubblicazione commerciale.

Il sorgente applicativo distribuito è il merge sopra. Gli aggiornamenti documentali successivi non sono un secondo Publish e non cambiano il backend. L’HTML/modulo pubblico è stato associato al deployment reale, non alla sola anteprima Lovable. Le impronte e gli screenshot sono nella [release evidence](../seo/evidence/release-2026-11-12.json).

## Stato dei requisiti e dipendenze effettive

| Attività | Stato alla chiusura di questa sessione | Prova / azione necessaria |
| --- | --- | --- |
| PR #49, build SEO, sitemap/robots/canonical | **Concluso e pubblicato** | CI/GitGuardian sullo SHA finale, merge e versione live distinti; 1.349 URL HTTP 200 |
| Account Marco e permessi | **Concluso, preservato** | Account verificato, solo editor, sette capability/14 campi; accesso personale già confermato. Nessuna nuova richiesta login |
| Editing/sync/prezzi, bozza reale con immagine, categoria e pubblicazione cliente | **Accettazione operativa aperta** | Proprietario non ha ancora scelto prodotto/campo/valore, dati reali del nuovo articolo o prodotto da pubblicare. Non sceglierli al suo posto; prezzo solo se richiesto. Upload computer già disponibile |
| Collaudo tecnico precedente | **Acquisito, non riaperto** | Una sola DRAFT tecnica, immagine/recovery/sync già verificati; non pubblicarla né ricrearla |
| 16 mapping dimostrabili | **Proposti; 0 approvati; 0 pubblicati** | Tabella seguente; fonti GSC/export e GID/varianti/publicazione ricontrollati senza dipendere dal TAR |
| 3 identità incerte e altri 1.255 percorsi | **Riconciliazione proseguibile con fonti disponibili** | Separare i casi; nessuna identità dedotta da prefisso o nome. La verifica mirata corrente non ha risolto i tre casi |
| Livello HTTP redirect | **Dipendenza infrastrutturale aperta** | Lovable non espone path-level 301; DNS IONOS identificato, nessun proxy controllato dimostrato. Serve titolare/referente DNS IONOS per una proposta e consenso specifico a eventuali cambi |
| Spedizioni A/B, Sicilia/Sardegna | **Preservate** | Riusati sei casi precedenti; preventivo Roma attuale €8,90. Nessun importo/regola cambiato |
| Tutte le isole minori con tariffa speciale | **Copertura non dimostrata** | Zero carrier services Shopify; market isole basato su province. Lettura delle personalizzazioni negata per scope `read_delivery_customizations` assente; non si conclude che nessuna personalizzazione esista. Non dimostrato un meccanismo CAP/località: nessun supplemento alle province continentali, vecchia deroga o nuova app attivati |
| Privacy e contatti | **Pubblicati e ricontrollati** | Shopify Privacy 30/10, contatti e footer live |
| Termini, cookie, spedizioni/resi e dati societari | **Contenuti attuali approvati mancanti** | Recupero selettivo dal vecchio hosting oppure testi/dati approvati. Qualunque testo recuperato resta da validare |
| Backup fornito | **Esame concluso: troncato, non utilizzabile per recuperare i contenuti richiesti** | Dimensione, hash e interruzione sotto; non ripetere tentativi identici né dichiarare recuperati DB/testi/permalink |
| Notifiche | **Invio piattaforma parzialmente attestato** | Tre conferme ordine `mail_sent` su ordini esistenti; ricezione cliente/staff, mittente e template non provati. Nessun ordine/invio test |
| Desktop/mobile e Safari | **Storefront desktop/mobile PASS; Safari/iOS non verificati** | 1280×720 e 390×844 effettivi; controllo Safari senza risposta. Non equivale a QA Admin nella sessione Marco |
| Recovery | **Limite invariato** | Sorgente frontend precedente recuperabile e snapshot gestito già identificato; nessun rollback/restore eseguito, `restoreVerified=false` |

## Sedici corrispondenze da approvare — soltanto proposte

**Il proprietario ha chiesto di non registrare ancora l’approvazione.** Ogni riga usa URL GSC + identità Woo ID/SKU/categoria/immagine, poi GID e SKU attuali. Gli export non contengono un permalink autorevole: confidenza tecnica alta non è consenso commerciale. I dettagli degli ID restano nelle [evidenze originarie](../seo/evidence/mapping-evidence.json) e nella lettura corrente. L’approvazione della tabella non autorizza DNS/proxy. Manifest `enabled=false`, `approvalReference=null`, `reviewApproved=false`.

| Vecchio URL (apex e www) | Prodotto / SKU storico | Nuova destinazione proposta |
| --- | --- | --- |
| `/prodotto/rose/rosa-jasmina-rampicante/` | Rosa Jasmina - Rampicante — `OG_436162` | [rosa-jasmina-rampicante](https://onlinegarden.it/products/rosa-jasmina-rampicante) |
| `/prodotto/piante-da-interno/grasse-e-succulente/agave-americana-verde/` | Agave Americana Verde — `OG_317782` | [agave-americana-verde](https://onlinegarden.it/products/agave-americana-verde) |
| `/prodotto/piante-da-interno/piante-da-appartamento/kalanchoe-calandiva-bianco/` | Kalanchoe “Calandiva bianco" — `OG_182937` | [kalanchoe-calandiva-bianco](https://onlinegarden.it/products/kalanchoe-calandiva-bianco) |
| `/prodotto/piante-da-interno/grasse-e-succulente/kalanchoe-tetraphylla/` | kalanchoe Tetraphylla — `OG_631727` | [kalanchoe-tetraphylla-kalanchoe-a-quattro-foglie](https://onlinegarden.it/products/kalanchoe-tetraphylla-kalanchoe-a-quattro-foglie) |
| `/prodotto/da-frutto/castanea-sativa-marrone-di-marradi-castagno-marrone/` | Castanea Sativa Marrone Di Marradi - Castagno Marrone — `OG_334361` | [castanea-sativa-marrone-di-marradi-castagno-marrone](https://onlinegarden.it/products/castanea-sativa-marrone-di-marradi-castagno-marrone) |
| `/prodotto/da-frutto/prunus-avium-lapins-ciliegio/` | Prunus Avium Lapins - Ciliegio — `OG_326285` | [prunus-avium-lapins-ciliegio](https://onlinegarden.it/products/prunus-avium-lapins-ciliegio) |
| `/prodotto/piante-da-esterno/arbusti/calycanthus-floridus-calicanto-estivo/` | Calycanthus Floridus - Calicanto Estivo — `OG_737951` | [calycanthus-floridus-calicanto-estivo](https://onlinegarden.it/products/calycanthus-floridus-calicanto-estivo) |
| `/prodotto/piante-da-esterno/arbusti/calycanthus-venus-calicanto-estivo/` | Calycanthus Venus - Calicanto Estivo — `OG_575973` | [calycanthus-venus-calicanto-estivo](https://onlinegarden.it/products/calycanthus-venus-calicanto-estivo) |
| `/prodotto/piante-da-esterno/arbusti/rhyncospermum-asiaticum-tricolor-gelsomino/` | Rhyncospermum Asiaticum Tricolor - Gelsomino — `OG_689687` | [rhyncospermum-asiaticum-tricolor-gelsomino](https://onlinegarden.it/products/rhyncospermum-asiaticum-tricolor-gelsomino) |
| `/prodotto/piante-da-esterno/arbusti/elaeagnus-ebbingei-aurea-eleagno/` | Elaeagnus Ebbingei Aurea - Eleagno — `OG_287827` | [elaeagnus-ebbingei-aurea-eleagno](https://onlinegarden.it/products/elaeagnus-ebbingei-aurea-eleagno) |
| `/prodotto/piante-da-esterno/alberi/fagus-sylvatica-dawyck-purple-faggio/` | Fagus Sylvatica Dawyck Purple - Faggio — `OG_349957` | [fagus-sylvatica-dawyck-purple-faggio](https://onlinegarden.it/products/fagus-sylvatica-dawyck-purple-faggio) |
| `/prodotto/piante-da-esterno/alberi/ginkgo-biloba-mariken/` | Ginkgo Biloba Mariken — `OG_839828` | [ginkgo-biloba-mariken-albero-nano-da-giardino-e-terrazzo](https://onlinegarden.it/products/ginkgo-biloba-mariken-albero-nano-da-giardino-e-terrazzo) |
| `/prodotto/piante-da-esterno/alberi/ginkgo-biloba-menhir/` | Ginkgo Biloba Menhir — `OG_818665` | [ginkgo-biloba-menhir-lalbero-antico-dal-portamento-elegante](https://onlinegarden.it/products/ginkgo-biloba-menhir-lalbero-antico-dal-portamento-elegante) |
| `/prodotto/piante-da-esterno/arbusti/parrotia-persica-bella-albero-pagoda/` | Parrotia Persica Bella - Albero Pagoda — `OG_455857` | [parrotia-persica-bella-albero-pagoda](https://onlinegarden.it/products/parrotia-persica-bella-albero-pagoda) |
| `/prodotto/piante-da-esterno/alberi/paulownia-tomentosa-paulonia/` | Paulownia Tomentosa - Paulonia — `OG_371278` | [paulownia-tomentosa-paulonia](https://onlinegarden.it/products/paulownia-tomentosa-paulonia) |
| `/prodotto/piante-da-interno/piante-da-appartamento/tradescantia-nanouk/` | Tradescantia Nanouk — `OG_748228` | [tradescantia-nanouk](https://onlinegarden.it/products/tradescantia-nanouk) |

### Tre casi separati, nessuna destinazione inventata

| Caso | Identità storica disponibile | Esito della verifica mirata corrente |
| --- | --- | --- |
| Magnolia Grandiflora Little Gem | Woo 16546, SKU `OG_557118` | Nessuna variante trovata per quel prefisso nella ricerca Shopify; nessun GID attuale certo. Non dichiarato prodotto eliminato |
| Celtis australis / Bagolaro | Woo 20689, SKU `OG_939693` | Nessuna variante trovata per quel prefisso nella ricerca Shopify; nessun GID attuale certo. Non dichiarato prodotto eliminato |
| Viburnum Coppertop | Woo 26964, SKU storico `OG_924853-2-1-1-1` | Variante candidata `OG_924853-2-1-01-1-1`, famiglia condivisa con 12 varianti anche di Potentilla: prefisso/nome non bastano a confermare il mapping |

GSC già collegata non viene ricollegata. Export GSC del 10/11 e fonti prodotto restano disponibili per nuove corrispondenze puntuali anche senza backup integro. I 1.255 percorsi rimanenti sono un insieme ancora non riconciliato, non rimozioni certificate. Nessun nuovo audit generale o inoltro alla homepage eseguito. URL Inspection e invio sitemap Google non sono attestati da un connettore Search Analytics.

**HTTP dopo il rilascio:** sul vecchio percorso Rosa Jasmina GET e HEAD apex restituiscono 200 senza Location; www restituisce 302 verso lo stesso vecchio percorso apex. Nessun recupero dei vecchi link dichiarato. Nameserver `ns1098.ui-dns.de`, `ns1041.ui-dns.biz`, `ns1126.ui-dns.com`, `ns1037.ui-dns.org` identificano [DNS IONOS](https://www.ionos.it/aiuto/e-mail/risoluzione-di-problemi-per-mail-basicmail-business/modificare-i-record-mx-per-la-ricezione-di-e-mail-con-i-server-di-posta-di-ionos/); apex A `185.158.133.1`, hosting Lovable. Questo non dimostra che IONOS fosse il vecchio hosting cPanel. [Limiti primary-domain Lovable](https://docs.lovable.dev/features/custom-domain#primary-domain). Nessuna route/DNS installata o modificata.

## Backup legacy: risultato e richiesta pronta per il referente

Fonte: archivio Drive indicato dal proprietario, `CORRUPT.backup-11.3.2026_15-00-06_vyonline.tar`, **20.447.232 byte**, SHA-256 `d25c3f1a96ac330f6d4aae28639fbba6af531865cf6eda6c6f9d772cde8a1880`. Sono leggibili 16 intestazioni TAR; il file termina dentro `bandwidth_db_data.json`: dimensione dichiarata **57.723.050 byte**, disponibili **20.435.456**, payload dall’offset 11.776. Il parser segnala fine inattesa; nessuna ulteriore intestazione TAR valida trovata ai confini di blocco. Nessun membro SQL/pagina/prodotto raggiunto. Analizzati soltanto metadati, non estratti contenuti account/clienti/credenziali né ripristinato il sito. **Zero database, testi e permalink recuperati**. [Evidenza sanitizzata](../seo/evidence/legacy-backup-2026-11-12.json).

Testo da consegnare al referente del **vecchio hosting cPanel** (preparato, non inviato a terzi):

> Occorre l’archivio integro dello stesso backup `backup-11.3.2026_15-00-06_vyonline`, con dimensione e SHA-256 per verificarne l’integrità. In alternativa, fornire un export selettivo delle sole pagine pubbliche (termini, cookie, spedizioni/consegne, resi/rimborsi e dati societari) e dei prodotti/varianti: ID originale, ID padre, SKU, slug/post_name, permalink originale ed eventuali URL storici, gerarchia delle categorie con relativi ID/slug necessari a ricostruire gli indirizzi. Per le pagine includere titolo, contenuto pubblico, stato e date di modifica. Escludere utenti, clienti, ordini, password/hash, token, secret e dati di pagamento. Non ripristinare il vecchio sito in produzione. L’export è una fonte da verificare: i testi commerciali devono essere confermati e approvati prima di una nuova pubblicazione.

**Dipende davvero dalla nuova fonte:** recuperare contenuti/permalink non presenti negli export attuali e chiarire identità mancanti quando le fonti disponibili non bastano. **Non dipende dal nuovo archivio:** rilascio SEO già concluso, controlli pubblici, 16 mapping corroborati, ulteriori corrispondenze dimostrabili GSC/export e lavoro reale di Marco su dati approvati.

## Limiti commerciali e responsabilità

Marco/proprietario deve scegliere prodotto, valori, dati reali del nuovo articolo, categoria certa e pubblicazione esplicita. Non sono stati chiesti nuovamente registrazione o login; nessuna sua sessione è stata impersonata. Il prezzo non va modificato solo per un test. Le 22 associazioni interne storiche rimangono distinte: non bloccano tutte le bozze e non sono approvate in massa.

Shopify/checkout e Sendcloud restano i sistemi noti. Il market Sicilia/Sardegna contiene province, non dimostra copertura delle isole minori in province continentali. La decisione commerciale è tariffa speciale per **tutte** le isole: resta un requisito aperto, non rinviato fra miglioramenti facoltativi. Il connettore ha negato la lettura delle personalizzazioni di consegna per scope `read_delivery_customizations` mancante: serve il titolare Shopify per ispezionare in sola lettura le eventuali personalizzazioni già installate. Non è stata richiesta un’estensione dei privilegi e non se ne presume l’assenza. Nessuna tariffa/app o costo introdotto; eventuale soluzione richiede proposta concreta e consenso.

Tre invii conferma ordine registrati da Shopify non dimostrano recapito cliente/staff. [Registro notifiche aggiornato](../SHOPIFY-EMAIL-NOTIFICATIONS-AUDIT.md). Solo Privacy/contatti sono confermati; [checklist testi/consenso](../legal/CLIENT-LEGAL-PUBLICATION-CHECKLIST.md). Nessuna policy inventata, obsoleta o soltanto recuperata è stata pubblicata. Telemetria/consenso rimangono da decidere/validare; presenza dello script hosting non è una prova nuova di trasmissione.

## Manutenzione, rollback ed esito

La sitemap è statica. Dopo nuove pubblicazioni/cambi handle: responsabile tecnico esegue `node --import tsx scripts/prepare-seo-sitemap.ts`, controlla la fotografia e pubblica il frontend. Il comando Pubblica dell’Admin non aggiorna automaticamente questo file. Nessun cron o automatismo dichiarato.

Rollback circoscritto disponibile: sorgente frontend precedente main `41e53339e647c23ea80e69f3c66fec383ee8ad30`, release `admin-delivery-20261110-r1`, deployment precedente `885640f0-b94e-4220-989c-dff4677b8125`; archivio sorgenti protetto già identificato nelle evidenze, senza secret. Eventuale ripubblicazione compatibile conserva grant e configurazione, senza restore DB o backend generale. Non è stata eseguita né certificata una prova di restore; `restoreVerified=false` resta esplicito.

**Esito: CONSEGNA PARZIALE.** Primo rilascio SEO pubblicato e Admin preservato; accettazione commerciale cliente, redirect HTTP, tariffa isole minori, testi/consenso e recapito notifiche/Safari restano aperti con i limiti sopra. Nessuna eccezione è stata automaticamente accettata o spostata a manutenzione futura. Questa checklist sostituisce le note preparatorie del 12/11 per lo stato corrente; la cronologia di abilitazione e preparazione resta nei registri collegati e in Git.
