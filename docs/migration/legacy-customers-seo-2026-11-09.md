# Online Garden — audit sorgenti storiche clienti e SEO (09/11/2026)

> **Solo analisi documentale. Nessun ripristino, import, deploy, sync, redirect, cambio permessi o scrittura su Shopify/Supabase/Lovable.** Non modifica e non sblocca i gate runtime documentati in `docs/PROJECT_STATUS.md` o la PR #47.

## 1. Backup storico fornito dal proprietario

- Origine: un file TAR su Google Drive, nome `CORRUPT.backup-11.3.2026_15-00-06_vyonline.tar`.
- SHA-256 dell'archivio scaricato: `d25c3f1a96ac330f6d4aae28639fbba6af531865cf6eda6c6f9d772cde8a1880`.
- Dimensione disponibile: **20.447.232 byte**.
- Formato: backup account/hosting (con riferimenti a `onlinegarden.it` e `staging.onlinegarden.it`), **non** dump SQL autonomo.
- Analisi read-only TAR: **16 intestazioni di archivio** fino all'entry `bandwidth_db_data.json` che dichiara **57.723.050 byte**; l'archivio termina prima che questa singola entry possa essere letta completamente. Errore riproducibile: `ReadError('unexpected end of data')`.
- **Nessun dump SQL cliente/prodotto recuperabile nella porzione disponibile.** Il nome `CORRUPT` è coerente con l'evidenza tecnica; non tentare restore.
- Il backup potrebbe contenere segreti e credenziali di hosting: conservarlo fuori dal repository e da log, ticket, artefatti CI o storage pubblico.

**Decisione:** chiedere al fornitore hosting un *backup completo e integro*, oppure un export MySQL selettivo delle sole tabelle necessarie, con canale privato autorizzato. Non usare il TAR troncato come base per migration.

## 2. Sorgenti alternative trovate su Drive

Nel Drive, cartella Onlinegarden, sono presenti i fogli:
- `onlinegardecustomer`, con le schede `onlinegardecustomer`, `Copy of onlinegardecustomer` e `Sheet2`;
- `wc-product-export-28-2-2026-1772300858057`;
- `Untitled spreadsheet` (snapshot di export Shopify datato marzo 2026);
- `Prodotti wp import` (ulteriore snapshot, non usato per contare le corrispondenze qui).

I link e gli identificativi dei documenti non sono copiati in Git per ridurre la diffusione di dati personali e file sorgente. Consultare i fogli direttamente in Drive con autorizzazioni ristrette.

### Profilo account storico (fonte: `onlinegardecustomer`)

| Metrica | Conteggio |
| --- | ---: |
| Righe account, esclusa intestazione | 5.453 |
| Record con ruolo `customer` | 5.450 |
| Record con ruolo `administrator` | 2 |
| Record con ruolo `author` | 1 |
| Account con campo `orders > 0` | **858** |
| Somma del campo `orders` degli account | **953** |
| Account con `orders = 0`, tutti i ruoli | 4.595 |
| Email distinte nell'estrazione ripulita | 5.452 |
| Record nella scheda selezionata `Sheet2` | **1.108** |
| Account con ordini inclusi in `Sheet2` | **858 su 858** |
| Righe in `Sheet2` senza ordini | 250 (incluse 2 utenze non-`customer`) |
| Account `customer` di `Sheet2` senza ordini | 248 |
| Altri account `customer` senza ordini, fuori `Sheet2` | 4.344 |

Date di registrazione rilevate: **2020-05-18** – **2026-02-25**. Le righe sono account, non ordini esportati né prova che tutti abbiano acquistato. Gli ordini guest potrebbero non essere rappresentati; non importare `Total Spent` / `Total Orders` come se fossero ordini Shopify.

**Avvertenza privacy e sicurezza:** la prima scheda del foglio storico include `user_pass` (hash password WordPress) e `session_tokens`. Non importare, esporre, versionare, loggare o allegare questi valori. Limitare l'accesso alla fonte; preferire una copia di lavoro con campo minimo necessario. Non considerare il possesso dell'email come consenso al marketing. La scheda `Sheet2` è un sottoinsieme, non una prova certificata di qualificazione o opt-in.

### Strategia clienti proposta

