import { afterEach, describe, expect, it } from "vitest";
import { rememberIntroSeen, resetIntroPolicy, shouldPlayIntro } from "./introPolicy";

afterEach(() => resetIntroPolicy());

describe("introPolicy", () => {
  it("plays on a fresh page load", () => {
    expect(shouldPlayIntro(false)).toBe(true);
  });

  it("does not replay within the same page load", () => {
    rememberIntroSeen();
    expect(shouldPlayIntro(false)).toBe(false);
  });

  it("plays again on the next page load, even in the same browser session", () => {
    rememberIntroSeen();
    resetIntroPolicy();
    expect(shouldPlayIntro(false)).toBe(true);
  });

  it("never plays with reduced motion", () => {
    expect(shouldPlayIntro(true)).toBe(false);
  });
});
