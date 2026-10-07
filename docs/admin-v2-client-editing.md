# Admin V2 — guida editing cliente e sync Shopify

Stato: implementazione in PR, **non distribuita**. La sincronizzazione è
disabilitata per default e richiede `PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED=true`.

## Regola operativa

Il pulsante **Salva nell’Admin** modifica soltanto il catalogo interno. Per i
campi supportati lo stato diventa **Da sincronizzare**. Solo un utente con
ruolo `admin` o `tech_admin` può usare **Salva e sincronizza su Shopify** o
**Sincronizza su Shopify**. Ogni invio riguarda un solo campo e viene riletto
da Shopify prima di essere marcato come sincronizzato.

Gli stati mostrati sono:

- **Solo Admin** (`INTERNAL_ONLY`): il campo non ha un mapping pubblicabile supportato;
- **Da sincronizzare** (`PENDING_SYNC`): esiste una modifica interna non ancora confermata su Shopify;
- **Sincronizzato** (`SYNCED`): la rilettura Shopify coincide con il valore inviato;
- **Errore sync** (`SYNC_ERROR`): mapping, drift, scrittura o verifica hanno bloccato l’operazione.

## Identità prodotto Shopify

Admin V2 usa come unica sorgente runtime
`product_sync_csv_products.shopify_product_id`, risolta per SKU esatto. Il
ledger privato delle fasi 3B.2/3B.4 conserva le prove storiche di creazione e
pubblicazione, ma non è un fallback dell'API: se l'ID manca nel catalogo,
l'operazione restituisce `BLOCK_SYNC`.

Il recupero degli ID storici avviene esclusivamente tramite il controlled
script `scripts/admin-shopify-id-backfill.sql`, prima in `dry-run` e poi, dopo
approvazione del report, in `execute`. Sono eleggibili solo mapping verificati,
validi, esatti e univoci; un ID già presente non viene mai sovrascritto. Le
variation ricevono il Product GID del parent soltanto quando relazione
canonica, SKU parent e prove ledger parent/variant coincidono. Non vengono mai
usati titolo, handle o euristiche.

Questa riconciliazione non chiama Shopify, non modifica valori editoriali e
non cambia il comportamento di salvataggio o sincronizzazione esplicita.

## Primo valore mancante

Se un campo stagionale è vuoto, puoi compilarlo normalmente. Non devi
conoscere o inserire il formato tecnico Shopify.

Il primo salvataggio usa internamente `expectedVersion=0`, crea una sola riga
versione 1 tramite la stessa RPC atomica e, quando il mapping Shopify è
supportato, mostra **Da sincronizzare** (`PENDING_SYNC`). Non viene eseguita
alcuna scrittura Shopify: la sincronizzazione resta un’azione esplicita.

La policy è definita esclusivamente sul server. L’allowlist iniziale è:

- `periodo_di_fioritura`;
- `periodo_di_messa_a_dimora`;
- `periodo_di_raccolta`;
- `periodo_ottimale_di_potatura`;
- `difficolta_di_coltivazione`.

Tutti gli altri campi non-`manual_only` senza una riga corrente restano in
sola lettura. Il comportamento storico di creazione dei campi `manual_only`
rimane invariato e riservato ad Admin/Tech Admin.

## Tabella cliente

| Campo | Tipo editor | Dove appare | Modificabile | Sync Shopify | Note |
|---|---|---|---:|---:|---|
| Titolo prodotto | Testo libero | Scheda prodotto | Sì | Sì | Testo breve; sync esplicita. |
| Titolo commerciale | Testo libero | Scheda prodotto | Sì | No | Valore editoriale interno; mapping Shopify non definito. |
| Descrizione / descrizione ottimizzata | Area di testo | Scheda prodotto | Sì | Sì | Il registro determina il campo Shopify; il client non vede la sintassi tecnica. |
| Descrizione breve | Area di testo | Scheda prodotto | Sì | No | Conservata nell’Admin finché non esiste un mapping verificato. |
| Introduzione, promo, guida e testi di cura | Area di testo | Scheda prodotto | Sì | Sì | `short_intro`, `promo_text`, `care_guide`, `care_info`, `come_prendersene_cura`, `conosci_meglio_la_tua_pianta`. |
| Nome comune, nome botanico, ibridatore, colori | Testo libero | Scheda prodotto | Sì | Sì | Metafield `custom` derivato dal registro. |
| Curiosità, origini e habitat | Area di testo | Scheda prodotto | Sì | Sì | Metafield `custom` derivato dal registro. |
| Fornitore | Testo libero | Catalogo Shopify | Sì | Sì | Mapping core server-side. |
| Tag, punti di forza e caratteristiche | Lista strutturata | Scheda/ricerca/filtri | Sì | Sì | `tags`, `key_benefits`, `key_features`, `special_bullets`; voci separate, mai JSON grezzo. |
| Titolo SEO | Testo libero | Risultati di ricerca | Sì | Sì | Sync esplicita. |
| Descrizione SEO | Area di testo | Risultati di ricerca | Sì | Sì | Sync esplicita. |
| Periodo di fioritura | Selezione multipla mesi | Scheda prodotto | Sì | Sì | Solo i dodici mesi disponibili. |
| Periodo di messa a dimora | Selezione multipla mesi | Scheda prodotto | Sì | Sì | Solo i dodici mesi disponibili. |
| Periodo di raccolta | Selezione multipla mesi | Scheda prodotto | Sì | Sì | Solo i dodici mesi disponibili. |
| Periodo ottimale di potatura | Selezione multipla mesi | Scheda prodotto | Sì | Sì | Solo i dodici mesi disponibili. |
| Difficoltà di coltivazione | Selezione | Scheda prodotto | Sì | Sì | Facile, Media o Difficile. |
| FAQ | Domanda/risposta strutturata | Scheda prodotto | Sì | Sì | Nessun JSON esposto. Formati legacy non deterministici restano in sola lettura. |
| Prezzo / prezzo barrato / EAN | Numero o testo tipizzato | Scheda prodotto | Secondo capability | Sì, solo con variante SKU univoca | In assenza di una variante esatta la sync è bloccata. Per una variation sono ammessi soltanto target variant. |
| Immagini e testi alternativi | Lista strutturata | Scheda prodotto | Secondo capability | No | Il mapping media non è incluso nel fast track a campo singolo. |
| Parole chiave/link interni suggeriti | Lista strutturata | Solo Admin | Secondo capability | No | Supporto editoriale interno. |
| Handle, stato pubblicazione, ID Shopify | Sola lettura live | Shopify | No | No | Visualizzati senza sovrascrivere il valore Admin. |
| SKU, ID Woo, tipo entità, parent, categorie | Sola lettura | Identità/struttura | No | No | Campi strutturali protetti. |
| Inventario, disponibilità, spedizione, dimensioni | Sola lettura | Shopify/logistica | No | No | Il gruppo inventario rimane protetto in questo flusso. |
| Stato/report tecnici Shopify e campi di sistema | Sola lettura | Solo Admin | No | No | Provenienza, import e diagnostica non sono editabili. |
| Select senza opzioni validate | Sola lettura | Dipende dal campo | No | No | Nessuna tassonomia viene inventata. |
| JSON legacy non riconosciuto | Sola lettura | Dipende dal campo | No | No | Conservato integralmente fino a un editor deterministico. |

