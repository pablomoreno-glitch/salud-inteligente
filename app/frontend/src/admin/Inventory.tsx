import { useState } from "react";
import { useAdminInventory, useUpdateStock } from "./queries";
import type { StockRow } from "../types";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";

const STATUS_LABELS: Record<string, string> = {
  available: "Disponible",
  low: "Pocas unidades",
  out: "Agotado",
  untracked: "Sin control",
};

const STATUS_STYLES: Record<string, string> = {
  available: "bg-leaf/10 text-leaf",
  low: "bg-warn/10 text-warn",
  out: "bg-danger/10 text-danger",
  untracked: "bg-sage text-muted",
};

function InventoryRow({ row }: { row: StockRow }) {
  const updateStock = useUpdateStock();
  const [quantity, setQuantity] = useState(row.quantity ?? 0);
  const [threshold, setThreshold] = useState(row.low_stock_threshold);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    updateStock.mutate(
      { ref: row.ref, quantity, low_stock_threshold: threshold },
      { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 1500); } },
    );
  }

  function handleToggleTracking() {
    updateStock.mutate(
      { ref: row.ref, quantity: row.tracked ? null : 0 },
      { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 1500); } },
    );
  }

  return (
    <tr className="border-b border-line last:border-0">
      <td className="flex items-center gap-3 px-4 py-3">
        {row.image_url && (
          <img
            src={row.image_url}
            alt={row.name ?? row.ref}
            width={40}
            height={40}
            className="h-10 w-10 rounded-control bg-white object-contain"
          />
        )}
        <div>
          <p className="text-body font-medium text-ink">{row.name ?? row.ref}</p>
          <p className="text-meta text-muted">{row.ref}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          value={quantity}
          disabled={!row.tracked}
          onChange={(event) => setQuantity(Number(event.target.value))}
          aria-label={`Cantidad de ${row.ref}`}
          className="w-24 rounded-control border border-line px-2 py-1 text-body disabled:bg-sage/40"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          value={threshold}
          disabled={!row.tracked}
          onChange={(event) => setThreshold(Number(event.target.value))}
          aria-label={`Umbral de ${row.ref}`}
          className="w-24 rounded-control border border-line px-2 py-1 text-body disabled:bg-sage/40"
        />
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-pill px-3 py-1 text-meta font-medium ${STATUS_STYLES[row.status]}`}>
          {STATUS_LABELS[row.status]}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleToggleTracking}
            className="rounded-pill border border-line px-3 py-1.5 text-meta text-ink hover:border-leaf"
          >
            {row.tracked ? "Dejar de controlar" : "Empezar a controlar"}
          </button>
          {row.tracked && (
            <button
              type="button"
              onClick={handleSave}
              disabled={updateStock.isPending}
              className="rounded-pill bg-forest px-3 py-1.5 text-meta font-medium text-white disabled:opacity-60"
            >
              {saved ? "Guardado" : "Guardar"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function Inventory() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const inventory = useAdminInventory({ status: status || undefined, q: q || undefined });

  return (
    <div>
      <h1 className="font-display text-h3 font-bold text-ink">Inventario</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Buscar por nombre o referencia..."
          aria-label="Buscar inventario"
          className="w-full max-w-sm rounded-pill border border-line bg-white px-4 py-2 text-body outline-none focus-visible:border-leaf"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filtrar por estado"
          className="rounded-pill border border-line bg-white px-4 py-2 text-body"
        >
          <option value="">Todos los estados</option>
          <option value="low">Pocas unidades</option>
          <option value="out">Agotado</option>
          <option value="untracked">Sin control</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-line bg-white">
        {inventory.isLoading && <Skeleton className="h-40 w-full" />}
        {inventory.isError && (
          <div className="p-4">
            <ErrorState onRetry={() => inventory.refetch()} message="No pudimos cargar el inventario." />
          </div>
        )}
        {inventory.data && (
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-line text-left text-meta text-muted">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Umbral</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inventory.data.items.map((row) => (
                <InventoryRow key={row.ref} row={row} />
              ))}
              {inventory.data.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No hay resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
