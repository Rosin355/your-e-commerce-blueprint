import { Truck, CheckCircle, Leaf, Recycle } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Truck,
    title: "Trasporto Garantito",
    description: "La nostra 'Garanzia fino alla consegna' copre danni durante il trasporto, rispedendo gratuitamente gli articoli danneggiati."
  },
  {
    icon: CheckCircle,
    title: "Varietà Garantita",
    description: "Ampia selezione di piante rare e comuni, sempre disponibili per soddisfare ogni esigenza del tuo spazio verde."
  },
  {
    icon: Leaf,
    title: "Offerta Ampia",
    description: "Migliaia di piante da interno, esterno, rose, bulbi e piante da frutto. Trova sempre la pianta perfetta per te."
  },
  {
    icon: Recycle,
    title: "Imballaggi e Ambiente",
    description: "Utilizziamo materiali eco-sostenibili per l'imballaggio, nel rispetto dell'ambiente e del pianeta."
  }
];

export const FeaturesSection = () => {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-section font-heading font-bold text-primary text-center mb-12">
          Perché scegliere Online Garden
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className="p-6 text-center space-y-4 hover:shadow-card-hover transition-shadow">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
