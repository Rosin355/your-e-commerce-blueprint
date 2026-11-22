import { useAuth } from '@/hooks/useAuth';
import { useAdminContext } from '@/adminv2/hooks/useAdminData';
import { canViewAdminDiagnostics } from '@/adminv2/lib/adminDiagnostics';
import viewer from './viewer.html?raw';

export default function StaffViewer() {
  const { user } = useAuth();
  const context = useAdminContext();
  if (
    !user ||
    context.isError ||
    !canViewAdminDiagnostics(context.data?.roles)
  ) {
    return (
      <p role="alert">
        La consultazione del registro richiede il ruolo amministratore.
      </p>
    );
  }
  // An opaque origin keeps the selected file outside the storefront and its analytics.
  return (
    <iframe
      key={user.id}
      title="Registro storico privato"
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      srcDoc={viewer}
      className="h-[78vh] w-full border-0"
    />
  );
}
