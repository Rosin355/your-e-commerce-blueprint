# Admin V2 correzioni di usabilita e assistenza AI

Data: 13 novembre 2026. Stato: difetti riscontrati e intervento da implementare; nessuna correzione applicativa, abilitazione AI, modifica catalogo o nuova pubblicazione eseguita da questa nota. Fonte della richiesta: tre screenshot forniti da Romesh durante la prova del gestionale. Gli screenshot originali e dati personali non sono copiati nel repository.

## Riscontri effettivi

1. `src/adminv2/lib/fieldValueCodecs.ts` tratta `editorType=richtext` come textarea. `FieldEditor.tsx` mostra quindi il valore HTML come sorgente: Marco vede i tag invece di un editor visuale.
2. In `FieldCard.tsx`, il badge `Solo Admin` traduce `syncState=INTERNAL_ONLY`: NON indica un ruolo amministrativo. La stessa card richiede `field.version !== null` e `capabilities.canUpdate` per modificare; un valore interno assente puo impedire il percorso anche quando Shopify mostra contenuti. La causa esatta del blocco di ogni campo va riletta nel suo `updateBlockReason`, senza attribuirla solo al badge.
3. La policy `supabase/functions/_shared/admin-catalog-policy.ts` contiene 14 CLIENT_FIELD_KEYS: non comprende `key_benefits`, `key_features`, `special_bullets`. Nella lettura SELECT del registro questi tre campi sono visibili, editable=true, publishable=true, ai_allowed=true, editor multiselect/data json, con mapping ai metafield `custom.key_benefits`, `custom.key_features`, `custom.special_bullets`. Non basta cambiare l'interfaccia o il solo grant persistito.
4. La stessa lettura del registro mostra `description` e `optimized_description` entrambi diretti a Shopify `descriptionHtml`. Non devono diventare due controlli che sovrascrivono silenziosamente la medesima destinazione. `short_description` ha mapping vuoto: non promettere sincronizzazione di un campo senza destinazione.
5. `product-admin-ai/index.ts` rifiuta le operazioni AI quando il modo globale e canary; non carica il grant catalogo ordinario come il percorso API. `provider.ts` contiene gia l'adattatore Lovable AI gateway, con modello configurabile e default `google/gemini-3-flash-preview`. Questa lettura non verifica secret, disponibilita del modello, credito o chiamate reali.
6. Screenshot: il modulo nuovi prodotti espone SKU variante, Formato e Prezzo di confronto senza una guida sufficiente per il cliente. La configurazione editor/admin e il collaudo tecnico precedente non costituiscono accettazione di questa UX.

## Risultato richiesto per Marco

### Testi visuali

Per i rich text usare un editor visuale mantenuto, riutilizzando componenti/librerie gia presenti quando possibile: paragrafi, grassetto, corsivo, elenchi, link sicuri e annulla/ripristina. HTML/JSON devono rimanere dettagli tecnici, non il formato di lavoro del cliente. Non basta rimuovere i tag: preservare struttura e contenuti utili.

Validazione/sanitizzazione anche sul server e in ogni preview; niente script, handler inline o protocolli pericolosi. Apertura e annullamento non devono scrivere o riserializzare distruttivamente contenuti legacy. Un formato non supportato va preservato e segnalato, non svuotato. Nessun import o conversione massiva del catalogo.

### Campo modificabile e valore effettivo

CTA con matita e testo Modifica in alto nella card, indicatore testuale Modificabile e stato In modifica. Focus tastiera, nome accessibile e contrasto; il colore da solo non basta. Comandi vicini all'editor: Salva bozza, Aggiorna sul sito con conferma ed effetto chiaro, Annulla. Non introdurre autosync o autopublish.

Per il cliente mostrare in primo piano il contenuto da modificare e il suo stato. Spostare origine WordPress, storico, payload e confronti in un pannello Dettagli/confronto chiuso di default. Tradurre INTERNAL_ONLY con uno stato coerente, non con Solo Admin. Un campo presente solo su Shopify non deve apparire genericamente vuoto o come una bozza locale gia esistente.

Quando manca il valore interno ma esiste quello live, consentire una lettura sicura e un'azione esplicita Modifica partendo dal sito. Preservare la provenienza, rileggere l'hash/versione remota, inizializzare il valore locale solo al salvataggio autorizzato e mantenere controllo concorrenza/idempotenza. Nessuna scrittura all'apertura pagina. Non inviare null, stringa vuota o lista vuota a Shopify per inizializzare un campo. Per campi davvero vuoti supportare il primo inserimento autorizzato invece di richiedere una versione preesistente impossibile.

Descrizione estesa/ottimizzata: presentare una descrizione sul sito e l'eventuale proposta alternativa, rendendo esplicito quale contenuto andra a `descriptionHtml`. Preservare IDs e dati originali; non sincronizzare automaticamente entrambe le versioni in sequenza.

### Permessi editoriali e liste

Abilitare `key_benefits`, `key_features`, `special_bullets` per i due account catalogo gia autorizzati, insieme all'allineamento della whitelist server, del grant e delle capability API. Nomi cliente: Punti di forza, Caratteristiche principali, Altri punti utili. Editor con una riga per voce, Aggiungi/Rimuovi e ordine conservato; niente JSON da scrivere.

Per gli altri campi editoriali presenti sul prodotto verificare registro, tipo, mapping e ragione del blocco. Consentire soltanto quelli pertinenti alla gestione contenuti, con elenco esplicito documentato; non usare un jolly su tutti i campi. Dati tecnici, ID, handle/SKU esistenti, stock, classi logistiche A/B, approvazioni, utenti e configurazioni restano protetti. Prezzi e pubblicazione seguono i rispettivi percorsi dedicati, non una generica update_field.

