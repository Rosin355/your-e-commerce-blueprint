import { useEffect } from 'react';
import { productStructuredData, serializeStructuredData, type ProductStructuredDataSource } from '@/lib/storefront-structured-data';

export function useProductStructuredData(product: ProductStructuredDataSource | null) {
  // Compare content, not the object identity recreated by a route render.
  const source = product ? JSON.stringify(product) : null;
  useEffect(() => {
    if (!source) return;
    const origin = import.meta.env.VITE_SITE_URL || window.location.origin;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.storefrontProduct = 'true';
    script.textContent = serializeStructuredData(productStructuredData(origin, JSON.parse(source)));
    document.head.append(script);
    return () => script.remove();
  }, [source]);
}
