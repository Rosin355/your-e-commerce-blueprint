import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

export const Hero = () => {
  const [email, setEmail] = useState("");

  const handleNewsletterSignup = () => {
    if (email) {
      toast.success("Grazie per esserti iscritto alla newsletter!");
      setEmail("");
    } else {
      toast.error("Inserisci un'email valida");
    }
  };

  return (
    <section className="relative bg-gradient-to-b from-muted/30 to-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Tagline */}
          <p className="text-base md:text-lg text-primary font-medium">
            Per la creazione e la cura del tuo spazio verde
          </p>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-heading font-bold text-primary leading-tight">
            La prossima Pianta che amerai è qui.
          </h1>

          {/* Newsletter */}
          <div className="max-w-md mx-auto pt-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="La tua email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
              />
              <Button 
                onClick={handleNewsletterSignup}
                size="lg"
                className="uppercase font-semibold whitespace-nowrap px-6"
              >
                Iscriviti
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
