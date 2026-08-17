// F6 — Sezioni previste ma non ancora attive: nessuna funzione nascosta, nessun errore.
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminContext } from '../hooks/useAdminData';
import { LEGACY_TOOLS_ENABLED } from '../lib/flags';

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" aria-hidden="true" /> In preparazione
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
      </Card>
    </div>
  );
}

export const ImportsPage = () => (
  <Placeholder
    title="Importazioni"
    description="Qui potrai caricare i file del catalogo e vedere il riepilogo di ogni importazione. La funzione sarà attivata dopo il completamento dei controlli di sicurezza."
  />
);

export const CategoriesPage = () => (
  <Placeholder
    title="Categorie"
    description="Qui potrai consultare e assegnare le categorie del catalogo. La funzione sarà attivata nella prossima fase."
  />
);

export const PublicationsPage = () => (
  <Placeholder
    title="Pubblicazioni"
    description="Qui vedrai lo storico delle pubblicazioni verso il negozio online. La pubblicazione non è ancora abilitata."
  />
);

export function SettingsPage() {
  const { data } = useAdminContext();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Impostazioni</h1>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Il tuo accesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Modalità: sola consultazione</p>
          <p>
            {data?.readOnlyReason ??
              'Le funzioni di modifica saranno abilitate dopo il completamento dei test.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function TechnicalToolsPage() {
  const { data } = useAdminContext();
  const isTechAdmin = data?.roles?.includes('tech_admin');

  if (!isTechAdmin || !LEGACY_TOOLS_ENABLED) {
    return (
      <Placeholder
        title="Strumenti tecnici"
        description="Questa sezione non è disponibile per il tuo account."
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Strumenti tecnici</h1>
      <p className="text-sm text-muted-foreground">
        Strumenti di transizione riservati al team tecnico. Non utilizzarli senza indicazioni.
      </p>
      <Card>
        <CardContent className="space-y-2 pt-4 text-sm">
          <Link to="/admin/import" className="block text-primary underline">
            Pannello di importazione e sincronizzazione (versione precedente)
          </Link>
          <Link to="/admin/settings-legacy" className="block text-primary underline">
            Impostazioni tecniche (versione precedente)
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
