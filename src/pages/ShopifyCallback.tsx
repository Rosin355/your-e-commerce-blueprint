import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function ShopifyCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const shop = searchParams.get('shop');
    const state = searchParams.get('state');
    const hmac = searchParams.get('hmac');

    if (!code || !shop || !state) {
      setStatus('error');
      setMessage('Parametri OAuth mancanti');
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('shopify-oauth-callback', {
          body: { code, shop, state, hmac },
        });

        if (error) throw error;

        if (data?.success) {
          setStatus('success');
          setMessage(`Store ${data.shop} connesso con successo!`);
          // Notify parent window
          if (window.opener) {
            window.opener.postMessage({ type: 'shopify-oauth-success', shop: data.shop }, '*');
            setTimeout(() => window.close(), 2000);
          }
        } else {
          throw new Error(data?.error || 'Errore sconosciuto');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Errore durante il callback OAuth');
        if (window.opener) {
          window.opener.postMessage({ type: 'shopify-oauth-error', error: err.message }, '*');
        }
      }
    })();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="text-center space-y-4 p-8">
        {status === 'loading' && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Connessione in corso...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
            <p className="font-medium">{message}</p>
            <p className="text-sm text-muted-foreground">Questa finestra si chiuderà automaticamente.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="font-medium text-destructive">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
