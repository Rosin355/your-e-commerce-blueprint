import { useEffect, useSyncExternalStore } from 'react';
import { createCustomerClient, type CustomerClient } from './client';
import { readCustomerConfig } from './config';
let client: CustomerClient;
export function getCustomerClient() {
  return client ??= createCustomerClient(readCustomerConfig(), window.sessionStorage);
}
export function useCustomer() {
  const api = getCustomerClient();
  const state = useSyncExternalStore(api.subscribe, api.getSnapshot);
  useEffect(() => {
    void api.restore();
    const timer = window.setInterval(() => { void api.restore(); }, 30000);
    const restore = () => { void api.restore(); };
    window.addEventListener('focus', restore);
    return () => { clearInterval(timer); window.removeEventListener('focus', restore); };
  }, [api]);
  return { ...state, api };
}
