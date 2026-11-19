import { useEffect, useRef } from "react";

const ITEMS = ["Natural", "Registro INVIMA", "Asesor con IA", "Pedidos por WhatsApp"];
const IDLE_SPEED = 1; // 1 = one loop in LOOP_SECONDS, leftward.
const LOOP_SECONDS = 40;

function Sequence() {
  return (
    <>
      {ITEMS.map((item, index) => (
        <span key={item} className="flex shrink-0 items-center">
          <span className={index % 2 === 0 ? "text-outline" : "text-leaf"}>{item}</span>
          <span className="px-8 text-leaf">·</span>
        </span>
      ))}
    </>
  );
}

/**
 * A full-width band of outlined display text that drifts left on its own. Scrolling down pushes it
 * faster to the left, scrolling up nudges it to the right, then it eases back to the idle speed.
 * The content is two identical halves so the loop is seamless. Hidden from screen readers, with the
 * same items in a visually hidden sentence. Without `motion` it is a static strip.
 */
export function MarqueeBand({ motion }: { motion: boolean }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || !motion) return undefined;
    const band = el.parentElement as HTMLElement;

    let offset = 0; // 0 .. -half, wraps.
    let speed = IDLE_SPEED;
    let boost = 0;
    let lastY = window.scrollY;
    let last = performance.now();
    let visible = true;
    let frame = 0;

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const y = window.scrollY;
      const velocity = dt > 0 ? (y - lastY) / dt : 0; // px/s, positive when scrolling down
      lastY = y;
      // Scroll velocity becomes a bounded boost (down = leftward = positive), decaying back to idle.
      const impulse = Math.max(-6, Math.min(8, velocity / 400));
      boost += (impulse - boost) * Math.min(1, dt * 4);
      speed = IDLE_SPEED + boost;
      const half = el.scrollWidth / 2;
      offset -= (half / LOOP_SECONDS) * speed * dt;
      if (offset <= -half) offset += half;
      else if (offset > 0) offset -= half;
      el.style.transform = `translate3d(${offset.toFixed(2)}px, 0, 0)`;
      frame = visible ? requestAnimationFrame(tick) : 0;
    };

    // The loop sleeps while the band is off screen.
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) {
        last = performance.now();
        lastY = window.scrollY;
        frame = requestAnimationFrame(tick);
      }
    });
    observer?.observe(band);
    frame = requestAnimationFrame(tick);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      el.style.removeProperty("transform");
    };
  }, [motion]);

  return (
    <section aria-label="Lo que nos distingue" className="hidden overflow-hidden border-b border-line bg-paper py-8 lg:block xl:py-10">
      <p className="sr-only">Natural, registro INVIMA, asesor con IA y pedidos por WhatsApp.</p>
      <div aria-hidden="true" className="overflow-hidden">
        <div ref={track} className="flex w-max font-display text-marquee font-bold leading-[1.3] will-change-transform">
          <Sequence />
          <Sequence />
          <Sequence />
          <Sequence />
        </div>
      </div>
    </section>
  );
}
