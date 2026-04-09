

## Piano: Collegare lo store Shopify corretto

### Problema
Il connettore Shopify nativo di Lovable e' collegato a `lovable-project-6tknn.myshopify.com`, uno store di sviluppo a cui l'utente non ha accesso. Lo store reale e' `onlinegarden-new-2.myshopify.com`.

### Step 1 — Disconnettere lo store sbagliato
Usare il tool `shopify--disconnect_store` per scollegare `lovable-project-6tknn`.

### Step 2 — Aggiornare il codice frontend
Dopo aver collegato il nuovo store, aggiornare `src/lib/shopify.ts` con il nuovo dominio permanente e il nuovo Storefront Access Token ottenuti dai tool Shopify.

### Step 3 — Aggiornare il secret SHOPIFY_ADMIN_SHOP
Impostare il secret `SHOPIFY_ADMIN_SHOP` a `onlinegarden-new-2.myshopify.com`.

### Step 4 — Collegare lo store corretto via OAuth Admin
Dalla pagina `/admin/settings`, l'utente dovra' inserire `onlinegarden-new-2.myshopify.com` e completare il flusso OAuth per ottenere un token Admin API (`shpat_`) valido salvato nel database.

### Step 5 — Verificare
Testare che `get-products` e `shopify-test-connection` funzionino correttamente.

### Note tecniche
- Il connettore nativo Lovable gestisce la Storefront API (lettura prodotti frontend, checkout)
- Il sistema OAuth custom gestisce la Admin API (gestione prodotti, sync, ordini)
- Entrambi devono puntare allo stesso store `onlinegarden-new-2.myshopify.com`
- L'utente dovra' ricollegare lo store dal pannello Shopify di Lovable (icona Shopify in alto a destra)

