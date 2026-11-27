# Admin V2 — AI Product Editor (candidato, 27/11/2026)

Stato: **READY_FOR_UAT (solo preview Admin)** · PENDING_CLIENT_ACCEPTANCE · SAL 57,75%.
Nessun deploy, Publish, merge su main, migration, permesso o scrittura Shopify.

## Architettura e flusso AI
- Riusa il servizio esistente `product-admin-ai` (`suggest_confirmed_field`, batch `reserve_new_draft_editorial_v1`); nessuna seconda pipeline.
- Input: nome prodotto + fatti verificati (1–12 righe) con conferma esplicita.
- «Completa scheda con AI» → proposte per descrizione estesa, descrizione breve, SEO, tag; tipo prodotto dal registro; caratteristiche/punti di forza/FAQ estratti in modo deterministico dai fatti.
- «Rigenera con AI» per singolo campo: nuova richiesta, viene sostituito solo quel campo (`mergeRegenerated`); campi accettati bloccati; errore AI o proposta non valida mantiene il valore precedente.
- Flussi separati: generazione → revisione (Accetta/Rifiuta/modifica) → salvataggio bozza locale → invio DRAFT Shopify → pubblicazione.

## Stati campo
Proposta AI · Modificato a mano · Accettato (bloccato) · Rifiutato · Mancante/non verificato. Nessuna proposta è approvata senza «Accetta» (con conferma).

## Matrice mapping
| Sezione | Fonte | AI |
|---|---|---|
| Descrizione estesa | `description` | Sì (sezioni con evidenze) |
| Descrizione breve | `short_description` | Sì / deterministico |
| Titolo e meta SEO | `seo_title`, `seo_description` | Sì |
| Tag | `tags` | Sì |
| Tipo prodotto | registro core | No, deterministico |
| Caratteristiche, punti di forza, FAQ | `key_features`, `key_benefits`, `faq` | No, estratti dai fatti |
| Periodi botanici, dimensioni, rusticità, cura | metafield botanici | **No**: manuale con conferma fonte per campo |
| SKU, prezzi, varianti, inventario | commerciali | **Mai** |

Non ancora supportati dall'AI: `special_bullets` per nuove bozze, sezione cura/coltivazione dedicata, categorie (restano selezione manuale). Richiederebbero modifiche backend con autorizzazione separata.

## Test
- `scripts/tests/admin-sheet-review.test.ts` 6/6 PASS (no auto-approvazione, rigenerazione isolata, accettati preservati, errori AI, mancanti).
- `admin-draft-sheet` + `admin-sheet-evidence` PASS; typecheck PASS.
- Preview autenticata (account Admin di Romesh) con risposte AI **simulate**: generazione, rifiuto, accettazione, rigenerazione singola, blocco del campo accettato. Scritture bloccate nel test. Non testati: AI reale, salvataggio/riapertura bozza, anti-duplicato (coperti dai test esistenti del servizio).
- Il test Admin **non** vale come collaudo dei permessi Editor di Marco.

## Checklist UAT
Admin: input breve → genera → modifica → rigenera una sezione → verifica campi accettati invariati → salva bozza → riapri → nessun duplicato.
Marco (sessione propria): stessi passi + verifica che compaiano solo i campi del suo grant.

## Dipendenze PR #78
La verifica metafield per campo e il recupero senza ricreazione sono nella PR #78 (non distribuita). Questo editor funziona in locale senza di essa; il salvataggio con ricevute campo per campo richiede il rilascio della #78.
