// F6 — Accesso all'Admin: sessione valida e ruolo verificato lato server.
import AdminLogin from '@/admin/components/AdminLogin';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AdminShell from './components/AdminShell';
import { useAdminContext } from './hooks/useAdminData';

export default function AdminV2Guard() {
  const { user, isLoading } = useAuth();
  const { data, isLoading: contextLoading, isError } = useAdminContext();

  if (isLoading || (user && contextLoading)) {
    return <div className="flex min-h-screen items-center justify-center">Caricamento…</div>;
  }

  if (!user) return <AdminLogin onLogin={() => window.location.reload()} />;

  if (isError || !data?.roles?.length) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Alert variant="destructive">
          <AlertTitle>Accesso non consentito</AlertTitle>
          <AlertDescription>
            Il tuo account non è abilitato all’area amministrativa di Online Garden.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <AdminShell />;
}
