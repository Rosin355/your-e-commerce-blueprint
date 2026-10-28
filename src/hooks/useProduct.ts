import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { storefrontApiRequest, completeProductVariants, isHiddenStorefrontProduct, ShopifyProduct } from "@/lib/shopify";

const PRODUCT_BY_HANDLE_QUERY = `
  query GetProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      availableForSale
      seo { title description }
      publishedAt
      collections(first: 50) { edges { node { handle title } } }
      title
      description
      handle
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 5) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 100) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
            selectedOptions {
              name
              value
            }
          }
        }
      }
      options {
        name
        values
      }
      productType
      tags
      shortIntro: metafield(namespace: "custom", key: "short_intro") {
        value
        type
      }
      specialBullets: metafield(namespace: "custom", key: "special_bullets") {
        value
        type
      }
      keyFeatures: metafield(namespace: "custom", key: "key_features") {
        value
        type
      }
      careInfo: metafield(namespace: "custom", key: "care_info") {
        value
        type
      }
      promoText: metafield(namespace: "custom", key: "promo_text") {
        value
        type
      }
      cultivationDifficulty: metafield(namespace: "custom", key: "difficolta_di_coltivazione") {
        value
        type
      }
      originsHabitat: metafield(namespace: "custom", key: "origini_e_habitat") {
        value
        type
      }
      botanicalName: metafield(namespace: "custom", key: "nome_botanico") {
        value
        type
      }
      commonName: metafield(namespace: "custom", key: "nome_comune") {
        value
        type
      }
      productAttributes: metafield(namespace: "custom", key: "attributi_prodotto") {
        value
        type
      }
      floweringPeriod: metafield(namespace: "custom", key: "periodo_di_fioritura") {
        value
        type
      }
      pruningPeriod: metafield(namespace: "custom", key: "periodo_ottimale_di_potatura") {
        value
        type
      }
      plantingPeriod: metafield(namespace: "custom", key: "periodo_di_messa_a_dimora") {
        value
        type
      }
      harvestPeriod: metafield(namespace: "custom", key: "periodo_di_raccolta") {
        value
        type
      }
      plantKnowledge: metafield(namespace: "custom", key: "conosci_meglio_la_tua_pianta") {
        value
        type
      }
      careGuide: metafield(namespace: "custom", key: "come_prendersene_cura") {
        value
        type
      }
      faqTitle: metafield(namespace: "custom", key: "titolo_sezione_faq") {
        value
        type
      }
      faqItems: metafield(namespace: "custom", key: "faq_prodotto") {
        value
        type
      }
      hybridizer: metafield(namespace: "custom", key: "ibridatore") {
        value
        type
      }
      flowerColor: metafield(namespace: "custom", key: "colore_fiore") {
        value
        type
      }
      leafColor: metafield(namespace: "custom", key: "colore_foglia") {
        value
        type
      }
      curiosity: metafield(namespace: "custom", key: "curiosita") {
        value
        type
      }
    }
  }
`;

interface UseProductResult {
  product: ShopifyProduct | null;
  loading: boolean;
  retry: () => void;
  error: unknown;
  selectedVariant: ShopifyProduct["node"]["variants"]["edges"][number]["node"] | null;
  setSelectedVariant: Dispatch<SetStateAction<ShopifyProduct["node"]["variants"]["edges"][number]["node"] | null>>;
}

export const useProduct = (handle: string | undefined): UseProductResult => {
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [selectedVariant, setSelectedVariant] = useState<ShopifyProduct["node"]["variants"]["edges"][number]["node"] | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setProduct(null);
    setSelectedVariant(null);
    const loadProduct = async () => {
      if (!handle) {
        setProduct(null);
        setSelectedVariant(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle }, controller.signal);
        if (!active) return;
        if (data?.data?.productByHandle && !isHiddenStorefrontProduct({ node: data.data.productByHandle })) {
          const normalizedProduct = await completeProductVariants({ node: data.data.productByHandle }, controller.signal);
          if (!active) return;
          setProduct(normalizedProduct);
          setSelectedVariant(normalizedProduct.node.variants.edges.find(({ node }) => node.availableForSale)?.node ?? normalizedProduct.node.variants.edges[0]?.node ?? null);
        } else {
          setProduct(null);
          setSelectedVariant(null);
        }
      } catch (error) {
        if (!active) return;
        setError(error);
        console.error("Errore caricamento prodotto:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProduct();
    return () => { active = false; controller.abort(); };
  }, [handle, attempt]);

  return { product, loading, error, selectedVariant, setSelectedVariant, retry: () => setAttempt(value => value + 1) };
};
