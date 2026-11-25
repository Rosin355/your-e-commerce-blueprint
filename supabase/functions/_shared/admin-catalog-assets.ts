import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { catalogAllowed } from "./admin-catalog-policy.ts";
import { demand, OperationalError, UUID } from "./admin-operational-core.ts";
import type { AuthContext } from "./admin-v2-types.ts";
import { shopifyAdminGraphQLAtVersion } from "./shopify-admin-client.ts";

export const assetActions = [
  "get_product_gallery",
  "set_catalog_image",
  "get_product_formats",
  "rename_catalog_format",
];
export const assetWrites = ["set_catalog_image", "rename_catalog_format"];
const graphql = <T>(query: string, variables: Record<string, unknown>) =>
  shopifyAdminGraphQLAtVersion<T>("2026-10", query, variables, true);
const formats = (action: unknown) =>
  action === "get_product_formats" || action === "rename_catalog_format";
export function assetAllowed(auth: AuthContext, action: unknown) {
  return catalogAllowed(auth, "sync") &&
    catalogAllowed(auth, formats(action) ? "prices" : "images") &&
    auth.catalogGrant?.fieldKeys.includes(
        formats(action) ? "product_formats" : "product_gallery",
      ) === true;
}
export function requireAsset(auth: AuthContext, action: unknown) {
  if (!assetAllowed(auth, action)) {
    throw new OperationalError(
      "FORBIDDEN",
      "Gestione non abilitata per questo operatore.",
    );
  }
}
type Image = {
  id: string;
  status: string;
  alt: string | null;
  image?: { url: string } | null;
};
type Variant = {
  id: string;
  sku: string;
  price: string;
  selectedOptions: { name: string; value: string }[];
  media: { nodes: { id: string }[]; pageInfo: { hasNextPage: boolean } };
};
type Option = {
  id: string;
  name: string;
  optionValues: { id: string; name: string }[];
};
interface AssetState {
  id: string;
  updatedAt: string;
  media: { nodes: Image[]; pageInfo: { hasNextPage: boolean } };
  variants: { nodes: Variant[]; pageInfo: { hasNextPage: boolean } };
  options: Option[];
}
export async function readAssetState(id: string) {
  const { product } = await graphql<{ product: AssetState | null }>(
    `query EditorProductAssets($id:ID!) {
    product(id:$id){ id updatedAt options{id name optionValues{id name}} media(first:30){nodes{id status alt ... on MediaImage{image{url}}} pageInfo{hasNextPage}}
      variants(first:50){nodes{id sku price selectedOptions{name value} media(first:10){nodes{id} pageInfo{hasNextPage}}} pageInfo{hasNextPage}}}
  }`,
    { id },
  );
  demand(
    product?.id === id && !product.media.pageInfo.hasNextPage &&
      !product.variants.pageInfo.hasNextPage &&
      product.variants.nodes.every((v) => !v.media.pageInfo.hasNextPage),
    "Galleria o varianti oltre i limiti di verifica. Nessun invio disponibile.",
  );
  return product;
}
const images = (state: AssetState) =>
  state.media.nodes.filter((m) => m.image?.url && m.status === "READY");
const assigned = (state: AssetState, id: string) =>
  state.variants.nodes.some((v) => v.media.nodes.some((m) => m.id === id));
