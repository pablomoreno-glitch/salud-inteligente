import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Send } from "lucide-react";
import { createScope, createTimeline, onScroll, stagger, utils } from "animejs";
import { useAdvisor } from "../context/advisor";
import { useBusiness, useCategories, useNeeds, useProducts } from "../lib/queries";
import { ProductGridSkeleton } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { ServicesStory } from "../components/ServicesStory";
import { KefirPromo } from "../components/KefirPromo";
import { Intro } from "../experience/Intro";
import { FeaturedRow } from "../experience/FeaturedRow";
import { MarqueeBand } from "../experience/MarqueeBand";
import { NeedsSection } from "../experience/NeedsSection";
import { PointerFollower } from "../experience/PointerFollower";
import { RevealHeading } from "../experience/RevealHeading";
import { useHeroDepth, useScrolledPast } from "../experience/useHeroDepth";
import { useReveal } from "../experience/useReveal";
import { usePrefersReducedMotion } from "../lib/motion";
import { DESKTOP, FINE_POINTER, useMediaQuery } from "../lib/useMediaQuery";

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
  const desktop = useMediaQuery(DESKTOP);
  const finePointer = useMediaQuery(FINE_POINTER);
  const immersive = desktop && !reducedMotion;
  useHeroEntrance(heroRef, reducedMotion, heroState);
  useHeroDepth(heroRef, immersive, immersive && finePointer);
  const scrolled = useScrolledPast(40);
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
      {immersive && finePointer && <PointerFollower />}
      <section
        ref={heroRef}
        className="relative border-b border-line bg-sage/40 lg:flex lg:min-h-[calc(100svh-64px)] lg:items-center lg:overflow-hidden"
      >
        {/* Depth layers: soft blobs and a spotlight behind the content. Decorative, desktop only. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
          <div data-depth="-30" className="absolute -left-40 top-[-8%] h-[520px] w-[520px] rounded-full bg-leaf/25 blur-3xl will-change-transform" />
          <div data-depth="24" className="absolute -bottom-40 left-[34%] h-[460px] w-[460px] rounded-full bg-sage blur-3xl will-change-transform" />
          <div data-depth="-18" className="absolute -right-32 top-[8%] h-[420px] w-[420px] rounded-full bg-leaf/15 blur-3xl will-change-transform" />
          <div data-spot className="hero-spot absolute inset-0 opacity-0 transition-opacity duration-500" />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_46%] lg:items-center lg:gap-10 lg:py-16">
          <div>
            <h1 className="font-display text-h2 font-bold leading-tight text-forest lg:text-display xl:text-display-xl">
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

          <div className="relative lg:[perspective:1200px]">
            <div data-depth="12" data-tilt className="will-change-transform">
              <div className="hero-frame relative aspect-[16/9] overflow-hidden rounded-tile lg:aspect-auto lg:h-[72svh]">
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
            {/* Floating capsules around the frame, each at its own depth. */}
            <div aria-hidden="true" className="pointer-events-none hidden lg:block">
              <div data-depth="40" className="absolute -left-10 top-[12%] z-10 will-change-transform">
                <div data-bob="7000" data-rotate="-14" className="h-28 w-14 -rotate-[14deg] rounded-pill border border-line bg-paper shadow-sm" />
              </div>
              <div data-depth="26" className="absolute -right-4 bottom-[16%] z-10 will-change-transform">
                <div data-bob="9000" data-rotate="18" className="h-24 w-12 rotate-[18deg] rounded-pill border border-leaf/30 bg-leaf/20" />
              </div>
              <div data-depth="32" className="absolute -bottom-6 left-[14%] z-10 will-change-transform">
                <div data-bob="6000" data-rotate="32" className="h-20 w-10 rotate-[32deg] rounded-pill border border-line bg-paper shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-meta text-muted transition-opacity duration-300 lg:flex ${scrolled ? "opacity-0" : "opacity-100"}`}
        >
          <span>Desliza</span>
          <span className="flex h-9 w-5 justify-center rounded-pill border border-forest/40 pt-1.5">
            <span className="hero-cue-dot h-1.5 w-1.5 rounded-full bg-forest" />
          </span>
        </div>
      </section>

      <MarqueeBand motion={immersive} />

      {business.data && business.data.services.length > 0 && (
        <ServicesStory services={business.data.services} whatsapp={business.data.contacts.whatsapp} />
      )}

      <NeedsSection query={needs} pinned={immersive} />

      <KefirPromo whatsapp={business.data?.contacts.whatsapp ?? null} />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {viral.isLoading && (
          <>
            <RevealHeading className="font-display text-h3 font-bold text-ink">Destacados</RevealHeading>
            <ProductGridSkeleton count={4} />
          </>
        )}
        {viral.isError && (
          <>
            <RevealHeading className="font-display text-h3 font-bold text-ink">Destacados</RevealHeading>
            <ErrorState onRetry={() => viral.refetch()} message="No pudimos cargar los productos." />
          </>
        )}
        {viral.data && (
          <FeaturedRow products={viral.data.items} tilt={immersive && finePointer} smooth={!reducedMotion} />
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <RevealHeading className="font-display text-h3 font-bold text-ink">Explora por categoría</RevealHeading>
        {categories.isError && (
          <ErrorState onRetry={() => categories.refetch()} message="No pudimos cargar las categorías." />
        )}
        {categories.data && (
          <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:gap-y-0">
            {categories.data.map((category, index) => (
              <Link
                key={category.slug}
                to={`/catalogo?categoria=${category.slug}`}
                data-reveal="row"
                className="cat-row relative isolate flex items-center justify-between py-3 hover:text-leaf lg:gap-5 lg:px-4 lg:py-6"
              >
                <span aria-hidden="true" className="cat-sweep absolute inset-0 -z-10 hidden bg-sage lg:block" />
                <span data-line aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px origin-left bg-line" />
                <span data-fade aria-hidden="true" className="hidden w-14 shrink-0 lg:block">
                  <span className="cat-index block font-display text-[40px] leading-none text-line lining-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </span>
                <span data-fade className="cat-text min-w-0 flex-1">
                  <span className="block text-body-lg font-medium text-ink">{category.name}</span>
                  <span className="block text-meta text-muted">
                    {category.tagline}
                    <span className="cat-count-inline hidden whitespace-nowrap lg:inline"> · {category.product_count} productos</span>
                  </span>
                </span>
                <span data-fade className="grid items-center justify-items-end text-meta text-muted">
                  <span className="cat-count-end col-start-1 row-start-1">{category.product_count}</span>
                  <ArrowRight
                    size={22}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="cat-arrow col-start-1 row-start-1 hidden text-leaf lg:block"
                  />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
