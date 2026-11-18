import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import DOMPurify from 'dompurify';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { sanitizeEditorialHtml } from '../../../supabase/functions/_shared/vendor/editorial-html.mjs';

export default function RichTextEditor({ value, onChange, disabled = false, label = 'Descrizione' }: { value: string; onChange: (value: string) => void; disabled?: boolean; label?: string }) {
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const originalValue = useRef(value).current;
  const clean = useRef(DOMPurify.sanitize(sanitizeEditorialHtml(originalValue))).current;
  const editor = useEditor({ extensions: [StarterKit.configure({ link: { openOnClick: false, HTMLAttributes: { rel: null, target: null } }, codeBlock: false, code: false })], content: clean, editable: !disabled && !unsupported,
    editorProps: { attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': label, class: 'prose prose-sm max-w-none min-h-40 rounded border p-3 focus:outline-none focus:ring-2 focus:ring-ring' } },
    onCreate: ({ editor }) => {
      // Unsupported structures are preserved in the caller's draft, never silently flattened.
      const original = document.createElement('div'); original.innerHTML = clean;
      const normalized = (s: string) => s.replace(/<b>/g,'<strong>').replace(/<\/b>/g,'</strong>').replace(/<i>/g,'<em>').replace(/<\/i>/g,'</em>').replace(/\s+/g,' ').replace(/> </g,'><').replace(/<li><p>/g,'<li>').replace(/<\/p><\/li>/g,'</li>').trim();
      const changed = (/<[a-z!/]/i.test(originalValue) && originalValue !== clean) || (/<[a-z!/]/i.test(originalValue) && normalized(original.innerHTML) !== normalized(editor.getHTML()));
      if (changed && originalValue.trim()) { setUnsupported(true); }
    },
    onUpdate: ({ editor }) => onChange(DOMPurify.sanitize(sanitizeEditorialHtml(editor.getHTML()))),
  });
  useEffect(() => { editor?.setEditable(!disabled && !unsupported, false); }, [editor, disabled, unsupported]);
  if (!editor) return <p role="status">Caricamento editor…</p>;
  const locked = disabled || unsupported;
  const action = (text: string, fn: () => void) => <Button type="button" size="sm" variant="outline" disabled={locked} onClick={fn}>{text}</Button>;
  return <div className="space-y-3">
    {unsupported && <p role="alert">Il contenuto contiene formattazioni non supportate. L’originale è conservato: annulla e richiedi assistenza per modificarlo senza perdita.</p>}
    <div role="toolbar" aria-label={`Formattazione ${label}`} className="flex flex-wrap gap-2">
      {action('Paragrafo', () => editor.chain().focus().setParagraph().run())}
      {action('Grassetto', () => editor.chain().focus().toggleBold().run())}
      {action('Corsivo', () => editor.chain().focus().toggleItalic().run())}
      {action('Elenco puntato', () => editor.chain().focus().toggleBulletList().run())}
      {action('Elenco numerato', () => editor.chain().focus().toggleOrderedList().run())}
      {action('Annulla modifica', () => editor.chain().focus().undo().run())}
      {action('Ripristina', () => editor.chain().focus().redo().run())}
    </div>
    <EditorContent editor={editor} />
    <label className="block text-sm">Indirizzo del link selezionato<input className="mt-1 w-full rounded border p-2" value={link} disabled={locked} onChange={e => setLink(e.target.value)} placeholder="https://…" /></label>
    {action('Inserisci link', () => { if (!/^(https?:\/\/|mailto:|\/[^/]|#)/i.test(link)) { setLinkError(true); return; } setLinkError(false); editor.chain().focus().extendMarkRange('link').setLink({ href: link }).run(); })}
    {action('Rimuovi link', () => editor.chain().focus().unsetLink().run())}
    {linkError && <p role="alert">Usa un indirizzo https, un percorso del sito o un link email valido.</p>}
  </div>;
}
