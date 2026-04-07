import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const ShopifyCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const forwardToEdgeFunction = async () => {
      const code = searchParams.get('code');
      const hmac = searchParams.get('hmac');
      const shop = searchParams.get('shop');
      const state = searchParams.get('state');
      const timestamp = searchParams.get('timestamp');

      if (!code || !hmac || !shop || !state) {
        setStatus('error');
        setErrorMsg('Parametri OAuth mancanti dalla risposta Shopify.');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('shopify-oauth-callback', {
          body: { code, hmac, shop, state, timestamp },
        });

        if (error) {
          setStatus('error');
          setErrorMsg('Errore durante la connessione. Riprova.');
          return;
        }

        if (data?.success) {
          navigate('/admin/settings?shopify=connected', { replace: true });
        } else {
          setStatus('error');
          setErrorMsg(data?.error || 'Connessione fallita. Riprova.');
        }
      } catch {
        setStatus('error');
        setErrorMsg('Errore imprevisto. Riprova.');
      }
    };

    forwardToEdgeFunction();
  }, [searchParams, navigate]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <div className="text-destructive text-lg font-medium">Connessione fallita</div>
          <p className="text-muted-foreground text-sm">{errorMsg}</p>
          <button onClick={() => navigate('/admin/settings', { replace: true })}
            className="text-sm text-primary underline hover:no-underline">
            Torna alle impostazioni
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground text-sm">Connessione a Shopify in corso...</p>
      </div>
    </div>
  );
};

export default ShopifyCallback;
