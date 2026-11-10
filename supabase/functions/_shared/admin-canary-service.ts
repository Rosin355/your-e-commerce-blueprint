import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import type { AuthContext } from './admin-v2-types.ts';
import { writeMode } from './admin-v2-commands.ts';
import { getExactShopifyProductMapping } from './admin-v2-queries-deferred.ts';
import { readProductCoreSnapshot, toProductGid } from './admin-v2-shopify-field-sync.ts';
import { parseCanaryScope, requireCanaryIdentity, requireCanaryScope } from './admin-canary-policy.ts';

export function canaryScope() {
  const scope = parseCanaryScope(Deno.env.get('PRODUCT_ADMIN_CANARY_SCOPE'));
  // A scope approved for this project cannot be reused on another backend.
  return scope && Deno.env.get('SUPABASE_URL') === `https://${scope.projectRef}.supabase.co` ? scope : null;
}

export async function requireCanaryProduct(
  db: SupabaseClient, auth: AuthContext, product: { id: string; sku: string }, action: string, fieldKey?: string,
) {
  if (auth.catalogGrant?.enabled === true && auth.roles.includes('editor')) return;
  const scope = requireCanaryScope(canaryScope(), auth.userId, auth.roles, action, fieldKey);
  // Reject the wrong internal identity before any external lookup.
  requireCanaryIdentity(scope, product, scope.shopifyProductId, 'DRAFT');
  const mapping = await getExactShopifyProductMapping(db, product.sku);
  requireCanaryIdentity(scope, product, mapping?.shopify_product_id ? toProductGid(mapping.shopify_product_id) : null, 'DRAFT');
  const live = await readProductCoreSnapshot(mapping!.shopify_product_id!);
  requireCanaryIdentity(scope, product, live.id, live.status);
  requireCanaryScope(canaryScope(), auth.userId, auth.roles, action, fieldKey);
}
