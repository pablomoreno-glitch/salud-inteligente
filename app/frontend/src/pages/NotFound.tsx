import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="font-display text-h1 font-bold text-forest">404</p>
      <h1 className="mt-2 text-h4 font-semibold text-ink">
        No encontramos esta página
      </h1>
      <p className="mt-2 text-body text-muted">
        Puede que el enlace esté roto o el producto ya no exista.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-pill bg-forest px-5 py-3 text-body font-medium text-white hover:bg-forest/90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
