export const INTRO_SEEN_KEY = "si:intro:seen";

/** The intro plays once per browser session, and never when the visitor asks for reduced motion. */
export function shouldPlayIntro(reducedMotion: boolean): boolean {
  if (reducedMotion) return false;
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) !== "1";
  } catch {
    return true;
  }
}

export function rememberIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    /* storage blocked: the intro may play again on the next visit */
  }
}
