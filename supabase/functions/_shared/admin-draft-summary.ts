import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { CANONICAL_HANDLES, UUID } from './admin-operational-core.ts';

import { projectDraft, draftRecord, draftStrings } from './admin-draft-view.ts';

// Resolve only exact persisted identifiers. A missing or ambiguous mapping never
// becomes an invented category. The operational payload itself stays server-side.
export async function readDraftSummary(
  db: SupabaseClient,
  raw: unknown,
  shopify: <T>(query: string, variables: Record<string, unknown>) => Promise<T>,
) {
  const p = draftRecord(raw);
  const categoryIds = new Set((draftStrings(p.categoryIds) ?? []).filter(id => UUID.test(id)));
  const gids = (draftStrings(p.collectionIds) ?? []).filter(id => /^gid:\/\/shopify\/Collection\/\d+$/.test(id));
  const mapped = new Map<string, Set<string>>();
  if (gids.length) {
    const { data, error } = await db.from('product_category_shopify_map')
      .select('shopify_collection_gid,category_id').eq('map_status', 'verified').in('shopify_collection_gid', gids);
    if (!error) for (const row of data ?? []) {
      categoryIds.add(row.category_id);
      const matches = mapped.get(row.shopify_collection_gid) ?? new Set<string>();
      matches.add(row.category_id);
      mapped.set(row.shopify_collection_gid, matches);
    }
  }
  const names = new Map<string, string>();
  if (categoryIds.size) {
    const { data, error } = await db.from('product_categories').select('id,display_name')
      .in('id', [...categoryIds]).eq('visible_admin', true);
    if (!error) for (const row of data ?? []) if (typeof row.display_name === 'string' && row.display_name.trim()) names.set(row.id, row.display_name);
    for (const [gid, matches] of mapped) {
      const [id] = matches;
      if (matches.size === 1 && names.has(id)) names.set(gid, names.get(id)!);
    }
  }
  const unresolved = [...new Set(gids.filter(id => !names.has(id)))];
  if (unresolved.length && unresolved.length <= 23) {
    // Older ordinary drafts stored only collection GIDs. Resolve current labels
    // by exact identity; the read does not assert membership of a Shopify product.
    try {
      const result = await shopify<{ nodes: ({ id: string; title: string; handle: string } | null)[] }>(
        'query EditorDraftCollectionNames($ids:[ID!]!){nodes(ids:$ids){... on Collection{id title handle}}}',
        { ids: unresolved },
      );
      for (const node of result.nodes) {
        if (node && unresolved.includes(node.id) && node.title?.trim() &&
            (CANONICAL_HANDLES as readonly string[]).includes(node.handle)) names.set(node.id, node.title);
      }
    } catch { /* The saved selection remains visible with an unresolved label. */ }
  }
  return projectDraft(raw, names);
}
