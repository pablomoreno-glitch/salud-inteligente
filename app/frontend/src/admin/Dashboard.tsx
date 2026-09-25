import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboard, useOrderSms } from "./queries";
import { formatDate, formatNumber, formatPercent, formatPrice } from "../lib/format";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";

const RANGES = [7, 30, 90];

const SMS_STATUS_LABEL = { sent: "enviado", failed: "falló", skipped: "no enviado" } as const;

function OrderSmsCard() {
  const sms = useOrderSms();
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <h2 className="text-body-lg font-semibold text-ink">SMS de pedidos</h2>
      {sms.data ? (
        <div className="mt-3 space-y-1 text-body text-ink">
          <p>
            {sms.data.status.sms_configured
              ? `Cada pedido nuevo llega por SMS al ${sms.data.status.order_sms_to}.`
              : "Twilio aún no está configurado: los pedidos no generan SMS."}
          </p>
          <p className="text-muted">
            {sms.data.last
              ? `Último: ${sms.data.last.order_code ?? "sin pedido"}, ${SMS_STATUS_LABEL[sms.data.last.status]}`
              : "Aún no se ha enviado ninguno."}
          </p>
        </div>
      ) : (
        <div className="mt-3">
          {sms.isLoading ? <Skeleton className="h-10 w-full" /> : <Unavailable />}
        </div>
      )}
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <p className="text-meta text-muted">{label}</p>
      <p className="mt-1 text-h4 font-semibold text-ink">{value}</p>
    </div>
  );
}

function Unavailable() {
  return <p className="text-body text-muted">No disponible</p>;
}

function NoDataYet() {
  return <p className="text-body text-muted">Aún no hay datos en este período.</p>;
}

