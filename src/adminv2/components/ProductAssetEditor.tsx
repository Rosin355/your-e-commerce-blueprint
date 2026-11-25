import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { callAdminApi, callCatalogCommand } from "../lib/adminApi";
import CatalogImages from "./CatalogImages";

type RemoteImage = { id: string; url: string; alt: string; variant: boolean };
type Data = {
  updatedAt: string;
  images?: RemoteImage[];
  formats?: { id: string; name: string }[];
  variants?: { sku: string; format: string; price: string }[];
};
type Pending = {
  expectedUpdatedAt: string;
  before: string;
  after: string;
  command: Record<string, string>;
};
type AssetProps = { productId: string; kind: "gallery" | "formats" };
export default function ProductAssetEditor(props: AssetProps) {
  const { user } = useAuth();
  return user
    ? (
      <AssetForm
        key={user.id + props.productId + props.kind}
        {...props}
        actor={user.id}
      />
    )
    : null;
}
function AssetForm({ productId, kind, actor }: AssetProps & { actor: string }) {
  const gallery = kind === "gallery";
  const storageKey = "og-admin:review:" + actor + ":" + productId + ":" + kind;
  const [open, setOpen] = useState(false);
  const [old, setOld] = useState("");
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<{ url: string; alt: string }[]>([]);
  const [pending, setPending] = useState<Pending | null>(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      const keys = gallery
        ? ["action", "change", "imageId", "libraryId"]
        : ["action", "optionValueId", "name"];
      return v && typeof v.expectedUpdatedAt === "string" &&
          typeof v.before === "string" && typeof v.after === "string" &&
          v.command?.action ===
            (gallery ? "set_catalog_image" : "rename_catalog_format") &&
          Object.keys(v.command).every((k) =>
            keys.includes(k) && typeof v.command[k] === "string"
          )
        ? v
        : null;
    } catch {
      return null;
    }
  });
  const action = gallery ? "get_product_gallery" : "get_product_formats";
  const query = useQuery({
    queryKey: ["admin", action, actor, productId],
    enabled: open,
    retry: false,
    queryFn: () => callAdminApi<Data>({ action, productId }),
  });
  const library = useQuery({
    queryKey: ["admin", "own-media", actor],
    enabled: open && gallery,
    retry: false,
    queryFn: () =>
      callAdminApi<{ media: { id: string; url: string; alt: string }[] }>({
        action: "list_catalog_media",
      }),
  });
  function store(value: Pending | null) {
    setPending(value);
    try {
      if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
      else sessionStorage.removeItem(storageKey);
    } catch { /* revisione disponibile nella scheda aperta */ }
  }
  const send = useMutation({
    mutationFn: (review: Pending) =>
      callCatalogCommand({
        productId,
        ...review.command,
        expectedUpdatedAt: review.expectedUpdatedAt,
      }),
    onSuccess: () => {
      store(null);
      setSelected([]);
      setName("");
      setOld("");
    },
    onSettled: () => query.refetch(),
  });
  const data = query.data;
  const file = library.data?.media.find((m) =>
    m.url === selected[0]?.url && m.alt === selected[0]?.alt
  );
  const existing = data?.images?.find((m) => m.id === old);
  const format = data?.formats?.find((v) => v.id === old);
  const remove = !!existing && !selected.length;
  const ready = gallery
    ? (!selected.length || !!file) && (!!existing || !!file) &&
      (!remove || (data?.images?.length ?? 0) > 1)
    : !!format && !!name.trim() &&
      !data?.formats?.some((v) =>
        v.name.toLowerCase() === name.trim().toLowerCase()
      );
  function review() {
    if (!data || !ready) return;
    const command: Record<string, string> = gallery
      ? {
        action: "set_catalog_image",
        change: existing ? file ? "replace" : "remove" : "add",
      }
      : {
        action: "rename_catalog_format",
        optionValueId: old,
        name: name.trim(),
      };
    if (gallery && existing) command.imageId = existing.id;
    if (gallery && file) command.libraryId = file.id;
    store({
      expectedUpdatedAt: data.updatedAt,
      command,
      before: gallery
        ? existing?.alt ||
          (existing
            ? "Foto senza testo alternativo"
            : "Nessuna foto selezionata")
        : format!.name,
      after: gallery
        ? file?.alt ?? "Rimuovi il collegamento della foto da questo prodotto"
        : name.trim(),
    });
    send.reset();
  }
  return (
    <details
      className="rounded-lg border p-4"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer font-semibold">
        {gallery ? "Immagini e testi alternativi" : "Modifica dei formati"}
      </summary>
      {open && (
        <div className="mt-3 space-y-3">
          {query.isPending && (
            <p role="status">Lettura del prodotto da Shopify…</p>
          )}
          {query.isError && (
            <p role="alert" className="text-destructive">
              {query.error.message}
            </p>
          )}
          {data && !pending && (
            <>
              {gallery
                ? (
                  <>
                    <label className="block">
                      Foto attuale<select
                        className="block w-full rounded border p-2"
                        value={old}
                        onChange={(e) => setOld(e.target.value)}
                      >
                        <option value="">Aggiungi una foto</option>
                        {data.images?.map((m) => (
                          <option key={m.id} value={m.id} disabled={m.variant}>
                            {m.alt || "Foto senza ALT"}
                            {m.variant ? " · assegnata a un formato" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    {existing && (
                      <img
                        className="h-24 w-auto"
                        alt={existing.alt}
                        src={existing.url}
                      />
                    )}
                    <p>
                      Per correggere il testo alternativo, scegli la foto
                      attuale e carica una copia con il nuovo testo. La copia
                      viene aggiunta in fondo alla galleria. Il file originale
                      conserva il proprio ALT negli altri prodotti.
                    </p>
                    <CatalogImages
                      images={selected}
                      onChange={(items) => setSelected(items.slice(-1))}
                      ordinary
                      enabled
                      sku=""
                      onUploadingChange={setUploading}
                      separateAlt
                    />
                    {library.isError && (
                      <p role="alert" className="text-destructive">
                        Libreria non disponibile.
                      </p>
                    )}
                  </>
                )
                : (
                  <>
                    <ul>
                      {data.variants?.map((v) => (
                        <li key={v.sku}>{v.format} · {v.price} €</li>
                      ))}
                    </ul>
                    {data.formats?.length
                      ? (
                        <>
                          <label className="block">
                            Formato attuale<select
                              className="block w-full rounded border p-2"
                              value={old}
                              onChange={(e) => setOld(e.target.value)}
                            >
                              <option value="">Scegli un formato</option>
                              {data.formats.map((o) => (
                                <option value={o.id} key={o.id}>
                                  {o.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Nuovo nome del formato<Input
                              value={name}
                              maxLength={100}
                              onChange={(e) => setName(e.target.value)}
                            />
                          </label>
                        </>
                      )
                      : (
                        <p>
                          Questa famiglia richiede la gestione delle opzioni
                          multiple nel pannello Shopify.
                        </p>
                      )}
                  </>
                )}
              <Button
                variant="editorial"
                disabled={!ready || uploading}
                onClick={review}
              >
                Salva e confronta la modifica
              </Button>
            </>
          )}
          {pending && (
            <section aria-label="Confronto con Shopify" className="space-y-2">
              <p>Attuale su Shopify · {pending.before}</p>
              <p>Proposta salvata in questa sessione · {pending.after}</p>
              {data && pending.expectedUpdatedAt !== data.updatedAt && (
                <p role="alert" className="text-amber-900">
                  Prodotto cambiato. Riapri il confronto sui dati aggiornati.
                </p>
              )}
              <Button
                variant="outline"
                disabled={send.isPending}
                onClick={() => {
                  store(null);
                  void query.refetch();
                }}
              >
                Riapri la modifica
              </Button>{" "}
              <Button
                variant="shopify"
                disabled={!data ||
                  data.updatedAt !== pending.expectedUpdatedAt ||
                  send.isPending}
                onClick={() => {
                  send.mutate(pending);
                }}
              >
                Invia aggiornamenti a Shopify
              </Button>
            </section>
          )}
          {send.isPending && <p role="status">Invio e rilettura da Shopify…</p>}
          {send.isSuccess && (
            <p role="status">
              Aggiornato su Shopify. Valori riletti e verificati.
            </p>
          )}
          {send.isError && (
            <p role="alert" className="text-destructive">
              {send.error.message}
            </p>
          )}
        </div>
      )}
    </details>
  );
}
