import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'admin_session';

export async function isAdminUser(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();
  
  return !!data;
}

export function logoutAdmin(): void {
  localStorage.removeItem(SESSION_KEY);
  supabase.auth.signOut({ scope: 'local' });
}
