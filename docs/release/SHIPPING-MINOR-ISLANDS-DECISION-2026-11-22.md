# Online Garden — decisione commerciale definitiva isole minori (22 novembre 2026)

**Fonte:** conferma esplicita comunicata dal responsabile il 22 novembre 2026, riferita alla decisione di Marco. **Stato decisione commerciale: APPROVATA. Stato applicazione tecnica sulle isole minori: NON ANCORA ATTESTATA.** Non confondere i due stati.

## Regola approvata, senza nuovi importi

Le **isole minori italiane e le località insulari/disagiate documentate** devono applicare **esattamente le stesse tabelle «Isole e zone disagiate» già configurate e approvate per Sicilia e Sardegna**, rispettando entrambe le classi logistiche:

- **Classe A** (piante ordinarie, prodotti voluminosi/sconosciuti, carrelli misti): carrello **0–18,99 € → 9,60 €; 19–79,99 € → 12,50 €; 80–149,99 € → 14,90 €; 150–249,99 € → 17,50 €; 250–499,99 € → 36,00 €; da 500 € → 54,00 €**.
- **Classe B** (solo bulbi e succulente/grasse con approvazione): **0–49,99 € → 6,90 €; 50–149,99 € → 8,90 €; da 150 € → 9,50 €**.
- **Nessuna gratuità**; tariffe A e B non si sommano e i carrelli misti ereditano A.
- La classe B è gestita tramite elenco varianti esplicito, non tramite tag o parole del titolo; preservare ID e policy live.
- **Non estendere** il supplemento a intere province continentali miste (per esempio LI, VE, NA) per includere un'isola e non introdurre un supplemento per tutto il Sud Italia.

Esempi già citati nella matrice originale: **Elba, Lido di Venezia, Pellestrina, Capri, Ischia, Procida, Eolie, Egadi, Ponza, Tremiti, Lampedusa, Pantelleria**. La **lista operativa esaustiva dei CAP/località e delle eventuali «zone disagiate» continentali resta da acquisire da fonte attendibile**: gli esempi non sono una tabella CAP pronta per produzione.

## Stato tecnico e limiti verificati

1. La lettura Shopify Admin GraphQL del 22/11/2026 conferma che il mercato **Italy** e il mercato **Sicilia e Sardegna — Isole** sono ACTIVE e presentano le tabelle A/B corrette, nessuna gratuità.
2. La PR [#45](https://github.com/Rosin355/your-e-commerce-blueprint/pull/45) registra sei checkout positivi (5 novembre), compresi Palermo/Cagliari. La PR rimane Draft/non merged ma l'attivazione di Shopify Markets è confermata in readback.
3. Shopify Markets per area/provincia **non è stato dimostrato sufficiente** a distinguere le isole minori dal resto della provincia. **Non dichiarare l'intervento completato al checkout delle isole minori senza una soluzione CAP/località verificata.**
4. Nessuna app nuova, spesa ricorrente, cambio dominio, modifica del carrello frontend, scrittura di tariffe o nuova policy di spedizione viene autorizzata implicitamente da questa registrazione.
5. Il connettore corrente non ha lo scope `read_delivery_customizations`. Accertare con accesso autorizzato quali customizzazioni siano operative; non scegliere un workaround che nasconda opzioni e impedisca l'acquisto.

## Criteri di chiusura tecnica

- Verificare disponibilità tecnica e costi della soluzione selettiva per CAP/località su piano Shopify e checkout nativo, mantenendo il listino A/B esistente e la compatibilità con Sendcloud.
- Ottenere lista ufficiale destinazioni, inclusi CAP/località ambigui, con copertura minima per Elba, Lido/Pellestrina, Capri/Ischia, Eolie e altri casi pertinenti; aggiungere test di non-regressione per **Livorno città, Venezia città, Napoli città**.
- Eseguire un test con carrello A, B e misto su territorio speciale e ordinario, includendo confini delle fasce e un preventivo checkout senza pagamento. Evidenziare ogni destinazione non distinguibile/servita.
- Rileggere Shopify post-eventuale autorizzazione, registrare codice/configurazione e rollback. Soltanto dopo marcare `SHIPPING_MINOR_ISLANDS=PASS`.

## Impatto SAL

La decisione commerciale «quale tariffa usare» è **CHIUSA**. La distribuzione tecnica sulle isole minori resta **PENDING_TECHNICAL_IMPLEMENTATION_AND_QA**, senza incremento SAL arbitrario. Le altre tariffe A/B live sono preservate.

Fonti: [matrice approvata PR #45](https://github.com/Rosin355/your-e-commerce-blueprint/blob/b6ac09b2059cff561ee36ec8ee331da4363cca4a/docs/SHIPPING-RATE-MATRIX.md) · [tariffe live aggiornate](SHIPPING-LIVE-RATES-2026-11-22.md).
