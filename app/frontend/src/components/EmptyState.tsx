import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { useAdvisor } from "../context/advisor";

interface EmptyStateProps {
  title: string;
  description?: string;
  children?: ReactNode;
  showAdvisorButton?: boolean;
}

export function EmptyState({
  title,
  description,
  children,
  showAdvisorButton = false,
}: EmptyStateProps) {
  const advisor = useAdvisor();

  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-white px-6 py-12 text-center">
      <p className="text-body-lg font-semibold text-ink">{title}</p>
      {description && <p className="text-body text-muted">{description}</p>}
      {children}
      {showAdvisorButton && (
        <button
          type="button"
          onClick={advisor.open}
          className="mt-2 flex items-center gap-2 rounded-pill bg-forest px-4 py-2 text-body font-medium text-white hover:bg-forest/90"
        >
          <Sparkles size={18} strokeWidth={1.75} />
          Pregúntale al asesor
        </button>
      )}
    </div>
  );
}
