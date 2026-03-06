import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleCallback, customerAccountQuery, CUSTOMER_PROFILE_QUERY } from '@/lib/shopify-customer-auth';
import { useCustomerStore } from '@/stores/customerStore';
import { toast } from 'sonner';

const AccountCallback = () => {
  const navigate = useNavigate();
  const processed = useRef(false);
  const { setTokens, setProfile, setLoading } = useCustomerStore();

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const run = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams(window.location.search);
        const tokens = await handleCallback(params);

        setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);

        // Fetch profile
        const data = await customerAccountQuery(tokens.access_token, CUSTOMER_PROFILE_QUERY);
        if (data?.customer) {
          setProfile({
            firstName: data.customer.firstName,
            lastName: data.customer.lastName,
            email: data.customer.emailAddress?.emailAddress ?? null,
            phone: data.customer.phoneNumber?.phoneNumber ?? null,
            defaultAddress: data.customer.defaultAddress ?? null,
          });
        }

        toast.success('Accesso effettuato con successo!');
        navigate('/account', { replace: true });
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        toast.error('Errore durante l\'accesso', { description: err.message });
        navigate('/', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [navigate, setTokens, setProfile, setLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Accesso in corso...</p>
      </div>
    </div>
  );
};

export default AccountCallback;
