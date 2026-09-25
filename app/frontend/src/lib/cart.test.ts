import { afterEach, describe, expect, it } from "vitest";
import { getCartToken, setCartToken } from "./cart";

describe("cart token helper", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("returns null when no token is stored", () => {
    expect(getCartToken()).toBeNull();
  });

  it("persists a token to localStorage", () => {
    setCartToken("abc-123");
    expect(getCartToken()).toBe("abc-123");
    expect(localStorage.getItem("si_cart_token")).toBe("abc-123");
  });

  it("removes the token when set to null", () => {
    setCartToken("abc-123");
    setCartToken(null);
    expect(getCartToken()).toBeNull();
  });
});
