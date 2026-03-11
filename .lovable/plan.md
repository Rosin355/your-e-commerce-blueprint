

## Piano: Sostituire il bottone "Aggiorna" con "Aggiorna prezzi da CSV"

Il bottone "Aggiorna" nel riquadro "Catalogo CSV salvato nel DB" (riga 552-559) attualmente ricarica solo la dashboard. Verrà sostituito con il bottone "Aggiorna prezzi da CSV" che:

1. Rilegge il CSV caricato nel browser
2. Estrae SKU + prezzi (con header italiani)
3. Invia batch UPDATE al DB
4. Ricarica la dashboard al termine

### Modifiche

**`src/admin/components/ProductSyncPanel.tsx`** — Nel riquadro "Catalogo CSV salvato nel DB":
- Sostituire il bottone "Aggiorna" con "Aggiorna prezzi da CSV" (stessa logica già presente nel bottone "Fix prezzi" più sopra, righe 470-506)
- Il bottone sarà disabilitato se non c'è un CSV caricato
- Aggiungere un piccolo bottone "Ricarica" (icona refresh) accanto per ricaricare la dashboard senza toccare i prezzi

