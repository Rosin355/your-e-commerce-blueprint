import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export const AccountButton = () => {
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
    <Button variant="ghost" size="sm" className="hidden md:flex gap-2" onClick={handleClick}>
      <User className="h-5 w-5" />
      <span className="uppercase text-xs font-semibold">
        {user?.user_metadata?.first_name || (user ? 'Account' : 'Accedi / Registrati')}
      </span>
    </Button>
  );
};
