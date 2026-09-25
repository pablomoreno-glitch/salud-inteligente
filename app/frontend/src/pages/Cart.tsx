import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useCart, useCheckout, useRemoveCartItem, useSetCartItem } from "../lib/cart";
import { formatPrice } from "../lib/format";
import { QuantityStepper } from "../components/QuantityStepper";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { ApiError } from "../lib/api";

interface FormState {
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  customer_name: "",
  customer_phone: "",
  customer_city: "",
  notes: "",
};

export function Cart() {
  const cart = useCart();
  const setCartItem = useSetCartItem();
  const removeCartItem = useRemoveCartItem();
  const checkout = useCheckout();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [stockErrorRefs, setStockErrorRefs] = useState<string[] | null>(null);

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.customer_name.trim()) nextErrors.customer_name = "Ingresa tu nombre.";
    if (!form.customer_phone.trim()) nextErrors.customer_phone = "Ingresa tu celular.";
    if (!form.customer_city.trim()) nextErrors.customer_city = "Ingresa tu ciudad.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStockErrorRefs(null);
    if (!validate()) return;

    checkout.mutate(
      {
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        customer_city: form.customer_city.trim(),
        notes: form.notes.trim() || undefined,
      },
      {
        onSuccess: (response) => {
          sessionStorage.setItem(
            `si_order_${response.order.code}`,
            JSON.stringify(response),
          );
          navigate(`/pedido/${response.order.code}`);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            const data = error.data as { refs?: string[] } | null;
            setStockErrorRefs(Array.isArray(data?.refs) ? data.refs : []);
          }
        },
      },
    );
  }

  if (cart.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-4 h-24 w-full" />
        <Skeleton className="mt-3 h-24 w-full" />
      </div>
    );
  }

  if (cart.isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <ErrorState onRetry={() => cart.refetch()} message="No pudimos cargar tu carrito." />
      </div>
    );
  }

  const data = cart.data;
  if (!data || data.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Tu carrito está vacío"
          description="Explora el catálogo o pídele una recomendación al asesor."
          showAdvisorButton
        >
          <Link
            to="/catalogo"
            className="rounded-pill border border-forest px-4 py-2 text-body font-medium text-forest hover:bg-forest hover:text-white"
          >
            Ir al catálogo
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-h3 font-bold text-ink">Tu carrito</h1>

      <div className="mt-6 space-y-4">
        {data.items.map((line) => (
          <div
            key={line.ref}
            className="flex items-center gap-4 rounded-card border border-line bg-white p-4"
          >
            <img
              src={line.image_url}
              alt={line.name}
              width={72}
              height={72}
              className="h-[72px] w-[72px] shrink-0 rounded-control bg-white object-contain"
            />
            <div className="flex-1 min-w-0">
              <Link
                to={`/producto/${line.slug}`}
                className="line-clamp-1 text-body font-medium text-ink hover:text-leaf"
              >
                {line.name}
              </Link>
              <p className="text-meta text-muted">{formatPrice(line.price)}</p>
              {stockErrorRefs?.includes(line.ref) && (
                <p className="text-meta text-danger">Sin suficiente stock</p>
              )}
            </div>
            <QuantityStepper
              value={line.quantity}
              onChange={(value) =>
                setCartItem.mutate({ ref: line.ref, quantity: value, source: line.source })
              }
              min={0}
            />
            <p className="w-24 shrink-0 text-right text-body font-medium text-ink">
              {line.price === null ? "Por confirmar" : formatPrice(line.line_total)}
            </p>
            <button
              type="button"
              aria-label={`Quitar ${line.name}`}
              onClick={() => removeCartItem.mutate(line.ref)}
              className="shrink-0 rounded-control p-2 text-muted hover:bg-sage hover:text-danger"
            >
              <Trash2 size={18} strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
        <span className="text-body-lg font-semibold text-ink">Subtotal</span>
        <span className="text-h4 font-semibold text-ink">
          {formatPrice(data.subtotal)}
        </span>
      </div>

      {data.has_unpriced && (
        <p className="mt-2 text-meta text-warn">
          Algunos productos tienen precio por confirmar; te lo confirmamos por
          WhatsApp.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-10 space-y-4 rounded-card border border-line bg-white p-6">
        <h2 className="text-body-lg font-semibold text-ink">Datos de entrega</h2>

        <div>
          <label htmlFor="customer_name" className="block text-body font-medium text-ink">
            Nombre completo
          </label>
          <input
            id="customer_name"
            type="text"
            value={form.customer_name}
            onChange={(event) => setForm((f) => ({ ...f, customer_name: event.target.value }))}
            className="mt-1 w-full rounded-control border border-line px-3 py-2 text-body outline-none focus-visible:border-leaf"
          />
          {errors.customer_name && (
            <p className="mt-1 text-meta text-danger">{errors.customer_name}</p>
          )}
        </div>

        <div>
          <label htmlFor="customer_phone" className="block text-body font-medium text-ink">
            Celular
          </label>
          <input
            id="customer_phone"
            type="tel"
            value={form.customer_phone}
            onChange={(event) => setForm((f) => ({ ...f, customer_phone: event.target.value }))}
            className="mt-1 w-full rounded-control border border-line px-3 py-2 text-body outline-none focus-visible:border-leaf"
          />
          {errors.customer_phone && (
            <p className="mt-1 text-meta text-danger">{errors.customer_phone}</p>
          )}
        </div>

        <div>
          <label htmlFor="customer_city" className="block text-body font-medium text-ink">
            Ciudad
          </label>
          <input
            id="customer_city"
            type="text"
            value={form.customer_city}
            onChange={(event) => setForm((f) => ({ ...f, customer_city: event.target.value }))}
            className="mt-1 w-full rounded-control border border-line px-3 py-2 text-body outline-none focus-visible:border-leaf"
          />
          {errors.customer_city && (
            <p className="mt-1 text-meta text-danger">{errors.customer_city}</p>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="block text-body font-medium text-ink">
            Notas (opcional)
          </label>
          <textarea
            id="notes"
            rows={3}
            value={form.notes}
            onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))}
            className="mt-1 w-full rounded-control border border-line px-3 py-2 text-body outline-none focus-visible:border-leaf"
          />
        </div>

        {checkout.isError && !stockErrorRefs && (
          <p className="text-body text-danger">
            {checkout.error instanceof ApiError
              ? checkout.error.message
              : "No pudimos confirmar el pedido. Intenta de nuevo."}
          </p>
        )}
        {stockErrorRefs && (
          <p className="text-body text-danger">
            Algunos productos no tienen stock suficiente. Ajusta las cantidades
            marcadas arriba.
          </p>
        )}

        <button
          type="submit"
          disabled={checkout.isPending}
          className="w-full rounded-pill bg-forest px-6 py-3 text-body-lg font-medium text-white hover:bg-forest/90 disabled:opacity-60"
        >
          {checkout.isPending ? "Confirmando..." : "Confirmar pedido"}
        </button>
      </form>
    </div>
  );
}
