import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./auth";
import { ApiError } from "../lib/api";

export function Login() {
  const { isAuthenticated, login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    const from =
      (location.state as { from?: { pathname?: string } } | null)?.from
        ?.pathname ?? "/admin";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No pudimos iniciar sesión. Intenta de nuevo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sage/40 px-4">
      <div className="w-full max-w-sm rounded-card border border-line bg-white p-8">
        <h1 className="font-display text-h4 font-bold text-forest">
          Panel de administración
        </h1>
        <p className="mt-1 text-body text-muted">
          Inicia sesión para gestionar la tienda.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-body font-medium text-ink">
              Correo
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-control border border-line px-3 py-2 text-body outline-none focus-visible:border-leaf"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-body font-medium text-ink">
              Contraseña
            </label>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-control border border-line px-3 py-2 text-body outline-none focus-visible:border-leaf"
            />
          </div>

          {error && <p className="text-body text-danger">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-pill bg-forest px-4 py-3 text-body font-medium text-white hover:bg-forest/90 disabled:opacity-60"
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
