import { storefrontApiRequest, CART_CREATE_MUTATION } from './shopify';
import type { CartItem } from '@/stores/cartStore';

export async function createStorefrontCheckout(items: CartItem[]): Promise<string> {
  try {
    if (!items.length || items.some(item => !Number.isSafeInteger(item.quantity) || item.quantity <= 0)) {
      throw new Error("Controlla le quantità nel carrello prima di continuare.");
    }
    const lines = items.map(item => ({
      quantity: item.quantity,
      merchandiseId: item.variantId,
    }));

    const cartData = await storefrontApiRequest(CART_CREATE_MUTATION, {
      input: {
        lines,
      },
    });

    // A checkout requires a successful cartCreate payload.
    if (!cartData?.data?.cartCreate) {
      throw new Error('Impossibile creare il checkout su Shopify');
    }

    if (cartData.data.cartCreate.userErrors.length > 0) {
      throw new Error(`Creazione carrello fallita: ${cartData.data.cartCreate.userErrors.map((e: { message: string }) => e.message).join(', ')}`);
    }

    const cart = cartData.data.cartCreate.cart;
    
    if (!cart?.checkoutUrl) {
      throw new Error('Nessun URL di checkout restituito da Shopify');
    }

    const url = new URL(cart.checkoutUrl);
    if (url.protocol !== 'https:') throw new Error('URL di checkout non valido');
    url.searchParams.set('channel', 'online_store');
    return url.toString();
  } catch (error) {
    console.error('Errore creazione checkout:', error);
    throw error;
  }
}
