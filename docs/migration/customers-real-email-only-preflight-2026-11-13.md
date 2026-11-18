# Online Garden — preflight reale email-only, 13 novembre 2026

**Eseguito offline su input reali minimizzati. Esito `BLOCKED` per 7 quarantene; revisione privata ancora necessaria. Nessuna importazione autorizzata o eseguita.**

Esecuzione della CLI della PR #53 al commit `65131b6f49bdba3d207e99ac1a5815442910e189`, con Node `v22.22.3`, terminata alle **13:24:28 UTC**. Comando `customers-convert.mjs --email-only`, con join `--orders`, snapshot/manifest e guard `ci/offline-network.cjs`. Exit **2**, previsto per `SOURCE_QUARANTINE_REQUIRES_REVIEW`; nessun errore tecnico di input/IO. Il [JSON aggregato](customers-real-email-only-preflight-2026-11-13.json) è la copia esatta dell'output reale, distinta dalle fixture sintetiche.

## Input e controlli osservati

| Input privato | Verifica completata |
| --- | --- |
| `sheet2-minimo.csv` | 1.108 record; sole colonne `ID,roles,email,billing_phone`; ID validi, distinti e tutti abbinati al contatore ordini |
| `id-orders.csv` | 5.453 record; sole colonne `ID,orders`; ID validi e distinti, contatori validi; 858 acquirenti e 953 ordini |
| Riconciliazione | Zero ID mancanti/ambigui; 4.345 account fuori selezione, zero acquirenti fuori selezione; 857 customer e 1 author fra gli acquirenti |
| `shopify-minimo.csv` | Sole colonne `Email,Phone`; 12 profili, inclusi 11 con email e 1 senza email |
| `snapshot.json` | Manifest v2: checksum dei byte CSV, negozio, freschezza entro 24 ore, conteggi e pagine coerenti con le letture osservate |

I due CSV storici sono stati acquisiti dai file Drive minimizzati indicati e autorizzati dal responsabile. Verificati cartella di origine, tipo CSV, dimensioni e date di modifica stabili prima/dopo l'acquisizione; condivisioni dei due file **solo proprietario**. Non è stato aperto o scaricato il workbook originale. Le evidenze dell'estrazione selettiva precedente restano documentate nel [runbook](customers-offline-developer.md).

Calcolati SHA-256 locali dei CSV storici e ricontrollati dopo la CLI: byte invariati. Il connettore non ha esposto un checksum della fonte confrontabile: **non si attesta un confronto con un digest upstream indipendente**, né una nuova verifica del workbook originale. Lo SHA-256 dello snapshot coincide con quello del manifest. Digest, riferimenti Drive, ID e cursori restano nel registro privato.

Input e prove sono conservati fuori da Git/CI, in directory temporanea privata `0700`, file `0600`, proprietario locale verificato; FileVault risulta attivo. Il percorso non è pubblicato. Il responsabile deve definire durata di conservazione e custodia stabile: la directory temporanea non è un archivio permanente. Nessun file anagrafico va allegato a PR, chat o ticket.

## Copertura Shopify realmente osservata

Negozio verificato: `ecom-blueprint-gen-6ud1s.myshopify.com`. Lettura tramite connettore già autorizzato, senza nuove credenziali e senza mutazioni. Intervallo: **13:17:05–13:18:07 UTC**, corrispondente alle 14:17:05–14:18:07 in Italia.

- `customersCount(limit:null)`: **12, precision EXACT**, prima e dopo la lettura.
- Query clienti senza filtri, includendo ID per il controllo privato e soli recapiti predefiniti per il CSV. Campi dello schema connesso: `defaultEmailAddress.emailAddress` e `defaultPhoneNumber.phoneNumber`.
- Due pagine effettivamente restituite: **10 record / `hasNextPage=true`**, poi **2 / `hasNextPage=false`**. Il cursore restituito dalla prima è stato usato nella seconda; catena verificata, nessun cursore simulato.
- **12 ID distinti**; somma delle pagine, righe CSV e conteggi prima/dopo concordano. Incluso il profilo senza email. Le prove dettagliate di ID e cursori sono conservate privatamente.

Il report CLI mantiene intenzionalmente `shopifySnapshot.liveCompletenessProven=false`: il programma offline verifica il contratto locale, non interroga Shopify. Le letture osservate sopra costituiscono l'evidenza operativa separata. Analogamente `dataKind=private-unverified` indica che il programma non certifica la provenienza; non significa che sia stata eseguita una fixture.

## Esiti reali e riconciliazione

