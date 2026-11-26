import { Link } from 'react-router-dom';
import { AdminApiError } from '../lib/AdminApiError';

const labels: Record<string, string> = {
  VERIFIED: 'verificato su Shopify',
  VERIFIED_ADMIN: 'verificato nella bozza interna',
  NOT_VERIFIED: 'valore assente o diverso',
  REJECTED: 'rifiutato da Shopify',
  UNREAD: 'rilettura incompleta',
};

export default function DraftVerificationError({ error }: { error: Error }) {
  const details = error instanceof AdminApiError ? error.details : undefined;
  const rows = details?.metafieldVerification ?? details?.adminFieldVerification;
  const productId = details?.productId;
  return <div role="alert">
    <p>{error.message}</p>
    {typeof productId === 'string' && /^[a-f0-9-]{36}$/i.test(productId) &&
      <Link to={'/admin/products/' + productId}>Riapri la bozza già salvata</Link>}
    {Array.isArray(rows) && <ul>{rows.map(row =>
      row && typeof row.fieldKey === 'string' && Object.prototype.hasOwnProperty.call(labels, row.state)
        ? <li key={row.fieldKey}>{row.fieldKey.replace(/_/g, ' ')} · {labels[row.state]}</li>
        : null)}</ul>}
  </div>;
}
