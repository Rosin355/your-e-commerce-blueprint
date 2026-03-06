import { create } from 'zustand';

export interface CustomerProfile {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  defaultAddress: {
    address1: string;
    address2: string | null;
    city: string;
    province: string;
    country: string;
    zip: string;
  } | null;
}

interface CustomerState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  profile: CustomerProfile | null;
  isLoading: boolean;

  setTokens: (access: string, refresh: string | undefined, expiresIn: number) => void;
  setProfile: (profile: CustomerProfile) => void;
  setLoading: (v: boolean) => void;
  clear: () => void;
  isLoggedIn: () => boolean;
  isTokenExpired: () => boolean;
  hydrate: () => void;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  profile: null,
  isLoading: false,

  setTokens: (access, refresh, expiresIn) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    sessionStorage.setItem('shopify_customer_token', access);
    if (refresh) sessionStorage.setItem('shopify_refresh_token', refresh);
    sessionStorage.setItem('shopify_token_expires', String(expiresAt));
    set({ accessToken: access, refreshToken: refresh ?? get().refreshToken, expiresAt });
  },

  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),

  clear: () => {
    sessionStorage.removeItem('shopify_customer_token');
    sessionStorage.removeItem('shopify_refresh_token');
    sessionStorage.removeItem('shopify_token_expires');
    set({ accessToken: null, refreshToken: null, expiresAt: null, profile: null });
  },

  isLoggedIn: () => !!get().accessToken,
  isTokenExpired: () => {
    const exp = get().expiresAt;
    if (!exp) return true;
    return Date.now() > exp - 60_000; // 1 min buffer
  },

  hydrate: () => {
    const access = sessionStorage.getItem('shopify_customer_token');
    const refresh = sessionStorage.getItem('shopify_refresh_token');
    const exp = sessionStorage.getItem('shopify_token_expires');
    if (access) {
      set({
        accessToken: access,
        refreshToken: refresh,
        expiresAt: exp ? Number(exp) : null,
      });
    }
  },
}));
