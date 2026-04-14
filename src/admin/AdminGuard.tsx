import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import AdminLogin from '@/admin/components/AdminLogin';
import AdminImport from '@/admin/pages/AdminImport';
import AdminSettings from '@/admin/pages/AdminSettings';
import AdminLayout from '@/admin/components/AdminLayout';

interface AdminGuardProps {
  page?: 'import' | 'settings';
}

export default function AdminGuard({ page = 'import' }: AdminGuardProps) {
  const { user, isAdmin, isLoading, signOut } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>;
  }

  if (!user || !isAdmin) {
    return <AdminLogin onLogin={() => window.location.reload()} />;
  }

  const handleLogout = async () => {
    await signOut();
  };

  if (page === 'settings') {
    return (
      <AdminLayout onLogout={handleLogout}>
        <AdminSettings />
      </AdminLayout>
    );
  }

  return <AdminImport onLogout={handleLogout} />;
}
