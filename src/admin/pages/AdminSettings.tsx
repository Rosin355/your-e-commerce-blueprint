import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SHOPIFY_STORE_PERMANENT_DOMAIN } from '@/lib/shopify';

export default function AdminSettings() {
  const adminUrl = `https://admin.shopify.com/store/${SHOPIFY_STORE_PERMANENT_DOMAIN.replace('.myshopify.com', '')}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Connessione Shopify</h2>
        <p className="text-sm text-muted-foreground">Lo store Shopify è gestito tramite l'integrazione nativa di Lovable</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Connesso</CardTitle>
              <CardDescription>Store: {SHOPIFY_STORE_PERMANENT_DOMAIN}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href={adminUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Apri Shopify Admin
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
