# Fase 3A — QA commerciale Shopify / storefront

Data: 29 settembre 2026  
Esito: **SHOPIFY / STOREFRONT — BLOCKED**

Nessun dato modificato, nessun ordine eseguito, canary invariato.

## Bloccanti

- **P0 — disponibilità**: 461 prodotti Shopify, 458 esauriti. Solo `OG_257799`, `OG_426481`, `OG_797988` acquistabili; hanno quantità 0 ma vendita oltre scorta attiva.
- **P1 — pubblicazione**: 461 prodotti pubblicati su 2.706 del catalogo interno.
- **P1 — immagini**: i tre prodotti acquistabili non hanno immagini; nessun prodotto osservato ha più di una foto.
- **Gate non verificato — spedizioni**: richiedono pannello Shopify o checkout con indirizzo.

## PASS

- Prezzi: 22/22 campione coerenti con catalogo interno, EUR.
- Carrello: add e persistenza dopo reload PASS.
- Checkout tecnico: PASS; carrello di prova 2 pezzi / 30,00 €, checkout Shopify aperto con righe corrette. Totale finale, tasse e spedizione non verificati.
- Nessun errore grave di pagina.

## P2

- Varianti/formati spesso pubblicati come prodotti separati; unico multi-variant con opzioni `Title 01/02` poco comprensibili.
- Checkout Shopify in inglese.
- Mobile FAIL: overflow orizzontale su catalogo e prodotto; CTA Add raggiungibile.

## Entity type

- `OG_152965`: **SAFE FOR GO-LIVE** come prodotto singolo.
- `OG_891874`: **REQUIRES STRUCTURAL REVIEW**.
- `OG_758263`: **REQUIRES STRUCTURAL REVIEW**.

## Correzioni minime

1. Caricare/verificare giacenze reali.
2. Decidere quali prodotti pubblicare per il lancio e completarli.
3. Aggiungere immagini ai prodotti acquistabili.
4. Verificare spedizioni Italia.
5. Correggere overflow mobile.
6. Riesaminare struttura varianti per `OG_891874` e `OG_758263`.
7. Rerun QA 3A.
8. Ordine E2E controllato con email conferma.

## Stato

Non uscire dal canary finché il rerun QA commerciale non è PASS.
