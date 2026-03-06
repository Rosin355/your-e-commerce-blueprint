

## Piano: Aggiornare il token Shopify Admin e verificare il sync clienti

### Problema attuale
I log della Edge Function mostrano ancora l'errore `"This action requires merchant approval for read_customers scope"`. Questo significa che il token attualmente salvato nel secret `SHOPIFY_ACCESS_TOKEN` non ha i permessi necessari.

Hai fornito un nuovo token dalla nuova app di sviluppo: `5777870638ee3b57a9421d8402021380`.

### Passaggi

1. **Aggiornare il secret `SHOPIFY_ACCESS_TOKEN`** con il nuovo valore fornito, usando lo strumento di gestione secrets.

2. **Verificare che il dominio dello store nella Edge Function sia corretto** — attualmente la funzione punta a `lovable-project-6tknn.myshopify.com`. Se la nuova app di sviluppo è sullo stesso store, va bene. Altrimenti va aggiornato.

3. **Testare la Edge Function** con una chiamata `search_customer` per verificare che il nuovo token abbia gli scope `read_customers` e `write_customers` attivi.

4. **Se il test passa**, il flusso di import dalla pagina `/admin/import` funzionerà correttamente.

### Note importanti
- Assicurati che nella nuova app Shopify siano stati abilitati gli scope: `read_customers`, `write_customers`, `read_products`, `write_products`.
- L'app deve essere **installata** sullo store (non solo creata) affinché il token funzioni.

