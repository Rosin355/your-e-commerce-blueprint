import DOMPurify from 'dompurify';
import { sanitizeEditorialHtml } from '../../../supabase/functions/_shared/vendor/editorial-html.mjs';

export default function EditorialText({ value }: { value: string }) {
  if (!/<[a-z!/]/i.test(value)) return <p className="whitespace-pre-wrap">{value}</p>;
  const html = DOMPurify.sanitize(sanitizeEditorialHtml(value));
  return <div className="prose prose-sm max-w-none break-words" dangerouslySetInnerHTML={{ __html: html }} />;
}
