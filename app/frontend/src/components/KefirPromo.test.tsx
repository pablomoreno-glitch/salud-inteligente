import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdvisorContext, type AdvisorContextValue } from "../context/advisor";
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

function renderPromo(whatsapp: string | null = "573043486001") {
  const sendMessage = vi.fn();
  render(
    <AdvisorContext.Provider value={{ sendMessage } as unknown as AdvisorContextValue}>
      <KefirPromo whatsapp={whatsapp} />
    </AdvisorContext.Provider>,
  );
  return { sendMessage };
}

describe("KefirPromo", () => {
  it("shows the poster and every benefit", () => {
    renderPromo();
    expect(screen.getByRole("heading", { name: "Kefir Casero" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Kefir Casero/ })).toHaveAttribute("src", expect.stringContaining("promo-kefir"));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("orders through the business WhatsApp with a prefilled message", () => {
    renderPromo();
    const link = screen.getByRole("link", { name: "Pedir por WhatsApp" });
    expect(link.getAttribute("href")).toBe(
      `https://wa.me/573043486001?text=${encodeURIComponent("Hola, quiero pedir Kefir Casero.")}`,
    );
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
