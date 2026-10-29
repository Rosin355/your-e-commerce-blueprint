import { formatMoney } from "@/lib/storefront-money";
import { useStorefrontSeo } from "@/hooks/useStorefrontSeo";
import { CatalogProductCard } from "@/components/storefront/CatalogProductCard";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight, ChevronUp, Loader2, SlidersHorizontal, X } from "lucide-react";
import { SiteHeader } from "@/components/storefront/SiteHeader";
import { Footer } from "@/components/Footer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { fetchAllProducts, CatalogProduct } from "@/lib/shopify";

import { searchCatalogProducts } from "@/lib/storefrontDiscovery";

type SortKey =
  | "featured"
  | "az"
  | "za"
  | "price-asc"
  | "price-desc"
  | "date-new"
  | "date-old";

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: "featured", label: "In evidenza" },
  { key: "az", label: "Ordine alfabetico, A-Z" },
  { key: "za", label: "Ordine alfabetico, Z-A" },
  { key: "price-asc", label: "Prezzo, dal piu basso" },
  { key: "price-desc", label: "Prezzo, dal piu alto" },
  { key: "date-new", label: "Dal piu recente" },
  { key: "date-old", label: "Dal meno recente" },
];

const INITIAL_VISIBLE = 9;
const LOAD_MORE_STEP = 6;
const COLOR_LIMIT = 8;

const colorSwatchMap: Record<string, string> = {
  verde: "#4a7a4a",
  "verde chiaro": "#7ba77b",
  "verde scuro": "#2f5a33",
  bianco: "#f5f2ea",
  rosso: "#c44536",
  rosa: "#e8a1b0",
  viola: "#8b5fbf",
  giallo: "#e3c35a",
  arancione: "#d98b3f",
  arancio: "#d98b3f",
  nero: "#222",
  blu: "#3c5a85",
  azzurro: "#6fa3c7",
  beige: "#d9c3a0",
  lilla: "#b797cf",
  fucsia: "#c64373",
  marrone: "#8a5a3b",
  oro: "#caa450",
  argento: "#b8b8b8",
};

interface FilterState {
  availability: Array<"in" | "out">;
  size: string[];
  color: string[];
  priceMin: string;
  priceMax: string;
}

const defaultFilters: FilterState = {
  availability: [],
  size: [],
  color: [],
  priceMin: "",
  priceMax: "",
};

const productIsInStock = (product: CatalogProduct) =>
  product.node.availableForSale;

const readProductOptionValues = (product: CatalogProduct, matcher: RegExp) => {
  const option = product.node.options.find((opt) => matcher.test(opt.name));
  return option?.values ?? [];
};

const sortProducts = (products: CatalogProduct[], sort: SortKey): CatalogProduct[] => {
  const list = [...products];
  switch (sort) {
    case "az":
      return list.sort((a, b) => a.node.title.localeCompare(b.node.title));
    case "za":
      return list.sort((a, b) => b.node.title.localeCompare(a.node.title));
    case "price-asc":
      return list.sort(
        (a, b) =>
          parseFloat(a.node.priceRange.minVariantPrice.amount) -
          parseFloat(b.node.priceRange.minVariantPrice.amount),
      );
    case "price-desc":
      return list.sort(
        (a, b) =>
          parseFloat(b.node.priceRange.minVariantPrice.amount) -
          parseFloat(a.node.priceRange.minVariantPrice.amount),
      );
    case "date-new":
      return list.sort((a, b) =>
        (Date.parse(b.node.publishedAt ?? "") || 0) - (Date.parse(a.node.publishedAt ?? "") || 0),
      );
    case "date-old":
      return list.sort((a, b) =>
        (Date.parse(a.node.publishedAt ?? "") || 0) - (Date.parse(b.node.publishedAt ?? "") || 0),
      );
    case "featured":
    default:
      return list;
  }
};