1. **Prima coorte da revisionare:** 858 record con ordini storici; dedupe per email normalizzata rispetto alla lista **live** Shopify prima di qualsiasi write.
2. **Seconda coorte da revisionare:** 248 account ruolo cliente di `Sheet2` senza ordini; verificare presenza dati anagrafici e utilità.
3. **Terza coorte sospesa:** 4.344 account ruolo cliente senza ordini, non presenti nella scheda selezionata; non importarli automaticamente, verificare qualità, trattamento e finalità.
4. Escludere `administrator` e `author`; rimuovere password hash, sessioni, metadati di sicurezza e campi estranei.
5. Mappare conservativamente nome, cognome, email, telefono, indirizzi; deduplicare e impedire sovrascritture dei profili Shopify correnti.
6. Marketing `no` salvo **prova esplicita, verificabile e aggiornata** del consenso per canale. Nessun invio campagna automatico.
7. Con un CSV Shopify si importano anagrafiche, **non** ordini storici né password; definire una procedura separata per consultazione dell'archivio storico.
8. Prima di un'importazione, approvare campione, report di righe escluse/duplicate, destinazione, rollback e comunicazione account.

### Script repository già presenti: NON eseguire ora

- `sync/customers-convert.mjs`: converte CSV in formato Shopify, con `Accepts Email Marketing=no`, ma oggi filtra per `billing_email` o `user_email`; le schede ripulite hanno anche una colonna denominata `email`. Richiede adattamento a input reale e distinzione delle coorti.
- `sync/customers-sync-shopify.mjs`: su esecuzione reale fa lookup e **create/update** su Shopify. In stato attuale potrebbe modificare record esistenti ed è privo di gate esplicito per selezione delle coorti; il dry-run stampa indirizzi email nei log. Non invocare, né dry-run su dati reali senza protezione log.

Qualsiasi fix ai suddetti script deve passare in PR separata e test offline con fixture **sintetiche**, senza cambiare il gate operativo del progetto.

## 3. Inventario URL storico e SEO 301

- Export WooCommerce del **28/02/2026**: **2.718** righe di dati; 1.220 prodotti `variable`, 1.363 `variation`, 134 `simple`, 1 gift-card virtuale.
- Snapshot Shopify nel Drive (marzo 2026): **2.718** righe, **2.704 SKU distinti**.
- Confronto SKU dei due export storici: **2.704 / 2.704** SKU distinti corrispondono; 13 righe per file hanno SKU vuoto. **Questa è corrispondenza tra file storici, non un audit del catalogo live.**
- Nello snapshot Shopify tutti i 2.718 record recano lo stato storico `draft`; **non dedurne lo stato attuale Shopify**.
- L'export WooCommerce non contiene una colonna affidabile di permalink/slug canonico vecchio. Percorsi storici recuperabili dai risultati indicizzati includono segmenti di categoria, p.es. `/prodotto/piante-da-esterno/siepi/bignonia-capreolata/`. Non inventare URL vecchi da soli titoli o handle.
- Il frontend React/Lovable nel repository gestisce `/products/:handle`; Shopify gestisce il checkout. **I redirect del negozio Shopify non sono automaticamente equivalenti ai redirect del dominio pubblico servito da Lovable.** Verificare routing e hosting del dominio pubblico (incluso `www`) prima della scelta implementativa.

### Procedura SEO non eseguita

1. Ricostruire gli URL old-source da sitemap XML storica, GSC (Pagine/404 + link), export SEO plugin, Wayback e log server, salvando **provenienza e livello di confidenza** per ogni riga.
2. Associare prodotti per SKU/ID conservando gli alias e i percorsi categoria quando verificati. Validare che la destinazione nuova sia pubblicata e ritorni 200.
3. Generare manifest per review: `old_path,new_path,entity_type,source,evidence,status`. Non imporre 301 se manca un URL esatto o una destinazione appropriata.
4. Decidere lo strato corretto per il 301 (edge/hosting frontend se è Lovable a rispondere al dominio; Shopify soltanto se Shopify risponde alla rotta). Verificare anche `www` vs apex, redirect loop, 404 e canonical.
5. Eseguire test HTTP read-only prima e dopo rilascio controllato; monitorare GSC 404 e performance. Non modificare URL attivi senza procedura.

## 4. Gate e prossima decisione

**Stato: DATI PARZIALMENTE RECUPERATI, SOLO READ-ONLY.** Disponibili account storici e correlazione SKU documentale; backup TAR inutilizzabile come database; vecchi permalink incompleti; consenso/duplicati e mapping live da validare.

**Nessuna azione in produzione autorizzata da questo audit.** In particolare: nessun ripristino del TAR, nessuna scrittura Lovable/Supabase/Shopify, nessuna modifica di status prodotto, nessun invio email, nessun redirect 301 pubblicato. Le verifiche runtime e le limitazioni già registrate in `docs/PROJECT_STATUS.md` rimangono valide.

## Fonti metodologiche ufficiali

- [Shopify Help — Importazione/esportazione clienti](https://help.shopify.com/it/manual/customers/import-export-customers): CSV importa anagrafiche, non password o ordini; consenso marketing esplicito.
- [Shopify Help — Gestione redirect](https://help.shopify.com/it/manual/online-store/menus-and-links/url-redirect): limiti URL, import CSV e condizioni dei reindirizzamenti.
