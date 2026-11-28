import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useArchiveAccess } from "../hooks/useAdminData";

type Row = { id: string; name: string; purchases: number; email?: string };
type Listing = {
  total: number;
  accounts: number;
  buyers: number;
  purchases: number;
  rows: Row[];
};
type Detail = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  purchases: number;
};
type Selection = { query: string; filter: string; page: number };

function download(rows: Row[]) {
  const lines = [
    ["ID Woo", "Nome", "Email", "Conteggio ordini WooCommerce"],
    ...rows.map((r) => [r.id, r.name, r.email ?? "", String(r.purchases)]),
  ];
  const csv = lines.map((line) =>
    line.map((value) => {
      const safe = /^[\s\uFEFF]*[=+@-]|^[\t\r\n]/u.test(value)
        ? "'" + value
        : value;
      return '"' + safe.replace(/"/g, '""') + '"';
    }).join(",")
  ).join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "archivio-woocommerce.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Archive() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selection, select] = useState<Selection>({
    query: "",
    filter: "all",
    page: 0,
  });
  const [result, setResult] = useState<Listing | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const current = useRef<AbortController | null>(null);
  const operation = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    current.current = controller;
    setResult(null);
    setDetail(null);
    setError("");
    setBusy(false);
    const run = async () => {
      const { data, error } = await supabase.rpc("woo_archive_read", {
        p_action: "list",
        p_query: selection.query,
        p_filter: selection.filter,
        p_page: selection.page,
      }).abortSignal(controller.signal);
      if (controller.signal.aborted) return;
      if (error || !data) {
        setError("Archivio non disponibile o autorizzazione scaduta.");
      } else setResult(data as unknown as Listing);
    };
    void run();
    return () => {
      controller.abort();
      operation.current?.abort();
    };
  }, [selection]);

  async function act(action: "detail" | "export", id?: string) {
    if (busy || !current.current || current.current.signal.aborted) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError("");
    setDetail(null);
    try {
      const { data, error } = await supabase.rpc("woo_archive_read", {
        p_action: action,
        p_query: selection.query,
        p_filter: selection.filter,
        p_purpose: action === "export" ? purpose : undefined,
        p_id: id ? Number(id) : undefined,
      }).abortSignal(controller.signal);
      if (controller.signal.aborted) return;
      if (error) {
        setResult(null);
        setError("Operazione non autorizzata o archivio non disponibile.");
        return;
      }
      if (action === "export") download((data as unknown as Listing).rows);
      else if (data) setDetail(data as unknown as Detail);
      else setError("Scheda non disponibile.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">Clienti storici e migrazione</h1>
      {result && (
        <dl className="grid gap-3 sm:grid-cols-3">
          {[
            ["Clienti WooCommerce", result.accounts],
            ["Clienti con acquisti", result.buyers],
            ["Ordini storici dichiarati", result.purchases],
          ].map(([label, value]) => (
            <div className="rounded-lg border bg-card p-4" key={label}>
              <dt>{label}</dt>
              <dd className="text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          select({ query: query.trim(), filter, page: 0 });
        }}
      >
        <label>
          Nome, email o ID Woo<Input
            autoComplete="off"
            maxLength={200}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Acquisti storici<select
            className="block rounded border p-2"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Tutti</option>
            <option value="with">Con acquisti</option>
            <option value="without">Senza acquisti</option>
          </select>
        </label>
        <Button type="submit">Cerca</Button>
      </form>
      {error && <p role="alert">{error}</p>}
      {!result && !error && <p role="status">Caricamento archivio…</p>}
      {result && (
        <>
          <p>
            {result.total} risultati · Pagina {selection.page + 1} di{" "}
            {Math.max(1, Math.ceil(result.total / 50))}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>ID Woo</th>
                  <th>Nome</th>
                  <th>Ordini storici</th>
                  <th>Scheda</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td>{r.id}</td>
                    <td>{r.name || "Non disponibile"}</td>
                    <td>{r.purchases}</td>
                    <td>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        aria-label={"Apri scheda Woo " + r.id}
                        onClick={() => void act("detail", r.id)}
                      >
                        Apri
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!result.rows.length && <p>Nessun cliente per questi filtri.</p>}
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!selection.page || busy}
              onClick={() => select({ ...selection, page: selection.page - 1 })}
            >
              Precedente
            </Button>
            <Button
              variant="outline"
              disabled={(selection.page + 1) * 50 >= result.total || busy}
              onClick={() => select({ ...selection, page: selection.page + 1 })}
            >
              Successiva
            </Button>
          </div>
          {detail && (
            <section
              aria-label="Scheda cliente"
              className="rounded-lg border bg-card p-4"
            >
              <h2 className="font-semibold">Scheda Woo {detail.id}</h2>
              <p>
                {[detail.first_name, detail.last_name].filter(Boolean).join(
                  " ",
                ) || "Nome non disponibile"}
              </p>
              <p>Email storica · {detail.email || "Non disponibile"}</p>
              <p>Conteggio ordini WooCommerce · {detail.purchases}</p>
              <p>Dettaglio transazioni non disponibile.</p>
              <Button variant="outline" onClick={() => setDetail(null)}>
                Chiudi scheda
              </Button>
            </section>
          )}
          <section className="flex flex-wrap items-end gap-3 border-t pt-4">
            <label>
              Motivo dell’esportazione
              <select
                className="block rounded border p-2"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              >
                <option value="">Seleziona motivo</option>
                <option value="verifica_archivio">Verifica archivio</option>
                <option value="assistenza_cliente">Assistenza cliente</option>
              </select>
            </label>
            <Button
              disabled={!purpose || busy}
              onClick={() => void act("export")}
            >
              Esporta {result.total} risultati
            </Button>
          </section>
        </>
      )}
    </section>
  );
}

export default function CustomerArchivePage() {
  const { user } = useAuth();
  const context = useArchiveAccess();
  if (context.isLoading) return <p role="status">Verifica accesso…</p>;
  if (!user || context.data !== true) {
    return (
      <p role="alert">La consultazione richiede un grant Admin verificato.</p>
    );
  }
  return <Archive key={user.id} />;
}
