import { describe, expect, it } from "vitest";
import { endpoints, groupedEndpoints } from "./endpoints";

describe("endpoints", () => {
  it("has at least one endpoint", () => {
    expect(endpoints.length).toBeGreaterThan(0);
  });

  it("has no duplicate method+path combinations", () => {
    const seen = new Set<string>();
    for (const endpoint of endpoints) {
      const key = `${endpoint.method} ${endpoint.path}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("every endpoint has a non-empty description, example, group and path", () => {
    for (const endpoint of endpoints) {
      expect(endpoint.path.startsWith("/")).toBe(true);
      expect(endpoint.description.length).toBeGreaterThan(0);
      expect(endpoint.example.length).toBeGreaterThan(0);
      expect(endpoint.group.length).toBeGreaterThan(0);
    }
  });

  it("only marks tryable endpoints as public GET requests", () => {
    for (const endpoint of endpoints) {
      if (endpoint.tryable) {
        expect(endpoint.method).toBe("GET");
        expect(endpoint.admin).toBeFalsy();
      }
    }
  });

  it("groups endpoints without losing any entry", () => {
    const groups = groupedEndpoints();
    const total = Object.values(groups).reduce((sum, items) => sum + items.length, 0);
    expect(total).toBe(endpoints.length);
  });
});
