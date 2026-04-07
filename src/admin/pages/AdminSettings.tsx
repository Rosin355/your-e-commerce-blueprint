import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, WifiOff, Loader2, Unplug, ExternalLink, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ConnectionStatus {
  connected: boolean;
  shop_domain?: string;
  scopes?: string;
  installed_at?: string;
}

export default function AdminSettings() {
  const [searchParams] = useSearchParams();
  const [shopDomain, setShopDomain] = useState('');
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
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

  useEffect(() => {
    loadStatus();
    if (searchParams.get('shopify') === 'connected') {
      toast.success('Shopify connesso con successo!');
    }
  }, [loadStatus, searchParams]);

  const handleConnect = async () => {
    if (!shopDomain.trim()) { toast.error('Inserisci il dominio dello store'); return; }
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopify-oauth-start', {
        body: { shop: shopDomain.trim() },
      });
      if (error) throw error;
      if (data?.authorize_url) {
        window.location.href = data.authorize_url;
      } else {
        toast.error(data?.error || 'Errore nell\'avvio OAuth');
      }
    } catch (err: any) {
      toast.error(err.message || 'Errore di connessione');
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopify-test-connection');
      if (error) throw error;
      if (data?.success) {
        toast.success(`Connessione OK! ${data.products_found} prodotti trovati.`);
      } else {
        toast.error(data?.error || 'Test fallito');
      }
    } catch (err: any) {
      toast.error(err.message || 'Errore nel test');
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!status?.shop_domain) return;
    if (!confirm(`Disconnettere ${status.shop_domain}?`)) return;
    setDisconnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopify-disconnect', {
        body: { shop_domain: status.shop_domain },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('Shopify disconnesso');
        setStatus({ connected: false });
      } else {
        toast.error(data?.error || 'Disconnessione fallita');
      }
    } catch (err: any) {
      toast.error(err.message || 'Errore');
    } finally {
      setDisconnecting(false);
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
        <p className="text-sm text-muted-foreground">Gestisci la connessione OAuth con il tuo store Shopify</p>
      </div>

      {status?.connected ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Connesso</CardTitle>
                <CardDescription>{status.shop_domain}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {status.scopes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Scopi autorizzati</p>
                <p className="text-sm font-mono">{status.scopes}</p>
              </div>
            )}
            {status.installed_at && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Connesso il</p>
                <p className="text-sm">{new Date(status.installed_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testing} className="gap-2">
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                Testa Connessione
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={disconnecting} className="gap-2">
                {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                Disconnetti
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <WifiOff className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-base">Non Connesso</CardTitle>
                <CardDescription>Inserisci il dominio del tuo store per avviare la connessione OAuth</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopDomain">Dominio Store</Label>
              <Input id="shopDomain" placeholder="your-store.myshopify.com o your-store"
                value={shopDomain} onChange={(e) => setShopDomain(e.target.value)} />
            </div>
            <Button onClick={handleConnect} disabled={connecting} className="gap-2">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Connetti a Shopify
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
