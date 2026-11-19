import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import { createScope, createTimeline, onScroll, stagger, utils } from "animejs";
import { useAdvisor } from "../context/advisor";
import { useBusiness, useCategories, useNeeds, useProducts } from "../lib/queries";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { ServicesStory } from "../components/ServicesStory";
import { KefirPromo } from "../components/KefirPromo";
import { Intro } from "../experience/Intro";
import { RevealHeading } from "../experience/RevealHeading";
import { useReveal } from "../experience/useReveal";
import { usePrefersReducedMotion } from "../lib/motion";

const SUGGESTION_CHIPS = [
  "Me cuesta dormir",
  "Quiero más energía",
  "Dolor en las articulaciones",
];

interface HeroState {
  revealed: boolean;
  play: () => void;
}

const HEADLINE = "Suplementos naturales, elegidos para lo que sientes";

/**
 * Hero entrance. Before the intro opens (`state.revealed`), every hero element is held in its
 * hidden state; `state.play` then runs the entrance. With reduced motion nothing is hidden.
 */
function useHeroEntrance(
  hero: React.RefObject<HTMLElement>,
  reducedMotion: boolean,
  state: React.MutableRefObject<HeroState>,
) {
  useLayoutEffect(() => {
    const section = hero.current;
    if (!section || reducedMotion) return undefined;
    const current = state.current;

    const scope = createScope({ root: hero }).add(() => {
      const frame = section.querySelector<HTMLElement>(".hero-frame");
      // A centered capsule (3:5) that opens to the full rounded tile; its radius follows the box.
      const radius = frame ? Math.round(frame.offsetWidth * 0.14) : 80;
      const capsule = `inset(6% 36% 6% 36% round ${radius}px)`;
      const tile = "inset(0% 0% 0% 0% round 16px)";

      if (!current.revealed) {
        utils.set(".hero-word", { translateY: "110%" });
        utils.set(".hero-copy", { opacity: 0, translateY: 16 });
        utils.set(".hero-form", { opacity: 0, translateY: 16, scale: 0.97 });
        utils.set(".hero-chip", { opacity: 0, translateY: 10 });
        utils.set(".hero-frame", { clipPath: capsule });
        utils.set(".hero-img", { scale: 1.15 });
      }

      const entrance = createTimeline({ autoplay: false, defaults: { ease: "outExpo" } });
      entrance
        .add(".hero-word", { translateY: ["110%", "0%"], duration: 900, delay: stagger(60) }, 0)
        .add(".hero-copy", { opacity: [0, 1], translateY: [16, 0], duration: 800 }, 250)
        .add(".hero-form", { opacity: [0, 1], translateY: [16, 0], scale: [0.97, 1], duration: 800 }, 500)
        .add(".hero-chip", { opacity: [0, 1], translateY: [10, 0], duration: 600, delay: stagger(70) }, 750)
        .add(".hero-frame", { clipPath: [capsule, tile], duration: 1400, ease: "inOutCubic" }, 0)
        .add(".hero-img", { scale: [1.15, 1], duration: 1400, ease: "outCubic" }, 0);
      current.play = () => entrance.play();

      // The image drifts up slightly while the hero scrolls away.
      createTimeline({
        defaults: { ease: "linear" },
        autoplay: onScroll({ target: section, enter: "top top", leave: "bottom top", sync: 0.12 }),
      }).add(".hero-parallax", { translateY: ["0%", "-8%"] }, 0);
    });

    return () => {
      current.play = () => undefined;
      scope.revert();
    };
  }, [hero, reducedMotion, state]);
}

