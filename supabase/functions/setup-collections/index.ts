import { corsHeaders, shopifyAdminGraphQL, jsonResponse } from "../_shared/shopify-admin-client.ts";

interface CollectionSpec {
  handle: string;
  title: string;
  description: string;
  query: string; // Shopify product search query
  maxProducts?: number;
}

const COLLECTIONS: CollectionSpec[] = [
  // Piante da esterno
  { handle: "piante-da-esterno", title: "Piante da esterno", description: "Selezione di piante pensate per terrazzi, balconi e giardini.", query: "tag:esterno OR tag:outdoor OR product_type:Piante", maxProducts: 50 },
  { handle: "fioriture-stagionali", title: "Fioriture stagionali", description: "Le fioriture di stagione per dare colore e ritmo allo spazio esterno.", query: "tag:fioritura OR tag:fiorita OR title:fiorit*" },
  { handle: "rampicanti", title: "Rampicanti", description: "Glicini, gelsomini, bouganville e altre piante che vestono pergole e muri.", query: "tag:rampicante OR title:glicin* OR title:gelsomin* OR title:bouganv* OR title:passiflor* OR title:plumbag*" },
  { handle: "balconi-e-terrazze", title: "Balconi e terrazze", description: "Varietà ideali per spazi compatti, vasi e contenitori.", query: "tag:balcone OR tag:terrazzo OR tag:vaso" },
  { handle: "sempreverdi", title: "Sempreverdi", description: "Strutture verdi tutto l'anno per dare continuità al giardino.", query: "tag:sempreverde OR title:lauro OR title:bosso OR title:olivo OR title:cipress*" },

  // Rose
  { handle: "rose", title: "Rose", description: "Una collezione di rose dal carattere romantico e raffinato.", query: "title:rosa OR title:rose OR product_type:Rose OR tag:rosa", maxProducts: 80 },
  { handle: "rose-cespuglio", title: "Rose cespuglio", description: "Rose a portamento cespuglioso, perfette per aiuole e bordure.", query: "title:rosa AND (tag:cespuglio OR title:cespuglio)" },
  { handle: "rose-rampicanti", title: "Rose rampicanti", description: "Rose rampicanti per pergole, archi e muri fioriti.", query: "title:rosa AND (tag:rampicante OR title:rampicante)" },
  { handle: "rose-profumate", title: "Rose profumate", description: "Selezione di rose dal profumo intenso e persistente.", query: "title:rosa AND (tag:profumata OR title:profumat*)" },

  // Piante da frutto
  { handle: "piante-da-frutto", title: "Piante da frutto", description: "Essenze per unire bellezza, profumo e raccolto.", query: "tag:frutto OR product_type:Frutto OR product_type:Agrumi", maxProducts: 80 },
  { handle: "agrumi", title: "Agrumi", description: "Limoni, aranci, mandarini e altri agrumi per terrazzi e giardini.", query: "title:limon* OR title:arancio OR title:arancia OR title:mandarin* OR title:cedr* OR title:bergamott* OR title:kumquat OR title:pompelm* OR product_type:Agrumi" },
  { handle: "piccoli-frutti", title: "Piccoli frutti", description: "Lamponi, mirtilli, ribes, more e altri piccoli frutti decorativi.", query: "title:lampon* OR title:mirtill* OR title:ribes OR title:more OR title:goji OR title:uvaspina OR title:fragol*" },
  { handle: "alberi-da-frutto", title: "Alberi da frutto", description: "Meli, peri, susini, ciliegi e altri alberi da frutto.", query: "title:melo OR title:pero OR title:susin* OR title:cilieg* OR title:albicocc* OR title:pesco OR title:fico OR title:noce OR title:noccioll*" },
  { handle: "varieta-da-terrazzo", title: "Varietà da terrazzo", description: "Piante da frutto compatte, adatte alla coltivazione in vaso.", query: "tag:terrazzo AND (tag:frutto OR product_type:Agrumi)" },

  // Altre categorie
  { handle: "altre-categorie", title: "Altre categorie", description: "Vasi, accessori, aromatiche e idee regalo per completare lo spazio outdoor.", query: "tag:accessori OR tag:vaso OR tag:aromatica OR tag:regalo", maxProducts: 60 },
  { handle: "vasi-da-esterno", title: "Vasi da esterno", description: "Vasi in materiali resistenti per ogni stile di terrazzo.", query: "tag:vaso OR product_type:Vasi OR title:vaso" },
  { handle: "accessori", title: "Accessori", description: "Dettagli essenziali per un giardino curato.", query: "tag:accessori OR product_type:Accessori" },
  { handle: "aromatiche", title: "Aromatiche da esterno", description: "Rosmarino, salvia, lavanda, menta e altre aromatiche.", query: "title:rosmarin* OR title:salvia OR title:lavand* OR title:menta OR title:timo OR title:basilico OR title:origan* OR title:erba OR tag:aromatica" },
  { handle: "bulbi", title: "Bulbi", description: "Categoria in arrivo: bulbi di stagione per nuove fioriture.", query: "tag:bulbo OR product_type:Bulbi OR title:bulbo" },
  { handle: "idee-regalo", title: "Idee regalo", description: "Una selezione pensata per regalare il verde con stile.", query: "tag:regalo OR tag:gift OR title:regalo" },
];

