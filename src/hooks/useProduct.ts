import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { storefrontApiRequest, ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";

const PRODUCT_BY_HANDLE_QUERY = `
  query GetProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
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
      variants(first: 10) {
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
    }
  }
`;

interface UseProductResult {
  product: ShopifyProduct | null;
  loading: boolean;
  error: unknown;
  selectedVariant: ShopifyProduct["node"]["variants"]["edges"][number]["node"] | null;
  setSelectedVariant: Dispatch<SetStateAction<ShopifyProduct["node"]["variants"]["edges"][number]["node"] | null>>;
}

export const useProduct = (handle: string | undefined): UseProductResult => {
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [selectedVariant, setSelectedVariant] = useState<ShopifyProduct["node"]["variants"]["edges"][number]["node"] | null>(null);

  useEffect(() => {
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
        const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
        if (data?.data?.productByHandle) {
          const normalizedProduct = { node: data.data.productByHandle };
          setProduct(normalizedProduct);
          setSelectedVariant(normalizedProduct.node.variants.edges[0]?.node ?? null);
        } else {
          setProduct(null);
          setSelectedVariant(null);
        }
      } catch (error) {
        setError(error);
        console.error("Errore caricamento prodotto:", error);
        toast.error("Errore nel caricamento del prodotto");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [handle]);

  return { product, loading, error, selectedVariant, setSelectedVariant };
};
