import React, { useState } from 'react';
import { getAdminSession } from '@/admin/lib/adminAuth';
import AdminLogin from '@/admin/components/AdminLogin';
import AdminImport from '@/admin/pages/AdminImport';

export default function AdminGuard() {
  const [authenticated, setAuthenticated] = useState(!!getAdminSession());

  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />;
  }

  return <AdminImport onLogout={() => setAuthenticated(false)} />;
}
