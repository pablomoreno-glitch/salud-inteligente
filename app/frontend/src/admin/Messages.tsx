import { useState } from "react";
import { useAdminMessages, useUpdateMessage } from "./queries";
import { formatDateTime } from "../lib/format";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";

const STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  read: "Leído",
  archived: "Archivado",
};

export function Messages() {
  const [status, setStatus] = useState("");
  const messages = useAdminMessages({ status: status || undefined });
  const updateMessage = useUpdateMessage();

  return (
    <div>
      <h1 className="font-display text-h3 font-bold text-ink">Mensajes</h1>

      <div className="mt-4 flex gap-2">
        {["", "new", "read", "archived"].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`rounded-pill border px-4 py-1.5 text-body ${
              status === value
                ? "border-forest bg-forest text-white"
                : "border-line bg-white text-ink hover:border-leaf"
            }`}
          >
            {value === "" ? "Todos" : STATUS_LABELS[value]}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {messages.isLoading && <Skeleton className="h-32 w-full" />}
        {messages.isError && (
          <ErrorState onRetry={() => messages.refetch()} message="No pudimos cargar los mensajes." />
        )}
        {messages.data && messages.data.items.length === 0 && (
          <p className="text-body text-muted">No hay mensajes con este filtro.</p>
        )}
        {messages.data?.items.map((message) => (
          <div key={message.id} className="rounded-card border border-line bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-body font-semibold text-ink">{message.name}</p>
                <p className="text-meta text-muted">
                  {[message.phone, message.email].filter(Boolean).join(" · ")} ·{" "}
                  {formatDateTime(message.created_at)}
                </p>
              </div>
              <span className="rounded-pill bg-sage px-3 py-1 text-meta font-medium text-forest">
                {STATUS_LABELS[message.status]}
              </span>
            </div>
            <p className="mt-2 text-body text-ink">{message.message}</p>
            <div className="mt-3 flex gap-2">
              {message.status !== "read" && (
                <button
                  type="button"
                  onClick={() => updateMessage.mutate({ id: message.id, status: "read" })}
                  className="rounded-pill border border-line px-3 py-1.5 text-meta text-ink hover:border-leaf"
                >
                  Marcar como leído
                </button>
              )}
              {message.status !== "archived" && (
                <button
                  type="button"
                  onClick={() => updateMessage.mutate({ id: message.id, status: "archived" })}
                  className="rounded-pill border border-line px-3 py-1.5 text-meta text-ink hover:border-leaf"
                >
                  Archivar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
