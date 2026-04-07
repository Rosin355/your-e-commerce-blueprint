import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Inserisci la tua email'); return; }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Controlla la tua casella email per il link di recupero password.');
      setIsForgotPassword(false);
    } catch (err: any) {
      toast.error(err.message || 'Impossibile inviare l\'email. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error('Compila tutti i campi obbligatori'); return; }
    if (password.length < 6) { toast.error('La password deve avere almeno 6 caratteri'); return; }
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message.includes('Invalid login credentials')
            ? 'Credenziali non valide. Verifica email e password.'
            : error.message);
        }
      } else {
        if (!firstName.trim() || !lastName.trim()) { toast.error('Nome e cognome sono obbligatori'); setIsLoading(false); return; }
        const { error } = await signUp(email, password, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
        });
        if (error) {
          toast.error(error.message.includes('User already registered')
            ? 'Questa email è già registrata. Prova ad accedere.'
            : error.message);
        } else {
          toast.success('Controlla la tua email per verificare il tuo account.');
        }
      }
    } catch {
      toast.error('Si è verificato un errore. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Recupera Password</CardTitle>
              <CardDescription>Inserisci la tua email per ricevere un link di recupero</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input id="forgot-email" type="email" placeholder="nome@esempio.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Invio in corso...' : 'Invia Link di Recupero'}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <button type="button" onClick={() => setIsForgotPassword(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Torna al login
                </button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{isLogin ? 'Accedi' : 'Registrati'}</CardTitle>
            <CardDescription>
              {isLogin ? 'Inserisci le tue credenziali per accedere' : 'Crea un nuovo account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nome *</Label>
                      <Input id="firstName" placeholder="Mario" value={firstName}
                        onChange={(e) => setFirstName(e.target.value)} disabled={isLoading} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Cognome *</Label>
                      <Input id="lastName" placeholder="Rossi" value={lastName}
                        onChange={(e) => setLastName(e.target.value)} disabled={isLoading} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefono</Label>
                    <Input id="phone" type="tel" placeholder="3331234567" value={phone}
                      onChange={(e) => setPhone(e.target.value)} disabled={isLoading} />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="nome@esempio.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Caricamento...' : isLogin ? 'Accedi' : 'Registrati'}
              </Button>
            </form>
            <div className="mt-6 text-center space-y-2">
              {isLogin && (
                <div>
                  <button type="button" onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Password dimenticata?
                  </button>
                </div>
              )}
              <button type="button" onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Auth;