| Esito disgiunto sulle 1.108 righe | Account |
| --- | ---: |
| Privilegiati esclusi: 1 author con ordini e 1 administrator senza ordini | 2 |
| Customer senza ordini esclusi | 249 |
| Quarantena | 7 |
| Già presente su Shopify per email, saltato | 1 |
| Già presente per telefono, saltato | 0 |
| `emailOnlyReviewCandidates`: revisione privata richiesta | **849** |
| `proposedNew`: proposte di creazione | **0** |
| Totale | **1.108** |

Sui soli 857 customer con ordini: **849 + 7 + 1 = 857**. I 856 senza match email si dividono in 849 candidati alla revisione e 7 quarantene, **non in 856 importazioni**. Tutti i casi residui richiedono valutazione privata: i 7 bloccati vanno trattati separatamente dai 849 candidati. Il customer già presente non viene aggiornato.

Anomalie e qualità:

- **6 account** coinvolti in somiglianze telefoniche interne legacy (`ambiguousSourcePhone`), non sei duplicati confermati né necessariamente sei coppie.
- **1 account** con telefono malformato; `invalidPhone=1` e `nonE164Phone=1` descrivono la stessa causa sullo stesso record, non due ulteriori quarantene.
- Zero gruppi di email duplicate, zero email invalide/discordanti rilevate, zero duplicati telefonici esatti; zero somiglianze telefoniche o conflitti email/telefono verso lo snapshot Shopify.
- Sui 857 customer: **90 telefoni internazionali riconosciuti**, **766 nazionali riconoscibili**, **1 malformato**, **0 assenti**. Dei 90, 88 sono già canonici e 2 contengono solo separatori visuali ignorati nelle chiavi in memoria. I valori originali non sono stati riscritti.
- Sui 858 acquirenti prima dell'esclusione dell'author: 768 telefoni non E.164 secondo il controllo dello script. Questa metrica e i contatori di qualità non si sommano agli esiti disgiunti.

`productionAuthorized=false`, `privateIdentityReviewRequired=true`, `phoneExportAllowed=false`, `sourceValuesChanged=0`; nessun consenso email/SMS/WhatsApp abilitato. I consensi Shopify esistenti non sono stati letti o modificati. `networkRequests=0`, `customerWrites=0` e `personalArtifactsWritten=0` descrivono **la CLI offline**: l'acquisizione precedente ha effettuato letture autorizzate Drive/Shopify e creato gli input privati, senza scritture sui provider. Nessun CSV importabile, invito o comunicazione prodotto.

## Verifica e limiti per il pilota

- `npm run test:customers`: **46/46 PASS**, esclusivamente sintetici, con rete Node bloccata; i test non accedono a questi input privati.
- Ricontrollati dopo la CLI checksum degli input, riconciliazione degli esiti e invarianti di assenza di creazione, marketing e write. Nessuna modifica agli script necessaria per questa esecuzione.
- I conteggi reali confermano il [precheck esplorativo precedente](customers-live-precheck-2026-11-13.md), ora accompagnati dall'esecuzione CLI e dalle evidenze del manifest. Il precheck precedente resta una fotografia storica distinta.

Prima di valutare un pilota occorrono:

1. Review privata dei sei casi di somiglianza e del telefono malformato, con decisioni motivate per account e senza dedurre prefissi, cancellare valori o forzare i conteggi. L'assenza di collisioni automatiche sui 849 non prova titolarità, unicità o recapito effettivo.
2. Controllo di identità dei candidati rispetto a Shopify, incluso il profilo senza email. Le euristiche possono avere falsi positivi e falsi negativi; la lettura dei recapiti predefiniti non è una verifica di ogni indirizzo/recapito alternativo storico.
3. Conferma della provenienza dell'estrazione minima, finalità, campi approvati e conservazione. Nomi, indirizzi, titolarità delle email, deliverability e consenso non sono certificati da questo pacchetto minimo.
4. Snapshot nuovo e controllo collisioni immediatamente prima di qualsiasi eventuale lotto: conteggi invariati durante una lettura non garantiscono assenza di modifiche concorrenti ai recapiti. Non riutilizzare automaticamente questo snapshot dopo 24 ore o dopo cambiamenti.
5. Writer/esportatore separato revisionato, piano di accesso clienti senza password legacy o inviti impliciti, backup privato, journal e prova di recupero. Autorizzazione esplicita del proprietario per negozio, numero finale, campi, finestra e lotto pilota. Nessuna autorizzazione è concessa da questo report o dalla PR.

La [guida cliente](customers-offline-client.md) e il [runbook developer](customers-offline-developer.md) descrivono ripetizione privata, controlli e rollback futuro. Nessun dato remoto è stato scritto: oggi non è necessario un rollback clienti. PR #47, Admin, Supabase/Lovable, sito pubblico e gate runtime non sono modificati; nessun merge, publish o deploy.
