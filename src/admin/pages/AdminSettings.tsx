import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ConnectionStatus {
  connected: boolean;
  shop_domain?: string;
  api_version?: string;
}

interface TestResult {
  success: boolean;
  shop?: { name: string; domain: string };
  products_found?: number;
  error?: string;
}

export default function AdminSettings() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('shopify-status');
      if (error) throw error;
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('shopify-test-connection');
      if (error) throw error;
      setTestResult(data);
      if (data?.success) {
        toast.success(`Connessione OK! ${data.products_found} prodotti trovati.`);
      } else {
        toast.error(data?.error || 'Test fallito');
      }
    } catch (err: any) {
      toast.error(err.message || 'Errore nel test');
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Impostazioni Shopify</h2>
        <p className="text-sm text-muted-foreground">Connessione Admin API statica — configurata via variabili d'ambiente</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${status?.connected ? 'bg-primary/10' : 'bg-destructive/10'}`}>
              {status?.connected ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <WifiOff className="h-5 w-5 text-destructive" />}
            </div>
            <div>
              <CardTitle className="text-base">{status?.connected ? 'Configurato' : 'Non Configurato'}</CardTitle>
              <CardDescription>
                {status?.connected
                  ? `Store: ${status.shop_domain} — API ${status.api_version}`
                  : 'Le variabili SHOPIFY_ADMIN_SHOP e SHOPIFY_ADMIN_ACCESS_TOKEN non sono configurate'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.connected && (
            <>
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testing} className="gap-2">
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                Testa Connessione
              </Button>

              {testResult && (
                <div className={`p-3 rounded-md text-sm ${testResult.success ? 'bg-primary/5 text-primary' : 'bg-destructive/5 text-destructive'}`}>
                  {testResult.success ? (
                    <div>
                      <p className="font-medium">✓ {testResult.shop?.name}</p>
                      <p className="text-xs mt-1">{testResult.shop?.domain} — {testResult.products_found} prodotti</p>
                    </div>
                  ) : (
                    <p>{testResult.error}</p>
                  )}
                </div>
              )}
            </>
          )}

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p><strong>Variabili richieste:</strong></p>
            <p><code>SHOPIFY_ADMIN_SHOP</code> — dominio .myshopify.com</p>
            <p><code>SHOPIFY_ADMIN_ACCESS_TOKEN</code> — token Admin API (shpat_...)</p>
            <p><code>SHOPIFY_ADMIN_API_VERSION</code> — versione API (default: 2025-01)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
