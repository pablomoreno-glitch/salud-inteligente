/**
 * The intro plays on every page load (a new visit, a new tab or a reload), but only once per
 * load: navigating back to the home page inside the app does not replay it. It never plays
 * when the visitor asks for reduced motion.
 */
let seenThisLoad = false;

export function shouldPlayIntro(reducedMotion: boolean): boolean {
  return !reducedMotion && !seenThisLoad;
}

export function rememberIntroSeen(): void {
  seenThisLoad = true;
}

/** Test hook: forget that the intro played, as a fresh page load would. */
export function resetIntroPolicy(): void {
  seenThisLoad = false;
}
