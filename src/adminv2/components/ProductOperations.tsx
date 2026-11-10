import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { callAdminApi, callCatalogCommand } from '../lib/adminApi';
import { OPERATION_LABELS } from '../lib/operationalApi';
export default function ProductOperations({ productId }: { productId: string }) {
  const query = useQuery({
    queryKey: ['admin', 'operations', productId],
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
            created_at: string;
            admin_operation_events: { state: string; created_at: string }[];
          }[];
        }
      >({ action: 'get_product_operations', productId }),
    retry: false,
  });
  const command = useMutation({
    mutationFn: (input: { action: string; operationId: string }) =>
      callCatalogCommand({ ...input }),
    onSettled: () => query.refetch(),
  });
  if (query.isError) {
    return (
      <p className='text-sm' role='status'>
        Storico nuove bozze non disponibile in questo ambiente.
      </p>
    );
  }
  if (!query.data?.operations.length) return null;
  const canRecover = query.data.canRecover;
  return (
    <section className='space-y-3 rounded-lg border p-4'>
      <h2 className='font-semibold'>Creazione e sincronizzazione</h2>
      {query.data.operations.map((op) => (
        <div key={op.id} className='space-y-2'>
          <p>{OPERATION_LABELS[op.state] ?? 'Stato da verificare'}</p>
          <p className='text-sm'>{new Date(op.created_at).toLocaleString('it-IT')}</p>
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
        </div>
      ))}
      {command.isError && <p role='alert'>{command.error.message}</p>}
      <p className='text-sm'>
        Pubblicazione e inventario richiedono una verifica operativa separata.
      </p>
    </section>
  );
}
