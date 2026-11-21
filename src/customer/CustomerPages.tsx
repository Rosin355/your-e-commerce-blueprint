import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteHeader } from '@/components/storefront/SiteHeader';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useCustomer, getCustomerClient } from './react';
import { hostedCustomerAccount, SHOPIFY_CUSTOMER_AUTH_ENABLED } from './config';

// Neither raw provider errors nor tokens may reach the UI or the console.
export class CustomerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="container py-16"><h1>Accesso clienti temporaneamente non disponibile</h1><p>Puoi accedere direttamente all’area Shopify.</p><a href={hostedCustomerAccount}>Apri il tuo account</a><br /><Link to="/">Torna al negozio</Link></main> : this.props.children; }
}
function Frame({ children }: { children: ReactNode }) {
  return <div className="min-h-screen flex flex-col"><SiteHeader variant="page" /><main className="container max-w-3xl flex-1 py-12 space-y-6">{children}</main><Footer /></div>;
}
export function HostedCustomerAccount() {
  useEffect(() => { window.location.replace(hostedCustomerAccount); }, []);
  return <Frame><a href={hostedCustomerAccount}>Continua nell’area personale Shopify</a></Frame>;
}

export function CustomerAuth() {
  const { api, status, error } = useCustomer();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return <Frame><h1 className="text-3xl font-semibold">Accedi al tuo account</h1><p>Accedi con la tua email. Riceverai un codice monouso da Shopify: non serve la password del vecchio sito.</p><p>Al primo accesso può essere creato un profilo per questa email.</p>
    {(error || failed) && <p role="alert">{error || 'Accesso non disponibile. Riprova più tardi.'}</p>}
    {status === 'authenticated' ? <Button asChild><Link to="/account">Vai al tuo account</Link></Button> : <Button disabled={busy || status === 'loading'} onClick={async () => { setBusy(true); try { window.location.assign(await api.login()); } catch { setFailed(true); setBusy(false); } }}>Accedi con Shopify</Button>}
  </Frame>;
}
export function CustomerCallback() {
  const processed = useRef(false);
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const url = new URL(window.location.href);
    window.history.replaceState(null, '', '/account/callback');
    void getCustomerClient().callback(url).then(() => navigate('/account', { replace: true })).catch(() => setFailed(true));
  }, [navigate]);
  return <Frame>{failed ? <><p role="alert">Non è stato possibile completare l'accesso.</p><a href={hostedCustomerAccount}>Accedi tramite Shopify</a></> : <p role="status">Verifica dell'accesso in corso…</p>}</Frame>;
}
export function CustomerAccount() {
  const { api, customer, status, error } = useCustomer();
  const [busy, setBusy] = useState(false);
  return <Frame><h1 className="text-3xl font-semibold">Il tuo account</h1>{error && <p role="alert">{error}</p>}
    {status === 'loading' && <p role="status">Caricamento…</p>}
    {status !== 'authenticated' || !customer ? <Link to="/auth">Accedi</Link> : <>
      <section aria-label="Profilo"><h2 className="text-xl">Profilo</h2><p>{[customer.firstName, customer.lastName].filter(Boolean).join(' ')}</p><p>{customer.emailAddress?.emailAddress}</p></section>
      <section aria-label="Ordini"><h2 className="text-xl">Ordini Shopify</h2><p>Qui trovi gli ordini associati al tuo profilo.</p>{!customer.orders.nodes.length && <p>Non risultano ordini Shopify per questo account.</p>}
      <ul className="space-y-4">{customer.orders.nodes.map(order => <li key={order.id} className="rounded border p-4"><strong>{order.name}</strong><p>{order.processedAt ? new Date(order.processedAt).toLocaleDateString('it-IT') : ''}</p><p>{order.totalPrice.amount} {order.totalPrice.currencyCode}</p></li>)}</ul>
      {customer.orders.pageInfo.hasNextPage && <Button disabled={busy} onClick={async () => { setBusy(true); try { await api.moreOrders(); } finally { setBusy(false); } }}>Carica altri ordini</Button>}</section>
      <Button variant="outline" onClick={async () => { const url = await api.logout(); if (url) window.location.assign(url); }}>Esci dall'account cliente</Button>
    </>}
  </Frame>;
}
function CustomerLogoutCallback() {
  useEffect(() => { getCustomerClient().finishLogout(); }, []);
  return <Frame><p>La sessione cliente su questo sito è chiusa.</p><Link to="/">Torna al negozio</Link></Frame>;
}

export function CustomerLogout() {
  return SHOPIFY_CUSTOMER_AUTH_ENABLED ? <CustomerLogoutCallback /> : <HostedCustomerAccount />;
}
