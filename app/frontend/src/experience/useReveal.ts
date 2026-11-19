import { useLayoutEffect, useRef, type RefObject } from "react";
import { animate, createScope, stagger, utils, type Scope } from "animejs";

/**
 * Scroll reveals, played once per element as it enters the viewport. Elements opt in with a
 * `data-reveal` attribute:
 *  - "heading": the text inside `[data-rise]` rises out of its overflow mask
 *  - "tile": fades up 24 px while its `img` settles from 1.08 to 1
 *  - "slide": slides in from 40 px to the right
 *  - "row": its `[data-line]` draws left to right, then its `[data-fade]` children fade in
 * Hidden states are set from JavaScript, so everything is visible when scripts fail. Elements that
 * mount after the data loads are picked up after every render. With reduced motion nothing
 * is touched.
 */
export function useReveal(root: RefObject<HTMLElement>, reducedMotion: boolean): void {
  const state = useRef<{ scope: Scope; observer: IntersectionObserver } | null>(null);

  useLayoutEffect(() => {
    const container = root.current;
    if (!container || reducedMotion || typeof IntersectionObserver === "undefined") return undefined;

    const scope = createScope({ root: container });
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
        visible.forEach((entry, index) => {
          observer.unobserve(entry.target);
          scope.execute(() => play(entry.target as HTMLElement, index));
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    state.current = { scope, observer };
    return () => {
      observer.disconnect();
      scope.revert();
      state.current = null;
    };
  }, [root, reducedMotion]);

  // Runs after every render, since new elements may have mounted: hides and observes the new ones.
  useLayoutEffect(() => {
    const container = root.current;
    const current = state.current;
    if (!container || !current) return;
    current.scope.execute(() => {
      container.querySelectorAll<HTMLElement>("[data-reveal]:not([data-reveal-ready])").forEach((el) => {
        el.dataset.revealReady = "1";
        hide(el);
        current.observer.observe(el);
      });
    });
  });
}

function part(el: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(selector));
}

function hide(el: HTMLElement): void {
  switch (el.dataset.reveal) {
    case "heading":
      utils.set(part(el, "[data-rise]"), { translateY: "110%" });
      break;
    case "tile":
      utils.set(el, { opacity: 0, translateY: 24 });
      utils.set(part(el, "img"), { scale: 1.08 });
      break;
    case "slide":
      utils.set(el, { opacity: 0, translateX: 40 });
      break;
    case "row":
      utils.set(part(el, "[data-line]"), { scaleX: 0 });
      utils.set(part(el, "[data-fade]"), { opacity: 0 });
      break;
  }
}

/** Drops the inline styles a reveal leaves behind, so hover transforms and layout take over again. */
function settle(...els: HTMLElement[]): void {
  els.forEach((el) => {
    el.style.removeProperty("transform");
    el.style.removeProperty("opacity");
  });
}

function play(el: HTMLElement, index: number): void {
  const delay = index * 70;
  switch (el.dataset.reveal) {
    case "heading":
      animate(part(el, "[data-rise]"), { translateY: ["110%", "0%"], duration: 900, ease: "outExpo", delay });
      break;
    case "tile": {
      const images = part(el, "img");
      animate(el, {
        opacity: [0, 1],
        translateY: [24, 0],
        duration: 800,
        ease: "outCubic",
        delay,
        onComplete: () => settle(el),
      });
      animate(images, { scale: [1.08, 1], duration: 1200, ease: "outCubic", delay, onComplete: () => settle(...images) });
      break;
    }
    case "slide":
      animate(el, {
        opacity: [0, 1],
        translateX: [40, 0],
        duration: 800,
        ease: "outCubic",
        delay,
        onComplete: () => settle(el),
      });
      break;
    case "row": {
      animate(part(el, "[data-line]"), { scaleX: [0, 1], duration: 700, ease: "inOutCubic", delay });
      animate(part(el, "[data-fade]"), {
        opacity: [0, 1],
        duration: 500,
        ease: "outQuad",
        delay: stagger(60, { start: delay + 350 }),
      });
      break;
    }
  }
}
