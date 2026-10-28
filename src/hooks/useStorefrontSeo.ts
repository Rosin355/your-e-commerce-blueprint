import { useEffect } from 'react';
import { canonicalUrl, seoDescription, type StorefrontSeo } from '@/lib/storefront-seo';

/** One owner per route; restore the original head on navigation/unmount, including errors. */
export function useStorefrontSeo({ title, description, path, image, type = 'website', noindex = false }: StorefrontSeo) {
  useEffect(() => {
    const originalTitle = document.title;
    const restore: Array<() => void> = [];
    const canonical = canonicalUrl(import.meta.env.VITE_SITE_URL || window.location.origin, path);
    const socialImage = image ? new URL(image, canonical).href : undefined;
    const meta = (attribute: 'name' | 'property', key: string, content?: string) => {
      const existing = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      const previous = existing?.getAttribute('content');
      const element = existing ?? document.createElement('meta');
      element.setAttribute(attribute, key);
      if (content) {
        element.content = content;
        if (!existing) document.head.append(element);
      } else element.remove();
      restore.push(() => {
        if (existing) {
          if (previous === null) existing.removeAttribute('content');
          else existing.content = previous;
          if (!existing.isConnected) document.head.append(existing);
        } else element.remove();
      });
    };
    document.title = title;
    const summary = seoDescription(description);
    meta('name', 'description', summary);
    meta('name', 'robots', noindex ? 'noindex,follow' : 'index,follow');
    for (const [key, value] of Object.entries({ title, description: summary, url: canonical, type, image: socialImage })) meta('property', `og:${key}`, value);
    for (const [key, value] of Object.entries({ title, description: summary, image: socialImage, card: socialImage ? 'summary_large_image' : 'summary' })) meta('name', `twitter:${key}`, value);
    const oldCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previousHref = oldCanonical?.getAttribute('href');
    const link = oldCanonical ?? document.createElement('link');
    link.rel = 'canonical';
    link.href = canonical;
    if (!oldCanonical) document.head.append(link);
    return () => {
      document.title = originalTitle;
      restore.reverse().forEach(reset => reset());
      if (oldCanonical) {
        if (previousHref === null) oldCanonical.removeAttribute('href');
        else oldCanonical.setAttribute('href', previousHref);
      } else link.remove();
    };
  }, [title, description, path, image, type, noindex]);
}
