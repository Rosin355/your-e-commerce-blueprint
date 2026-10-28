import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ShopifyProduct } from '@/lib/shopify';
import { createStorefrontCheckout } from '@/lib/shopify-checkout';

export interface CartItem {
  product: ShopifyProduct;
  variantId: string;
  variantTitle: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  quantity: number;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
}

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  checkoutUrl: string | null;
  isLoading: boolean;
  
  addItem: (item: CartItem) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  setCartId: (cartId: string) => void;
  setCheckoutUrl: (url: string | null) => void;
  setLoading: (loading: boolean) => void;
  createCheckout: () => Promise<string | null>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      checkoutUrl: null,
      isLoading: false,

      addItem: (item) => {
        if (get().isLoading || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) return;
        const variant = item.product.node.variants.edges.find(({ node }) => node.id === item.variantId)?.node;
        if (!variant?.availableForSale) return;
        const { items } = get();
        const existingItem = items.find(i => i.variantId === item.variantId);
        
        if (existingItem && !Number.isSafeInteger(existingItem.quantity + item.quantity)) return;
        if (existingItem) {
          set({
            items: items.map(i =>
              i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          });
        } else {
          set({ items: [...items, item] });
        }
      },

      updateQuantity: (variantId, quantity) => {
        if (get().isLoading || !Number.isSafeInteger(quantity)) return;
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }
        
        set({
          items: get().items.map(item =>
            item.variantId === variantId ? { ...item, quantity } : item
          )
        });
      },

      removeItem: (variantId) => {
        if (get().isLoading) return;
        set({
          items: get().items.filter(item => item.variantId !== variantId)
        });
      },

      clearCart: () => {
        if (get().isLoading) return;
        set({ items: [], cartId: null, checkoutUrl: null });
      },

      setCartId: (cartId) => set({ cartId }),
      setCheckoutUrl: (checkoutUrl) => set({ checkoutUrl }),
      setLoading: (isLoading) => set({ isLoading }),

      // Returns a fresh URL on success, null for an empty/busy cart; throws on failure.
      // Always clears any previous (possibly stale) checkout URL before starting,
      // and rethrows so callers can surface a user-facing error.
      createCheckout: async () => {
        const { items, setLoading, setCheckoutUrl } = get();
        // Guard: never start a checkout for an empty cart.
        if (get().isLoading || items.length === 0) return null;

        // Clear any stale checkout URL from a previous attempt so it can never be reopened.
        setCheckoutUrl(null);
        setLoading(true);
        try {
          const checkoutUrl = await createStorefrontCheckout(items);
          if (!checkoutUrl) {
            throw new Error('Nessun URL di checkout restituito');
          }
          setCheckoutUrl(checkoutUrl);
          return checkoutUrl;
        } catch (error) {
          console.error('Checkout fallito:', error);
          setCheckoutUrl(null);
          throw error;
        } finally {
          setLoading(false);
        }
      }
    }),
    {
      name: 'shopify-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ items }) => ({ items }),
      // Ignore transient flags/URLs saved by earlier storefront versions.
      merge: (persisted, current) => ({
        ...current,
        items: (persisted as Partial<CartStore> | undefined)?.items ?? [],
      }),
    }
  )
);
