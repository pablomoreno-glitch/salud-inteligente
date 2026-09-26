import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useAdminInventory, useAdminProducts, useUpdateStock } from "./queries";
import { matchesSearch } from "./filters";
import type { AdminProductRow, StockRow } from "../types";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";

type Status = "untracked" | "available" | "low" | "out";

const STATUS_LABELS: Record<Status, string> = {
  untracked: "Sin control",
  available: "Disponible",
  low: "Pocas unidades",
  out: "Agotado",
};

const STATUS_STYLES: Record<Status, string> = {
  untracked: "bg-sage text-muted",
  available: "bg-leaf/10 text-leaf",
  low: "bg-warn/10 text-warn",
  out: "bg-danger/10 text-danger",
};

interface Row {
  product: AdminProductRow;
  stock: StockRow | undefined;
  status: Status;
}

function statusOf(stock: StockRow | undefined): Status {
  if (!stock || !stock.tracked) return "untracked";
  return stock.status as Status;
}

function InventoryRow({ row }: { row: Row }) {
  const updateStock = useUpdateStock();
  const tracked = row.status !== "untracked";
  const [quantity, setQuantity] = useState(String(row.stock?.quantity ?? ""));
  const [threshold, setThreshold] = useState(String(row.stock?.low_stock_threshold ?? 5));

  const qty = quantity.trim() === "" ? null : Number(quantity);
  const thr = Number(threshold);
  const invalid = (qty !== null && (!Number.isInteger(qty) || qty < 0)) || !Number.isInteger(thr) || thr < 0;

  function save(nextQuantity: number | null, nextThreshold = thr) {
    updateStock.mutate({ ref: row.product.ref, quantity: nextQuantity, low_stock_threshold: nextThreshold });
  }

  function adjust(delta: number) {
    const next = Math.max(0, (qty ?? 0) + delta);
    setQuantity(String(next));
    save(next);
  }

  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={row.product.image_url} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 shrink-0 rounded-control bg-white object-contain" />
          <div className="min-w-0">
            <p className="font-medium text-ink">{row.product.name}</p>
            <p className="text-meta text-muted">{row.product.ref}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`whitespace-nowrap rounded-pill px-3 py-1 text-meta font-medium ${STATUS_STYLES[row.status]}`}>
          {STATUS_LABELS[row.status]}
        </span>
      </td>
      <td className="px-4 py-3">
        {tracked ? (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => adjust(-1)} disabled={updateStock.isPending || (qty ?? 0) <= 0} aria-label={`Restar una unidad de ${row.product.name}`} className="rounded-control border border-line p-1.5 hover:border-forest disabled:opacity-40">
              <Minus size={14} />
            </button>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && !invalid && save(qty)}
              aria-label={`Unidades de ${row.product.name}`}
              className="w-20 rounded-control border border-line px-2 py-1 text-center text-body"
            />
            <button type="button" onClick={() => adjust(1)} disabled={updateStock.isPending} aria-label={`Sumar una unidad de ${row.product.name}`} className="rounded-control border border-line p-1.5 hover:border-forest disabled:opacity-40">
              <Plus size={14} />
            </button>
          </div>
        ) : (
          <span className="text-meta text-muted">Se vende sin límite</span>
        )}
      </td>
      <td className="px-4 py-3">
        {tracked ? (
          <input
            type="number"
            min={0}
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && !invalid && save(qty)}
            aria-label={`Avisar con pocas unidades de ${row.product.name}`}
            title="Desde cuántas unidades se muestra 'Pocas unidades'"
            className="w-16 rounded-control border border-line px-2 py-1 text-center text-body"
          />
        ) : (
          <span className="text-meta text-muted">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {tracked ? (
            <>
              <button type="button" onClick={() => save(qty)} disabled={invalid || updateStock.isPending} className="rounded-pill bg-forest px-3 py-1.5 text-meta font-medium text-white disabled:opacity-40">
                Guardar
              </button>
              {row.status !== "out" && (
                <button type="button" onClick={() => { setQuantity("0"); save(0); }} disabled={updateStock.isPending} className="rounded-pill border border-danger/40 px-3 py-1.5 text-meta text-danger hover:bg-danger/5">
                  Marcar agotado
                </button>
              )}
              <button type="button" onClick={() => save(null)} disabled={updateStock.isPending} className="rounded-pill border border-line px-3 py-1.5 text-meta text-muted hover:border-forest">
                Quitar control
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setQuantity("10"); save(10, 5); }} disabled={updateStock.isPending} className="rounded-pill bg-forest px-3 py-1.5 text-meta font-medium text-white disabled:opacity-40">
                Controlar stock
              </button>
              <button type="button" onClick={() => { setQuantity("0"); save(0, 5); }} disabled={updateStock.isPending} className="rounded-pill border border-danger/40 px-3 py-1.5 text-meta text-danger hover:bg-danger/5">
                Marcar agotado
              </button>
            </>
          )}
          {updateStock.isError && <span className="text-meta text-danger">No se guardó</span>}
        </div>
      </td>
    </tr>
  );
}

