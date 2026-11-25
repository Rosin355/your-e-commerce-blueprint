import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { callAdminApi } from '../lib/adminApi';
type Image = { url: string; alt: string };
type Media = { id: string; state: string; url: string | null; alt: string };
// UUIDv5, namespace URL. The media journal scopes the key to the signed-in actor
// and independently verifies the submitted bytes, MIME type and alternative text.
async function mediaRequestKey(base64: string, mimeType: string, altKey = '') {
  const namespace = Uint8Array.from([0x6b,0xa7,0xb8,0x11,0x9d,0xad,0x11,0xd1,0x80,0xb4,0x00,0xc0,0x4f,0xd4,0x30,0xc8]);
  const name = new TextEncoder().encode(`https://onlinegarden.it/admin/media/${mimeType}/${base64}${altKey}`);
  const buffer = new Uint8Array(namespace.length + name.length);
  buffer.set(namespace);
  buffer.set(name, namespace.length);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', buffer));
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = Array.from(digest.slice(0, 16), n => n.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

export default function CatalogImages({ images, onChange, ordinary, enabled, sku, requestKey, onUploadingChange, separateAlt = false, errors = {} }: {
  separateAlt?: boolean; errors?: Record<string,string>; images: Image[]; onChange: (images: Image[]) => void; ordinary: boolean; enabled: boolean; sku: string; requestKey?: string | null; onUploadingChange: (busy: boolean) => void;
}) {
  const [file, setFile] = useState<File>();
  const [alt, setAlt] = useState('');
  const { user } = useAuth();
  const library = useQuery({ queryKey: ['admin', 'own-media', user?.id], enabled: ordinary && enabled, retry: false,
    queryFn: () => callAdminApi<{ media: Media[] }>({ action: 'list_catalog_media' }) });
  const add = (image: Image) => { if (!images.some(i => i.url === image.url)) onChange([...images, image]); };
  const upload = useMutation({ onMutate: () => onUploadingChange(true), onSettled: () => onUploadingChange(false), mutationFn: async () => {
    if (!file || !['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024 || !alt.trim()) {
      throw new Error('Scegli un’immagine JPEG o PNG fino a 5 MB e inserisci il testo alternativo.');
    }
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onerror = () => reject(new Error('File non leggibile.'));
      reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(file);
    });
    const scope = { requestKey, sku };
    let result = await callAdminApi<{ media: Media }>({ action: 'upload_catalog_image', ...scope, idempotencyKey: await mediaRequestKey(base64, file.type, separateAlt ? '/alt/'+alt.trim() : ''), base64, mimeType: file.type, alt, confirm: true });
    for (let attempt = 0; result.media.state === 'PROCESSING' && attempt < 30; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      result = await callAdminApi<{ media: Media }>({ action: 'get_catalog_media', ...scope, mediaId: result.media.id });
    }
    if (result.media.state !== 'READY' || !result.media.url) throw new Error('Immagine in verifica: riprova con lo stesso file, senza creare un nuovo caricamento.');
    return { url: result.media.url, alt: result.media.alt };
  }, onSuccess: image => { add(image); if (ordinary && enabled) void library.refetch(); } });
  return <section className='space-y-3'>
    <h2 className='font-semibold'>Fotografie (facoltative)</h2>
    <p className='text-sm'>Carica dal computer un file JPEG o PNG, massimo 5 MB. L’immagine viene aggiunta soltanto quando Shopify la rende disponibile.</p>
    <Input aria-label='Scegli immagine dal computer' type='file' accept='image/jpeg,image/png' disabled={upload.isPending || !enabled}
      onChange={e => { setFile(e.target.files?.[0]); upload.reset(); }} />
    <label className='block'>Testo alternativo dell’immagine<Input value={alt} disabled={upload.isPending} onChange={e => { setAlt(e.target.value); upload.reset(); }} /></label>
    <Button type='button' disabled={!enabled || !file || !alt.trim() || upload.isPending || upload.isSuccess || images.length >= 20} onClick={() => upload.mutate()}>
      {upload.isPending ? 'Caricamento e verifica…' : 'Carica immagine'}
    </Button>
    {!enabled && <p role='status'>Il tuo account non è ancora abilitato al caricamento.</p>}
    <p className='text-sm'>Rimuovere la foto dalla bozza conserva il file nella libreria.</p>
    {upload.isSuccess && <p role='status'>File pronto nella libreria.</p>}
    {upload.isError && <p role='alert'>{upload.error.message} Controlla le immagini già caricate prima di riprovare.</p>}
    <div className='grid gap-3 sm:grid-cols-3'>{images.map((image,i) => <div key={image.url} className='rounded-lg border p-2'>
      <img src={image.url} alt={image.alt} className='h-32 w-full object-contain' /><label className="block">Testo alternativo nella bozza (obbligatorio)
        <Input id={'image-alt-'+i} required aria-invalid={Boolean(errors['image-alt-'+i])} aria-describedby={errors['image-alt-'+i] ? 'image-alt-error-'+i : undefined} disabled={upload.isPending} value={image.alt} maxLength={250} readOnly={separateAlt} onChange={e => onChange(images.map(i => i.url === image.url ? { ...i, alt: e.target.value } : i))} />
      </label>{errors['image-alt-'+i] && <p id={'image-alt-error-'+i} className="text-sm text-destructive">{errors['image-alt-'+i]}</p>}<p className="text-xs">Per l’invio a Shopify usa il testo alternativo registrato nella libreria.</p>
      <Button type='button' variant='outline' disabled={upload.isPending} onClick={() => onChange(images.filter(i => i.url !== image.url))}>Rimuovi dalla bozza</Button>
    </div>)}</div>
    {ordinary && enabled && Boolean(library.data?.media.length) && <details><summary>Scegli fra le tue immagini già caricate</summary>
      <div className='grid gap-3 sm:grid-cols-3'>{library.data?.media.filter(m => m.url && !images.some(i => i.url === m.url)).map(m => <Button type='button' variant='outline' className='h-auto flex-col' key={m.id} onClick={() => add({ url: m.url!, alt: m.alt })} disabled={upload.isPending || images.length >= 20}>
        <img src={m.url!} alt={m.alt} className='h-24 w-full object-contain' />{m.alt}
      </Button>)}</div></details>}
  </section>;
}