interface ShopifyProductSearchNode {
  id: string;
  title: string;
}

async function searchProducts(query: string, max: number): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = null;
  const pageSize = Math.min(50, max);

  while (ids.length < max) {
    const data: any = await shopifyAdminGraphQL(
      `query($query: String!, $first: Int!, $after: String) {
        products(query: $query, first: $first, after: $after) {
          edges { cursor node { id title } }
          pageInfo { hasNextPage }
        }
      }`,
      { query, first: pageSize, after: cursor },
    );
    const edges = data?.products?.edges || [];
    for (const e of edges) {
      ids.push(e.node.id);
      if (ids.length >= max) break;
    }
    if (!data?.products?.pageInfo?.hasNextPage) break;
    cursor = edges[edges.length - 1]?.cursor;
    if (!cursor) break;
  }
  return ids;
}

async function findCollectionByHandle(handle: string): Promise<string | null> {
  const data: any = await shopifyAdminGraphQL(
    `query($q: String!) {
      collections(first: 1, query: $q) {
        edges { node { id handle } }
      }
    }`,
    { q: `handle:${handle}` },
  );
  const node = data?.collections?.edges?.[0]?.node;
  if (node?.handle === handle) return node.id;
  return null;
}

async function getOnlineStorePublicationId(): Promise<string | null> {
  try {
    const data: any = await shopifyAdminGraphQL(
      `query { publications(first: 25) { edges { node { id name } } } }`,
    );
    const edges = data?.publications?.edges || [];
    const online = edges.find((e: any) => /online store/i.test(e.node.name));
    return online?.node?.id || null;
  } catch {
    return null;
  }
}

async function createCollection(spec: CollectionSpec, publicationId: string | null): Promise<string> {
  const input: any = {
    title: spec.title,
    handle: spec.handle,
    descriptionHtml: `<p>${spec.description}</p>`,
  };
  if (publicationId) {
    input.publications = [{ publicationId }];
  }
  const data: any = await shopifyAdminGraphQL(
    `mutation($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection { id handle }
        userErrors { field message }
      }
    }`,
    { input },
  );
  const errs = data?.collectionCreate?.userErrors || [];
  if (errs.length) {
    throw new Error(`collectionCreate ${spec.handle}: ${errs.map((e: any) => e.message).join("; ")}`);
  }
  return data.collectionCreate.collection.id;
}

async function addProductsToCollection(collectionId: string, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;
  // Chunk in batches of 100
  for (let i = 0; i < productIds.length; i += 100) {
    const chunk = productIds.slice(i, i + 100);
    const data: any = await shopifyAdminGraphQL(
      `mutation($id: ID!, $productIds: [ID!]!) {
        collectionAddProducts(id: $id, productIds: $productIds) {
          userErrors { field message }
        }
      }`,
      { id: collectionId, productIds: chunk },
    );
    const errs = data?.collectionAddProducts?.userErrors || [];
    if (errs.length) {
      throw new Error(`collectionAddProducts: ${errs.map((e: any) => e.message).join("; ")}`);
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const onlyHandle = url.searchParams.get("handle");
    const dryRun = url.searchParams.get("dry") === "1";

    const publicationId = await getOnlineStorePublicationId();
    const targetCollections = onlyHandle ? COLLECTIONS.filter((c) => c.handle === onlyHandle) : COLLECTIONS;

    const report: any[] = [];

    for (const spec of targetCollections) {
      const entry: any = { handle: spec.handle, title: spec.title };
      try {
        const max = spec.maxProducts ?? 50;
        const productIds = await searchProducts(spec.query, max);
        entry.productsFound = productIds.length;

        if (dryRun) {
          report.push(entry);
          continue;
        }

        let collectionId = await findCollectionByHandle(spec.handle);
        if (collectionId) {
          entry.action = "exists";
        } else {
          collectionId = await createCollection(spec, publicationId);
          entry.action = "created";
        }
        entry.collectionId = collectionId;

        if (productIds.length > 0) {
          await addProductsToCollection(collectionId, productIds);
          entry.productsAdded = productIds.length;
        } else {
          entry.productsAdded = 0;
        }
      } catch (err: any) {
        entry.error = err?.message || String(err);
      }
      report.push(entry);
    }

    return jsonResponse({ ok: true, publicationId, report });
  } catch (err: any) {
    console.error("setup-collections error:", err);
    return jsonResponse({ ok: false, error: err?.message || String(err) }, 500);
  }
});
