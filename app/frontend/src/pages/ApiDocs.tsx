import { useState } from "react";
import { ChevronDown, Play } from "lucide-react";
import { groupedEndpoints, type ApiEndpoint, type HttpMethod } from "../lib/endpoints";
import { api, ApiError } from "../lib/api";

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: "bg-leaf/15 text-leaf",
  POST: "bg-forest/15 text-forest",
  PUT: "bg-warn/15 text-warn",
  PATCH: "bg-warn/15 text-warn",
  DELETE: "bg-danger/15 text-danger",
};

interface TryResult {
  status: number;
  latencyMs: number;
  body: string;
}

function EndpointRow({ endpoint }: { endpoint: ApiEndpoint }) {
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<TryResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  async function handleTry() {
    setIsRunning(true);
    const start = performance.now();
    try {
      const data = await api.get(endpoint.path);
      setResult({
        status: 200,
        latencyMs: Math.round(performance.now() - start),
        body: JSON.stringify(data, null, 2),
      });
    } catch (error) {
      setResult({
        status: error instanceof ApiError ? error.status : 0,
        latencyMs: Math.round(performance.now() - start),
        body:
          error instanceof ApiError
            ? JSON.stringify({ error: error.message }, null, 2)
            : "No se pudo conectar con la API.",
      });
    } finally {
      setIsRunning(false);
    }
  }

  const canTry = endpoint.tryable && endpoint.method === "GET" && !endpoint.admin;

  return (
    <div className="rounded-card border border-line bg-white">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className={`w-16 shrink-0 rounded-control px-2 py-1 text-center text-meta font-semibold ${METHOD_STYLES[endpoint.method]}`}
        >
          {endpoint.method}
        </span>
        <code className="flex-1 truncate font-mono text-body text-ink">
          /api{endpoint.path}
        </code>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className={`shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-line px-4 py-4">
          <p className="text-body text-muted">{endpoint.description}</p>
          <div>
            <p className="text-meta font-medium text-muted">Ejemplo de respuesta</p>
            <pre className="mt-1 overflow-x-auto rounded-control bg-ink px-3 py-2 text-meta text-white">
              {endpoint.example}
            </pre>
          </div>

          {canTry && (
            <div>
              <button
                type="button"
                onClick={handleTry}
                disabled={isRunning}
                className="flex items-center gap-2 rounded-pill bg-forest px-4 py-2 text-body font-medium text-white disabled:opacity-60"
              >
                <Play size={16} strokeWidth={1.75} />
                {isRunning ? "Probando..." : "Probar"}
              </button>

              {result && (
                <div className="mt-3">
                  <p className="text-meta text-muted">
                    Estado {result.status} · {result.latencyMs} ms
                  </p>
                  <pre className="mt-1 max-h-64 overflow-auto rounded-control bg-ink px-3 py-2 text-meta text-white">
                    {result.body}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ApiDocs() {
  const groups = groupedEndpoints();
  const publicGroups = Object.entries(groups).filter(
    ([, items]) => !items.every((item) => item.admin),
  );
  const adminGroup = groups["Administración"] ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-h3 font-bold text-ink">
        API de Salud Inteligente
      </h1>
      <p className="mt-3 text-body-lg text-muted">
        URL base <code className="font-mono">/api</code>. La arquitectura combina
        una puerta de enlace y microservicios de dominio. Todas las respuestas
        son JSON y algunas rutas tienen límites de solicitudes por minuto.
      </p>

      <div className="mt-8 space-y-8">
        {publicGroups.map(([group, items]) => (
          <div key={group}>
            <h2 className="text-body-lg font-semibold text-ink">{group}</h2>
            <div className="mt-3 space-y-3">
              {items
                .filter((item) => !item.admin)
                .map((endpoint) => (
                  <EndpointRow key={`${endpoint.method}-${endpoint.path}`} endpoint={endpoint} />
                ))}
            </div>
          </div>
        ))}
      </div>

      {adminGroup.length > 0 && (
        <div className="mt-10">
          <h2 className="text-body-lg font-semibold text-ink">
            Administración (requiere token de administrador)
          </h2>
          <div className="mt-3 space-y-3">
            {adminGroup.map((endpoint) => (
              <EndpointRow key={`${endpoint.method}-${endpoint.path}`} endpoint={endpoint} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
