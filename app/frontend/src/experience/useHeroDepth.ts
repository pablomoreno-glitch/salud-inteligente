import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { animate, createScope, utils } from "animejs";

/** Max rotation, in degrees, of the hero frame (the layer marked `data-tilt`). */
const MAX_TILT = 3;
const EASE = 0.08;

/**
 * Depth for the desktop hero. Layers opt in with `data-depth="<px>"`: the pointer moves them up to
 * that many pixels (negative values move against the pointer). `data-tilt` also tilts the layer in
 * 3D, and the element with `data-spot` gets a spotlight that follows the pointer through the
 * `--x` and `--y` custom properties on the hero. `data-bob="<ms>"` layers float with a slow idle
 * loop. Positions ease toward the target in a rAF loop that sleeps once the layers are at rest.
 *
 * `motion` enables the idle loops, `pointer` additionally enables the pointer effects.
 */
export function useHeroDepth(hero: RefObject<HTMLElement>, motion: boolean, pointer: boolean): void {
  useLayoutEffect(() => {
    const section = hero.current;
    if (!section || !motion) return undefined;
    const scope = createScope({ root: hero }).add(() => {
      section.querySelectorAll<HTMLElement>("[data-bob]").forEach((el, index) => {
        const duration = Number(el.dataset.bob) || 7000;
        const rotate = Number(el.dataset.rotate) || 0;
        utils.set(el, { rotate });
        animate(el, {
          translateY: [-9, 9],
          rotate: [rotate - 4, rotate + 4],
          duration,
          delay: index * 400,
          ease: "inOutSine",
          loop: true,
          alternate: true,
        });
      });
      animate(".hero-cue-dot", { translateY: [0, 14], opacity: [1, 0], duration: 1600, ease: "inOutCubic", loop: true });
    });
    return () => scope.revert();
  }, [hero, motion]);

  useEffect(() => {
    const section = hero.current;
    if (!section || !pointer) return undefined;
    const layers = Array.from(section.querySelectorAll<HTMLElement>("[data-depth]"));
    const spot = section.querySelector<HTMLElement>("[data-spot]");

    // Normalised pointer (-1..1 from the hero's center) and the eased copy that is drawn.
    const target = { x: 0, y: 0, sx: 0, sy: 0 };
    const current = { x: 0, y: 0, sx: 0, sy: 0 };
    let frame = 0;

    const draw = () => {
      for (const layer of layers) {
        const depth = Number(layer.dataset.depth) || 0;
        const move = `translate3d(${(current.x * depth).toFixed(2)}px, ${(current.y * depth).toFixed(2)}px, 0)`;
        const tilt = "tilt" in layer.dataset
          ? ` rotateX(${(-current.y * MAX_TILT).toFixed(2)}deg) rotateY(${(current.x * MAX_TILT).toFixed(2)}deg)`
          : "";
        layer.style.transform = move + tilt;
      }
      section.style.setProperty("--x", `${current.sx.toFixed(1)}px`);
      section.style.setProperty("--y", `${current.sy.toFixed(1)}px`);
    };

    const tick = () => {
      current.x += (target.x - current.x) * EASE;
      current.y += (target.y - current.y) * EASE;
      current.sx += (target.sx - current.sx) * 0.18;
      current.sy += (target.sy - current.sy) * 0.18;
      draw();
      const settled =
        Math.abs(target.x - current.x) < 0.002 &&
        Math.abs(target.y - current.y) < 0.002 &&
        Math.abs(target.sx - current.sx) < 0.5 &&
        Math.abs(target.sy - current.sy) < 0.5;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = section.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      if (spot && spot.style.opacity !== "1") {
        // First contact: start the spotlight under the pointer instead of sliding in from the corner.
        current.sx = target.sx = px;
        current.sy = target.sy = py;
        spot.style.opacity = "1";
      }
      target.x = (px / rect.width) * 2 - 1;
      target.y = (py / rect.height) * 2 - 1;
      target.sx = px;
      target.sy = py;
      wake();
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      if (spot) spot.style.opacity = "0";
      wake();
    };

    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
      for (const layer of layers) layer.style.removeProperty("transform");
      section.style.removeProperty("--x");
      section.style.removeProperty("--y");
      if (spot) spot.style.opacity = "0";
    };
  }, [hero, pointer]);
}

/** True once the page has scrolled past `threshold` pixels. */
export function useScrolledPast(threshold: number): boolean {
  const [past, setPast] = useState(() => window.scrollY > threshold);
  useEffect(() => {
    const update = () => setPast(window.scrollY > threshold);
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);
  return past;
}
