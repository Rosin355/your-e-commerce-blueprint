# Fase 2C.2 — QA finale Admin V2 / UX (canary)

Data: 2026-09-29. Backend: `main@82f77933`. Nessuna scrittura live, AI, Shopify, import, Smart Sync o Storage.
Azioni API osservate durante il QA: solo `get_admin_context`, `list_products`, `get_product`.

Stato registrato: backend 2C.1 CLOSED; create expectedVersion=0 live PASS; OG_365676.colore_fiore = "viola" permanente;
current values 24.467; history 5; command log 5.

| AREA | ESITO | SEVERITÀ | NOTE | BLOCCANTE GO-LIVE |
|---|---|---|---|---|
| Login/dashboard/lista/ricerca SKU/dettaglio/ritorno/refresh | PASS | — | Sessione Admin, refresh su dettaglio OK | No |
| Loading / error / empty state | PASS | — | Skeleton; "Prodotto non disponibile" + Riprova; "Nessun prodotto trovato" | No |
| Fixture A OG_264361.nome_comune | PASS | — | Valore corretto, v5, Manuale+Bloccato (badge, non errore), Modifica attiva per Admin, origine manuale, originale assente | No |
| Salva solo con modifica | FIXED | P3 | Prima era sempre attivo (click produceva NO_CHANGE, nessuna write). Ora disabilitato senza modifiche | No |
| Fixture B OG_365676.colore_fiore | PASS | — | "viola", v1, bloccato, manuale, confermato, protetto; lineage NULL senza errori | No |
| OG_393883 cinque manual_only | PASS | — | Protetti, modificabili Admin, "AI non ammessa", nessun controllo Shopify/import | No |
| Campi strutturali (SKU, GTIN, handle, quantità, prezzo…) | PASS | — | Modifica disabilitata con motivo in tooltip | No |
| Campo assente: "Versione 0" visibile | FIXED | P3 | Ora mostra "Valore non ancora inserito"; expectedVersion=0 resta interno | No |
| Editor tipizzati | PASS (codice + test 10/10) | — | number/boolean(select Sì/No)/select da registry/lista/FAQ repeater; nessun JSON manuale | No |
| FAQ legacy / JSON opaco | PASS (test) | — | Formato ignoto → sola lettura, nessuna normalizzazione. Nessuna FAQ live creata | No |
| VERSION_CONFLICT | PASS (codice/test) | — | Bozza conservata, avviso chiaro, "Ricarica senza sovrascrivere" | No |
| Replay / IDEMPOTENCY_CONFLICT | PASS (codice) | — | Replay = successo; conflitto con messaggio dedicato | No |
| Messaggi errore | PASS | P3 | Testi non tecnici; aggiornati due tooltip che citavano "RPC" | No |
| Accessibilità | PASS con nota | P3 | Label presenti; errore ora collegato al campo (aria-describedby). Cronologia mostra chiavi tecniche (field_key/change_type) | No |
| Responsive 1440/820/390 | PASS | — | Nessun overflow orizzontale | No |
| Console | PASS | P3 | Solo warning React forwardRef preesistenti, nessun errore bloccante | No |
| Bug noto validate_field_update (price) | Lasciare (A) | P3 | Il frontend non usa quella risposta: nessun impatto visibile, backend non modificato | No |

Correzioni: solo `src/adminv2/components/FieldCard.tsx` (presentazione). Backend invariato.

## Decisione
**ADMIN V2 UX — GO-LIVE READY** (limitatamente all'UX Admin; canary resta attivo; QA Shopify commerciale non iniziato).

Backlog P3: etichette leggibili in cronologia; warning forwardRef; test live con ruolo editor (unico account Admin).
