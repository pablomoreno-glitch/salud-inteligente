import { Minus, Plus } from "lucide-react";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
}: QuantityStepperProps) {
  return (
    <div className="inline-flex items-center rounded-pill border border-line bg-white">
      <button
        type="button"
        aria-label="Disminuir cantidad"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-9 w-9 items-center justify-center text-ink disabled:opacity-40"
      >
        <Minus size={16} strokeWidth={1.75} />
      </button>
      <span className="w-8 text-center text-body font-medium" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Aumentar cantidad"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-9 w-9 items-center justify-center text-ink disabled:opacity-40"
      >
        <Plus size={16} strokeWidth={1.75} />
      </button>
    </div>
  );
}
