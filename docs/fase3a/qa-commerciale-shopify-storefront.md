# FASE 3A — QA commerciale Shopify / Storefront

Data: 2026-09-29 · Modalità: read-only + carrello di prova (nessun ordine, nessun pagamento) · Canary: ATTIVO

## 1. Preflight
| Voce | Esito |
|---|---|
| Store | `ecom-blueprint-gen-6ud1s.myshopify.com`, Storefront API 2025-07, token pubblico in `src/lib/shopify.ts` |
| Dominio storefront | romeshbigbird.com (published) / anteprima Lovable |
| Cart/checkout | `cartCreate` via Storefront API, `channel=online_store`, nuova scheda |
| Job | sync: 29 completed, 2 failed, 1 pending, 4 processing (storici, orfani); pipeline: 1 processing (storico). Nessuno avviato in questa fase |
| Build/log | build OK; nessun 4xx/5xx; solo warning React `forwardRef` (P3 noto) |
| Current values | 24.467 (invariato) |

## 2. Catalogo storefront (461 prodotti pubblicati sul canale)
- Pubblicati sullo storefront: **461** su 2.706 prodotti canonici (421 righe marcate `synced` nel catalogo locale).
- Disponibili (`availableForSale`): **3**; esauriti: **458**.
- I 3 disponibili (OG_257799, OG_426481, OG_797988) hanno `quantityAvailable = 0` (vendita oltre scorta attiva) e **nessuna immagine**.
- Prodotti con più immagini: **0**. Nessun prodotto con `compare_at_price`.
- Descrizioni presenti su tutti; alt text presente su tutte le immagini; nessun SKU duplicato; valuta sempre EUR; nessun prezzo 0.

## 3. Varianti
- Prodotti con più varianti: **1** (`og-535464`, opzione "Title", valori `01`/`02`, 17,50/21,00 €, entrambe esaurite).
- Le variazioni WooCommerce sono pubblicate come prodotti simple separati (es. OG_891874-01 / -02). Test "almeno 5 variable" **non eseguibile**.
- Nome opzione "Title" e valori "01/02" non comprensibili al cliente (P2).
- `cartCreate` con variante esaurita: nessun errore ma carrello con 0 righe → la UI disabilita correttamente il pulsante.

## 4. Anomalie entity type
| SKU | Storefront | Varianti Shopify | Prezzo | Immagini | Disp. | Esito |
|---|---|---|---|---|---|---|
| OG_152965 | 1 prodotto simple (-01) | Default Title | 8,90 € | 1 | esaurito | SAFE FOR GO-LIVE (rappresentato come simple coerente) |
| OG_891874 | 2 prodotti simple separati (-01, -02) | Default Title | 7,40 / 15,50 € | 1+1 | esauriti | REQUIRES STRUCTURAL REVIEW (formati come prodotti distinti) |
| OG_758263 | 2 prodotti simple separati (-01, -02) | Default Title | 15,70 / 19,20 € | 1+1 | esauriti | REQUIRES STRUCTURAL REVIEW |

Nessuna modifica eseguita.

## 5. Prezzi (22 campioni casuali)
22/22 prezzo storefront = prezzo catalogo interno; nessun compare_at_price; EUR. **PASS**.

## 6. Immagini
3 prodotti senza immagine (proprio i soli 3 acquistabili); nessuna gallery multi-immagine; nessuna immagine 404 in pagina. **FAIL (P1)**.

## 7. Disponibilità
UI coerente: badge "ESAURITO", filtro Disponibili 3 / Esauriti 458, pulsante disabilitato su esauriti. Dato commerciale: 99,3% esaurito → **P0 commerciale**.

## 8. Spedizioni
Non verificabili con token Storefront né senza inserire indirizzo nel checkout; nessuna regola creata.
| TIPO | DEST. | REGOLA | ESITO |
|---|---|---|---|
| Piante | Italia | non verificata | NON TESTATO |
| Bulbi | Italia | non verificata | NON TESTATO |
| Soglia gratuita / esclusioni | — | non verificata | NON TESTATO |
→ da verificare in Shopify Admin (Impostazioni › Spedizioni) o nell'ordine E2E.

## 9. Carrello
Aggiunta, persistenza dopo refresh (localStorage) **PASS** su desktop e mobile. Quantità/rimozione non testate esplicitamente oltre al codice (store locale).

## 10. Checkout
`cartCreate` OG_257799 ×2 → subtotale 30,00 €, riga/variante/quantità corrette; checkoutUrl fresco risponde 200, non protetto da password. Lingua checkout `en-it` (P2). Spedizione/tasse/totale finale: non verificati (richiede dati cliente). **PASS tecnico parziale**.

## 11. Email
Non testabile senza ordine → gate successivo E2E.

## 12. Mobile (390 px)
Home OK; catalogo e PDP con **overflow orizzontale** (P2); CTA "Aggiungi" sticky raggiungibile.

## 13. Errori
Nessun 4xx/5xx, nessun errore GraphQL; solo warning React forwardRef (P3).

## 14. Risultato
| AREA | ESITO | SEV. | NOTE | BLOCCANTE |
|---|---|---|---|---|
| Disponibilità catalogo | FAIL | P0 | 458/461 esauriti | SÌ |
| Copertura catalogo | FAIL | P1 | 461/2.706 pubblicati | SÌ (commerciale) |
| Immagini acquistabili | FAIL | P1 | 3/3 disponibili senza foto | SÌ |
| Spedizioni | NON TESTATO | P1 | regole non verificate | SÌ finché non verificate |
| Varianti | FAIL | P2 | variazioni come prodotti separati, opzione "Title" | No |
| Prezzi | PASS | — | 22/22 | No |
| Carrello | PASS | — | persistenza OK | No |
| Checkout tecnico | PASS | — | URL fresco, righe corrette | No |
| Lingua checkout | FAIL | P2 | en-it | No |
| Mobile | FAIL | P2 | overflow catalogo/PDP | No |
| Errori console | PASS | P3 | forwardRef | No |

## 15. Decisione
**SHOPIFY / STOREFRONT — BLOCKED**

Correzioni minime:
1. Caricare le giacenze reali in Shopify (o politica di vendita esplicita) sui prodotti da vendere.
2. Pubblicare sul canale storefront i prodotti destinati al lancio (decisione cliente).
3. Immagini sui prodotti acquistabili.
4. Verificare/configurare zone e tariffe di spedizione Italia in Shopify Admin.

## 16. Testo per README / PROJECT_STATUS / client-status / developer-handoff
> Fase 3A (2026-09-29): QA commerciale Shopify/Storefront — BLOCKED. Tecnica cart/checkout e prezzi OK; bloccanti: 458/461 prodotti esauriti, solo 461/2.706 pubblicati, prodotti acquistabili senza immagini, spedizioni non verificate. Canary attivo, nessun dato modificato. Prossimo gate: correzione dati Shopify, poi ordine E2E controllato.

## 17. Stop
Nessuna modifica a dati, entity type, prezzi, inventario, spedizioni; nessun import/AI/Smart Sync; nessun ordine.
