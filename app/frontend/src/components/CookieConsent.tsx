import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { readConsent, saveConsent } from "../lib/consent";

/** First-visit consent card, same idea as lavillasb.com, in the Salud Inteligente look. */
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [functional, setFunctional] = useState(true);

  useEffect(() => {
    const stored = readConsent();
    if (stored) setFunctional(stored.functional);
    else setOpen(true);

    const reopen = () => {
      const current = readConsent();
      setFunctional(current?.functional ?? true);
      setShowPreferences(true);
      setOpen(true);
    };
    window.addEventListener("si-open-cookies", reopen);
    return () => window.removeEventListener("si-open-cookies", reopen);
  }, []);

  function decide(choice: { functional: boolean }) {
    saveConsent(choice);
    setOpen(false);
    setShowPreferences(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-title"
    >
      <div className="cookie-backdrop absolute inset-0 bg-ink/40" aria-hidden="true" />

      <div className="cookie-card relative w-full max-w-md overflow-hidden rounded-[20px] border border-line bg-paper shadow-2xl">
        {readConsent() && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute right-3 top-3 rounded-control p-2 text-muted hover:bg-sage"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        )}

        <div className="flex flex-col items-center bg-sage/60 px-6 pb-5 pt-7">
          <div className="cookie-logo relative">
            <span className="cookie-halo absolute inset-0 rounded-full" aria-hidden="true" />
            <img
              src="/media/site/logo-mark.webp"
              alt="Salud Inteligente"
              width={96}
              height={78}
              className="relative h-[78px] w-auto"
            />
          </div>
          <h2 id="cookie-title" className="mt-4 font-display text-h4 font-bold text-forest">
            Tu privacidad
          </h2>
        </div>

        <div className="px-6 pt-5 text-center">
          <p className="text-body text-muted">
            Guardamos en tu navegador solo lo necesario para que la tienda funcione, como tu
            carrito. Si lo permites, también recordamos tu conversación con el asesor mientras
            navegas. No usamos publicidad ni analítica de terceros.
          </p>
          <Link to="/cookies" onClick={() => setOpen(false)} className="mt-2 inline-block text-meta font-medium text-leaf hover:underline">
            Política de cookies
          </Link>
        </div>

        {showPreferences && (
          <div className="mx-6 mt-4 space-y-2">
            <PreferenceRow
              title="Necesarias"
              description="Carrito, sesión del panel y esta elección."
              checked
              locked
            />
            <PreferenceRow
              title="Funcionales"
              description="Recordar tu conversación con el asesor IA en esta pestaña."
              checked={functional}
              onChange={() => setFunctional((value) => !value)}
            />
          </div>
        )}

        <div className="flex flex-col gap-2 px-6 pb-5 pt-5">
          {showPreferences ? (
            <button type="button" onClick={() => decide({ functional })} className="rounded-pill bg-forest px-4 py-3 text-body font-medium text-white hover:bg-forest/90">
              Guardar preferencias
            </button>
          ) : (
            <>
              <button type="button" onClick={() => decide({ functional: true })} className="rounded-pill bg-forest px-4 py-3 text-body font-medium text-white hover:bg-forest/90">
                Aceptar todas
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => decide({ functional: false })} className="rounded-pill border border-line bg-white px-4 py-2.5 text-body font-medium text-ink hover:border-forest">
                  Solo necesarias
                </button>
                <button type="button" onClick={() => setShowPreferences(true)} className="rounded-pill border border-line bg-white px-4 py-2.5 text-body font-medium text-ink hover:border-forest">
                  Preferencias
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 border-t border-line bg-white px-4 pb-3 pt-3">
          <span className="text-[11px] font-medium text-muted">Diseñado y mantenido por</span>
          <a href="https://github.com/Macreat" target="_blank" rel="noopener noreferrer" aria-label="Macreat en GitHub">
            <img src="/media/site/macreat.webp" alt="Macreat" width={120} height={50} className="cookie-signature h-[50px] w-auto" />
          </a>
        </div>
      </div>
    </div>
  );
}

function PreferenceRow({
  title,
  description,
  checked,
  locked = false,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  locked?: boolean;
  onChange?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-card border border-line bg-white p-3">
      <div>
        <p className="text-body font-semibold text-ink">{title}</p>
        <p className="text-meta text-muted">{locked ? `${description} Siempre activas.` : description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`Cookies ${title.toLowerCase()}`}
        disabled={locked}
        onClick={onChange}
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-pill transition-colors ${
          checked ? "bg-leaf" : "bg-line"
        } ${locked ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
    </div>
  );
}

/** Small button to reopen the choice later, bottom left (the Netlify badge lives bottom right). */
export function CookieSettingsButton() {
  const [decided, setDecided] = useState(() => readConsent() !== null);

  useEffect(() => {
    const update = () => setDecided(readConsent() !== null);
    window.addEventListener("si-consent-change", update);
    return () => window.removeEventListener("si-consent-change", update);
  }, []);

  if (!decided) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("si-open-cookies"))}
      aria-label="Preferencias de cookies"
      title="Preferencias de cookies"
      className="fixed bottom-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper text-muted shadow-md hover:text-forest"
    >
      <Cookie size={18} strokeWidth={1.75} />
    </button>
  );
}
