import { useState } from "react";
import { X } from "lucide-react";
import { useAdminOrder, useAdminOrders, useUpdateOrderStatus } from "./queries";
import { formatDate, formatDateTime, formatPrice } from "../lib/format";
import type { OrderStatus } from "../types";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-warn/10 text-warn",
  confirmed: "bg-leaf/10 text-leaf",
  shipped: "bg-leaf/10 text-leaf",
  delivered: "bg-forest/10 text-forest",
  cancelled: "bg-danger/10 text-danger",
};

const TABS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregado" },
  { value: "cancelled", label: "Cancelado" },
];

function nextTransitions(status: OrderStatus): OrderStatus[] {
  const forward: Record<OrderStatus, OrderStatus | null> = {
    pending: "confirmed",
    confirmed: "shipped",
    shipped: "delivered",
    delivered: null,
    cancelled: null,
  };
  const next = forward[status];
  const options: OrderStatus[] = [];
  if (next) options.push(next);
  if (status !== "delivered" && status !== "cancelled") options.push("cancelled");
  return options;
}

function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`rounded-pill px-3 py-1 text-meta font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function OrderDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const order = useAdminOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto bg-paper p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-body-lg font-semibold text-ink">Detalle del pedido</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose}>
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {order.isLoading && <Skeleton className="mt-4 h-40 w-full" />}
        {order.isError && (
          <ErrorState onRetry={() => order.refetch()} message="No pudimos cargar el pedido." />
        )}

        {order.data && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="font-display text-h4 font-bold text-forest">{order.data.code}</p>
              <StatusPill status={order.data.status} />
            </div>

            <div className="rounded-card border border-line bg-white p-4 text-body">
              <p><span className="text-muted">Cliente: </span>{order.data.customer_name}</p>
              <p><span className="text-muted">Celular: </span>{order.data.customer_phone}</p>
              <p><span className="text-muted">Ciudad: </span>{order.data.customer_city}</p>
              {order.data.notes && (
                <p><span className="text-muted">Notas: </span>{order.data.notes}</p>
              )}
            </div>

            <div className="rounded-card border border-line bg-white p-4">
              <p className="text-body font-semibold text-ink">Productos</p>
              <div className="mt-2 space-y-2">
                {order.data.items.map((item) => (
                  <div key={item.ref} className="flex justify-between text-body">
                    <span>{item.quantity} x {item.name}</span>
                    <span>
                      {item.unit_price === null ? "Por confirmar" : formatPrice(item.line_total)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between border-t border-line pt-2 text-body-lg font-semibold">
                <span>Total</span>
                <span>{formatPrice(order.data.total)}</span>
              </div>
            </div>

            <div className="rounded-card border border-line bg-white p-4">
              <p className="text-body font-semibold text-ink">Historial</p>
              <ul className="mt-2 space-y-1 text-meta text-muted">
                {order.data.history.map((entry, index) => (
                  <li key={index}>
                    {entry.from_status ? `${STATUS_LABELS[entry.from_status]} -> ` : ""}
                    {STATUS_LABELS[entry.to_status]} · {formatDateTime(entry.at)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              {nextTransitions(order.data.status).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    if (status === "cancelled" && !confirmCancel) {
                      setConfirmCancel(true);
                      return;
                    }
                    updateStatus.mutate({ id: order.data!.id, status });
                    setConfirmCancel(false);
                  }}
                  disabled={updateStatus.isPending}
                  className={`rounded-pill px-4 py-2 text-body font-medium ${
                    status === "cancelled"
                      ? "border border-danger text-danger hover:bg-danger hover:text-white"
                      : "bg-forest text-white hover:bg-forest/90"
                  }`}
                >
                  {status === "cancelled" && confirmCancel
                    ? "Confirmar cancelación"
                    : `Marcar como ${STATUS_LABELS[status].toLowerCase()}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Orders() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const orders = useAdminOrders({ status: status || undefined, q: q || undefined });

  return (
    <div>
      <h1 className="font-display text-h3 font-bold text-ink">Pedidos</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={`rounded-pill border px-4 py-1.5 text-body ${
              status === tab.value
                ? "border-forest bg-forest text-white"
                : "border-line bg-white text-ink hover:border-leaf"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Buscar por código o cliente..."
        aria-label="Buscar pedidos"
        className="mt-4 w-full max-w-sm rounded-pill border border-line bg-white px-4 py-2 text-body outline-none focus-visible:border-leaf"
      />

      <div className="mt-4 overflow-x-auto rounded-card border border-line bg-white">
        {orders.isLoading && <Skeleton className="h-40 w-full" />}
        {orders.isError && (
          <div className="p-4">
            <ErrorState onRetry={() => orders.refetch()} message="No pudimos cargar los pedidos." />
          </div>
        )}
        {orders.data && (
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-line text-left text-meta text-muted">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">Unidades</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.items.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => setSelectedId(order.id)}
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-sage/40"
                >
                  <td className="px-4 py-3 font-medium">{order.code}</td>
                  <td className="px-4 py-3">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3">{order.customer_name}</td>
                  <td className="px-4 py-3">{order.customer_city}</td>
                  <td className="px-4 py-3">{order.items.reduce((units, item) => units + item.quantity, 0)}</td>
                  <td className="px-4 py-3">{formatPrice(order.total)}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={order.status} />
                  </td>
                </tr>
              ))}
              {orders.data.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No hay pedidos con este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedId !== null && (
        <OrderDetail id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
