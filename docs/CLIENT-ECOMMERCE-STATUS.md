## Decisione FINALE del proprietario sulle isole — 5 novembre 2026

**La precedente concessione sulla tariffa standard delle isole minori è annullata.** Il cliente conferma che **tutte le isole italiane, anche quelle minori — tra cui Elba, Lido di Venezia e Pellestrina — devono pagare la fascia «Isole e zone disagiate», proprio come Sicilia e Sardegna**. Si rivedrà la politica solo in seguito a un'eventuale nuova decisione. Non aumentare il prezzo delle consegne continentali della stessa provincia. Le tariffe commerciali A/B non cambiano.

**Attenzione:** questa è una decisione commerciale definitiva, non un test superato. Al momento Shopify nativo nel Dev gestisce le province siciliane/sarde ma non è stata dimostrata la distinzione delle isole minori all'interno di province continentali. I checkout Palermo e Cagliari sono ancora non verificati e ci sono 161 prodotti/varianti candidati alla tariffa B, **nessuno ancora approvato**. La copertura completa delle isole è quindi un requisito aperto che impedisce di considerare pronta la produzione. Shopify e Sendcloud live invariati, PR #45 Draft, nessun nuovo abbonamento autorizzato. Le precedenti note sulla tariffa provinciale standard sono soltanto storico superato.

# Online Garden — aggiornamento cliente

## 1 novembre 2026 — footer pubblicato sul dominio ufficiale

**Footer pubblicato e verificato su https://onlinegarden.it.** PR [#43](https://github.com/Rosin355/your-e-commerce-blueprint/pull/43) unita senza bypass. HEAD sorgente `e617c05ad9afcaf2c22ad5faac0da06e8bd9ad1d`; merge e commit effettivamente servito in produzione `8d2a160917895735658e34a37d6b337733a32649`. Deploy Lovable esplicito `0ae71161-a4cc-407e-ae36-b2202f381981`, confermato dal DOM del footer e dal `data-commit-sha` dell'HTML pubblico, non dal solo merge.

Il sito pubblico mostra ora il nuovo footer desktop e mobile. Le categorie aprono pagine reali, Contatti mostra `info@onlinegarden.it` e Privacy Policy porta all'informativa ufficiale Shopify. Social non verificati e newsletter inattiva sono rimossi dal footer; homepage, catalogo, schede prodotto e header conservano la grafica approvata.

La verifica reale dopo la pubblicazione è positiva per navigazione, link, focus, mobile e carrello vuoto. Il checkout non è stato completato con un acquisto o un carrello Shopify reale. Il codice Admin V2 della PR #42 non è stato pubblicato e non sono stati attivati flag o modificati negozio, database o dominio.

**Questo rilascio riguarda il footer, non l'approvazione a vendere.** Marco deve ancora fornire testi approvati per Cookie Policy, termini, spedizioni/resi e dati societari. La telemetria Lovable è ancora attiva: c'è un'impostazione per disabilitarla, ma occorre una decisione specifica e una successiva verifica. Nessuna CMP aggiunta e nessuna dichiarazione di conformità del consenso.

[Checklist Marco](legal/CLIENT-LEGAL-PUBLICATION-CHECKLIST.md) · [Screenshot realmente online e QA](legal/release-evidence/2026-11-01/README.md). Le sezioni successive sono storico precedente, non attestazioni aggiornate del rilascio.

### Storico precedente alla pubblicazione del footer

28 ottobre 2026. **Migliorie integrate e verificate localmente; pubblicazione non effettuata.**

La nuova versione è stata preparata sulla base più recente del sito. Conserva categorie, selezioni della homepage, suggerimenti e prodotti di prova nascosti. Il lavoro precedente è stato preservato integralmente.

## Miglioramenti verificati con dati di prova

- La ricerca può raggiungere anche i prodotti oltre il millesimo. Sono stati controllati cataloghi sintetici da 1.205 e 10.000 prodotti, mantenendo filtri, conteggi e ordinamenti sull'intero insieme.
- Le schede caricano tutte le varianti; verificato un prodotto di prova con 205 formati. Gli errori di caricamento hanno un messaggio e un nuovo tentativo, senza mostrare dati parziali come completi.
- Il percorso di acquisto gestisce doppi clic ed errori, senza raddoppiare la quantità al nuovo tentativo. Il checkout Shopify resta quello esistente; le prove sono simulate e non hanno creato ordini o carrelli reali.
- Navigazione mobile, tastiera e ingrandimento immagini migliorati. Disponibilità e informazioni della pianta vengono mostrate dai dati ricevuti, senza numeri di stock o descrizioni botaniche generati.
- Titoli e descrizioni delle pagine aggiornati durante la navigazione; pagine mancanti contrassegnate per non essere indicizzate dopo il caricamento dell'app. Aggiunti dati descrittivi delle schede, senza prezzi o recensioni inventati.

Il catalogo completo richiede ancora il caricamento di tutte le pagine prima dei risultati: i test non dimostrano tempi reali su rete mobile o Shopify. La maggiore copertura non equivale a una promessa di maggiore velocità. La riduzione dei dati per singolo prodotto è stata misurata soltanto su fixture controllate.

## Da validare prima del lancio

Confermare dominio pubblico, indicizzazione e pagine mancanti sul sito effettivamente pubblicato; provare in un ambiente autorizzato prodotti/varianti/prezzi/disponibilità reali e checkout di test; approvare pagamenti, spedizioni, resi e pagine informative. Non sono stati attivati servizi, newsletter o metodi di pagamento per deduzione.

L'amministrazione, le sincronizzazioni e i dati del negozio restano quelli della versione recente. Non sono stati modificati dati, prezzi, giacenze, utenti o configurazioni live. Nessuna pubblicazione automatica o nuova Pull Request creata.

Questo documento descrive lo stato cliente. Dettagli tecnici e prove sono nel [report di integrazione](STOREFRONT-MAIN-INTEGRATION.md).