Rilevare tipo reale e forma dei metafield prima di serializzare. Supportare valori locali null con valori remoti validi, senza perdita dati. Non rimuovere lock o RLS per far funzionare un pulsante. Nei soli blocchi necessari mostrare una spiegazione utile.

### Formati e prezzi guidati

Prima domanda: Come vendi questo prodotto? Un solo formato / Piu formati. Se singolo, gestire coerentemente lo SKU famiglia/variante senza doppia digitazione. Se multiplo, chiedere nome formato e prezzo per ciascuna riga, con codice proposto deterministicamente e controllo unicita server prima del salvataggio. Non rinumerare varianti esistenti.

Esempi solamente esplicativi: Vaso diametro 14 cm, Pianta altezza 40-60 cm, Confezione da 5 bulbi. Non precompilarli come caratteristiche reali. Prezzo di vendita in EUR con gestione della virgola e validazione coerente con il checkout; non modificare il regime fiscale del negozio. Prezzo precedente opzionale nascosto sotto una scelta dedicata, senza prezzi barrati inventati. Spiegare il risultato con anteprima variante/prezzo e mantenere le regole A/B.

La comprensione del modulo non deve dipendere dall'AI: testi guida e validazioni deterministiche sempre disponibili.

### AI solo su richiesta e con revisione

Riutilizzare endpoint, repository di proposte e provider gia presenti. Allineare la guardia AI al grant catalogo nominativo per i soli campi consentiti e `ai_allowed`, senza mettere globalmente full o aprire l'AI a ogni admin/editor. Permessi verificati anche su accept/reject e replay; approvazioni per attore, hash/versione, rate limit e audit. Non esporre credenziali o log con dati personali.

Azioni utili: Migliora il testo, Trasforma in elenco, Aiutami a compilare. Proposta leggibile e modificabile, Applica alla bozza o Scarta; applicazione solo dopo conferma. Sync Shopify e pubblicazione restano azioni distinte. Nessun invio automatico al caricamento della pagina o generazione su tutto il catalogo.

Per formati/prezzi, l'assistente puo spiegare e strutturare informazioni scritte dal cliente, riportando quali dati mancano. Non determina prezzi di vendita, costi, margini, sconti, quantita, misure, codici esistenti o disponibilita. Un eventuale calcolo economico deve usare input reali e una formula esplicita, non stime del modello. Non accettare il testo del prodotto come istruzioni di sistema. Campi vuoti o nuove bozze richiedono contesto confermato; non creare prodotti tecnici per simulare un contesto AI.

Verificare modello/provider attualmente supportati e configurazione senza leggere o mostrare valori dei secret. Riutilizzare il saldo e servizio esistenti, nessuna nuova sottoscrizione o ricarica automatica. Uso AI a consumo: limiti per richiesta/utente, timeout, gestione credito insufficiente e fallback manuale. UI senza provider funzionante non e AI consegnata; distinguere prove simulate e richiesta reale riuscita.

## Qualita del contenuto segnalata

Nel primo screenshot la Dalia White Bell viene descritta come non tossica e adatta a spazi con cani/gatti. La fonte ASPCA classifica Dahlia species come tossica per cani e gatti: https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/dahlia . Segnalare quel claim per correzione prima della sincronizzazione; questa nota NON modifica il prodotto o la sua descrizione. Non attribuire automaticamente all'AI la provenienza del testo. Un testo gia presente non e necessariamente una fonte botanica verificata.

Per tossicita, commestibilita, resistenza a temperature e altre proprieta non confermate, la proposta deve evitare nuove affermazioni o segnalare verifica necessaria. Il modello non e un sostituto della validazione delle fonti.

## Esecuzione e accettazione circoscritte

Un solo branch/PR pertinente, riusando il lavoro esistente e senza interventi paralleli su main. Sequenza proposta: implementazione UI/backend e test automatici; deploy funzioni minime compatibili; ampliamento nominativo dei soli campi approvati; Publish frontend e controllo effettivo. Preservare gli account abilitati, i ruoli preesistenti, canary chiuso, sync/approvazioni ordinarie, guard coppia SEO della #52, sitemap/SEO della #49, checkout, spedizioni e Sendcloud. Niente aggiornamenti massivi, nuovi ambienti o restore generali.

Prove mirate, non nuovo audit generale: rich text andata/ritorno e sanitizzazione; modificabilita delle tre liste per cliente e proprietario e rifiuto di utenti/campi non autorizzati; valore Shopify presente senza valore locale e nessuna perdita al cancel; concorrenza/salvataggio/sync; formato singolo/multiplo e prezzi con virgola; AI proposta/applicazione separata e rifiuto prezzi o fatti non forniti, errori provider/credito; layout desktop/mobile/tastiera. Riutilizzare una fixture non pubblicata e distinguere un test tecnico da accettazione personale di Marco. Non pubblicare la DRAFT tecnica o cambiare un prodotto commerciale per ottenere un PASS.

Aggiornare guida cliente, QA, stato progetto e questa nota con commit, versione e risultati reali. Un semplice Publish della versione corrente non implementa queste correzioni. La consegna richiede nuovo codice e distribuzione verificati.

Fonti codice: `src/adminv2/components/FieldCard.tsx`, `FieldEditor.tsx`, `lib/fieldValueCodecs.ts`, `pages/NewProductPage.tsx`, `supabase/functions/_shared/admin-catalog-policy.ts`, `product-admin-ai/index.ts` e `provider.ts`. Fonti pubbliche per AI: https://docs.lovable.dev/features/ai . La query registro e stata solo SELECT; nessuna capability, secret o policy e stata modificata da questo documento.
