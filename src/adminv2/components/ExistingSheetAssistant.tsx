import { useQuery } from '@tanstack/react-query';
import type { FieldDefinition } from '../../../supabase/functions/_shared/admin-v2-types';
import { type AdminField, callAdminApi } from '../lib/adminApi';
import { evidenceLabels, sourceFacts } from '../lib/sheetEvidence';
import type { SheetKey } from '../lib/draftSheet';
import DraftSheetAssistant from './DraftSheetAssistant';

const registry: Record<SheetKey, string> = {
  description: 'description',
  shortDescription: 'short_description',
  seoTitle: 'seo_title',
  seoDescription: 'seo_description',
  tags: 'tags',
  productType: 'product_type',
};
export default function ExistingSheetAssistant({ fields, title, liveVerified, stage, activeValues }: {
  fields: AdminField[];
  title: string;
  liveVerified: boolean;
  stage: (field: AdminField, value: unknown) => void;
  activeValues: Record<string, unknown>;
}) {
  const definitions = useQuery({
    queryKey: ['admin', 'draft-field-definitions'],
    retry: false,
    queryFn: () => callAdminApi<{ definitions: FieldDefinition[] }>({ action: 'get_field_definitions' }),
  });
  const editable = fields.filter((f) => f.capabilities.canUpdate && !f.manualOnly && f.version !== null);
  const typeDef = definitions.data?.definitions.find((d) =>
    d.shopify_mapping?.type === 'core' &&
    ['productType', 'product_type'].includes(String(d.shopify_mapping.field))
  );
  const current = (key: string) => {
    const field = fields.find((f) => f.key === key);
    return activeValues[key] ?? field?.value ?? (liveVerified ? field?.shopifyLiveValue : undefined);
  };
  const str = (key: string) => typeof current(key) === 'string' ? String(current(key)) : '';
  const tags = current('tags');
  const draft = {
    description: str('description'),
    shortDescription: str('short_description'),
    seoTitle: str('seo_title'),
    seoDescription: str('seo_description'),
    tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [],
    productType: str(typeDef?.key ?? 'product_type'),
    botanical: Object.fromEntries(Object.keys(evidenceLabels).map((k) => [k, current(k)])),
  };
  if (definitions.isError) return <p role='alert'>Registro editoriale non disponibile.</p>;
  if (!definitions.data) return <p role='status'>Lettura dei campi editoriali…</p>;
  const defs = definitions.data.definitions.filter((d) => editable.some((f) => f.key === d.key));
  return (
    <DraftSheetAssistant
      draft={draft}
      context={{
        title,
        categories: [],
        definitions: defs,
        editableKeys: editable.map((f) => f.key),
        canFillDraft: true,
        supportsType: Boolean(typeDef && defs.includes(typeDef)),
      }}
      sourceRevision={JSON.stringify(fields.map((f) => [f.key, f.version, f.shopifyBaselineHash]))}
      sources={sourceFacts(liveVerified ? fields : fields.map((f) => ({ ...f, shopifyLiveValue: null })))}
      onApply={(change, extras) => {
        for (
          const [key, value] of [
            ...Object.entries(change).map(([k, v]) => [registry[k as SheetKey], v] as const),
            ...Object.entries(extras ?? {}),
          ]
        ) {
          const f = editable.find((f) =>
            f.key === key ||
            (key === 'product_type' && f.key === typeDef?.key)
          );
          if (f) stage(f, value);
        }
      }}
    />
  );
}
