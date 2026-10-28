/** Display only methods explicitly confirmed by the shop owner. No inferred defaults. */
type PaymentMethod = 'Carte' | 'Apple Pay' | 'Google Pay' | 'Shop Pay' | 'Klarna' | 'Satispay';

export const PaymentInformation = ({ confirmedMethods = [] }: { confirmedMethods?: readonly PaymentMethod[] }) => (
  <div className="space-y-2 text-sm leading-6 text-muted-foreground">
    <p>Pagamento nel checkout Shopify. I metodi disponibili sono indicati al momento del pagamento.</p>
    {confirmedMethods.length > 0 && (
      <ul aria-label="Metodi di pagamento confermati" className="flex flex-wrap gap-2">
        {confirmedMethods.map(method => <li key={method} className="rounded border border-border px-2 py-1">{method}</li>)}
      </ul>
    )}
  </div>
);
