import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { useAdminProducts, useUpdateMargin, useUpdateProduct } from "./queries";
import { matchesSearch } from "./filters";
import type { AdminProductRow } from "../types";
import { formatPrice } from "../lib/format";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";

function CostCell({ product }: { product: AdminProductRow }) {
  const updateProduct = useUpdateProduct();
  const [value, setValue] = useState(product.cost_price ? String(product.cost_price) : "");
  const [saved, setSaved] = useState(false);

  const parsed = value.trim() === "" ? null : Number(value);
  const invalid = parsed === null || !Number.isInteger(parsed) || parsed <= 0;
  const dirty = parsed !== (product.cost_price ?? null);

  function save() {
    if (invalid || !dirty || parsed === null) return;
    updateProduct.mutate(
      { ref: product.ref, cost_price: parsed },
      { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 1500); } },
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-meta text-muted">$</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          step={100}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && save()}
          aria-label={`Precio proveedor de ${product.name}`}
          placeholder="Sin costo"
          aria-invalid={dirty && invalid}
          className={`w-28 rounded-control border py-1.5 pl-5 pr-2 text-body outline-none focus-visible:border-leaf ${
            dirty && invalid ? "border-danger" : "border-line"
          }`}
        />
      </div>
      {dirty && (
        <button
          type="button"
          onClick={save}
          disabled={invalid || updateProduct.isPending}
          className="rounded-pill bg-forest px-3 py-1.5 text-meta font-medium text-white disabled:opacity-40"
        >
          {updateProduct.isPending ? "..." : "Guardar"}
        </button>
      )}
      {saved && <Check size={18} className="text-leaf" aria-label="Guardado" />}
      {updateProduct.isError && <span className="text-meta text-danger">No se guardó</span>}
    </div>
  );
}

function MarginCard({ margin }: { margin: number }) {
  const updateMargin = useUpdateMargin();
  const [value, setValue] = useState(String(margin));
  const parsed = Number(value);
  const valid = Number.isInteger(parsed) && parsed >= 0 && parsed <= 500;
  const example = 10000;

  return (
    <div className="mt-4 flex flex-wrap items-end gap-4 rounded-card border border-line bg-white p-4">
      <div>
        <label htmlFor="margin" className="block text-body font-semibold text-ink">Margen de ganancia</label>
        <p className="text-meta text-muted">Precio de venta = precio proveedor + margen, redondeado a $500.</p>
        <div className="mt-2 flex items-center gap-2">
          <input
            id="margin"
            type="number"
            min={0}
            max={500}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-20 rounded-control border border-line px-2 py-1.5 text-center text-body"
          />
          <span className="text-body text-ink">%</span>
          <button
            type="button"
            onClick={() => updateMargin.mutate(parsed)}
            disabled={!valid || parsed === margin || updateMargin.isPending}
            className="rounded-pill bg-forest px-4 py-1.5 text-meta font-medium text-white disabled:opacity-40"
          >
            {updateMargin.isPending ? "Aplicando..." : "Aplicar a todos"}
          </button>
        </div>
      </div>
      {valid && (
        <p className="text-meta text-muted">
          Ejemplo: un producto que te cuesta {formatPrice(example)} se vende en{" "}
          {formatPrice(Math.ceil((example * (1 + parsed / 100)) / 500) * 500)}.
        </p>
      )}
      {updateMargin.isSuccess && (
        <p className="text-meta text-leaf">Se actualizaron {updateMargin.data.products_repriced} precios.</p>
      )}
    </div>
  );
}

