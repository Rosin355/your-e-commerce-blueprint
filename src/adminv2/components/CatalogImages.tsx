import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { callAdminApi } from '../lib/adminApi';
type Image = { url: string; alt: string };
type Media = { id: string; state: string; url: string | null; alt: string };
export default function CatalogImages({ images, onChange, ordinary, enabled, sku, requestKey }: {
  images: Image[]; onChange: (images: Image[]) => void; ordinary: boolean; enabled: boolean; sku: string; requestKey?: string | null;
}) {
  const [file, setFile] = useState<File>();
  const [alt, setAlt] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const library = useQuery({ queryKey: ['admin', 'own-media'], enabled: ordinary, retry: false,
    queryFn: () => callAdminApi<{ media: Media[] }>({ action: 'list_catalog_media' }) });
  const add = (image: Image) => { if (!images.some(i => i.url === image.url)) onChange([...images, image]); };
  const upload = useMutation({ mutationFn: async () => {
    if (!file || !['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024 || !alt.trim()) {
      throw new Error('Scegli un’immagine JPEG o PNG fino a 5 MB e inserisci il testo alternativo.');
    }
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onerror = () => reject(new Error('File non leggibile.'));
      reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(file);
    });
    const scope = { requestKey, sku };
    let result = await callAdminApi<{ media: Media }>({ action: 'upload_catalog_image', ...scope, idempotencyKey: key, base64, mimeType: file.type, alt, confirm: true });
    for (let attempt = 0; result.media.state === 'PROCESSING' && attempt < 30; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      result = await callAdminApi<{ media: Media }>({ action: 'get_catalog_media', ...scope, mediaId: result.media.id });
    }
    if (result.media.state !== 'READY' || !result.media.url) throw new Error('Immagine in verifica: riprova con lo stesso file, senza creare un nuovo caricamento.');
    return { url: result.media.url, alt: result.media.alt };
  }, onSuccess: image => { add(image); void library.refetch(); } });
  return <section className='space-y-3'>
    <h2 className='font-semibold'>Immagini</h2>
    <p className='text-sm'>Carica dal computer un file JPEG o PNG, massimo 5 MB. L’immagine viene aggiunta soltanto quando Shopify la rende disponibile.</p>
    <Input aria-label='Scegli immagine dal computer' type='file' accept='image/jpeg,image/png' disabled={upload.isPending || !enabled}
      onChange={e => { setFile(e.target.files?.[0]); setKey(crypto.randomUUID()); upload.reset(); }} />
    <label className='block'>Testo alternativo dell’immagine<Input value={alt} disabled={upload.isPending} onChange={e => { setAlt(e.target.value); setKey(crypto.randomUUID()); upload.reset(); }} /></label>
    <Button type='button' disabled={!enabled || !file || !alt.trim() || upload.isPending || images.length >= 20} onClick={() => upload.mutate()}>
      {upload.isPending ? 'Caricamento e verifica…' : 'Carica immagine'}
    </Button>
    {!enabled && <p role='status'>Il tuo account non è ancora abilitato al caricamento.</p>}
    {upload.isError && <p role='alert'>{upload.error.message}</p>}
    <div className='grid gap-3 sm:grid-cols-3'>{images.map(image => <div key={image.url} className='rounded-lg border p-2'>
      <img src={image.url} alt={image.alt} className='h-32 w-full object-contain' /><p>{image.alt}</p>
      <Button type='button' variant='outline' onClick={() => onChange(images.filter(i => i.url !== image.url))}>Rimuovi dalla bozza</Button>
    </div>)}</div>
    {ordinary && Boolean(library.data?.media.length) && <details><summary>Scegli fra le tue immagini già caricate</summary>
      <div className='grid gap-3 sm:grid-cols-3'>{library.data?.media.filter(m => m.url && !images.some(i => i.url === m.url)).map(m => <Button type='button' variant='outline' className='h-auto flex-col' key={m.id} onClick={() => add({ url: m.url!, alt: m.alt })} disabled={images.length >= 20}>
        <img src={m.url!} alt={m.alt} className='h-24 w-full object-contain' />{m.alt}
      </Button>)}</div></details>}
  </section>;
}
