import { describe, expect, it } from "vitest";
import { matchesSearch, normalizeSearch } from "./filters";

describe("admin search", () => {
  it("ignores accents and case", () => {
    expect(normalizeSearch("  Colágeno MARINO ")).toBe("colageno marino");
    expect(matchesSearch("colageno", "Colágeno Marino")).toBe(true);
  });

  it("matches any of the fields, like the ref", () => {
    expect(matchesSearch("vw-158", "Magnesium Complex", "VW-158")).toBe(true);
    expect(matchesSearch("zzz", "Magnesium Complex", "VW-158")).toBe(false);
  });

  it("an empty query matches everything", () => {
    expect(matchesSearch("", "anything")).toBe(true);
  });
});
