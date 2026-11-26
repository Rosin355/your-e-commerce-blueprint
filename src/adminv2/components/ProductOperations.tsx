import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { callAdminApi, callCatalogCommand } from '../lib/adminApi';
import { useAuth } from '@/hooks/useAuth';
import DraftVerificationError from './DraftVerificationError';
import DraftSummaryView from './DraftSummaryView';
import type { DraftSummary } from '../../../supabase/functions/_shared/admin-draft-view';
import type { ProductDetail } from '../lib/adminApi';
import { siteState } from '../lib/labels';
import { OPERATION_LABELS } from '../lib/operationalApi';
interface BotanicalReview { hash: string; entries: [string, unknown][]; completed: boolean; canConfirm: boolean }

function HistoricalBotany({ review, pending, confirm }: { review: BotanicalReview; pending: boolean; confirm: (keys: string[]) => void }) {
  const [checked, setChecked] = useState<string[]>([]);
  if (review.completed) return <p role="status">Conferma botanica registrata su questa bozza interna.</p>;
  return <fieldset disabled={!review.canConfirm || pending} className="space-y-2">
    <legend>Conferma i valori salvati prima dell’invio</legend>
    {review.entries.map(([key, value]) => <label key={key} className="flex gap-2">
      <input type="checkbox" checked={checked.includes(key)} onChange={e => {
        const selected = e.target.checked;
        setChecked(previous => selected ? [...previous, key] : previous.filter(item => item !== key));
      }} />
      {key.replace(/_/g, ' ')} · {typeof value === 'string' ? value : JSON.stringify(value)}
    </label>)}
    <Button disabled={checked.length !== review.entries.length} onClick={() => confirm(checked)}>Conferma sulla bozza interna</Button>
  </fieldset>;
}

export default function ProductOperations({ productId, live }: { productId: string; live: ProductDetail['shopifyLive'] }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'operations', productId, user?.id],
    queryFn: () =>
      callAdminApi<
        {
          canManageDraft: boolean;
          ordinaryCatalog?: boolean;
          canSendDraft: boolean;
          canRecover: boolean;
          approvedOperationId: string | null;
          operations: {
            id: string;
            state: string;
            canOperate?: boolean;
            botanicalReview?: BotanicalReview;
            summary?: DraftSummary;
            created_at: string;
            admin_operation_events: { state: string; created_at: string }[];
          }[];
        }
      >({ action: 'get_product_operations', productId }),
    enabled: Boolean(user),
    retry: false,
  });
  const command = useMutation({
    mutationFn: (input: { action: string; operationId: string; expectedHash?: string; botanicalConfirmedKeys?: string[] }) =>
      callCatalogCommand({ ...input }),
    onSettled: () => Promise.all([
      query.refetch(),
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId, user?.id] }),
    ]),
  });
  const state = <p className='font-medium' role='status'>{siteState(live, query.data?.operations[0]?.state, live.mapped)}</p>;
  if (query.isError) {
    return (
      <p className='text-sm' role='status'>
        {siteState(live)}. Storico e riepilogo della bozza non disponibili in questo ambiente.
      </p>
    );
  }
  if (!query.data?.operations.length) return state;
  const canRecover = query.data.canRecover;
  return (
    <section className='space-y-3 rounded-lg border p-4'>
      {state}
      {query.data.operations.map((op) => (
        <div key={op.id} className='space-y-2'>
          <p className='text-sm'>Ultima operazione registrata · {OPERATION_LABELS[op.state] ?? 'Stato da verificare'}</p>
          <p className='text-sm'>{new Date(op.created_at).toLocaleString('it-IT')}</p>
          {op.summary ? <section className='space-y-2'>
            <h2 className='font-semibold'>Riepilogo della bozza interna salvata</h2>
            <p className='text-sm'>Dati registrati alla creazione. Le modifiche successive sono nei campi editoriali sotto. Le categorie mostrano la selezione salvata. I nomi sono quelli verificabili oggi nel catalogo o nella collezione collegata.</p>
            <DraftSummaryView saved draft={op.summary} />
          </section> : op.state === 'LOCAL_DRAFT' && <p role='status'>Riepilogo della bozza non disponibile per questa versione o account.</p>}

            {op.state === 'VERIFIED_DRAFT' && <p>Creazione e collegamento verificati. Per lo stato dei singoli campi consulta il confronto con Shopify.</p>}
            {op.botanicalReview && <HistoricalBotany key={op.id + op.botanicalReview.hash} review={op.botanicalReview} pending={command.isPending}
              confirm={keys => command.mutate({action:'save_new_product', operationId:op.id, expectedHash:op.botanicalReview!.hash, botanicalConfirmedKeys:keys})} />}
            {op.canOperate !== false && (!op.botanicalReview || op.botanicalReview.completed) && query.data.canManageDraft && query.data.canSendDraft && (query.data.ordinaryCatalog || query.data.approvedOperationId === op.id) && op.state === 'LOCAL_DRAFT' && (
              <div className='space-y-2'>
                <Button variant="shopify"
                  disabled={command.isPending || !query.data.canSendDraft || (!query.data.ordinaryCatalog && query.data.approvedOperationId !== op.id)}
                  onClick={() => {
                    if (window.confirm('Creare una bozza Shopify senza pubblicarla?')) {
                      command.mutate({ action: 'create_shopify_draft', operationId: op.id });
                    }
                  }}
                >
                  Crea bozza Shopify
                </Button>
              </div>
            )}
            {op.canOperate !== false && query.data.canManageDraft && canRecover && (query.data.ordinaryCatalog || query.data.approvedOperationId === op.id) && ['IN_FLIGHT', 'NEEDS_RECONCILIATION'].includes(op.state) && (
              <div className='space-y-2'>
                <Button variant="shopify"
                  disabled={command.isPending || !canRecover || (!query.data.ordinaryCatalog && query.data.approvedOperationId !== op.id)}
                  onClick={() =>
                    command.mutate({ action: 'recover_shopify_draft', operationId: op.id })}
                >
                  Recupera stato senza ricreare
                </Button>
              </div>
            )}
          <details><summary className='cursor-pointer'>Storico delle sincronizzazioni</summary>
            <ul className='text-sm'>
              {op.admin_operation_events.map((e, i) => (
                <li key={i}>
                  {OPERATION_LABELS[e.state] ?? 'Verifica richiesta'} —{' '}
                  {new Date(e.created_at).toLocaleString('it-IT')}
                </li>
              ))}
            </ul>
          </details>
        </div>
      ))}
      {command.isError && <DraftVerificationError error={command.error} />}
      <p className='text-sm'>
        Pubblicazione e inventario richiedono una verifica operativa separata.
      </p>
    </section>
  );
}
