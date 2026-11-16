import { SHOPIFY_CUSTOMER_AUTH_ENABLED } from '@/customer/config';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const LegacyAccountButton = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const handleClick = () => {
    if (user) {
      navigate('/account');
    } else {
      navigate('/auth');
    }
  };

  if (isLoading) return null;

  return (
    <Button variant="ghost" size="sm" className="hidden md:inline-flex gap-2" onClick={handleClick} aria-label="Il mio account">
      <User className="h-5 w-5" />
      <span className="uppercase text-xs font-semibold">
        {user?.user_metadata?.first_name || (user ? 'Account' : 'Accedi / Registrati')}
      </span>
    </Button>
  );
};

export const AccountButton = () => SHOPIFY_CUSTOMER_AUTH_ENABLED ? (
  <Button variant="ghost" size="sm" className="hidden md:inline-flex gap-2" asChild><a href="/account" aria-label="Il mio account"><User className="h-5 w-5" /><span>Account / Accedi</span></a></Button>
) : <LegacyAccountButton />;
