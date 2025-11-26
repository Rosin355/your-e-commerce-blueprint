import { storefrontApiRequest, CART_CREATE_MUTATION } from './shopify';
import { CartItem } from '@/stores/cartStore';

export async function createStorefrontCheckout(items: CartItem[]): Promise<string> {
  try {
    const lines = items.map(item => ({
      quantity: item.quantity,
      merchandiseId: item.variantId,
    }));

    const cartData = await storefrontApiRequest(CART_CREATE_MUTATION, {
      input: {
        lines,
      },
    });

    if (cartData.data.cartCreate.userErrors.length > 0) {
      throw new Error(`Creazione carrello fallita: ${cartData.data.cartCreate.userErrors.map((e: any) => e.message).join(', ')}`);
    }

    const cart = cartData.data.cartCreate.cart;
    
    if (!cart.checkoutUrl) {
      throw new Error('Nessun URL di checkout restituito da Shopify');
    }

    const url = new URL(cart.checkoutUrl);
    url.searchParams.set('channel', 'online_store');
    return url.toString();
  } catch (error) {
    console.error('Errore creazione checkout:', error);
    throw error;
  }
}
