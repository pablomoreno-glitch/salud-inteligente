import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import type { CheckoutResponse } from "../types";
import { formatPrice } from "../lib/format";

export function OrderConfirmation() {
  const { code } = useParams<{ code: string }>();

  const checkoutResponse = useMemo<CheckoutResponse | null>(() => {
    if (!code) return null;
    try {
      const raw = sessionStorage.getItem(`si_order_${code}`);
      return raw ? (JSON.parse(raw) as CheckoutResponse) : null;
    } catch {
      return null;
    }
  }, [code]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-meta text-muted">Pedido recibido</p>
      <h1 className="mt-1 font-display text-h2 font-bold text-forest">{code}</h1>

      {!checkoutResponse && (
        <p className="mt-4 text-body text-muted">
          Te contactaremos al número que dejaste para confirmar los detalles de
          tu pedido.
        </p>
      )}

      {checkoutResponse && (
        <>
          <div className="mt-6 space-y-3 rounded-card border border-line bg-white p-5">
            {checkoutResponse.order.items.map((line) => (
              <div key={line.ref} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={line.image_url}
                    alt={line.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-control bg-white object-contain"
                  />
                  <div>
                    <p className="text-body font-medium text-ink">{line.name}</p>
                    <p className="text-meta text-muted">
                      {line.quantity} x {formatPrice(line.unit_price)}
                    </p>
                  </div>
                </div>
                <p className="text-body font-medium text-ink">
                  {line.unit_price === null ? "Por confirmar" : formatPrice(line.line_total)}
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-body-lg font-semibold text-ink">Total</span>
              <span className="text-h4 font-semibold text-ink">
                {formatPrice(checkoutResponse.order.total)}
              </span>
            </div>
          </div>

          {checkoutResponse.whatsapp_url ? (
            <a
              href={checkoutResponse.whatsapp_url}
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-pill bg-leaf px-6 py-3 text-body-lg font-medium text-white hover:bg-leaf/90"
            >
              <MessageCircle size={20} strokeWidth={1.75} />
              Enviar pedido por WhatsApp
            </a>
          ) : (
            <p className="mt-6 text-body text-muted">
              Te contactaremos al número que dejaste.
            </p>
          )}
        </>
      )}

      <Link
        to="/catalogo"
        className="mt-8 block text-center text-body font-medium text-leaf hover:underline"
      >
        Seguir comprando
      </Link>
    </div>
  );
}
