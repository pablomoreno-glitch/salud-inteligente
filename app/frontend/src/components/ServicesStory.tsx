import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createScope, createTimeline, onScroll, utils } from "animejs";
import type { BusinessService } from "../types";
import { useAdvisor } from "../context/advisor";

/** Photo for each service, keyed by the icon the business service already carries. */
const SERVICE_IMAGES: Record<string, string> = {
  sparkles: "/media/site/service-advisor.webp",
  "shield-check": "/media/site/service-catalog.webp",
  "message-circle": "/media/site/service-whatsapp.webp",
  store: "/media/site/service-distributors.webp",
};
const FALLBACK_IMAGE = "/media/site/hero.webp";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia?.(REDUCED_MOTION).matches ?? false);
  useEffect(() => {
    const query = window.matchMedia?.(REDUCED_MOTION);
    if (!query) return;
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

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
 * The services, discovered by scrolling: the section pins to the screen and each scroll step
 * opens the next service inside a capsule-shaped window, with its title rising into place.
 * With reduced motion the same content renders as a plain list.
 */
export function ServicesStory({ services, whatsapp }: { services: BusinessService[]; whatsapp: string | null }) {
  const reducedMotion = usePrefersReducedMotion();
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = root.current;
    if (reducedMotion || !section || services.length === 0) return;

    const scope = createScope({ root }).add(() => {
      const count = services.length;
      const step = 1000;

      // Every service but the first starts hidden: image masked from below, copy below its line.
      utils.set(".story-image:not(:first-child)", { clipPath: "inset(100% 0% 0% 0%)" });
      utils.set(".story-image img", { scale: 1.18 });
      utils.set(".story-copy:not(:first-child) .story-rise", { translateY: "110%" });
      utils.set(".story-copy:not(:first-child)", { opacity: 0 });
      utils.set(".story-copy:not(:first-child)", { visibility: "hidden" });
      utils.set(".story-rail-item:not(:first-child)", { opacity: 0.4 });
      utils.set(".story-capsule", { scale: 0.62, rotate: -14 });

      const timeline = createTimeline({
        defaults: { ease: "linear" },
        autoplay: onScroll({ target: section, enter: "top top", leave: "bottom bottom", sync: 0.12 }),
      });

      // Opening: the capsule grows and straightens as the section locks in place.
      timeline
        .add(".story-capsule", { scale: [0.62, 1], rotate: [-14, 0], duration: step * 0.6, ease: "outQuad" }, 0)
        .add(".story-image:first-child img", { scale: [1.18, 1], duration: step * 0.8 }, 0)
        .add(".story-progress", { scaleY: [0, 1 / count], duration: step * 0.6 }, 0);

      for (let i = 1; i < count; i++) {
        const at = step * i;
        const previous = `.story-copy:nth-child(${i})`;
        const next = `.story-copy:nth-child(${i + 1})`;
        timeline
          .add(`${previous} .story-rise`, { translateY: ["0%", "-110%"], duration: step * 0.35, ease: "inQuad" }, at)
          .add(previous, { opacity: [1, 0], duration: step * 0.35 }, at)
          .set(previous, { visibility: "hidden" }, at + step * 0.35)
          .set(next, { visibility: "visible" }, at + step * 0.3)
          .add(next, { opacity: [0, 1], duration: step * 0.3 }, at + step * 0.3)
          .add(`${next} .story-rise`, { translateY: ["110%", "0%"], duration: step * 0.45, ease: "outQuad" }, at + step * 0.3)
          .add(
            `.story-image:nth-child(${i + 1})`,
            { clipPath: ["inset(100% 0% 0% 0%)", "inset(0% 0% 0% 0%)"], duration: step * 0.6, ease: "inOutQuad" },
            at,
          )
          .add(`.story-image:nth-child(${i + 1}) img`, { scale: [1.18, 1], duration: step * 0.8 }, at)
          .add(".story-capsule", { rotate: [0, i % 2 ? 6 : -6, 0], duration: step * 0.8, ease: "inOutSine" }, at)
          .add(`.story-rail-item:nth-child(${i})`, { opacity: [1, 0.4], duration: step * 0.3 }, at)
          .add(`.story-rail-item:nth-child(${i + 1})`, { opacity: [0.4, 1], duration: step * 0.3 }, at + step * 0.3)
          .add(".story-progress", { scaleY: [i / count, (i + 1) / count], duration: step * 0.6 }, at);
      }

      // Hold the last service on screen for the final stretch of the scroll.
      timeline.add(".story-capsule", { scale: [1, 1], duration: step * 0.4 }, step * count);
    });

    return () => scope.revert();
  }, [reducedMotion, services]);

  if (reducedMotion) {
    return (
      <section className="bg-forest text-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-h3 font-bold">Así te acompañamos</h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-2">
            {services.map((service) => (
              <article key={service.id} className="flex gap-5">
                <img
                  src={SERVICE_IMAGES[service.icon] ?? FALLBACK_IMAGE}
                  alt=""
                  width={120}
                  height={160}
                  loading="lazy"
                  className="h-40 w-28 shrink-0 rounded-pill object-cover"
                />
                <div>
                  <h3 className="font-display text-h4 font-bold">{service.title}</h3>
                  <p className="mt-2 text-body-lg text-paper/75">{service.description}</p>
                  <div className="mt-4">
                    <ServiceAction service={service} whatsapp={whatsapp} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={root}
      aria-label="Así te acompañamos"
      className="relative bg-forest text-paper"
      style={{ height: `${(services.length + 0.6) * 100}svh` }}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl flex-1 content-center gap-8 px-4 pb-8 pt-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_10rem] lg:items-center lg:gap-12 lg:py-0">
          <div className="relative order-2 min-h-[13rem] lg:order-1 lg:min-h-[20rem]">
            <h2 className="text-body-lg text-paper/60">Así te acompañamos</h2>
            <div className="relative mt-4">
              {services.map((service) => (
                <article key={service.id} className="story-copy absolute inset-x-0 top-0">
                  <div className="overflow-hidden pb-1">
                    <h3 className="story-rise font-display text-h3 font-bold leading-tight lg:text-h1">
                      {service.title}
                    </h3>
                  </div>
                  <div className="overflow-hidden">
                    <p className="story-rise mt-4 max-w-md text-body-lg text-paper/75">{service.description}</p>
                  </div>
                  <div className="overflow-hidden pt-6">
                    <div className="story-rise">
                      <ServiceAction service={service} whatsapp={whatsapp} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="order-1 flex items-center justify-center lg:order-2">
            <div className="story-capsule aspect-[3/5] h-[38svh] rounded-pill shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] lg:h-[min(72svh,40rem)]">
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
          </div>

          <div className="order-3 hidden lg:block" aria-hidden="true">
            <div className="relative h-24 w-px bg-paper/20">
              <span className="story-progress absolute inset-0 origin-top bg-paper" />
            </div>
            <ol className="mt-5 flex flex-col gap-3">
              {services.map((service) => (
                <li key={service.id} className="story-rail-item text-body text-paper">
                  {service.title}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
