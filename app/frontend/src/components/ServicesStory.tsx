import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createScope, createTimeline, onScroll, utils } from "animejs";
import type { BusinessService } from "../types";
import { useAdvisor } from "../context/advisor";
import { usePrefersReducedMotion } from "../lib/motion";

/** Photo for each service, keyed by the icon the business service already carries. */
const SERVICE_IMAGES: Record<string, string> = {
  sparkles: "/media/site/service-advisor.webp",
  "shield-check": "/media/site/service-catalog.webp",
  "message-circle": "/media/site/service-whatsapp.webp",
  store: "/media/site/service-distributors.webp",
};
const FALLBACK_IMAGE = "/media/site/hero.webp";

function ServiceAction({ service, whatsapp }: { service: BusinessService; whatsapp: string | null }) {
  const advisor = useAdvisor();
  const className =
    "inline-flex rounded-pill bg-paper px-5 py-3 text-body font-medium text-forest hover:bg-sage";

  switch (service.icon) {
    case "sparkles":
      return (
        <button type="button" onClick={advisor.open} className={className}>
          Hablar con el asesor
        </button>
      );
    case "shield-check":
      return (
        <Link to="/catalogo" className={className}>
          Ver el catálogo
        </Link>
      );
    case "message-circle":
      return (
        <Link to="/carrito" className={className}>
          Ir al carrito
        </Link>
      );
    case "store":
      return whatsapp ? (
        <a
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hola, quiero información para distribuidoras.")}`}
          target="_blank"
          rel="noreferrer"
          className={className}
        >
          Escribir por WhatsApp
        </a>
      ) : null;
    default:
      return null;
  }
}

/**
 * The services, discovered by scrolling: the section fills the screen and pins while each scroll
 * step opens the next service inside a capsule-shaped window, with its title rising into place.
 * With reduced motion the section still pins, but services swap with plain cross-fades.
 */