La classificazione completa è calcolata dal registro: `text` → `FREE_TEXT`,
`textarea/richtext` → `TEXTAREA`, `number` → `NUMBER`, `boolean` → `BOOLEAN`,
`select` con enum → `SELECT`, periodi → `MULTISELECT`, liste testuali →
`STRUCTURED_LIST`, `faq` → `FAQ`; strutture o select non deterministici →
`READ_ONLY`.

## Periodi stagionali

Il valore interno canonico è `string[]`, ordinato da gennaio a dicembre e
senza duplicati. L’interfaccia mostra checkbox; il formato Shopify viene
prodotto automaticamente. Stringhe libere, mesi sconosciuti e duplicati sono
rifiutati dal server. Un valore storico non strutturato viene mostrato senza
conversioni silenziose e può essere sostituito solo selezionando esplicitamente
i mesi corretti.

## Messaggi d’errore

- `BLOCK_SYNC`: mapping prodotto/campo assente, stato non approvato o variante non univoca;
- `VERSION_CONFLICT`: il dato Admin è cambiato; ricaricare prima di procedere;
- `STATE_DRIFT`: Shopify è cambiato dopo l’ultima verifica;
- `SYNC_VERIFY_FAILED`: la rilettura non coincide con il valore inviato;
- `SHOPIFY_WRITE_FAILED`: Shopify non ha accettato/completato la mutation.

## Limiti post-lancio

- nessuna sincronizzazione massiva in questo fast track;
- nessun editor arbitrario per namespace/key Shopify;
- media, tassonomie senza enum e JSON legacy opachi restano fuori dalla sync;
- il recupero live è una vista di confronto e non effettua backfill nel DB;
- l’abilitazione dell’ambiente e lo smoke con uno SKU approvato sono attività
  operative separate dalla merge della PR.

## Live deploy Admin V2 client-safe sync — 2026-10-06 (main@889d6ce)
- Migration `20261006143000_admin_client_safe_field_sync` applicata una volta: 4 colonne `shopify_*` presenti, periodi = multiselect/array (12 mesi), difficoltà = select Facile/Media/Difficile, trigger PENDING_SYNC e RPC `admin_complete_product_field_sync` (solo service_role). 24.467 valori invariati (hash identico prima/dopo). PASS.
- Deploy della sola `product-admin-api`: PASS. `PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED` assente = OFF.
- Pubblicazione frontend richiesta dalla stessa revisione.
- Smoke test autenticato e canary: NON eseguiti — serve un account admin per la sessione di test e un prodotto canary approvato esplicitamente. Nessuna scrittura Shopify effettuata.
- Stato: STOPPED in attesa di account di test + prodotto canary.

### Ripresa passaggio 4 — 2026-10-06 18:18
- Sessione Admin dell'utente non disponibile all'agente (stato anteprima: non autenticato); nessuna credenziale letta o creata.
- Pre-check DB in sola lettura: OG_111899 (variable) non ha una riga `periodo_di_fioritura`. La RPC `admin_update_product_field` crea righe nuove solo per campi `manual_only`; `periodo_di_fioritura` è `manual_only=false`, quindi il salvataggio canary risponderebbe FIELD_NOT_EDITABLE.
- Nessuna scrittura DB/Shopify. `PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED` assente = OFF.
