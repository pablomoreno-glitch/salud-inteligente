import type { AvailabilityStatus } from "../types";

const LABELS: Record<AvailabilityStatus, string> = {
  available: "Disponible",
  low: "Pocas unidades",
  out: "Agotado",
};

const STYLES: Record<AvailabilityStatus, string> = {
  available: "bg-leaf/10 text-leaf border-leaf/30",
  low: "bg-warn/10 text-warn border-warn/30",
  out: "bg-danger/10 text-danger border-danger/30",
};

export function AvailabilityPill({ status }: { status: AvailabilityStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-pill border px-3 py-1 text-meta font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