export function ServicesStory({ services, whatsapp }: { services: BusinessService[]; whatsapp: string | null }) {
  const reducedMotion = usePrefersReducedMotion();
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = root.current;
    if (!section || services.length === 0) return;

    const scope = createScope({ root }).add(() => {
      const count = services.length;
      const step = 1000;
      const motion = !reducedMotion;

      // Every service but the first starts hidden: image masked (or faded), copy below its line.
      if (motion) {
        utils.set(".story-image:not(:first-child)", { clipPath: "inset(100% 0% 0% 0%)" });
        utils.set(".story-image img", { scale: 1.18 });
        utils.set(".story-copy:not(:first-child) .story-rise", { translateY: "110%" });
        utils.set(".story-capsule", { scale: 0.62, rotate: -14 });
      } else {
        utils.set(".story-image:not(:first-child)", { opacity: 0 });
      }
      utils.set(".story-copy:not(:first-child)", { opacity: 0, visibility: "hidden" });
      utils.set(".story-rail-item:not(:first-child)", { opacity: 0.4 });

      const timeline = createTimeline({
        defaults: { ease: "linear" },
        autoplay: onScroll({ target: section, enter: "top top", leave: "bottom bottom", sync: 0.12 }),
      });

      timeline.add(".story-progress", { scaleY: [0, 1 / count], duration: step * 0.6 }, 0);
      if (motion) {
        // Opening: the capsule grows and straightens as the section locks in place.
        timeline
          .add(".story-capsule", { scale: [0.62, 1], rotate: [-14, 0], duration: step * 0.6, ease: "outQuad" }, 0)
          .add(".story-image:first-child img", { scale: [1.18, 1], duration: step * 0.8 }, 0);
      }

      for (let i = 1; i < count; i++) {
        const at = step * i;
        const previous = `.story-copy:nth-child(${i})`;
        const next = `.story-copy:nth-child(${i + 1})`;
        const image = `.story-image:nth-child(${i + 1})`;
        timeline
          .add(previous, { opacity: [1, 0], duration: step * 0.35 }, at)
          .set(previous, { visibility: "hidden" }, at + step * 0.35)
          .set(next, { visibility: "visible" }, at + step * 0.3)
          .add(next, { opacity: [0, 1], duration: step * 0.3 }, at + step * 0.3)
          .add(`.story-rail-item:nth-child(${i})`, { opacity: [1, 0.4], duration: step * 0.3 }, at)
          .add(`.story-rail-item:nth-child(${i + 1})`, { opacity: [0.4, 1], duration: step * 0.3 }, at + step * 0.3)
          .add(".story-progress", { scaleY: [i / count, (i + 1) / count], duration: step * 0.6 }, at);
        if (motion) {
          timeline
            .add(`${previous} .story-rise`, { translateY: ["0%", "-110%"], duration: step * 0.35, ease: "inQuad" }, at)
            .add(`${next} .story-rise`, { translateY: ["110%", "0%"], duration: step * 0.45, ease: "outQuad" }, at + step * 0.3)
            .add(image, { clipPath: ["inset(100% 0% 0% 0%)", "inset(0% 0% 0% 0%)"], duration: step * 0.6, ease: "inOutQuad" }, at)
            .add(`${image} img`, { scale: [1.18, 1], duration: step * 0.8 }, at)
            .add(".story-capsule", { rotate: [0, i % 2 ? 6 : -6, 0], duration: step * 0.8, ease: "inOutSine" }, at);
        } else {
          timeline.add(image, { opacity: [0, 1], duration: step * 0.5 }, at);
        }
      }

      // Hold the last service on screen for the final stretch of the scroll.
      timeline.add(".story-rail", { opacity: [1, 1], duration: step * 0.4 }, step * count);
    });

    return () => scope.revert();
  }, [reducedMotion, services]);

  return (
    <section
      ref={root}
      aria-label="Así te acompañamos"
      className="relative bg-forest text-paper"
      style={{ height: `${(services.length + 0.6) * 100}svh` }}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col items-center justify-center gap-8 px-4 pb-8 pt-20 sm:px-6 lg:gap-8 lg:pt-20">
          <div className="story-capsule aspect-[3/5] h-[38svh] shrink-0 rounded-pill shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] lg:h-[44svh]">
            {/* clip-path keeps the rounded crop while the capsule rotates; overflow + radius does not. */}
            <div className="relative h-full w-full bg-leaf/40 [clip-path:inset(0_round_9999px)]">
              {services.map((service) => (
                <div key={service.id} className="story-image absolute inset-0 overflow-hidden">
                  <img
                    src={SERVICE_IMAGES[service.icon] ?? FALLBACK_IMAGE}
                    alt=""
                    width={900}
                    height={1200}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[13rem] w-full max-w-2xl lg:min-h-[13rem] lg:max-w-4xl lg:text-center">
            <h2 className="text-body-lg text-paper/60">Así te acompañamos</h2>
            <div className="relative mt-3">
              {services.map((service) => (
                <article key={service.id} className="story-copy absolute inset-x-0 top-0">
                  <div className="overflow-hidden pb-1">
                    <h3 className="story-rise font-display text-h3 font-bold leading-tight lg:text-h1">
                      {service.title}
                    </h3>
                  </div>
                  <div className="overflow-hidden">
                    <p className="story-rise mt-3 max-w-md text-body-lg text-paper/75 lg:mx-auto">
                      {service.description}
                    </p>
                  </div>
                  <div className="overflow-hidden pt-5">
                    <div className="story-rise">
                      <ServiceAction service={service} whatsapp={whatsapp} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="story-rail absolute right-8 top-1/2 hidden -translate-y-1/2 xl:block" aria-hidden="true">
          <div className="relative h-24 w-px bg-paper/20">
            <span className="story-progress absolute inset-0 origin-top bg-paper" />
          </div>
          <ol className="mt-5 flex w-40 flex-col gap-3">
            {services.map((service) => (
              <li key={service.id} className="story-rail-item text-body text-paper">
                {service.title}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
