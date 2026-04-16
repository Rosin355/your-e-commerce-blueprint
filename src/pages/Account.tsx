import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Package, MapPin, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/storefront/SiteHeader';

interface OrderItem {
  title: string;
  quantity: number;
  variantTitle: string | null;
  amount: string;
  currencyCode: string;
  imageUrl: string | null;
  imageAlt: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  processedAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  totalAmount: string;
  currencyCode: string;
  items: OrderItem[];
}

const Account = () => {
  const navigate = useNavigate();
  const { user, session, isLoading: authLoading, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        // Fetch profile and orders in parallel
        const [profileRes, ordersRes] = await Promise.all([
          supabase.from('profiles').select('first_name, last_name, email, phone').eq('id', user.id).maybeSingle(),
          supabase.functions.invoke('get-customer-orders'),
        ]);

        if (profileRes.data) {
          setProfile(profileRes.data);
        } else {
          setProfile({ first_name: null, last_name: null, email: user.email ?? null, phone: null });
        }

        if (ordersRes.data?.success) {
          setOrders(ordersRes.data.orders || []);
        } else if (ordersRes.data?.error === 'shopify_unavailable') {
          toast.error('Shopify non raggiungibile. Riprova più tardi.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Errore nel caricamento dati account');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, authLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const formatPrice = (amount: string, currency: string) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(Number(amount));

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader variant="page" />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader variant="page" />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Ciao, {profile?.first_name || 'Cliente'}!
            </h1>
            <p className="text-muted-foreground">{profile?.email || user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Esci
          </Button>
        </div>

        <Tabs defaultValue="orders">
          <TabsList className="mb-6">
            <TabsTrigger value="orders" className="gap-2"><Package className="h-4 w-4" />Ordini</TabsTrigger>
            <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" />Profilo</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p>Nessun ordine ancora.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Ordine {order.orderNumber}</CardTitle>
                        <span className="text-sm text-muted-foreground">{formatDate(order.processedAt)}</span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-muted font-medium">{order.financialStatus}</span>
                        {order.fulfillmentStatus && (
                          <span className="px-2 py-0.5 rounded-full bg-muted font-medium">{order.fulfillmentStatus}</span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            {item.imageUrl && (
                              <img src={item.imageUrl} alt={item.imageAlt || item.title}
                                className="h-12 w-12 rounded object-cover" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.title}</p>
                              {item.variantTitle && <p className="text-xs text-muted-foreground">{item.variantTitle}</p>}
                              <p className="text-xs text-muted-foreground">Qtà: {item.quantity}</p>
                            </div>
                            <p className="text-sm">{formatPrice(item.amount, item.currencyCode)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t flex justify-end">
                        <p className="font-semibold">
                          Totale: {formatPrice(order.totalAmount, order.currencyCode)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader><CardTitle>Il tuo profilo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{profile?.first_name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cognome</p>
                    <p className="font-medium">{profile?.last_name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{profile?.email || user?.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefono</p>
                    <p className="font-medium">{profile?.phone ?? '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Account;
