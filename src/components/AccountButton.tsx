import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomerStore } from '@/stores/customerStore';
import { startLogin } from '@/lib/shopify-customer-auth';

export const AccountButton = () => {
  const navigate = useNavigate();
  const { accessToken, profile, hydrate } = useCustomerStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleClick = () => {
    if (accessToken) {
      navigate('/account');
    } else {
      startLogin();
    }
  };

  return (
    <Button variant="ghost" size="sm" className="hidden md:flex gap-2" onClick={handleClick}>
      <User className="h-5 w-5" />
      <span className="uppercase text-xs font-semibold">
        {accessToken && profile?.firstName ? profile.firstName : 'Accedi / Registrati'}
      </span>
    </Button>
  );
};
