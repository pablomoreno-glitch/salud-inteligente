import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdvisorContext, type AdvisorContextValue } from "../context/advisor";
import type { BusinessService } from "../types";
import { ServicesStory } from "./ServicesStory";

// jsdom has no layout or scrolling, so the scroll-driven timeline is replaced with no-ops.
const timeline = { add: () => timeline, set: () => timeline };
vi.mock("animejs", () => ({
  createScope: () => ({ add: (setup: () => void) => (setup(), { revert: () => {} }) }),
  createTimeline: () => timeline,
  onScroll: () => ({}),
  utils: { set: () => {} },
}));

const SERVICES: BusinessService[] = [
  { id: 1, title: "Asesor IA de bienestar", description: "Te recomienda productos.", icon: "sparkles" },
  { id: 2, title: "Catálogo con registro INVIMA", description: "Registro visible.", icon: "shield-check" },
  { id: 3, title: "Pedidos por WhatsApp", description: "Confirma por WhatsApp.", icon: "message-circle" },
  { id: 4, title: "Atención a distribuidoras", description: "Catálogo completo.", icon: "store" },
];

function renderStory(whatsapp: string | null = "573043486001") {
  const open = vi.fn();
  render(
    <AdvisorContext.Provider value={{ open } as unknown as AdvisorContextValue}>
      <MemoryRouter>
        <ServicesStory services={SERVICES} whatsapp={whatsapp} />
      </MemoryRouter>
    </AdvisorContext.Provider>,
  );
  return { open };
}

function preferReducedMotion() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce"),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe("ServicesStory", () => {
  it("renders every service with its action, also with reduced motion", () => {
    preferReducedMotion();
    const { open } = renderStory();

    for (const service of SERVICES) {
      expect(screen.getByRole("heading", { name: service.title })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Ver el catálogo" })).toHaveAttribute("href", "/catalogo");
    expect(screen.getByRole("link", { name: "Ir al carrito" })).toHaveAttribute("href", "/carrito");
    expect(screen.getByRole("link", { name: "Escribir por WhatsApp" }).getAttribute("href")).toMatch(
      /^https:\/\/wa\.me\/573043486001\?text=/,
    );

    fireEvent.click(screen.getByRole("button", { name: "Hablar con el asesor" }));
    expect(open).toHaveBeenCalled();
  });

  it("hides the distributors action when there is no WhatsApp number", () => {
    preferReducedMotion();
    renderStory(null);
    expect(screen.queryByRole("link", { name: "Escribir por WhatsApp" })).not.toBeInTheDocument();
  });
});
