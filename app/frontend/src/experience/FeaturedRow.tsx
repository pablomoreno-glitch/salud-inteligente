import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "../types";
import { ProductCard } from "../components/ProductCard";
import { DESKTOP, useMediaQuery } from "../lib/useMediaQuery";
import { RevealHeading } from "./RevealHeading";

const DRAG_THRESHOLD = 6;
const MAX_TILT = 4;
const FADE = 56;

/**
 * "Destacados". The row always scrolls natively. On desktop it adds previous and next buttons,
 * drag to scroll with the mouse, fade masks on the sides that still have content, and (with a fine
 * pointer and motion) a gentle 3D tilt on the card under the pointer.
 */
export function FeaturedRow({ products, tilt, smooth }: { products: Product[]; tilt: boolean; smooth: boolean }) {
  const desktop = useMediaQuery(DESKTOP);
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ active: false, moved: false, startX: 0, startScroll: 0 });

  const updateEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const start = el.scrollLeft <= 2;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setEdges((previous) => (previous.start === start && previous.end === end ? previous : { start, end }));
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [products, updateEdges]);

  function scrollByCard(direction: 1 | -1) {
    const el = scroller.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: direction * (first.offsetWidth + gap), behavior: smooth ? "smooth" : "auto" });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || !scroller.current) return;
    drag.current = { active: true, moved: false, startX: event.clientX, startScroll: scroller.current.scrollLeft };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = scroller.current;
    const state = drag.current;
    if (el && state.active) {
      const delta = event.clientX - state.startX;
      if (!state.moved && Math.abs(delta) > DRAG_THRESHOLD) {
        state.moved = true;
        setDragging(true);
        el.setPointerCapture(event.pointerId);
      }
      if (state.moved) el.scrollLeft = state.startScroll - delta;
      return;
    }
    if (!tilt || event.pointerType !== "mouse") return;
    const card = (event.target as HTMLElement).closest<HTMLElement>("[data-tilt]");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(900px) rotateX(${(-y * 2 * MAX_TILT).toFixed(2)}deg) rotateY(${(x * 2 * MAX_TILT).toFixed(2)}deg)`;
  }

  function endDrag() {
    drag.current.active = false;
    setDragging(false);
  }

  // A drag must not end in a click on the card it started over.
  function swallowClick(event: React.MouseEvent) {
    if (drag.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = false;
    }
  }

  const mask = `linear-gradient(to right, ${edges.start ? "#000" : "transparent"} 0, #000 ${FADE}px, #000 calc(100% - ${FADE}px), ${edges.end ? "#000" : "transparent"} 100%)`;
  const button =
    "flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-forest transition-colors hover:border-leaf hover:text-leaf disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-forest";

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <RevealHeading className="font-display text-h3 font-bold text-ink">Destacados</RevealHeading>
        <div className="hidden gap-2 lg:flex">
          <button type="button" aria-label="Anterior" disabled={edges.start} onClick={() => scrollByCard(-1)} className={button}>
            <ChevronLeft size={20} strokeWidth={1.75} />
          </button>
          <button type="button" aria-label="Siguiente" disabled={edges.end} onClick={() => scrollByCard(1)} className={button}>
            <ChevronRight size={20} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        onScroll={updateEdges}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={swallowClick}
        onDragStart={(event) => event.preventDefault()}
        style={desktop ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
        className={`mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 no-scrollbar lg:-mb-3 lg:mt-3 lg:snap-none lg:py-3 ${
          dragging ? "lg:cursor-grabbing" : "lg:cursor-grab"
        }`}
      >
        {products.map((product) => (
          <div key={product.ref} data-reveal="slide" className="w-52 shrink-0 snap-start sm:w-60">
            <div
              data-tilt
              onPointerLeave={(event) => event.currentTarget.style.removeProperty("transform")}
              className="h-full transition-transform duration-200 ease-out hover:[&_button]:scale-110"
            >
              <ProductCard product={product} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
