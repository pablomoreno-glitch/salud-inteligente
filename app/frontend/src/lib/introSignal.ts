/**
 * The home intro and the first-visit dialogs (cookie consent) must not overlap.
 * The intro marks itself as playing before its first paint and signals when it ends;
 * anything that wants to wait for it uses whenIntroDone.
 */

const EVENT = "si-intro-done";

export function markIntroPlaying(): void {
  document.documentElement.dataset.intro = "playing";
}

export function markIntroDone(): void {
  if (document.documentElement.dataset.intro !== "playing") return;
  delete document.documentElement.dataset.intro;
  window.dispatchEvent(new Event(EVENT));
}

export function isIntroPlaying(): boolean {
  return document.documentElement.dataset.intro === "playing";
}

/** Runs callback once the intro is over (right away if none is playing). Returns a cleanup. */
export function whenIntroDone(callback: () => void): () => void {
  if (!isIntroPlaying()) {
    callback();
    return () => undefined;
  }
  const handler = () => callback();
  window.addEventListener(EVENT, handler, { once: true });
  return () => window.removeEventListener(EVENT, handler);
}
