import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "No pudimos cargar esta información. Intenta de nuevo.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-white px-6 py-10 text-center">
      <AlertTriangle size={28} strokeWidth={1.75} className="text-danger" />
      <p className="text-body text-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-pill border border-forest px-4 py-2 text-body font-medium text-forest hover:bg-forest hover:text-white"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
