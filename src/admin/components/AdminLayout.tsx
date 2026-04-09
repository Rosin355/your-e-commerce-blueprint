import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Shield, Settings } from 'lucide-react';
import { logoutAdmin, getAdminSession } from '../lib/adminAuth';
import { useAuth } from '@/hooks/useAuth';

interface AdminLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export default function AdminLayout({ children, onLogout }: AdminLayoutProps) {
  const session = getAdminSession();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    logoutAdmin();
    await signOut();
    onLogout();
  };

  const isSettingsPage = location.pathname === '/admin/settings';

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Admin Tools</h1>
              <p className="text-xs text-muted-foreground">Import CSV, Smart Sync e AI Product Writer</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant={isSettingsPage ? 'default' : 'outline'}
              size="sm"
              onClick={() => navigate(isSettingsPage ? '/admin/import' : '/admin/settings')}
              className="gap-1.5 text-xs"
            >
              <Settings className="h-3.5 w-3.5" />
              {isSettingsPage ? 'Import' : 'Settings'}
            </Button>

            <span className="text-sm text-muted-foreground">{user?.email || session?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Esci
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
