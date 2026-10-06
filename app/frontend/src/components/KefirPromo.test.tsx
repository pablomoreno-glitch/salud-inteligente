import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdvisorContext, type AdvisorContextValue } from "../context/advisor";
import { formatPrice } from "../lib/format";
import { KEFIR_SLUG, kefirOrderMessage } from "../lib/kefir";
import { KefirPromo } from "./KefirPromo";

// jsdom has no layout or scrolling, so the entrance timeline and the float are replaced with no-ops.
const timeline = { add: () => timeline };
vi.mock("animejs", () => ({
  animate: () => ({ play: () => {} }),
  createScope: () => ({ add: (setup: () => void) => (setup(), { revert: () => {} }) }),
  createTimeline: () => timeline,
  onScroll: () => ({}),
  stagger: () => 0,
  utils: { set: () => {} },
}));

// The kefir's catalog entry; null stands for a catalog that does not have it (or failed to load).
let kefirProduct: { slug: string; price: number | null } | null = { slug: KEFIR_SLUG, price: 20000 };
vi.mock("../lib/queries", () => ({
  useProduct: () => ({ data: kefirProduct ?? undefined }),
}));

function renderPromo(whatsapp: string | null = "573043486001") {
  const sendMessage = vi.fn();
  render(
    <MemoryRouter>
      <AdvisorContext.Provider value={{ sendMessage } as unknown as AdvisorContextValue}>
        <KefirPromo whatsapp={whatsapp} />
      </AdvisorContext.Provider>
    </MemoryRouter>,
  );
  return { sendMessage };
}

function whatsappText(): string {
  const href = screen.getByRole("link", { name: "Pedir por WhatsApp" }).getAttribute("href")!;
  return new URL(href).searchParams.get("text")!;
}

describe("KefirPromo", () => {
  beforeEach(() => {
    kefirProduct = { slug: KEFIR_SLUG, price: 20000 };
  });

  it("shows the poster and every benefit", () => {
    renderPromo();
    expect(screen.getByRole("heading", { name: "Kefir Casero" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Kefir Casero/ })).toHaveAttribute("src", expect.stringContaining("promo-kefir"));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("orders one liter through the business WhatsApp with the price", () => {
    renderPromo();
    const link = screen.getByRole("link", { name: "Pedir por WhatsApp" });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/573043486001\?text=/);
    expect(whatsappText()).toBe(kefirOrderMessage(1, 20000));
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("$ 20.000");
  });

  it("adds liters and carries them and the total into the WhatsApp order", () => {
    renderPromo();
    fireEvent.click(screen.getByRole("button", { name: "Aumentar cantidad" }));
    fireEvent.click(screen.getByRole("button", { name: "Aumentar cantidad" }));
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("$ 60.000");
    expect(whatsappText()).toContain("3 litros");
    expect(whatsappText()).toContain(`total ${formatPrice(60000)}`);
  });

  it("links to the kefir's page in the catalog", () => {
    renderPromo();
    expect(screen.getByRole("link", { name: /Ver en el catálogo/ })).toHaveAttribute("href", `/producto/${KEFIR_SLUG}`);
  });

  it("still takes WhatsApp orders by liters when the catalog has no kefir", () => {
    kefirProduct = null;
    renderPromo();
    expect(screen.queryByRole("link", { name: /Ver en el catálogo/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Total")).not.toBeInTheDocument();
    expect(whatsappText()).toBe("Hola, quiero pedir 1 litro de Kefir Casero. ¿Me confirmas el pedido?");
  });

  it("hides the WhatsApp order when the business has no number", () => {
    renderPromo(null);
    expect(screen.queryByRole("link", { name: "Pedir por WhatsApp" })).not.toBeInTheDocument();
  });

  it("asks the advisor about kefir", () => {
    const { sendMessage } = renderPromo();
    fireEvent.click(screen.getByRole("button", { name: "Preguntar al asesor" }));
    expect(sendMessage).toHaveBeenCalledWith(expect.stringMatching(/kefir/i));
  });
});
