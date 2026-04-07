import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Shield, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { logoutAdmin, getAdminSession } from '../lib/adminAuth';
import { supabase } from '@/integrations/supabase/client';

interface AdminLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

type ConnStatus = 'idle' | 'loading' | 'ok' | 'error';

export default function AdminLayout({ children, onLogout }: AdminLayoutProps) {
  const session = getAdminSession();
  const [connStatus, setConnStatus] = useState<ConnStatus>('idle');
  const [shopName, setShopName] = useState<string | null>(null);
  const [connError, setConnError] = useState<string | null>(null);

  const handleLogout = () => {
    logoutAdmin();
    onLogout();
  };

  const testConnection = useCallback(async () => {
    setConnStatus('loading');
    setConnError(null);
    try {
      const { data, error } = await supabase.functions.invoke('validate-shopify-connection');
      if (error) throw new Error(error.message);
      if (data?.success) {
        setConnStatus('ok');
        setShopName(data.shop?.name || data.shop?.domain || 'Connesso');
      } else {
        setConnStatus('error');
        setConnError(data?.error || 'Connessione fallita');
      }
    } catch (e) {
      setConnStatus('error');
      setConnError(e instanceof Error ? e.message : 'Errore');
    }
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Admin Tools</h1>
              <p className="text-xs text-muted-foreground">Import CSV, Smart Sync e AI Product Writer</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Shopify connection status */}
            <div className="flex items-center gap-2">
              {connStatus === 'ok' && (
                <span className="flex items-center gap-1.5 text-xs text-green-600">
                  <Wifi className="h-3.5 w-3.5" />
                  {shopName}
                </span>
              )}
              {connStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-xs text-destructive" title={connError || undefined}>
                  <WifiOff className="h-3.5 w-3.5" />
                  Errore
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={connStatus === 'loading'}
                className="gap-1.5 text-xs"
              >
                {connStatus === 'loading' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wifi className="h-3.5 w-3.5" />
                )}
                Test Connessione
              </Button>
            </div>

            <span className="text-sm text-muted-foreground">{session?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Esci
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
