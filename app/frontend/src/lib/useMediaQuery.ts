import { useEffect, useState } from "react";

export const DESKTOP = "(min-width: 1024px)";
export const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/** Tracks a media query, updating when it changes. False where matchMedia is unavailable. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return;
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}