export function Home() {
  const reducedMotion = usePrefersReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const heroState = useRef<HeroState>({ revealed: false, play: () => undefined });
  useHeroEntrance(heroRef, reducedMotion, heroState);
  useReveal(pageRef, reducedMotion);
  // The intro (or its absence) tells the hero when to start.
  const handleReveal = useCallback(() => {
    if (heroState.current.revealed) return;
    heroState.current.revealed = true;
    heroState.current.play();
  }, []);

  const advisor = useAdvisor();
  const [heroInput, setHeroInput] = useState("");
  const needs = useNeeds();
  const categories = useCategories();
  const viral = useProducts({ viral: true, limit: 10 });
  const business = useBusiness();

  function handleHeroSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!heroInput.trim()) return;
    void advisor.sendMessage(heroInput);
    setHeroInput("");
  }

  return (
    <div ref={pageRef}>
      <Intro reducedMotion={reducedMotion} onReveal={handleReveal} />
      <section ref={heroRef} className="border-b border-line bg-sage/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <h1 className="font-display text-h2 font-bold leading-tight text-forest lg:text-h1">
              <span className="sr-only">{HEADLINE}</span>
              <span aria-hidden="true">
                {HEADLINE.split(" ").map((word, index) => (
                  <span key={index}>
                    {index > 0 && " "}
                    <span className="inline-block overflow-hidden pb-[0.14em] align-bottom">
                      <span className="hero-word inline-block">{word}</span>
                    </span>
                  </span>
                ))}
              </span>
            </h1>
            <p className="hero-copy mt-4 text-body-lg text-muted">
              Catálogo con registro INVIMA y un asesor con IA que te recomienda,
              sin reemplazar la consulta médica.
            </p>

            <form onSubmit={handleHeroSubmit} className="hero-form mt-6 flex items-center gap-2">
              <label htmlFor="hero-advisor-input" className="sr-only">
                Cuéntale al asesor qué necesitas
              </label>
              <input
                id="hero-advisor-input"
                type="text"
                value={heroInput}
                onChange={(event) => setHeroInput(event.target.value)}
                placeholder="Cuéntale al asesor qué necesitas..."
                className="flex-1 rounded-pill border border-line bg-white px-5 py-3 text-body-lg text-ink outline-none focus-visible:border-leaf"
              />
              <button
                type="submit"
                aria-label="Enviar al asesor"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest text-white hover:bg-forest/90"
              >
                <Send size={20} strokeWidth={1.75} />
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => void advisor.sendMessage(chip)}
                  className="hero-chip rounded-pill border border-line bg-white px-4 py-2 text-meta text-ink hover:border-leaf"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="hero-frame relative aspect-[16/9] overflow-hidden rounded-tile">
            <div className="hero-parallax absolute inset-x-0 top-0 h-[110%]">
              <img
                src="/media/site/hero.webp"
                alt="Suplementos naturales Salud Inteligente"
                width={960}
                height={540}
                className="hero-img h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {business.data && business.data.services.length > 0 && (
        <ServicesStory services={business.data.services} whatsapp={business.data.contacts.whatsapp} />
      )}

      <section id="necesidades" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <RevealHeading className="font-display text-h3 font-bold text-ink">¿Qué necesitas hoy?</RevealHeading>
        {needs.isError && (
          <ErrorState onRetry={() => needs.refetch()} message="No pudimos cargar las necesidades." />
        )}
        {needs.isLoading && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-tile bg-sage" />
            ))}
          </div>
        )}
        {needs.data && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {/* A need with no products yet (e.g. a fallback "other" bucket)
                would only lead to an empty catalog view, so it is skipped
                here even though the API still lists it for completeness. */}
            {needs.data
              .filter((need) => need.product_count > 0)
              .map((need) => (
                <Link
                  key={need.slug}
                  data-reveal="tile"
                  to={`/catalogo?necesidad=${need.slug}`}
                  className="group overflow-hidden rounded-tile border border-line bg-sage"
                >
                  <div className="aspect-square w-full overflow-hidden">
                    <img
                      src={need.image_url}
                      alt={need.name}
                      width={400}
                      height={400}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-body font-semibold text-ink">{need.name}</p>
                    <p className="text-meta text-muted">
                      {need.product_count} productos
                    </p>
                  </div>
                </Link>
              ))}
          </div>
        )}
      </section>

      <KefirPromo whatsapp={business.data?.contacts.whatsapp ?? null} />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <RevealHeading className="font-display text-h3 font-bold text-ink">Destacados</RevealHeading>
        {viral.isLoading && <ProductGridSkeleton count={4} />}
        {viral.isError && (
          <ErrorState onRetry={() => viral.refetch()} message="No pudimos cargar los productos." />
        )}
        {viral.data && (
          <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 no-scrollbar">
            {viral.data.items.map((product) => (
              <div key={product.ref} data-reveal="slide" className="w-52 shrink-0 snap-start sm:w-60">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <RevealHeading className="font-display text-h3 font-bold text-ink">Explora por categoría</RevealHeading>
        {categories.isError && (
          <ErrorState onRetry={() => categories.refetch()} message="No pudimos cargar las categorías." />
        )}
        {categories.data && (
          <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {categories.data.map((category) => (
              <Link
                key={category.slug}
                to={`/catalogo?categoria=${category.slug}`}
                data-reveal="row"
                className="relative flex items-center justify-between py-3 hover:text-leaf"
              >
                <span data-line aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px origin-left bg-line" />
                <span data-fade>
                  <span className="block text-body-lg font-medium text-ink">
                    {category.name}
                  </span>
                  <span className="block text-meta text-muted">{category.tagline}</span>
                </span>
                <span data-fade className="text-meta text-muted">{category.product_count}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