function ProductRow({ product, onEdit }: { product: AdminProductRow; onEdit: (p: AdminProductRow) => void }) {
  const updateProduct = useUpdateProduct();
  return (
    <tr className={`border-b border-line last:border-0 ${product.is_active ? "" : "opacity-60"}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={product.image_url} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 shrink-0 rounded-control bg-white object-contain" />
          <div className="min-w-0">
            <button type="button" onClick={() => onEdit(product)} className="text-left font-medium text-ink hover:text-leaf">
              {product.name}
            </button>
            <p className="text-meta text-muted">
              {product.ref}
              {product.format ? ` · ${product.format}` : ""}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-body text-muted">
        {product.brand}
        <p className="text-meta">{product.category.name}</p>
      </td>
      <td className="px-4 py-3">
        <CostCell key={`${product.ref}-${product.cost_price}`} product={product} />
      </td>
      <td className="px-4 py-3 font-semibold text-ink">{formatPrice(product.price)}</td>
      <td className="px-4 py-3 text-body text-muted" title={product.market_source ?? "Sin precio público encontrado"}>
        {product.market_price ? formatPrice(product.market_price) : "-"}
      </td>
      <td className="px-4 py-3 text-body text-ink">
        {product.margin_percent !== null ? `${product.margin_percent}%` : <span className="text-meta text-muted">Precio de mercado</span>}
      </td>
      <td className="px-4 py-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-body">
          <input
            type="checkbox"
            checked={product.is_active}
            onChange={(event) => updateProduct.mutate({ ref: product.ref, is_active: event.target.checked })}
            className="h-4 w-4 rounded border-line accent-forest"
          />
          {product.is_active ? "Visible" : "Oculto"}
        </label>
      </td>
    </tr>
  );
}

function EditPanel({ product, onClose }: { product: AdminProductRow; onClose: () => void }) {
  const updateProduct = useUpdateProduct();
  const [description, setDescription] = useState(product.description);
  const [saved, setSaved] = useState(false);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto bg-paper p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={product.image_url} alt="" width={56} height={56} className="h-14 w-14 rounded-control bg-white object-contain" />
            <div>
              <h2 className="text-body-lg font-semibold text-ink">{product.name}</h2>
              <p className="text-meta text-muted">{product.ref} · {formatPrice(product.price)}</p>
            </div>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="rounded-control p-1 hover:bg-sage">
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>
        <div className="mt-6">
          <label htmlFor="product-description" className="block text-body font-medium text-ink">
            Descripción
          </label>
          <textarea
            id="product-description"
            rows={8}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full rounded-control border border-line px-3 py-2 text-body outline-none focus-visible:border-leaf"
          />
          <button
            type="button"
            onClick={() =>
              updateProduct.mutate(
                { ref: product.ref, description },
                { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 1500); } },
              )
            }
            disabled={updateProduct.isPending}
            className="mt-3 rounded-pill bg-forest px-4 py-2 text-body font-medium text-white disabled:opacity-60"
          >
            {saved ? "Guardada" : "Guardar descripción"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Products() {
  const products = useAdminProducts();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [editing, setEditing] = useState<AdminProductRow | null>(null);

  const all = useMemo(() => products.data?.items ?? [], [products.data]);
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    all.forEach((p) => seen.set(p.category.slug, p.category.name));
    return [...seen.entries()];
  }, [all]);
  const withCost = all.filter((p) => p.cost_price).length;
  const brands = useMemo(() => ([...new Set(all.map((p) => p.brand).filter(Boolean))] as string[]).sort((a, b) => a.localeCompare(b, "es")), [all]);

  const visible = all.filter(
    (p) =>
      (!category || p.category.slug === category) &&
      (!brand || p.brand === brand) &&
      matchesSearch(q, p.name, p.ref, p.format, p.brand),
  );

  return (
    <div>
      <h1 className="font-display text-h3 font-bold text-ink">Productos</h1>
      {products.data && (
        <>
          <p className="mt-1 text-body text-muted">
            {all.length} productos. Los {withCost} que tienen precio proveedor se venden con el margen; los{" "}
            {all.length - withCost} restantes usan la mediana del precio de mercado hasta que les pongas un precio
            proveedor.
          </p>
          <MarginCard margin={products.data.margin_percent} />
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Buscar por nombre, referencia o presentación..."
          aria-label="Buscar productos"
          className="w-full max-w-sm rounded-pill border border-line bg-white px-4 py-2 text-body outline-none focus-visible:border-leaf"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filtrar por categoría"
          className="rounded-pill border border-line bg-white px-4 py-2 text-body"
        >
          <option value="">Todas las categorías</option>
          {categories.map(([slug, name]) => (
            <option key={slug} value={slug}>{name}</option>
          ))}
        </select>
        <select
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          aria-label="Filtrar por marca"
          className="rounded-pill border border-line bg-white px-4 py-2 text-body"
        >
          <option value="">Todas las marcas</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-line bg-white">
        {products.isLoading && <Skeleton className="h-40 w-full" />}
        {products.isError && (
          <div className="p-4">
            <ErrorState onRetry={() => products.refetch()} message="No pudimos cargar los productos." />
          </div>
        )}
        {products.data && (
          <table className="w-full min-w-[1080px] text-body">
            <thead>
              <tr className="border-b border-line text-left text-meta text-muted">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Marca</th>
                <th className="px-4 py-3">Precio proveedor</th>
                <th className="px-4 py-3">Precio de venta</th>
                <th className="px-4 py-3" title="Precio al público encontrado en línea">Precio público</th>
                <th className="px-4 py-3">Margen</th>
                <th className="px-4 py-3">En la tienda</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((product) => (
                <ProductRow key={product.ref} product={product} onEdit={setEditing} />
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">No hay productos con esos filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {products.data && (
        <p className="mt-2 text-meta text-muted">Mostrando {visible.length} de {all.length}. "Precio público" es el precio al público encontrado en línea, como referencia.</p>
      )}

      {editing && <EditPanel product={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
