// Cookie and local-storage consent. The site only stores what it needs to work
// (cart, admin session, this choice) plus one optional convenience: keeping the
// advisor conversation while the tab is open. No analytics or advertising.

export const CONSENT_KEY = "si_cookie_consent";
const CONSENT_VERSION = 1;

export interface ConsentChoice {
  functional: boolean;
}

export function readConsent(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; functional?: boolean };
    if (parsed.version !== CONSENT_VERSION) return null;
    return { functional: Boolean(parsed.functional) };
  } catch {
    return null;
  }
}

export function saveConsent(choice: ConsentChoice): void {
  try {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ version: CONSENT_VERSION, ...choice, at: new Date().toISOString() }),
    );
  } catch {
    // Storage blocked (private mode): the banner simply shows again next visit.
  }
  window.dispatchEvent(new Event("si-consent-change"));
}

export function functionalAllowed(): boolean {
  return readConsent()?.functional === true;
}
