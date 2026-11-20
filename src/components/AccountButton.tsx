import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AccountButton = () => (
  <Button variant="ghost" size="sm" className="hidden md:inline-flex gap-2" asChild>
    <Link to="/account" aria-label="Il mio account"><User className="h-5 w-5" />Account</Link>
  </Button>
);
