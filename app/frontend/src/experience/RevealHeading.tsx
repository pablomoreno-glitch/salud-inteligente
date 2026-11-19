import type { ReactNode } from "react";

/** A section heading whose text rises out of an overflow mask when `useReveal` plays it. */
export function RevealHeading({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <h2 id={id} data-reveal="heading" className={className}>
      <span className="block overflow-hidden pb-1">
        <span data-rise className="block">
          {children}
        </span>
      </span>
    </h2>
  );
}
