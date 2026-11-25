import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { type AdminField, callAdminApi, callCatalogCommand, type ProductDetail } from '../lib/adminApi';
import { normalizeEditorValue } from '../lib/fieldValueCodecs';
import ValueDisplay from './ValueDisplay';
import AiErrorNotice from './AiErrorNotice';

export type StagedField = { value: unknown; version: number | null; hash?: string; revision: number };
interface Item {
  field: AdminField;
  change: StagedField;
  send: boolean;
}
function equal(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
export default function ProductReview(
  { productId, items, onDone, onRefresh }: {
    productId: string;
    items: Item[];
    onDone: (fieldKey: string) => void;
    onRefresh: () => Promise<unknown>;
  },
) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState<string[]>([]);
  const [review, setReview] = useState<Item[]>();
  async function submit() {
    if (!review || busy || error) return;
    setBusy(true);
    setDone([]);
    async function getField(key: string) {
      const detail = await callAdminApi<ProductDetail>({ action: 'get_product', productId });
      if (detail.product.productId !== productId) throw new Error('Identità prodotto cambiata.');
      return {
        field: detail.sections.flatMap((s) => s.fields).find((f) => f.key === key),
        live: detail.shopifyLive,
      };
    }
    try {
      for (const { field, change, send } of review) {
        const { field: before, live } = await getField(field.key);
        if (
          !before?.capabilities.canUpdate || before.version !== change.version ||
          before.shopifyBaselineHash !== change.hash ||
          (send && (!live.identityVerified || !before.shopifySyncAllowed || !change.hash))
        ) throw new Error('Il confronto è cambiato. Rileggi ' + field.label + '.');
        const normalized = normalizeEditorValue(before, change.value);
        if (normalized.ok === false) throw new Error(normalized.message);
        await callCatalogCommand({
          action: 'update_field',
          productId,
          fieldKey: field.key,
          value: normalized.value,
          expectedVersion: change.version,
          expectedShopifyHash: change.hash,
        }, { reviewed: true });
        const { field: saved, live: after } = await getField(field.key);
        if (!saved || !equal(saved.value, normalized.value)) {
          throw new Error('Controllare il salvataggio locale di ' + field.label + '.');
        }
        if (send) {
          if (
            !after.identityVerified || !saved.shopifySyncAllowed || saved.version === null ||
            saved.shopifyBaselineHash !== change.hash
          ) throw new Error('Shopify è cambiato dopo il salvataggio di ' + field.label + '.');
          await callCatalogCommand({
            action: 'sync_field',
            productId,
            fieldKey: field.key,
            expectedVersion: saved.version,
            expectedShopifyHash: change.hash,
          }, { reviewed: true });
        }
        setDone(
          (old) => [...old, field.label + (send ? ' · aggiornamento verificato' : ' · salvato in Admin')],
        );
        onDone(field.key);
      }
      setReview(undefined);
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : 'Esito incerto.') +
          ' Controlla lo storico e rileggi i valori prima di proseguire.',
      );
    } finally {
      try {
        await onRefresh();
      } finally {
        setBusy(false);
      }
    }
  }
  if (!items.length && !review && !done.length) return null;
  return (
    <section className='space-y-3 rounded-lg border p-4' aria-label='Revisione modifiche'>
      <h2 className='font-semibold'>Modifiche preparate</h2>
      {!review && !!items.length && (
        <Button
          variant='editorial'
          onClick={() => {
            setReview(items);
            setDone([]);
          }}
        >
          Rivedi modifiche ({items.length})
        </Button>
      )}
      {review && (
        <>
          <ul className='space-y-3'>
            {review.map(({ field, change, send }) => (
              <li key={field.key} className='rounded border p-3'>
                <strong>{field.label}</strong>
                <p>{send ? 'Admin e Shopify' : 'Solo Admin'}</p>
                <p>Valore attuale</p>
                <ValueDisplay
                  richText={field.editorType === 'richtext'}
                  value={send ? field.shopifyLiveValue : field.value}
                  label={field.label}
                />
                <p>Nuovo valore</p>
                <ValueDisplay
                  richText={field.editorType === 'richtext'}
                  value={change.value}
                  label={field.label}
                />
              </li>
            ))}
          </ul>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              disabled={busy}
              onClick={() => {
                setReview(undefined);
                setError('');
              }}
            >
              Chiudi riepilogo
            </Button>
            <Button
              variant='shopify'
              disabled={busy || !!error ||
                !review.every((i) =>
                  items.some((v) => v.field.key === i.field.key && v.change.revision === i.change.revision)
                )}
              onClick={() => void submit()}
            >
              {review.some((i) => i.send) ? 'Salva e aggiorna Shopify' : 'Conferma salvataggio interno'}
            </Button>
          </div>
        </>
      )}
      {error && <AiErrorNotice>{error}</AiErrorNotice>}
      {!!done.length && <ul role='status'>{done.map((s) => <li key={s}>{s}</li>)}</ul>}
    </section>
  );
}
