
-- Shopify connection (single-store, one active at a time)
CREATE TABLE public.shopify_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain text NOT NULL,
  access_token text NOT NULL,
  scopes text,
  is_active boolean NOT NULL DEFAULT true,
  installed_by text,
  token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_active_shop UNIQUE (shop_domain)
);

ALTER TABLE public.shopify_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on shopify_connections"
  ON public.shopify_connections FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view shopify_connections"
  ON public.shopify_connections FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER update_shopify_connections_updated_at
  BEFORE UPDATE ON public.shopify_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- OAuth state table (temporary nonces)
CREATE TABLE public.shopify_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL UNIQUE,
  shop_domain text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shopify_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on shopify_oauth_states"
  ON public.shopify_oauth_states FOR ALL TO service_role
  USING (true) WITH CHECK (true);
