import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { useCategories, useNeeds, useProducts } from "../lib/queries";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";

const PAGE_SIZE = 24;

function FilterList({
  title,
  items,
  activeSlug,
  onSelect,
}: {
  title: string;
  items: { slug: string; name: string; product_count: number }[];
  activeSlug: string | null;
  onSelect: (slug: string | null) => void;
}) {
  return (
    <div>
      <h3 className="text-body font-semibold text-ink">{title}</h3>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.slug}>
            <button
              type="button"
              onClick={() => onSelect(activeSlug === item.slug ? null : item.slug)}
              className={`flex w-full items-center justify-between rounded-control px-2 py-1.5 text-left text-body ${
                activeSlug === item.slug
                  ? "bg-sage font-medium text-forest"
                  : "text-ink hover:bg-sage/60"
              }`}
            >
              <span>{item.name}</span>
              <span className="text-meta text-muted">{item.product_count}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");

  const category = searchParams.get("categoria");
  const need = searchParams.get("necesidad");
  const q = searchParams.get("q");
  const viral = searchParams.get("viral") === "true";
  const trending = searchParams.get("trending") === "true";
  const offset = Number(searchParams.get("offset") ?? "0");

  const categories = useCategories();
  const needs = useNeeds();
  const products = useProducts({
    category: category ?? undefined,
    need: need ?? undefined,
    q: q ?? undefined,
    viral,
    trending,
    limit: offset + PAGE_SIZE,
    offset: 0,
  });

  useEffect(() => {
    setSearchInput(q ?? "");
  }, [q]);

  function updateParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    next.delete("offset");
    setSearchParams(next);
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    updateParams({ q: searchInput || null });
  }

  function handleLoadMore() {
    const next = new URLSearchParams(searchParams);
    next.set("offset", String(offset + PAGE_SIZE));
    setSearchParams(next);
  }

  const activeChips: { key: string; label: string }[] = [];
  if (category) {
    const name = categories.data?.find((c) => c.slug === category)?.name ?? category;
    activeChips.push({ key: "categoria", label: name });
  }
  if (need) {
    const name = needs.data?.find((n) => n.slug === need)?.name ?? need;
    activeChips.push({ key: "necesidad", label: name });
  }
  if (q) activeChips.push({ key: "q", label: `"${q}"` });
  if (viral) activeChips.push({ key: "viral", label: "Solo virales" });
  if (trending) activeChips.push({ key: "trending", label: "Tendencia" });

  const filterContent = (
    <div className="space-y-6">
      {categories.data && (
        <FilterList
          title="Categorías"
          items={categories.data}
          activeSlug={category}
          onSelect={(slug) => updateParams({ categoria: slug })}
        />
      )}
      {needs.data && (
        <FilterList
          title="Necesidades"
          items={needs.data}
          activeSlug={need}
          onSelect={(slug) => updateParams({ necesidad: slug })}
        />
      )}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-body text-ink">
          <input
            type="checkbox"
            checked={viral}
            onChange={(event) =>
              updateParams({ viral: event.target.checked ? "true" : null })
            }
            className="h-4 w-4 rounded border-line text-forest focus-visible:outline-leaf"
          />
          Solo virales
        </label>
        <label className="flex items-center gap-2 text-body text-ink">
          <input
            type="checkbox"
            checked={trending}
            onChange={(event) =>
              updateParams({ trending: event.target.checked ? "true" : null })
            }
            className="h-4 w-4 rounded border-line text-forest focus-visible:outline-leaf"
          />
          Tendencia
        </label>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-h3 font-bold text-ink">Catálogo</h1>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <label htmlFor="catalog-search" className="sr-only">
            Buscar productos
          </label>
          <input
            id="catalog-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar productos..."
            className="flex-1 rounded-pill border border-line bg-white px-4 py-2 text-body outline-none focus-visible:border-leaf"
          />
          <button
            type="submit"
            className="rounded-pill bg-forest px-4 py-2 text-body font-medium text-white"
          >
            Buscar
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="flex items-center justify-center gap-2 rounded-pill border border-line bg-white px-4 py-2 text-body font-medium text-ink lg:hidden"
        >
          <SlidersHorizontal size={18} strokeWidth={1.75} />
          Filtrar
        </button>
      </div>

      {activeChips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => updateParams({ [chip.key]: null })}
              className="flex items-center gap-1 rounded-pill border border-line bg-white px-3 py-1 text-meta text-ink"
            >
              {chip.label}
              <X size={14} strokeWidth={1.75} />
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-meta text-muted">
        {products.data ? `${products.data.total} productos` : "Cargando..."}
      </p>

      <div className="mt-4 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">{filterContent}</div>
        </aside>

        <div>
          {products.isLoading && <ProductGridSkeleton />}
          {products.isError && (
            <ErrorState onRetry={() => products.refetch()} message="No pudimos cargar el catálogo." />
          )}
          {products.data && products.data.items.length === 0 && (
            <EmptyState
              title="No encontramos productos con esos filtros"
              description="Prueba con otra búsqueda o pregúntale al asesor."
              showAdvisorButton
            />
          )}
          {products.data && products.data.items.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {products.data.items.map((product) => (
                  <ProductCard key={product.ref} product={product} />
                ))}
              </div>
              {products.data.items.length < products.data.total && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className="rounded-pill border border-forest px-6 py-3 text-body font-medium text-forest hover:bg-forest hover:text-white"
                  >
                    Cargar más
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/30"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-tile bg-paper p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-body-lg font-semibold text-ink">Filtrar</h2>
              <button
                type="button"
                aria-label="Cerrar filtros"
                onClick={() => setMobileFiltersOpen(false)}
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>
            {filterContent}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="mt-6 w-full rounded-pill bg-forest px-4 py-3 text-body font-medium text-white"
            >
              Ver resultados
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
