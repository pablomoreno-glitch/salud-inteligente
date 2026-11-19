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
const loaded = vi.hoisted(() => ({
  needs: {
    data: [
      { slug: "sueno", name: "Sueño", image_url: "/s.webp", product_count: 4 },
      { slug: "energia", name: "Energía", image_url: "/e.webp", product_count: 6 },
    ],
    isLoading: false,
    isError: false,
    refetch: () => {},
  },
  categories: {
    data: [{ slug: "capsulas", name: "Cápsulas", tagline: "Frascos", product_count: 9 }],
    isLoading: false,
    isError: false,
    refetch: () => {},
  },
}));
let withData = false;
vi.mock("../lib/queries", () => ({
  useBusiness: () => idle,
  useCategories: () => (withData ? loaded.categories : idle),
  useNeeds: () => (withData ? loaded.needs : idle),
  useProducts: () => idle,
  useProduct: () => idle,
}));

/** matchMedia where only the listed fragments match (e.g. "min-width", "hover: hover", "reduce"). */
function stubMedia(matching: string[]) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: matching.some((fragment) => query.includes(fragment)),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function renderHome() {
  return render(
    <AdvisorContext.Provider value={{ open: vi.fn(), sendMessage: vi.fn() } as unknown as AdvisorContextValue}>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </AdvisorContext.Provider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  withData = false;
});

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

describe("Home layouts by screen", () => {
  it("below lg renders the needs grid and no pinned track or pointer follower", () => {
    withData = true;
    stubMedia(["hover: hover"]);
    const { container } = renderHome();

    expect(container.querySelector("[data-needs-grid]")).not.toBeNull();
    expect(container.querySelector("[data-needs-track]")).toBeNull();
    expect(container.querySelector("[data-pointer-follower]")).toBeNull();
  });

  it("at lg with motion pins the needs gallery and mounts the pointer follower", () => {
    withData = true;
    stubMedia(["min-width", "hover: hover"]);
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    const { container } = renderHome();

    expect(container.querySelector("[data-needs-grid]")).toBeNull();
    expect(container.querySelectorAll("[data-need-card]")).toHaveLength(2);
    expect(container.querySelector("[data-pointer-follower]")).not.toBeNull();
  });

  it("at lg with reduced motion shows the hero, needs and categories without hidden states or a follower", () => {
    withData = true;
    stubMedia(["min-width", "hover: hover", "reduce"]);
    const { container } = renderHome();

    expect(container.querySelector("[data-needs-grid]")).not.toBeNull();
    expect(container.querySelector("[data-needs-track]")).toBeNull();
    expect(container.querySelector("[data-pointer-follower]")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    expect(screen.getByText("Sueño")).toBeVisible();
    expect(screen.getByText("Cápsulas")).toBeVisible();
    for (const el of container.querySelectorAll<HTMLElement>("[data-reveal], [data-fade], [data-line], [data-depth], [data-bob], .hero-frame")) {
      expect(el.style.opacity).not.toBe("0");
      expect(el.style.transform).toBe("");
      expect(el.style.clipPath).toBe("");
    }
  });
});
