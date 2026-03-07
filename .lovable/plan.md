

## Piano: Iscrizione Newsletter senza invio email

### Cosa faremo

Aggiungeremo il campo `email_marketing_consent` al payload di ogni cliente importato, impostando lo stato come **iscritto** ma senza far partire email da Shopify.

Il trucco è usare `consent_updated_at` con una data nel passato e `opt_in_level: "single_opt_in"`. Shopify non invia email di benvenuto marketing quando il consenso viene impostato via Admin API -- le email partono solo dalle automazioni marketing che l'utente configura manualmente nel pannello Shopify (Marketing > Automazioni). Quindi di default nessuna email parte.

### Modifiche

**1. `src/admin/types/import.ts`** -- Aggiungere il tipo per il consenso marketing:

```typescript
export interface ShopifyCustomerInput {
  // ... campi esistenti ...
  email_marketing_consent?: {
    state: string;
    opt_in_level: string;
    consent_updated_at: string;
  };
}
```

**2. `src/admin/lib/shopifyMapper.ts`** -- Aggiungere il consenso nel mapper clienti:

```typescript
customer.email_marketing_consent = {
  state: "subscribed",
  opt_in_level: "single_opt_in",
  consent_updated_at: new Date().toISOString(),
};
```

Questo imposta il tag "Iscritto" nella colonna "Iscrizione all'email" su Shopify, senza triggerare nessuna email automatica (le email marketing in Shopify partono solo se hai automazioni attive configurate manualmente).

### Risultato atteso

- Colonna "Iscrizione all'email" in Shopify: **Iscritto** (invece di "Non iscritto")
- Nessuna email inviata automaticamente da Shopify
- Funziona sia per clienti nuovi che per aggiornamenti di clienti esistenti

