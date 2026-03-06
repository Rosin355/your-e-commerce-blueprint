import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerStore } from '@/stores/customerStore';
import {
  customerAccountQuery,
  refreshAccessToken,
  logout as shopifyLogout,
  CUSTOMER_PROFILE_QUERY,
  CUSTOMER_ORDERS_QUERY,
  CUSTOMER_ADDRESSES_QUERY,
} from '@/lib/shopify-customer-auth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Package, MapPin, LogOut } from 'lucide-react';
import { toast } from 'sonner';

const Account = () => {
  const navigate = useNavigate();
  const { accessToken, refreshToken, profile, setTokens, setProfile, isTokenExpired, clear, hydrate } = useCustomerStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [defaultAddressId, setDefaultAddressId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!accessToken) {
      if (!sessionStorage.getItem('shopify_customer_token')) {
        navigate('/', { replace: true });
      }
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        let token = accessToken;

        // Refresh if expired
        if (isTokenExpired() && refreshToken) {
          try {
            const refreshed = await refreshAccessToken(refreshToken);
            setTokens(refreshed.access_token, refreshed.refresh_token, refreshed.expires_in);
            token = refreshed.access_token;
          } catch {
            clear();
            navigate('/', { replace: true });
            return;
          }
        }

        // Fetch profile, orders, addresses in parallel
        const [profileData, ordersData, addressesData] = await Promise.all([
          !profile ? customerAccountQuery(token, CUSTOMER_PROFILE_QUERY) : null,
          customerAccountQuery(token, CUSTOMER_ORDERS_QUERY, { first: 20 }),
          customerAccountQuery(token, CUSTOMER_ADDRESSES_QUERY),
        ]);

        if (profileData?.customer) {
          setProfile({
            firstName: profileData.customer.firstName,
            lastName: profileData.customer.lastName,
            email: profileData.customer.emailAddress?.emailAddress ?? null,
            phone: profileData.customer.phoneNumber?.phoneNumber ?? null,
            defaultAddress: profileData.customer.defaultAddress ?? null,
          });
        }

        setOrders(ordersData?.customer?.orders?.edges?.map((e: any) => e.node) ?? []);
        setAddresses(addressesData?.customer?.addresses?.edges?.map((e: any) => e.node) ?? []);
        setDefaultAddressId(addressesData?.customer?.defaultAddress?.id ?? null);
      } catch (err: any) {
        if (err.message === 'UNAUTHORIZED') {
          clear();
          navigate('/', { replace: true });
          toast.error('Sessione scaduta, effettua nuovamente l\'accesso');
        } else {
          console.error(err);
          toast.error('Errore nel caricamento dati account');
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [accessToken]);

  const handleLogout = () => {
    clear();
    shopifyLogout();
  };

  const formatPrice = (amount: string, currency: string) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(Number(amount));

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Ciao, {profile?.firstName ?? 'Cliente'}!
            </h1>
            <p className="text-muted-foreground">{profile?.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Esci
          </Button>
        </div>

        <Tabs defaultValue="orders">
          <TabsList className="mb-6">
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" />
              Ordini
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profilo
            </TabsTrigger>
            <TabsTrigger value="addresses" className="gap-2">
              <MapPin className="h-4 w-4" />
              Indirizzi
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
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
                {orders.map((order: any) => (
                  <Card key={order.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Ordine #{order.number}</CardTitle>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(order.processedAt)}
                        </span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-muted font-medium">
                          {order.financialStatus}
                        </span>
                        {order.fulfillments?.[0]?.status && (
                          <span className="px-2 py-0.5 rounded-full bg-muted font-medium">
                            {order.fulfillments[0].status}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {order.lineItems?.edges?.map((li: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3">
                            {li.node.image?.url && (
                              <img
                                src={li.node.image.url}
                                alt={li.node.image.altText || li.node.title}
                                className="h-12 w-12 rounded object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium">{li.node.title}</p>
                              <p className="text-xs text-muted-foreground">Qtà: {li.node.quantity}</p>
                            </div>
                            <p className="text-sm">
                              {formatPrice(li.node.price.amount, li.node.price.currencyCode)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t flex justify-end">
                        <p className="font-semibold">
                          Totale: {formatPrice(order.totalPrice.amount, order.totalPrice.currencyCode)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Il tuo profilo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{profile?.firstName ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cognome</p>
                    <p className="font-medium">{profile?.lastName ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{profile?.email ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefono</p>
                    <p className="font-medium">{profile?.phone ?? '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses">
            {addresses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p>Nessun indirizzo salvato.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr: any) => (
                  <Card key={addr.id} className={addr.id === defaultAddressId ? 'border-primary' : ''}>
                    <CardContent className="pt-6">
                      {addr.id === defaultAddressId && (
                        <span className="text-xs font-semibold text-primary mb-2 block">
                          Indirizzo predefinito
                        </span>
                      )}
                      <p className="font-medium">
                        {addr.firstName} {addr.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{addr.address1}</p>
                      {addr.address2 && (
                        <p className="text-sm text-muted-foreground">{addr.address2}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {addr.zip} {addr.city} ({addr.province})
                      </p>
                      <p className="text-sm text-muted-foreground">{addr.country}</p>
                      {addr.phone && (
                        <p className="text-sm text-muted-foreground mt-1">📞 {addr.phone}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Account;
