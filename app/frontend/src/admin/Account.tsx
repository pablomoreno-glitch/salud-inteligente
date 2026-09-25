import { useState } from "react";
import { KeyRound } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useAdminAuth } from "./auth";

const MIN_LENGTH = 12;

export function Account() {
  const { user } = useAdminAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const localError =
    next && next.length < MIN_LENGTH
      ? `Mínimo ${MIN_LENGTH} caracteres.`
      : confirm && next !== confirm
        ? "La confirmación no coincide."
        : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (localError || !current || !next || !confirm) return;
    setSaving(true);
    setError(null);
    setDone(false);
    try {
      await api.put(
        "/admin/password",
        { current_password: current, password: next, password_confirmation: confirm },
        true,
      );
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-card border border-line bg-white px-3 py-2 text-body text-ink outline-none focus-visible:border-leaf";

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-h3 font-bold text-forest">Mi cuenta</h1>
      <p className="mt-1 text-body text-muted">Sesión iniciada como {user?.email ?? "administrador"}.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-card border border-line bg-white p-5">
        <h2 className="flex items-center gap-2 text-body-lg font-semibold text-ink">
          <KeyRound size={18} strokeWidth={1.75} /> Cambiar contraseña
        </h2>

        <div>
          <label htmlFor="current-password" className="text-body font-medium text-ink">Contraseña actual</label>
          <input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label htmlFor="new-password" className="text-body font-medium text-ink">Nueva contraseña</label>
          <input id="new-password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} minLength={MIN_LENGTH} required />
          <p className="mt-1 text-meta text-muted">Al menos {MIN_LENGTH} caracteres.</p>
        </div>
        <div>
          <label htmlFor="confirm-password" className="text-body font-medium text-ink">Confirmar nueva contraseña</label>
          <input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} required />
        </div>

        {(localError || error) && <p className="text-body text-danger">{localError ?? error}</p>}
        {done && (
          <p className="rounded-card border border-leaf/30 bg-leaf/10 px-3 py-2 text-body text-forest">
            Contraseña actualizada. Esta sesión sigue abierta y se cerró en los demás dispositivos.
          </p>
        )}

        <button
          type="submit"
          disabled={saving || Boolean(localError) || !current || !next || !confirm}
          className="rounded-pill bg-forest px-5 py-2.5 text-body font-medium text-white hover:bg-forest/90 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar nueva contraseña"}
        </button>
      </form>
    </div>
  );
}
