import { beforeEach, describe, expect, it } from "vitest";
import { CONSENT_KEY, functionalAllowed, readConsent, saveConsent } from "./consent";

describe("consent", () => {
  beforeEach(() => localStorage.clear());

  it("is unknown until the visitor chooses", () => {
    expect(readConsent()).toBeNull();
    expect(functionalAllowed()).toBe(false);
  });

  it("remembers the choice", () => {
    saveConsent({ functional: true });
    expect(readConsent()).toEqual({ functional: true });
    expect(functionalAllowed()).toBe(true);
  });

  it("ignores choices saved by an older version of the banner", () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: 0, functional: true }));
    expect(readConsent()).toBeNull();
  });
});