export function Dashboard() {
  const [days, setDays] = useState(30);
  const dashboard = useDashboard(days);

  if (dashboard.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <ErrorState onRetry={() => dashboard.refetch()} message="No pudimos cargar el resumen." />
    );
  }

  const { orders, inventory, advisor, catalog, messages } = dashboard.data;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h3 font-bold text-ink">Resumen</h1>
        <div className="flex gap-2">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDays(range)}
              className={`rounded-pill border px-4 py-1.5 text-body ${
                days === range
                  ? "border-forest bg-forest text-white"
                  : "border-line bg-white text-ink hover:border-leaf"
              }`}
            >
              {range} días
            </button>
          ))}
        </div>
      </div>

      {orders ? (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiTile label="Pedidos" value={formatNumber(orders.orders_in_range)} />
          <KpiTile label="Ingresos" value={formatPrice(orders.revenue)} />
          <KpiTile label="Ticket promedio" value={formatPrice(orders.avg_order_value)} />
          <KpiTile label="Unidades vendidas" value={formatNumber(orders.units_sold)} />
          <KpiTile
            label="Tasa de cancelación"
            value={formatPercent(orders.cancellation_rate)}
          />
          <KpiTile
            label="Pedidos con asesor IA"
            value={formatPercent(orders.advisor_share)}
          />
          <KpiTile
            label="Pendientes"
            value={formatNumber(orders.by_status.pending ?? 0)}
          />
        </div>
      ) : (
        <div className="mt-6">
          <Unavailable />
        </div>
      )}

      <div className="mt-8 rounded-card border border-line bg-white p-4">
        <h2 className="text-body-lg font-semibold text-ink">Pedidos e ingresos por día</h2>
        {orders && orders.daily.length > 0 ? (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={orders.daily}>
                <CartesianGrid stroke="#DCE5DD" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => formatDate(value)}
                  stroke="#5E6F63"
                  fontSize={12}
                />
                <YAxis yAxisId="left" stroke="#5E6F63" fontSize={12} allowDecimals={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  allowDecimals={false}
                  domain={[0, (max: number) => Math.max(max, 100000)]}
                  stroke="#5E6F63"
                  fontSize={12}
                  tickFormatter={(value: number) => formatPrice(value)}
                />
                <Tooltip
                  labelFormatter={(value: string) => formatDate(value)}
                  formatter={(value: number, name: string) =>
                    name === "Ingresos" ? [formatPrice(value), name] : [value, name]
                  }
                />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" name="Pedidos" fill="#3F7D58" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  name="Ingresos"
                  stroke="#1F3D2B"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4 flex h-40 items-center justify-center text-body text-muted">
            Sin datos en este rango
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-white p-4">
          <h2 className="text-body-lg font-semibold text-ink">Productos más vendidos</h2>
          {orders && orders.top_products.length > 0 ? (
            <table className="mt-3 w-full text-body">
              <thead>
                <tr className="text-left text-meta text-muted">
                  <th className="pb-2">Producto</th>
                  <th className="pb-2">Unidades</th>
                  <th className="pb-2">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {orders.top_products.map((product) => (
                  <tr key={product.ref} className="border-t border-line">
                    <td className="py-2">{product.name}</td>
                    <td className="py-2">{formatNumber(product.units)}</td>
                    <td className="py-2">{formatPrice(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="mt-3">
              {orders ? <NoDataYet /> : <Unavailable />}
            </div>
          )}
        </div>

        <div className="rounded-card border border-line bg-white p-4">
          <h2 className="text-body-lg font-semibold text-ink">
            Más recomendados por el asesor
          </h2>
          {advisor && advisor.top_recommended.length > 0 ? (
            <table className="mt-3 w-full text-body">
              <thead>
                <tr className="text-left text-meta text-muted">
                  <th className="pb-2">Producto</th>
                  <th className="pb-2">Veces recomendado</th>
                </tr>
              </thead>
              <tbody>
                {advisor.top_recommended.map((product) => (
                  <tr key={product.ref} className="border-t border-line">
                    <td className="py-2">{product.name}</td>
                    <td className="py-2">{formatNumber(product.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="mt-3">
              {advisor ? <NoDataYet /> : <Unavailable />}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-card border border-line bg-white p-4">
          <h2 className="text-body-lg font-semibold text-ink">Alertas de stock</h2>
          {inventory ? (
            <div className="mt-3 space-y-1 text-body text-ink">
              <p>Bajo: {formatNumber(inventory.low)}</p>
              <p>Agotado: {formatNumber(inventory.out)}</p>
              <p>Sin control: {formatNumber(inventory.untracked)}</p>
              <Link to="/admin/inventario" className="mt-2 inline-block text-leaf hover:underline">
                Ir a inventario
              </Link>
            </div>
          ) : (
            <div className="mt-3">
              <Unavailable />
            </div>
          )}
        </div>

        <div className="rounded-card border border-line bg-white p-4">
          <h2 className="text-body-lg font-semibold text-ink">Salud del catálogo</h2>
          {catalog ? (
            <div className="mt-3 space-y-1 text-body text-ink">
              <p>Productos activos: {formatNumber(catalog.active)}</p>
              <p>Sin precio: {formatNumber(catalog.unpriced)}</p>
              <Link to="/admin/productos" className="mt-2 inline-block text-leaf hover:underline">
                Ir a productos
              </Link>
            </div>
          ) : (
            <div className="mt-3">
              <Unavailable />
            </div>
          )}
        </div>

        <div className="rounded-card border border-line bg-white p-4">
          <h2 className="text-body-lg font-semibold text-ink">Mensajes nuevos</h2>
          {messages ? (
            <div className="mt-3 space-y-1 text-body text-ink">
              <p>{formatNumber(messages.new)} sin leer</p>
              <Link to="/admin/mensajes" className="mt-2 inline-block text-leaf hover:underline">
                Ir a mensajes
              </Link>
            </div>
          ) : (
            <div className="mt-3">
              <Unavailable />
            </div>
          )}
        </div>

        <OrderSmsCard />
      </div>
    </div>
  );
}
