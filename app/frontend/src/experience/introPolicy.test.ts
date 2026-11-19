import { afterEach, describe, expect, it, vi } from "vitest";
import { INTRO_SEEN_KEY, rememberIntroSeen, shouldPlayIntro } from "./introPolicy";

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("introPolicy", () => {
  it("plays on the first visit", () => {
    expect(shouldPlayIntro(false)).toBe(true);
  });

  it("does not play again once it has been seen", () => {
    rememberIntroSeen();
    expect(sessionStorage.getItem(INTRO_SEEN_KEY)).toBe("1");
    expect(shouldPlayIntro(false)).toBe(false);
  });

  it("never plays with reduced motion", () => {
    expect(shouldPlayIntro(true)).toBe(false);
  });

  it("plays when storage throws, and remembering does not throw", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(shouldPlayIntro(false)).toBe(true);
    expect(() => rememberIntroSeen()).not.toThrow();
  });
});