const AllProducts = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = (searchParams.get("q") ?? "").trim();
  useStorefrontSeo({
    title: searchQuery ? `Ricerca: ${searchQuery} | Online Garden` : 'Tutti i prodotti | Online Garden',
    description: 'Esplora il catalogo Online Garden e filtra i prodotti per disponibilità, formato, colore e prezzo.',
    path: '/collections/all',
    noindex: !!searchQuery,
  });
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [pendingFilters, setPendingFilters] = useState<FilterState>(defaultFilters);
  const [sort, setSort] = useState<SortKey>("featured");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [introExpanded, setIntroExpanded] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [colorShowMore, setColorShowMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    availability: true,
    size: true,
    color: true,
    price: true,
  });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setProducts([]);
    setLoading(true);
    setLoadError(false);
    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const list = await fetchAllProducts(undefined, controller.signal);
        if (active) setProducts(list);
      } catch (error) {
        if (active) { setLoadError(true); console.error(error); }
      } finally {
        if (active) setLoading(false);
      }
    };
    const timer = window.setTimeout(load, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);

  const searchScoped = useMemo(() => searchCatalogProducts(products, searchQuery), [products, searchQuery]);

  const clearSearch = () => {
    searchParams.delete("q");
    setSearchParams(searchParams, { replace: true });
  };

  const stats = useMemo(() => {
    const inStock = searchScoped.filter(productIsInStock).length;
    const outOfStock = searchScoped.length - inStock;

    const sizeOptions = new Map<string, number>();
    const colorOptions = new Map<string, number>();
    const priceList: number[] = [];

    searchScoped.forEach((product) => {
      const sizes = readProductOptionValues(product, /size|taglia|misura|formato/i);
      sizes.forEach((value) => {
        sizeOptions.set(value, (sizeOptions.get(value) || 0) + 1);
      });

      const colors = readProductOptionValues(product, /color|colore|tonalit/i);
      colors.forEach((value) => {
        colorOptions.set(value, (colorOptions.get(value) || 0) + 1);
      });

      priceList.push(parseFloat(product.node.priceRange.minVariantPrice.amount));
    });

    const priceMinValue = priceList.length ? priceList.reduce((min, price) => Math.min(min, price), Infinity) : 0;
    const priceMaxValue = priceList.length ? priceList.reduce((max, price) => Math.max(max, price), -Infinity) : 0;

    const currencies = [...new Set(searchScoped.map(product => product.node.priceRange.minVariantPrice.currencyCode))];
    return {
      currencyCode: currencies.length === 1 ? currencies[0] : null,
      inStock,
      outOfStock,
      sizeOptions: Array.from(sizeOptions.entries()).map(([value, count]) => ({ value, count })),
      colorOptions: Array.from(colorOptions.entries()).map(([value, count]) => ({ value, count })),
      priceMinValue,
      priceMaxValue,
    };
  }, [searchScoped]);

  const filteredProducts = useMemo(() => {
    return searchScoped.filter((product) => {
      const inStock = productIsInStock(product);
      if (filters.availability.length) {
        const wantsIn = filters.availability.includes("in");
        const wantsOut = filters.availability.includes("out");
        if (wantsIn && !wantsOut && !inStock) return false;
        if (wantsOut && !wantsIn && inStock) return false;
      }

      if (filters.size.length) {
        const sizes = readProductOptionValues(product, /size|taglia|misura|formato/i);
        const match = sizes.some((value) => filters.size.includes(value));
        if (!match) return false;
      }

      if (filters.color.length) {
        const colors = readProductOptionValues(product, /color|colore|tonalit/i);
        const match = colors.some((value) => filters.color.includes(value));
        if (!match) return false;
      }

      const price = parseFloat(product.node.priceRange.minVariantPrice.amount);
      if (filters.priceMin && price < parseFloat(filters.priceMin)) return false;
      if (filters.priceMax && price > parseFloat(filters.priceMax)) return false;

      return true;
    });
  }, [filters, searchScoped]);

  const sortedProducts = useMemo(() => sortProducts(filteredProducts, sort), [filteredProducts, sort]);
  const visibleProducts = sortedProducts.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [filters, sort, searchQuery]);

  const activeFilterCount =
    filters.availability.length +
    filters.size.length +
    filters.color.length +
    (filters.priceMin ? 1 : 0) +
    (filters.priceMax ? 1 : 0);

  const toggleAvailability = (state: FilterState, value: "in" | "out"): FilterState => {
    const exists = state.availability.includes(value);
    return {
      ...state,
      availability: exists
        ? state.availability.filter((item) => item !== value)
        : [...state.availability, value],
    };
  };

  const toggleArrayValue = <K extends "size" | "color">(
    state: FilterState,
    key: K,
    value: string,
  ): FilterState => {
    const exists = state[key].includes(value);
    return {
      ...state,
      [key]: exists ? state[key].filter((item) => item !== value) : [...state[key], value],
    };
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setPendingFilters(defaultFilters);
  };

  const applyPendingFilters = () => {
    setFilters(pendingFilters);
    setFilterDrawerOpen(false);
  };

  const toggleSection = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderAvailabilityGroup = (
    state: FilterState,
    setState: (value: FilterState) => void,
  ) => (
    <div className="space-y-2">
      {([
        { key: "in", label: "Disponibili", count: stats.inStock },
        { key: "out", label: "Esauriti", count: stats.outOfStock },
      ] as const).map((opt) => {
        const checked = state.availability.includes(opt.key);
        return (
          <label
            key={opt.key}
            className="flex cursor-pointer items-center justify-between py-1 text-sm text-foreground"
          >
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => setState(toggleAvailability(state, opt.key))}
                className="h-4 w-4 shrink-0 rounded-none border border-border accent-primary"
              />
              <span>{opt.label}</span>
            </span>
            <span className="text-xs text-muted-foreground">{opt.count}</span>
          </label>
        );
      })}
    </div>
  );

  const renderSizeGroup = (state: FilterState, setState: (value: FilterState) => void) => (
    <div className="space-y-2">
      {stats.sizeOptions.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nessun formato disponibile</p>
      ) : (
        stats.sizeOptions.map(({ value, count }) => {
          const checked = state.size.includes(value);
          return (
            <label
              key={value}
              className="flex cursor-pointer items-center justify-between py-1 text-sm text-foreground"
            >
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setState(toggleArrayValue(state, "size", value))}
                  className="h-4 w-4 shrink-0 rounded-none border border-border accent-primary"
                />
                <span>{value}</span>
              </span>
              <span className="text-xs text-muted-foreground">{count}</span>
            </label>
          );
        })
      )}
    </div>
  );

  const renderColorGroup = (state: FilterState, setState: (value: FilterState) => void) => {
    const list = colorShowMore ? stats.colorOptions : stats.colorOptions.slice(0, COLOR_LIMIT);
    return (
      <div className="space-y-2">
        {stats.colorOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nessun colore disponibile</p>
        ) : (
          <>
            {list.map(({ value, count }) => {
              const checked = state.color.includes(value);
              const swatch = colorSwatchMap[value.toLowerCase()] || "#e2ded4";
              return (
                <label
                  key={value}
                  className="flex cursor-pointer items-center justify-between py-1 text-sm text-foreground"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setState(toggleArrayValue(state, "color", value))}
                      className="h-4 w-4 shrink-0 rounded-none border border-border accent-primary"
                    />
                    <span
                      className="inline-block h-4 w-4 shrink-0 border border-border"
                      style={{ backgroundColor: swatch }}
                    />
                    <span className="capitalize">{value}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </label>
              );
            })}
            {stats.colorOptions.length > COLOR_LIMIT && (
              <button
                type="button"
                onClick={() => setColorShowMore((prev) => !prev)}
                className="mt-1 text-xs font-semibold text-foreground underline underline-offset-4"
              >
                {colorShowMore ? "Mostra meno" : "Mostra tutti"}
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  const renderPriceGroup = (state: FilterState, setState: (value: FilterState) => void) => (
    <div>
      <p className="text-xs text-muted-foreground">
        {stats.currencyCode ? `Il prezzo massimo in elenco è ${formatMoney({amount: String(stats.priceMaxValue), currencyCode: stats.currencyCode})}` : "Prezzi nella valuta indicata sui prodotti"}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex h-11 min-w-0 flex-1 items-center rounded-lg border border-border bg-background px-3">
          <span className="mr-2 text-xs text-muted-foreground">{stats.currencyCode}</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            aria-label="Prezzo minimo"
            placeholder="Da"
            value={state.priceMin}
            onChange={(event) => setState({ ...state, priceMin: event.target.value })}
            className="w-full min-w-0 bg-transparent text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
        <div className="flex h-11 min-w-0 flex-1 items-center rounded-lg border border-border bg-background px-3">
          <span className="mr-2 text-xs text-muted-foreground">{stats.currencyCode}</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            aria-label="Prezzo massimo"
            placeholder="A"
            value={state.priceMax}
            onChange={(event) => setState({ ...state, priceMax: event.target.value })}
            className="w-full min-w-0 bg-transparent text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
      </div>
    </div>
  );

  const renderSection = (
    id: string,
    title: string,
    body: React.ReactNode,
    options: { noBorderTop?: boolean } = {},
  ) => (
    <div key={id} className={options.noBorderTop ? "" : "border-t border-border/60 pt-5 mt-5"}>
      <button
        type="button"
        aria-expanded={openSections[id]}
        onClick={() => toggleSection(id)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-full border border-border bg-background px-4 text-left"
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {openSections[id] ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {openSections[id] && <div className="mt-4">{body}</div>}
    </div>
  );

  const renderSidebar = (state: FilterState, setState: (value: FilterState) => void) => (
    <div>
      {renderSection("availability", "Disponibilita", renderAvailabilityGroup(state, setState), {
        noBorderTop: true,
      })}
      {renderSection("size", "Formato", renderSizeGroup(state, setState))}
      {renderSection("color", "Colore", renderColorGroup(state, setState))}
      {renderSection("price", "Prezzo", renderPriceGroup(state, setState))}
    </div>
  );

  return (
    <div className="og-storefront min-h-screen flex flex-col bg-background">
      <SiteHeader variant="page" />

      <main id="main-content" tabIndex={-1} className="flex-1 pt-4 md:pt-6">
        <div className="container mx-auto max-w-[1280px] px-4">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground pt-4">
            <button type="button" onClick={() => navigate("/")} className="hover:text-foreground">
              Home
            </button>
            <ChevronRight className="h-3 w-3 opacity-60" />
            <span className="text-foreground">{searchQuery ? "Ricerca" : "Tutti i prodotti"}</span>
          </nav>

          <header className="py-5 md:py-7">
            <h1 className="font-heading break-words text-[2rem] sm:text-[2.5rem] font-semibold leading-[1.05] text-foreground md:text-[3rem]">
              {searchQuery ? (
                <>Risultati per «{searchQuery}»</>
              ) : (
                "Tutti i prodotti"
              )}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">Esplora il catalogo e affina la selezione con filtri e ordinamento.</p>
            {searchQuery && (
              <div className="mt-4 flex flex-wrap items-center gap-4" aria-live="polite">
                <p className="text-[15px] text-muted-foreground">
                  {loading
                    ? "Ricerca in corso…"
                    : loadError ? "Ricerca non disponibile: riprova." : `${searchScoped.length} prodott${searchScoped.length === 1 ? "o" : "i"} trovat${searchScoped.length === 1 ? "o" : "i"}`}
                </p>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4 hover:text-primary-dark"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancella ricerca
                </button>
              </div>
            )}
          </header>

          <div className="flex items-center justify-between gap-3 border-y border-border/60 py-3">
            <div className="flex items-center gap-3">
              <Sheet open={filterDrawerOpen} onOpenChange={(open) => {
                setFilterDrawerOpen(open);
                if (open) setPendingFilters(filters);
              }}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-background px-3 text-sm font-semibold text-foreground lg:hidden"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filtra e ordina {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="og-storefront-dialog w-[92%] max-w-sm overflow-y-auto border-border bg-background">
                  <SheetHeader>
                    <SheetTitle className="font-heading text-xl text-foreground">Filtri</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    {renderSidebar(pendingFilters, setPendingFilters)}
                  </div>
                  <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t border-border bg-background pt-4">
                    <button
                      type="button"
                      onClick={() => setPendingFilters(defaultFilters)}
                      className="text-sm font-semibold text-foreground underline underline-offset-4"
                    >
                      Rimuovi tutto
                    </button>
                    <button
                      type="button"
                      onClick={applyPendingFilters}
                      className="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
                    >
                      Applica
                    </button>
                  </div>
                </SheetContent>
              </Sheet>

              <span className="hidden text-sm text-muted-foreground lg:inline">
                Filtra e ordina {activeFilterCount > 0 ? `(${activeFilterCount})` : "(0)"}
              </span>
            </div>

            <div className="relative flex min-w-0 flex-1 items-center gap-3 md:flex-initial">
              <label htmlFor="pdp-sort" className="sr-only text-sm text-muted-foreground md:not-sr-only">
                Ordina per
              </label>
              <select id="pdp-sort" value={sort} onChange={event => setSort(event.target.value as SortKey)} className="h-11 min-w-0 flex-1 border border-border bg-background px-3 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                {sortOptions.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-6 py-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
            <aside className="hidden lg:block lg:sticky lg:top-28 lg:self-start">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-foreground underline underline-offset-4"
                >
                  Rimuovi filtri
                  <X className="h-3 w-3" />
                </button>
              )}
              {renderSidebar(filters, setFilters)}
            </aside>

            <div>
              {loading ? (
                <div role="status" className="flex items-center justify-center py-20"><span className="sr-only">Caricamento catalogo</span>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : loadError ? (
                <div role="alert" className="border border-border bg-card p-6 text-center">
                  <h2 className="text-lg font-semibold">Impossibile caricare il catalogo</h2>
                  <p className="my-3 text-muted-foreground">Controlla la connessione e riprova. La ricerca non è stata completata.</p>
                  <Button onClick={() => setAttempt(value => value + 1)}>Riprova</Button>
                </div>
              ) : sortedProducts.length === 0 ? (
                <div className="border border-border bg-card p-10 text-center">
                  <p className="text-base font-semibold text-foreground">
                    {searchQuery ? `Nessun risultato per «${searchQuery}»` : "Nessun prodotto trovato"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {searchQuery
                      ? "Controlla eventuali errori di battitura o prova con un termine più generico."
                      : "Prova a rimuovere qualche filtro per ampliare i risultati."}
                  </p>
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="mt-4 inline-flex items-center gap-2 border border-foreground px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground hover:bg-foreground hover:text-background"
                    >
                      Cancella la ricerca
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-4 inline-flex items-center gap-2 border border-foreground px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground hover:bg-foreground hover:text-background"
                    >
                      Rimuovi filtri
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-x-3 sm:gap-x-5 gap-y-8 md:grid-cols-3">
                    {visibleProducts.map((product, index) => <CatalogProductCard key={product.node.id} product={product} eager={index < 4} />)}
                  </div>

                  <div className="mt-14 flex flex-col items-center gap-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {Math.min(visibleCount, sortedProducts.length)}-di-{sortedProducts.length} prodotti
                    </p>
                    <div className="h-1 w-40 overflow-hidden bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${(Math.min(visibleCount, sortedProducts.length) / sortedProducts.length) * 100}%`,
                        }}
                      />
                    </div>
                    {visibleCount < sortedProducts.length && (
                      <button
                        type="button"
                        onClick={() => setVisibleCount((count) => count + LOAD_MORE_STEP)}
                        className="mt-2 inline-flex h-11 items-center justify-center border border-foreground px-8 text-xs font-semibold uppercase tracking-[0.16em] text-foreground transition-colors hover:bg-foreground hover:text-background"
                      >
                        Carica altri
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <section className="border-t border-border/60 py-12 md:py-16">
            <div className="mt-5 max-w-3xl text-[15px] leading-7 text-muted-foreground mb-6 mx-auto">
              <p>
                Scopri il mondo Online Garden — piante da esterno, rose, piante da frutto e accessori scelti per dare
                carattere a terrazzi, balconi e giardini.
                {introExpanded ? (
                  <>
                    {" "}Ogni selezione e pensata per accompagnarti durante tutta la stagione con soluzioni verdi curate,
                    resistenti e semplici da mantenere. Dalle fioriture ornamentali alle essenze da raccolto, dal verde
                    strutturale ai bulbi stagionali, ogni proposta e seguita direttamente dal vivaio per arrivare a
                    destinazione in condizioni ottimali, pronta da posizionare nel tuo spazio esterno.
                  </>
                ) : null}
              </p>
              <button
                type="button"
                onClick={() => setIntroExpanded((prev) => !prev)}
                className="mt-2 text-sm font-semibold text-foreground underline underline-offset-4"
              >
                {introExpanded ? "Mostra meno" : "Leggi di piu"}
              </button>
            </div>
            <div className="mx-auto max-w-3xl space-y-4 text-[15px] leading-7 text-muted-foreground">
              <p>
                La collezione Online Garden riunisce <strong className="font-semibold text-foreground">piante da esterno,
                rose ornamentali, piante da frutto, bulbi stagionali</strong> e accessori pensati per rendere ogni
                terrazzo, balcone o giardino un luogo vivo e curato. Ogni proposta e seguita direttamente dal vivaio e
                selezionata per durata, portamento e coerenza con il clima mediterraneo.
              </p>
              <p>
                Dalle fioriture che segnano la stagione agli agrumi profumati, dai piccoli frutti da terrazzo alle
                varieta sempreverdi che danno struttura agli spazi outdoor, ogni creazione unisce cura, radici e
                rispetto per la natura. Con Online Garden non scegli solo una pianta: coltivi un equilibrio tra
                bellezza, tempo e spazio esterno.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AllProducts;
