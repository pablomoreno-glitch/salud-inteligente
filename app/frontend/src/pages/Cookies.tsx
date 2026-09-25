import { useEffect } from "react";

const STORED = [
  {
    name: "Carrito (si_cart_token)",
    kind: "Necesaria",
    purpose: "Recuerda los productos que agregaste al carrito.",
    duration: "Hasta que vacíes el carrito o borres los datos del navegador.",
  },
  {
    name: "Tu elección de cookies (si_cookie_consent)",
    kind: "Necesaria",
    purpose: "Guarda lo que decidiste en este aviso para no volver a preguntarte.",
    duration: "Hasta que la cambies o borres los datos del navegador.",
  },
  {
    name: "Sesión del panel (solo administradores)",
    kind: "Necesaria",
    purpose: "Mantiene abierta la sesión de quien administra la tienda.",
    duration: "Hasta cerrar sesión.",
  },
  {
    name: "Conversación con el asesor (si_advisor_conversation)",
    kind: "Funcional",
    purpose: "Conserva tu conversación con el asesor IA mientras navegas en esta pestaña.",
    duration: "Se borra al cerrar la pestaña. Solo se guarda si la aceptas.",
  },
];

export function Cookies() {
  useEffect(() => {
    document.title = "Política de cookies - Salud Inteligente";
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-h3 font-bold text-forest">Política de cookies</h1>
      <p className="mt-4 text-body-lg text-muted">
        Salud Inteligente guarda en tu navegador solo la información necesaria para que la tienda
        funcione y, si lo aceptas, una comodidad adicional. No usamos cookies de publicidad ni
        herramientas de analítica de terceros, y no vendemos ni compartimos esta información.
      </p>

      <h2 className="mt-10 text-body-lg font-semibold text-ink">Qué guardamos</h2>
      <div className="mt-4 overflow-hidden rounded-card border border-line bg-white">
        {STORED.map((item) => (
          <div key={item.name} className="border-b border-line p-4 last:border-b-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-body font-semibold text-ink">{item.name}</p>
              <span className="rounded-pill bg-sage px-2 py-0.5 text-meta text-forest">{item.kind}</span>
            </div>
            <p className="mt-1 text-body text-muted">{item.purpose}</p>
            <p className="mt-1 text-meta text-muted">Duración: {item.duration}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-body-lg font-semibold text-ink">Cómo cambiar tu elección</h2>
      <p className="mt-2 text-body text-muted">
        Puedes cambiarla cuando quieras desde el botón de cookies en la esquina inferior izquierda,
        o aquí mismo.
      </p>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("si-open-cookies"))}
        className="mt-4 rounded-pill bg-forest px-5 py-2.5 text-body font-medium text-white hover:bg-forest/90"
      >
        Cambiar preferencias
      </button>

      <h2 className="mt-10 text-body-lg font-semibold text-ink">Datos de tus pedidos</h2>
      <p className="mt-2 text-body text-muted">
        Cuando haces un pedido guardamos tu nombre, celular y ciudad para poder entregarlo y
        contactarte. Esa información no se guarda en tu navegador sino en nuestros servidores, y la
        usamos solo para gestionar tu pedido.
      </p>
    </div>
  );
}
