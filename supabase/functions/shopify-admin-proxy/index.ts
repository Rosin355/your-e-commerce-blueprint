import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SHOPIFY_STORE = 'lovable-project-6tknn.myshopify.com';
const API_VERSION = '2025-01';

function adminUrl(path: string) {
  return `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/${path}`;
}

async function shopifyFetch(path: string, method: string, body?: any, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': token!,
  };
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  let response = await fetch(adminUrl(path), opts);

  // Rate limit handling
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    response = await fetch(adminUrl(path), opts);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(data.errors || data));
  }
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const token = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
  if (!token) {
    return new Response(JSON.stringify({ success: false, error: 'Token non configurato' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { action, data } = await req.json();

    let result: any;

    switch (action) {
      case 'search_customer': {
        const res = await shopifyFetch(`customers/search.json?query=email:${encodeURIComponent(data.query)}`, 'GET', undefined, token);
        const customer = res.customers?.[0];
        result = { found: !!customer, id: customer?.id };
        break;
      }
      case 'create_customer': {
        const res = await shopifyFetch('customers.json', 'POST', { customer: data }, token);
        result = { success: true, id: res.customer?.id };
        break;
      }
      case 'update_customer': {
        const { id, ...customerData } = data;
        const res = await shopifyFetch(`customers/${id}.json`, 'PUT', { customer: customerData }, token);
        result = { success: true, id: res.customer?.id };
        break;
      }
      case 'search_product': {
        const res = await shopifyFetch(`products.json?title=${encodeURIComponent(data.query)}&limit=1`, 'GET', undefined, token);
        const product = res.products?.[0];
        result = { found: !!product, id: product?.id };
        break;
      }
      case 'create_product': {
        const res = await shopifyFetch('products.json', 'POST', { product: data }, token);
        result = { success: true, id: res.product?.id };
        break;
      }
      case 'update_product': {
        const { id, ...productData } = data;
        const res = await shopifyFetch(`products/${id}.json`, 'PUT', { product: productData }, token);
        result = { success: true, id: res.product?.id };
        break;
      }
      default:
        return new Response(JSON.stringify({ success: false, error: 'Azione non valida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Shopify proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Errore durante l\'operazione' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
