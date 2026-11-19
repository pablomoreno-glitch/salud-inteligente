import { useEffect, useRef, useState } from "react";
import { useAdvisor } from "../context/advisor";
import { whenIntroDone } from "../lib/introSignal";

const INTERACTIVE = "a, button, input, textarea, select, label, summary, [role='button']";
const RING = 36;

function isTyping(): boolean {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el instanceof HTMLElement && el.isContentEditable);
}

/**
 * A small dot and a looser ring that trail the pointer on desktop. Over links and buttons the ring
 * grows and takes a leaf tint; over an element with `data-cursor="Word"` it grows further and
 * shows that word. It hides when the pointer leaves the window, while typing, and while the intro
 * or the advisor is open. The native cursor stays visible. Decorative: aria-hidden, no pointer events.
 */
export function PointerFollower() {
  const advisor = useAdvisor();
  const [introDone, setIntroDone] = useState(false);
  const [inWindow, setInWindow] = useState(false);
  const [typing, setTyping] = useState(false);
  const [hover, setHover] = useState<"none" | "link" | "label">("none");
  const [label, setLabel] = useState("");
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => whenIntroDone(() => setIntroDone(true)), []);

  useEffect(() => {
    const point = { x: -100, y: -100 };
    const dotPos = { x: -100, y: -100 };
    const ringPos = { x: -100, y: -100 };
    let frame = 0;

    const tick = () => {
      dotPos.x += (point.x - dotPos.x) * 0.4;
      dotPos.y += (point.y - dotPos.y) * 0.4;
      ringPos.x += (point.x - ringPos.x) * 0.16;
      ringPos.y += (point.y - ringPos.y) * 0.16;
      if (dot.current) dot.current.style.transform = `translate3d(${dotPos.x - 5}px, ${dotPos.y - 5}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${ringPos.x - RING / 2}px, ${ringPos.y - RING / 2}px, 0)`;
      const settled = Math.abs(point.x - ringPos.x) < 0.1 && Math.abs(point.y - ringPos.y) < 0.1;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };

    const classify = (target: Element | null) => {
      const cursor = target?.closest<HTMLElement>("[data-cursor]");
      if (cursor) {
        setHover("label");
        setLabel(cursor.dataset.cursor ?? "");
      } else {
        setHover(target?.closest(INTERACTIVE) ? "link" : "none");
      }
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (!frame && dotPos.x === -100) {
        dotPos.x = ringPos.x = event.clientX;
        dotPos.y = ringPos.y = event.clientY;
      }
      point.x = event.clientX;
      point.y = event.clientY;
      setInWindow(true);
      classify(event.target instanceof Element ? event.target : null);
      if (!frame) frame = requestAnimationFrame(tick);
    };
    // Scrolling moves content under a still pointer, so look again at what is there.
    let scrollFrame = 0;
    const onScroll = () => {
      if (scrollFrame || point.x < 0) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        classify(document.elementFromPoint(point.x, point.y));
      });
    };
    const onLeave = () => setInWindow(false);
    const onFocus = () => setTyping(isTyping());

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onFocus);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onFocus);
      cancelAnimationFrame(frame);
    };
  }, []);

  const visible = introDone && inWindow && !typing && !advisor.isOpen;
  const scale = hover === "label" ? 2 : hover === "link" ? 56 / RING : 1;

  return (
    <div data-pointer-follower aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60]">
      <div
        ref={ring}
        className={`absolute left-0 top-0 flex items-center justify-center transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
        style={{ width: RING, height: RING }}
      >
        <div
          className={`absolute inset-0 rounded-full border border-leaf transition-[transform,background-color] duration-300 ease-out ${hover === "none" ? "bg-transparent" : hover === "label" ? "bg-paper/85" : "bg-leaf/15"}`}
          style={{ transform: `scale(${scale})` }}
        />
        <span
          className={`relative whitespace-nowrap text-[11px] font-medium uppercase tracking-wide text-forest transition-opacity duration-200 ${hover === "label" ? "opacity-100" : "opacity-0"}`}
        >
          {label}
        </span>
      </div>
      <div
        ref={dot}
        className={`absolute left-0 top-0 h-2.5 w-2.5 rounded-full bg-forest transition-opacity duration-200 ${visible && hover !== "label" ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
