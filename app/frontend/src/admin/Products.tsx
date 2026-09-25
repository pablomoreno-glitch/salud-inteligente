import { useState } from "react";
import { X } from "lucide-react";
import { useAdminProducts, useUpdateProduct } from "./queries";
import type { AdminProductRow } from "../types";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";

function ProductRow({
  product,
  onEdit,
}: {
  product: AdminProductRow;
  onEdit: (product: AdminProductRow) => void;
}) {
  const updateProduct = useUpdateProduct();
  const [price, setPrice] = useState(product.price ?? 0);
  const [saved, setSaved] = useState(false);

  function handleSavePrice() {
    updateProduct.mutate(
      { ref: product.ref, price: price || null },
      { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 1500); } },
    );
  }

  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="text-left font-medium text-ink hover:text-leaf"
        >
          {product.name}
        </button>
        <p className="text-meta text-muted">{product.ref}</p>
      </td>
      <td className="px-4 py-3 text-body text-muted">{product.category.name}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={price}
            onChange={(event) => setPrice(Number(event.target.value))}
            aria-label={`Precio de ${product.name}`}
            className="w-28 rounded-control border border-line px-2 py-1 text-body"
          />
          <button
            type="button"
            onClick={handleSavePrice}
            disabled={updateProduct.isPending}
            className="rounded-pill bg-forest px-3 py-1.5 text-meta font-medium text-white disabled:opacity-60"
          >
            {saved ? "Guardado" : "Guardar"}
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={product.is_active}
            onChange={(event) =>
              updateProduct.mutate({ ref: product.ref, is_active: event.target.checked })
            }
            className="h-4 w-4 rounded border-line text-forest"
          />
          Activo
        </label>
      </td>
    </tr>
  );
}

function EditPanel({
  product,
  onClose,
}: {
  product: AdminProductRow;
  onClose: () => void;
}) {
  const updateProduct = useUpdateProduct();
  const [description, setDescription] = useState(product.description);
  const [saved, setSaved] = useState(false);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto bg-paper p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-body-lg font-semibold text-ink">{product.name}</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose}>
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>
        <div className="mt-4">
          <label htmlFor="product-description" className="block text-body font-medium text-ink">
            Descripción
          </label>
          <textarea
            id="product-description"
            rows={6}
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
            {saved ? "Guardado" : "Guardar descripción"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Products() {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<AdminProductRow | null>(null);
  const products = useAdminProducts({ q: q || undefined });

  return (
    <div>
      <h1 className="font-display text-h3 font-bold text-ink">Productos</h1>

      <input
        type="search"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Buscar por nombre o referencia..."
        aria-label="Buscar productos"
        className="mt-4 w-full max-w-sm rounded-pill border border-line bg-white px-4 py-2 text-body outline-none focus-visible:border-leaf"
      />

      <div className="mt-4 overflow-x-auto rounded-card border border-line bg-white">
        {products.isLoading && <Skeleton className="h-40 w-full" />}
        {products.isError && (
          <div className="p-4">
            <ErrorState onRetry={() => products.refetch()} message="No pudimos cargar los productos." />
          </div>
        )}
        {products.data && (
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-line text-left text-meta text-muted">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {products.data.items.map((product) => (
                <ProductRow key={product.ref} product={product} onEdit={setEditing} />
              ))}
              {products.data.items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    No hay resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {editing && <EditPanel product={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
