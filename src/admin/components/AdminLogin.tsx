import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AdminLoginProps {
  onLogin: () => void;
  access?: 'legacy-admin' | 'staff';
}

export default function AdminLogin({ onLogin, access = 'legacy-admin' }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Inserisci email e password');
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError('Credenziali non valide');
        return;
      }
      // V2 authorizes every staff role through get_admin_context before mounting its shell.
      if (access === 'staff') {
        onLogin();
        return;
      }
      // Older tools require the legacy administrator role.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Errore di autenticazione');
        return;
      }
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!roleData) {
        await supabase.auth.signOut({ scope: 'local' });
        setError('Accesso riservato agli amministratori');
        return;
      }
      onLogin();
    } catch {
      setError('Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  const requestRecovery = async () => {
    if (!email.trim()) { setError('Inserisci la tua email di lavoro'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (result.error) throw result.error;
      toast.success('Se la casella è abilitata, riceverai il link di recupero.');
    } catch {
      setError('Recupero temporaneamente non disponibile. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{access === 'staff' ? 'Accesso personale Online Garden' : 'Admin Import'}</CardTitle>
          <CardDescription>Usa le credenziali del personale abilitato</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <LogIn className="h-4 w-4" />
              {loading ? 'Accesso in corso…' : 'Accedi'}
            </Button>
            <Button type="button" variant="link" disabled={loading} onClick={requestRecovery}>
              Recupera password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