export function assetView(state: AssetState, action: unknown) {
  if (!formats(action)) {
    return {
      updatedAt: state.updatedAt,
      images: images(state).map((m) => ({
        id: m.id,
        url: m.image!.url,
        alt: m.alt ?? "",
        variant: assigned(state, m.id),
      })),
    };
  }
  const option = state.options.length === 1 &&
      state.options[0].name.toLowerCase() === "formato"
    ? state.options[0]
    : null;
  return {
    updatedAt: state.updatedAt,
    formats: option?.optionValues ?? [],
    variants: state.variants.nodes.map((v) => ({
      sku: v.sku,
      format: v.selectedOptions.map((o) => o.value).join(" / "),
      price: v.price,
    })),
  };
}
export function formatChange(state: AssetState, p: Record<string, unknown>) {
  const option = state.options[0];
  const current = option?.optionValues.find((v) => v.id === p.optionValueId);
  const name = typeof p.name === "string" ? p.name.trim() : "";
  demand(
    state.options.length === 1 && option.name.toLowerCase() === "formato" &&
      current && name && name.length <= 100 &&
      !/[<>\p{Cc}]/u.test(name) &&
      !option.optionValues.some((v) =>
        v.name.toLocaleLowerCase("it") === name.toLocaleLowerCase("it")
      ),
    "Seleziona un formato esistente e inserisci un nome nuovo e distinto.",
  );
  return { option, current, name };
}
async function libraryImage(
  db: SupabaseClient,
  actor: string,
  libraryId: unknown,
) {
  demand(
    typeof libraryId === "string" && UUID.test(libraryId),
    "Seleziona una foto dalla tua libreria.",
  );
  const { data, error } = await db.from("admin_catalog_media").select(
    "shopify_file_gid,alt",
  ).eq("id", libraryId).eq("actor", actor).eq("state", "READY").maybeSingle();
  demand(
    !error && data &&
      /^gid:\/\/shopify\/MediaImage\/\d+$/.test(data.shopify_file_gid) &&
      data.alt?.trim(),
    "Foto non disponibile nella tua libreria.",
  );
  const { node } = await graphql<
    { node: { id: string; alt: string; fileStatus: string } | null }
  >(
    "query EditorLibraryImage($id:ID!){node(id:$id){... on MediaImage{id alt fileStatus}}}",
    { id: data.shopify_file_gid },
  );
  demand(
    node !== null && node.id === data.shopify_file_gid &&
      node.alt === data.alt && node.fileStatus === "READY",
    "File o testo alternativo cambiato in Shopify. Rileggi la libreria.",
  );
  return { id: node.id, alt: node.alt };
}
export async function assetPlan(
  db: SupabaseClient,
  auth: AuthContext,
  p: Record<string, unknown>,
  state: AssetState,
) {
  requireAsset(auth, p.action);
  demand(
    state.updatedAt === p.expectedUpdatedAt,
    "La scheda Shopify è cambiata. Rileggi e confronta prima di inviare.",
  );
  if (formats(p.action)) {
    const { option, current, name } = formatChange(state, p);
    return {
      kind: "format" as const,
      optionId: option.id,
      oldValue: current.name,
      valueId: current.id,
      name,
    };
  }
  demand(
    ["add", "remove", "replace"].includes(String(p.change)),
    "Modifica galleria non riconosciuta.",
  );
  const old = p.change === "add"
    ? undefined
    : images(state).find((m) => m.id === p.imageId);
  demand(
    p.change === "add" || (old && !assigned(state, old.id)),
    "La foto manca o è associata a una variante. Conserva il suo collegamento.",
  );
  demand(
    p.change !== "remove" || images(state).length > 1,
    "Per togliere l’unica foto scegli prima una sostituzione.",
  );
  const next = p.change === "remove"
    ? undefined
    : await libraryImage(db, auth.userId, p.libraryId);
  demand(
    !next || !state.media.nodes.some((m) => m.id === next.id),
    "La foto selezionata è già associata al prodotto.",
  );
  return { kind: "image" as const, old: old?.id ?? null, next: next ?? null };
}
async function changeReference(product: string, id: string, add: boolean) {
  const { fileUpdate } = await graphql<
    { fileUpdate: { files: { id: string }[]; userErrors: unknown[] } }
  >(
    "mutation EditorImageReference($files:[FileUpdateInput!]!){fileUpdate(files:$files){files{id} userErrors{message}}}",
    {
      files: [{
        id,
        [add ? "referencesToAdd" : "referencesToRemove"]: [product],
      }],
    },
  );
  demand(
    !fileUpdate.userErrors.length && fileUpdate.files?.some((f) => f.id === id),
    "Shopify non ha confermato il collegamento della foto. Verifica la galleria.",
  );
}
export async function applyAsset(
  db: SupabaseClient,
  auth: AuthContext,
  p: Record<string, unknown>,
  before: AssetState,
) {
  const plan = await assetPlan(db, auth, p, before);
  if (plan.kind === "format") {
    const { productOptionUpdate } = await graphql<
      { productOptionUpdate: { userErrors: unknown[] } }
    >(
      "mutation EditorFormatName($product:ID!,$option:OptionUpdateInput!,$values:[OptionValueUpdateInput!]!){productOptionUpdate(productId:$product,option:$option,optionValuesToUpdate:$values,variantStrategy:LEAVE_AS_IS){userErrors{message}}}",
      {
        product: before.id,
        option: { id: plan.optionId },
        values: [{ id: plan.valueId, name: plan.name }],
      },
    );
    demand(
      !productOptionUpdate.userErrors.length,
      "Shopify ha rifiutato il nuovo nome del formato.",
    );
    const after = await readAssetState(before.id);
    const expected = before.variants.nodes.map((v) => ({
      ...v,
      selectedOptions: v.selectedOptions.map((o) => ({
        ...o,
        value: o.value === plan.oldValue ? plan.name : o.value,
      })),
    }));
    demand(
      JSON.stringify(after.variants.nodes) === JSON.stringify(expected) &&
        after.options[0]?.optionValues.some((v) =>
          v.id === plan.valueId && v.name === plan.name
        ),
      "Rilettura dei formati non corrispondente. Verifica la scheda prima di procedere.",
    );
  } else {
    let current = before;
    if (plan.next) {
      await changeReference(before.id, plan.next.id, true);
      current = await readAssetState(before.id);
      demand(
        images(current).some((m) =>
          m.id === plan.next!.id && m.alt === plan.next!.alt
        ),
        "Nuova foto e ALT da verificare. La foto precedente è conservata.",
      );
    }
    if (plan.old) {
      demand(
        images(current).some((m) => m.id === plan.old) &&
          !assigned(current, plan.old),
        "La foto è cambiata o è ora usata da un formato.",
      );
      await changeReference(before.id, plan.old, false);
      current = await readAssetState(before.id);
    }
    const expected = before.media.nodes.filter((m) => m.id !== plan.old).map(
      (m) => m.id,
    ).concat(plan.next ? [plan.next.id] : []).sort();
    demand(
      JSON.stringify(current.media.nodes.map((m) => m.id).sort()) ===
          JSON.stringify(expected) &&
        (!plan.next ||
          images(current).some((m) =>
            m.id === plan.next!.id && m.alt === plan.next!.alt
          )),
      "La galleria riletta è diversa da quella confermata. Non ripetere l’invio.",
    );
  }
  return { ok: true, result: { state: "VERIFIED" } };
}
