interface ProductCareInfoConfig {
  paragraphs: readonly string[];
}

interface ProductCareInfoProps {
  config?: ProductCareInfoConfig;
}

const defaultProductCareInfoConfig: ProductCareInfoConfig = {
  paragraphs: [
    "Le informazioni disponibili in descrizione e varianti ti aiutano a scegliere il formato più adatto al tuo spazio.",
    "Per dubbi su misure, disponibilità o opzioni specifiche puoi contattare l'assistenza prima di confermare l'acquisto.",
  ],
};

export const ProductCareInfo = ({ config = defaultProductCareInfoConfig }: ProductCareInfoProps) => {
  return (
    <div className="space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
      {config.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
};
