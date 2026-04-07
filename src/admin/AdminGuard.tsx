import React, { useState } from 'react';
import { getAdminSession } from '@/admin/lib/adminAuth';
import { useAuth } from '@/hooks/useAuth';
import AdminLogin from '@/admin/components/AdminLogin';
import AdminImport from '@/admin/pages/AdminImport';
import AdminSettings from '@/admin/pages/AdminSettings';
import AdminLayout from '@/admin/components/AdminLayout';

interface AdminGuardProps {
  page?: 'import' | 'settings';
}

export default function AdminGuard({ page = 'import' }: AdminGuardProps) {
  const { user, isAdmin, isLoading } = useAuth();
  const [legacyAuth, setLegacyAuth] = useState(!!getAdminSession());

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>;
  }

  // Support both Supabase Auth (admin role) and legacy email-based auth
  const isAuthenticated = (user && isAdmin) || legacyAuth;

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setLegacyAuth(true)} />;
  }

  const handleLogout = () => {
    setLegacyAuth(false);
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
