import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wifi, WifiOff, Loader2, CheckCircle2, Unplug, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface ConnectionStatus {
  connected: boolean;
  shop_domain?: string;
  scopes?: string;
  api_version?: string;
  source?: string;
  connected_at?: string;
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
  const [shopDomain, setShopDomain] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

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

  // Listen for OAuth callback messages
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'shopify-oauth-success') {
        toast.success('Shopify connesso con successo!');
        loadStatus();
      } else if (event.data?.type === 'shopify-oauth-error') {
        toast.error(event.data.error || 'Errore durante la connessione OAuth');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [loadStatus]);

  const handleConnect = async () => {
    const domain = shopDomain.trim();
    if (!domain) {
      toast.error('Inserisci il dominio dello store');
      return;
    }
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopify-oauth-start', {
        body: { shop: domain },
      });
      if (error) throw error;
      if (data?.authUrl) {
        // Open OAuth in popup
        const popup = window.open(data.authUrl, 'shopify-oauth', 'width=600,height=700');
        if (!popup) {
          toast.error('Popup bloccato. Abilita i popup per questo sito.');
        }
      } else {
        toast.error('Errore nella generazione URL OAuth');
      }
    } catch (err: any) {
      toast.error(err.message || 'Errore nella connessione');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Sei sicuro di voler disconnettere lo store Shopify?')) return;
    setDisconnecting(true);
    try {
      const { error } = await supabase.functions.invoke('shopify-disconnect');
      if (error) throw error;
      toast.success('Store disconnesso');
      setStatus({ connected: false });
      setTestResult(null);
    } catch (err: any) {
      toast.error(err.message || 'Errore nella disconnessione');
    } finally {
      setDisconnecting(false);
    }
  };

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
        <h2 className="text-xl font-semibold">Connessione Shopify</h2>
        <p className="text-sm text-muted-foreground">Collega il tuo store Shopify tramite OAuth per gestire prodotti e ordini</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${status?.connected ? 'bg-primary/10' : 'bg-destructive/10'}`}>
              {status?.connected ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <WifiOff className="h-5 w-5 text-destructive" />}
            </div>
            <div>
              <CardTitle className="text-base">
                {status?.connected ? 'Connesso' : 'Non Connesso'}
              </CardTitle>
              <CardDescription>
                {status?.connected
                  ? `Store: ${status.shop_domain} — API ${status.api_version}${status.source === 'env' ? ' (env vars)' : ' (OAuth)'}`
                  : 'Nessuno store Shopify collegato'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.connected ? (
            <>
              {status.scopes && (
                <div className="text-xs text-muted-foreground">
                  <strong>Scopes:</strong> {status.scopes}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleTest} disabled={testing} className="gap-2">
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                  Testa Connessione
                </Button>
                {status.source !== 'env' && (
                  <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={disconnecting} className="gap-2">
                    {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                    Disconnetti
                  </Button>
                )}
              </div>

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
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="tuo-store.myshopify.com"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  className="max-w-sm"
                />
                <Button onClick={handleConnect} disabled={connecting} className="gap-2">
                  {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Connetti
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Inserisci il dominio del tuo store Shopify e clicca "Connetti" per avviare il flusso OAuth.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
