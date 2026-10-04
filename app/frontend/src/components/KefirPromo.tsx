import { useEffect, useRef } from "react";
import { MessageCircle, ShieldCheck, Sparkles, Sprout, Zap } from "lucide-react";
import { animate, createScope, createTimeline, onScroll, stagger, utils } from "animejs";
import { useAdvisor } from "../context/advisor";
import { usePrefersReducedMotion } from "../lib/motion";

const BENEFITS = [
  { icon: Sprout, label: "Mejora tu digestión" },
  { icon: ShieldCheck, label: "Refuerza tu inmunidad" },
  { icon: Zap, label: "Aumenta tu energía natural" },
];

const WHATSAPP_MESSAGE = "Hola, quiero pedir Kefir Casero.";
const ADVISOR_QUESTION = "¿Qué beneficios tiene el kefir casero y cómo lo tomo?";

/**
 * Promotion for the homemade kefir, shown above the featured products. When it scrolls into view
 * the poster is unveiled from the bottom and the copy and benefits rise in; afterwards the poster
 * keeps a slow float. With reduced motion everything is simply shown.
 */
export function KefirPromo({ whatsapp }: { whatsapp: string | null }) {
  const advisor = useAdvisor();
  const reducedMotion = usePrefersReducedMotion();
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = root.current;
    if (!section || reducedMotion) return;

    const scope = createScope({ root }).add(() => {
      utils.set(".promo-poster", { clipPath: "inset(100% 0% 0% 0% round 16px)" });
      utils.set(".promo-poster img", { scale: 1.15 });
      utils.set(".promo-rise", { opacity: 0, translateY: 28 });
      utils.set(".promo-benefit", { opacity: 0, translateX: -24 });
      utils.set(".promo-glow", { scale: 0.4, opacity: 0 });

      const float = animate(".promo-float", {
        translateY: [0, -10],
        rotate: [-1, 1],
        duration: 3200,
        ease: "inOutSine",
        alternate: true,
        loop: true,
        autoplay: false,
      });

      createTimeline({
        defaults: { ease: "outQuart" },
        autoplay: onScroll({ target: section, enter: { target: "top", container: "85%" } }),
        onComplete: () => float.play(),
      })
        .add(".promo-glow", { scale: [0.4, 1], opacity: [0, 1], duration: 1400, delay: stagger(200) }, 0)
        .add(".promo-poster", { clipPath: "inset(0% 0% 0% 0% round 16px)", duration: 1000, ease: "inOutQuart" }, 0)
        .add(".promo-poster img", { scale: 1, duration: 1400 }, 0)
        .add(".promo-rise", { opacity: 1, translateY: 0, duration: 800, delay: stagger(90) }, 350)
        .add(".promo-benefit", { opacity: 1, translateX: 0, duration: 700, delay: stagger(120) }, 650)
        .add(".promo-badge", { scale: [1, 1.12, 1], duration: 600, ease: "inOutSine" }, 1300);
    });

    return () => scope.revert();
  }, [reducedMotion]);

  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
    : null;

  return (
    <section ref={root} aria-labelledby="promo-kefir-title" className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <div className="relative overflow-hidden rounded-tile border border-line bg-sage/60">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="promo-glow absolute -left-24 -top-24 h-72 w-72 rounded-full bg-leaf/15 blur-3xl" />
          <span className="promo-glow absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-forest/10 blur-3xl" />
        </div>

        <div className="relative grid items-center gap-8 p-6 sm:p-10 md:grid-cols-[minmax(0,17rem)_1fr] lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-14 lg:p-12">
          <div className="promo-float mx-auto w-full max-w-[17rem] lg:max-w-[20rem]">
            <div className="promo-poster overflow-hidden rounded-tile shadow-[0_30px_60px_-30px_rgba(31,61,43,0.45)]">
              <img
                src="/media/site/promo-kefir.webp"
                alt="Kefir Casero, probióticos naturales: mejora tu digestión, refuerza tu inmunidad y aumenta tu energía natural"
                width={572}
                height={1024}
                loading="lazy"
                className="block h-auto w-full"
              />
            </div>
          </div>

          <div>
            <span className="promo-rise promo-badge inline-flex items-center gap-1.5 rounded-pill bg-forest px-3 py-1 text-meta font-semibold text-paper">
              <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
              Nuevo
            </span>
            <h2 id="promo-kefir-title" className="promo-rise mt-4 font-display text-h3 font-bold leading-tight text-forest lg:text-h2">
              Kefir Casero
            </h2>
            <p className="promo-rise mt-3 max-w-md text-body-lg text-muted">
              Probióticos naturales, preparados en casa con leche fresca. Un aliado diario para
              sentirte mejor desde adentro.
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {BENEFITS.map(({ icon: Icon, label }) => (
                <li key={label} className="promo-benefit flex items-center gap-3 text-body-lg font-medium text-ink">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper text-leaf ring-1 ring-line">
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>

            <div className="promo-rise mt-8 flex flex-col gap-3 sm:flex-row">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-pill bg-forest px-5 py-3 text-body font-medium text-paper hover:bg-forest/90"
                >
                  <MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" />
                  Pedir por WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={() => void advisor.sendMessage(ADVISOR_QUESTION)}
                className="inline-flex justify-center rounded-pill border border-line bg-paper px-5 py-3 text-body font-medium text-forest hover:border-leaf"
              >
                Preguntar al asesor
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
