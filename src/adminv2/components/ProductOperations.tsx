import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { callAdminApi, callCatalogCommand } from '../lib/adminApi';
import { useAuth } from '@/hooks/useAuth';
import DraftSummaryView from './DraftSummaryView';
import type { DraftSummary } from '../../../supabase/functions/_shared/admin-draft-view';
import type { ProductDetail } from '../lib/adminApi';
import { siteState } from '../lib/labels';
import { OPERATION_LABELS } from '../lib/operationalApi';
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
    mutationFn: (input: { action: string; operationId: string }) =>
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
          <details>
            <summary className='cursor-pointer'>Operazioni Shopify e storico</summary>
            {query.data.canManageDraft && op.state === 'LOCAL_DRAFT' && (
              <div className='space-y-2'>
                <Button
                  disabled={command.isPending || !query.data.canSendDraft || (!query.data.ordinaryCatalog && query.data.approvedOperationId !== op.id)}
                  onClick={() => {
                    if (window.confirm('Creare una bozza Shopify senza pubblicarla?')) {
                      command.mutate({ action: 'create_shopify_draft', operationId: op.id });
                    }
                  }}
                >
                  Crea bozza Shopify
                </Button>
                {(!query.data.canSendDraft || (!query.data.ordinaryCatalog && query.data.approvedOperationId !== op.id)) && (
                  <p className='text-sm text-muted-foreground'>
                    Invio non disponibile: richiede abilitazione operativa e approvazione di questa bozza.
                  </p>
                )}
              </div>
            )}
            {query.data.canManageDraft && ['IN_FLIGHT', 'NEEDS_RECONCILIATION'].includes(op.state) && (
              <div className='space-y-2'>
                <Button
                  disabled={command.isPending || !canRecover || (!query.data.ordinaryCatalog && query.data.approvedOperationId !== op.id)}
                  onClick={() =>
                    command.mutate({ action: 'recover_shopify_draft', operationId: op.id })}
                >
                  Recupera stato senza ricreare
                </Button>
                {!canRecover && (
                  <p className='text-sm text-muted-foreground'>
                    Recupero non disponibile: richiede scritture abilitate e un amministratore autorizzato.
                  </p>
                )}
              </div>
            )}
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
      {command.isError && <p role='alert'>{command.error.message}</p>}
      <p className='text-sm'>
        Pubblicazione e inventario richiedono una verifica operativa separata.
      </p>
    </section>
  );
}
