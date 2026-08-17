// F6 — Guscio dell'Admin: menu principale, ruoli, stato sola lettura.
import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  FolderTree,
  Leaf,
  LogOut,
  Send,
  Settings,
  Upload,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useAdminContext } from '../hooks/useAdminData';
import { LEGACY_TOOLS_ENABLED } from '../lib/flags';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/admin/products', label: 'Prodotti', icon: Boxes },
  { to: '/admin/imports', label: 'Importazioni', icon: Upload },
  { to: '/admin/categories', label: 'Categorie', icon: FolderTree },
  { to: '/admin/publications', label: 'Pubblicazioni', icon: Send },
  { to: '/admin/settings', label: 'Impostazioni', icon: Settings },
];

export default function AdminShell() {
  const { user, signOut } = useAuth();
  const { data: context } = useAdminContext();
  const roles = context?.roles ?? [];
  const isTechAdmin = roles.includes('tech_admin');

  return (
    <div className="min-h-screen bg-muted/30">
      <a
        href="#contenuto-admin"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Vai al contenuto
      </a>

      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold leading-tight">Admin Online Garden</p>
              <p className="text-xs text-muted-foreground">Catalogo prodotti</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => signOut()} className="gap-2">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Esci
            </Button>
          </div>
        </div>

        <nav aria-label="Menu principale" className="mx-auto max-w-7xl px-2 pb-2">
          <ul className="flex flex-wrap gap-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
            {isTechAdmin && LEGACY_TOOLS_ENABLED && (
              <li>
                <NavLink
                  to="/admin/technical"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-secondary text-secondary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  <Wrench className="h-4 w-4" aria-hidden="true" />
                  Strumenti tecnici
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
      </header>

      <div className="border-b bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="mx-auto max-w-7xl px-4 py-2 text-sm">
          Modalità consultazione: le funzioni di modifica non sono ancora abilitate.
        </p>
      </div>

      <main id="contenuto-admin" className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
