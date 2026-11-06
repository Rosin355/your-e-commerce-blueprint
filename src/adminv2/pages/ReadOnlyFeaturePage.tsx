import { Link } from 'react-router-dom';
import { READ_ONLY_RELEASE_NOTICE } from '../lib/readOnlyRelease';

export default function ReadOnlyFeaturePage({ title }: { title: string }) {
  return (
    <section className='space-y-4 rounded-lg border bg-card p-5'>
      <h1 className='text-xl font-semibold'>{title}</h1>
      <p role='status'>{READ_ONLY_RELEASE_NOTICE}</p>
      <p>Questa funzione richiede un’attivazione operativa separata. Nessun dato viene modificato.</p>
      <Link className='underline focus-visible:ring-2 focus-visible:ring-ring' to='/admin/products'>Consulta i prodotti</Link>
    </section>
  );
}
