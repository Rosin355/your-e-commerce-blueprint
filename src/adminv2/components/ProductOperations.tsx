import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { callAdminApi } from '../lib/adminApi';
import { OPERATION_LABELS } from '../lib/operationalApi';
import { useAdminContext } from '../hooks/useAdminData';
export default function ProductOperations({ productId }: { productId: string }) {
  const context = useAdminContext();
  const query = useQuery({
    queryKey: ['admin', 'operations', productId],
    queryFn: () =>
      callAdminApi<
        {
          canSendDraft: boolean;
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
      callAdminApi({ ...input, confirm: true }),
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
  const canRecover = context.data?.roles.some((r) => r === 'admin' || r === 'tech_admin');
  return (
    <section className='space-y-3 rounded-lg border p-4'>
      <h2 className='font-semibold'>Creazione e sincronizzazione</h2>
      {query.data.operations.map((op) => (
        <div key={op.id} className='space-y-2'>
          <p>{OPERATION_LABELS[op.state] ?? 'Stato da verificare'}</p>
          <p className='text-sm'>{new Date(op.created_at).toLocaleString('it-IT')}</p>
          {op.state === 'LOCAL_DRAFT' && query.data.canSendDraft &&
            query.data.approvedOperationId === op.id && (
            <Button
              disabled={command.isPending}
              onClick={() => {
                if (window.confirm('Creare una bozza Shopify senza pubblicarla?')) {
                  command.mutate({ action: 'create_shopify_draft', operationId: op.id });
                }
              }}
            >
              Crea bozza Shopify
            </Button>
          )}
          {canRecover && ['IN_FLIGHT', 'NEEDS_RECONCILIATION'].includes(op.state) && (
            <Button
              disabled={command.isPending}
              onClick={() =>
                command.mutate({ action: 'recover_shopify_draft', operationId: op.id })}
            >
              Recupera stato senza ricreare
            </Button>
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
