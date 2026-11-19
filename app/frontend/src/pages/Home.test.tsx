import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdvisorContext, type AdvisorContextValue } from "../context/advisor";
import { Home } from "./Home";

vi.mock("animejs", () => {
  const timeline = { add: () => timeline, set: () => timeline, call: () => timeline, play: () => timeline };
  return {
    createScope: () => ({ add: (setup: () => void) => (setup(), { revert: () => {} }), execute: (cb: () => void) => cb() }),
    createTimeline: () => timeline,
    animate: () => ({}),
    onScroll: () => ({}),
    stagger: () => 0,
    utils: { set: () => {} },
  };
});

const idle = { data: undefined, isLoading: false, isError: false, refetch: () => {} };
vi.mock("../lib/queries", () => ({
  useBusiness: () => idle,
  useCategories: () => idle,
  useNeeds: () => idle,
  useProducts: () => idle,
  useProduct: () => idle,
}));

afterEach(() => vi.unstubAllGlobals());

describe("Home with reduced motion", () => {
  it("shows the headline, the form and the chips, none of them held hidden", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const { container } = render(
      <AdvisorContext.Provider value={{ open: vi.fn(), sendMessage: vi.fn() } as unknown as AdvisorContextValue}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </AdvisorContext.Provider>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Suplementos naturales, elegidos para lo que sientes" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Cuéntale al asesor qué necesitas")).toBeVisible();
    for (const chip of ["Me cuesta dormir", "Quiero más energía", "Dolor en las articulaciones"]) {
      expect(screen.getByRole("button", { name: chip })).toBeVisible();
    }
    // Nothing is left with an inline hidden state, and no intro layer is mounted.
    for (const el of container.querySelectorAll<HTMLElement>(".hero-word, .hero-copy, .hero-form, .hero-chip, .hero-frame")) {
      expect(el.style.opacity).not.toBe("0");
      expect(el.style.clipPath).toBe("");
    }
    expect(screen.queryByRole("button", { name: "Saltar intro" })).toBeNull();
  });
});
