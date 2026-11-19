import type { ReactNode } from "react";

/** A section heading whose text rises out of an overflow mask when `useReveal` plays it. */
export function RevealHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 data-reveal="heading" className={className}>
      <span className="block overflow-hidden pb-1">
        <span data-rise className="block">
          {children}
        </span>
      </span>
    </h2>
  );
}