export function Inventory() {
  const products = useAdminProducts();
  const inventory = useAdminInventory();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status | "">("");

  const rows: Row[] = useMemo(() => {
    const stockByRef = new Map((inventory.data?.items ?? []).map((s) => [s.ref, s]));
    return (products.data?.items ?? []).map((product) => {
      const stock = stockByRef.get(product.ref);
      return { product, stock, status: statusOf(stock) };
    });
  }, [products.data, inventory.data]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { untracked: 0, available: 0, low: 0, out: 0 };
    rows.forEach((r) => (c[r.status] += 1));
    return c;
  }, [rows]);

  const visible = rows.filter((r) => (!status || r.status === status) && matchesSearch(q, r.product.name, r.product.ref));
  const loading = products.isLoading || inventory.isLoading;
  const failed = products.isError || inventory.isError;

  const tile = (value: Status, hint: string) => (
    <button
      type="button"
      onClick={() => setStatus(status === value ? "" : value)}
      className={`rounded-card border bg-white p-4 text-left transition-colors ${status === value ? "border-forest ring-1 ring-forest" : "border-line hover:border-forest"}`}
    >
      <p className="text-meta text-muted">{STATUS_LABELS[value]}</p>
      <p className="mt-1 text-h4 font-semibold text-ink">{counts[value]}</p>
      <p className="text-meta text-muted">{hint}</p>
    </button>
  );

  return (
    <div>
      <h1 className="font-display text-h3 font-bold text-ink">Inventario</h1>
      <p className="mt-1 max-w-3xl text-body text-muted">
        Los productos sin control se venden sin límite. Cuando controlas el stock, cada pedido descuenta unidades y la
        tienda muestra automáticamente "Pocas unidades" o "Agotado" (y no deja comprar lo agotado).
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tile("available", "con stock suficiente")}
        {tile("low", "por debajo del aviso")}
        {tile("out", "no se pueden comprar")}
        {tile("untracked", "se venden sin límite")}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Buscar por nombre o referencia..."
          aria-label="Buscar en el inventario"
          className="w-full max-w-sm rounded-pill border border-line bg-white px-4 py-2 text-body outline-none focus-visible:border-leaf"
        />
        {status && (
          <button type="button" onClick={() => setStatus("")} className="text-body text-leaf hover:underline">
            Quitar filtro "{STATUS_LABELS[status]}"
          </button>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-line bg-white">
        {loading && <Skeleton className="h-40 w-full" />}
        {failed && (
          <div className="p-4">
            <ErrorState onRetry={() => { products.refetch(); inventory.refetch(); }} message="No pudimos cargar el inventario." />
          </div>
        )}
        {!loading && !failed && (
          <table className="w-full min-w-[900px] text-body">
            <thead>
              <tr className="border-b border-line text-left text-meta text-muted">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Unidades</th>
                <th className="px-4 py-3" title="Desde cuántas unidades se muestra 'Pocas unidades'">Aviso</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <InventoryRow key={`${row.product.ref}-${row.stock?.quantity}-${row.stock?.low_stock_threshold}-${row.status}`} row={row} />
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">No hay productos con esos filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {!loading && !failed && <p className="mt-2 text-meta text-muted">Mostrando {visible.length} de {rows.length}.</p>}
    </div>
  );
}
