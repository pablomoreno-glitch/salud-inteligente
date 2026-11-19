import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { createScope, createTimeline, onScroll } from "animejs";
import type { Need } from "../types";
import { ErrorState } from "../components/ErrorState";
import { RevealHeading } from "./RevealHeading";

const STEP = 1000;
const MIN_SCALE = 0.94;
/** How far, as a share of the card width, the photo travels against the card while it passes. */
const IMAGE_TRAVEL = 0.07;
const FADE_EDGE = 80;

interface NeedsQuery {
  data: Need[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
}

/**
 * "¿Qué necesitas hoy?". On desktop with motion (`pinned`) the section pins and the need cards
 * travel sideways as the page scrolls; everywhere else it is the plain grid.
 */
export function NeedsSection({ query, pinned }: { query: NeedsQuery; pinned: boolean }) {
  // A need with no products yet (e.g. a fallback "other" bucket) would only lead to an empty
  // catalog view, so it is skipped here even though the API still lists it for completeness.
  const needs = query.data?.filter((need) => need.product_count > 0);

  if (pinned && needs && needs.length > 0) return <NeedsGallery needs={needs} />;

  return (
    <section id="necesidades" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <RevealHeading className="font-display text-h3 font-bold text-ink">¿Qué necesitas hoy?</RevealHeading>
      {query.isError && <ErrorState onRetry={() => query.refetch()} message="No pudimos cargar las necesidades." />}
      {query.isLoading && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-tile bg-sage" />
          ))}
        </div>
      )}
      {needs && (
        <div data-needs-grid className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {needs.map((need) => (
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
                <p className="text-meta text-muted">{need.product_count} productos</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function NeedsGallery({ needs }: { needs: Need[] }) {
  const section = useRef<HTMLElement>(null);
  const region = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  // How far the track travels, in px; it also sets how tall the section is.
  const [distance, setDistance] = useState(0);

  // Measured once the cards are mounted, and again whenever the track or its window changes size.
  useLayoutEffect(() => {
    const trackEl = track.current;
    const regionEl = region.current;
    if (!trackEl || !regionEl) return undefined;
    const measure = () => {
      const next = Math.max(0, Math.round(trackEl.scrollWidth - regionEl.clientWidth));
      setDistance((previous) => (previous === next ? previous : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(trackEl);
    observer.observe(regionEl);
    return () => observer.disconnect();
  }, [needs]);

  // The scroll-driven timeline is rebuilt whenever the distance changes.
  useEffect(() => {
    const sectionEl = section.current;
    const regionEl = region.current;
    const trackEl = track.current;
    if (!sectionEl || !regionEl || !trackEl) return undefined;

    let layout: ResizeObserver | undefined;
    const scope = createScope({ root: section }).add(() => {
      const cards = Array.from(trackEl.querySelectorAll<HTMLElement>("[data-need-card]"));
      const images = cards.map((card) => card.querySelector<HTMLElement>("[data-need-img]"));
      const half = regionEl.clientWidth / 2;
      const geometry = cards.map((card) => ({ center: card.offsetLeft + card.offsetWidth / 2, width: card.offsetWidth }));

      // Cards swell toward the center of the window, and their photos slide against them.
      const render = (progress: number) => {
        const travelled = progress * distance;
        cards.forEach((card, index) => {
          const { center, width } = geometry[index];
          const offset = clamp((center - travelled - half) / half, -1.2, 1.2);
          const near = 1 - Math.min(1, Math.abs(offset));
          const scale = MIN_SCALE + (1 - MIN_SCALE) * near * near * (3 - 2 * near);
          card.style.transform = `scale(${scale.toFixed(4)})`;
          const image = images[index];
          if (image) image.style.transform = `translate3d(${(-offset * width * IMAGE_TRAVEL).toFixed(1)}px, 0, 0) scale(1.16)`;
        });
        regionEl.style.setProperty("--fade", `${clamp(progress * 24, 0, 1) * FADE_EDGE}px`);
      };
      render(0);

      const observer = onScroll({ target: sectionEl, enter: "top top", leave: "bottom bottom", sync: 0.12 });
      // Content above (the services story) loads later and moves the section; re-read its offsets.
      layout = new ResizeObserver(() => observer.refresh());
      layout.observe(document.body);

      createTimeline({
        defaults: { ease: "linear" },
        autoplay: observer,
        onUpdate: (timeline) => render(timeline.progress),
      })
        .add(trackEl, { translateX: [0, -distance], duration: STEP }, 0)
        .add(".needs-progress", { scaleX: [0, 1], duration: STEP }, 0);
    });

    return () => {
      layout?.disconnect();
      scope.revert();
      regionEl.style.removeProperty("--fade");
      trackEl.querySelectorAll<HTMLElement>("[data-need-card], [data-need-img]").forEach((el) => el.style.removeProperty("transform"));
    };
  }, [distance, needs]);

  // Tabbing to a card that is off screen scrolls the page to where the track brings it into view.
  function handleFocus(event: React.FocusEvent<HTMLElement>) {
    const sectionEl = section.current;
    const regionEl = region.current;
    const trackEl = track.current;
    const card = (event.target as HTMLElement).closest<HTMLElement>("[data-need-card]");
    if (!sectionEl || !regionEl || !trackEl || !card || distance <= 0) return;
    const bounds = card.getBoundingClientRect();
    const view = regionEl.getBoundingClientRect();
    if (bounds.left >= view.left + 8 && bounds.right <= view.right - 8) return;
    const center = card.offsetLeft + card.offsetWidth / 2;
    const progress = clamp((center - regionEl.clientWidth / 2) / distance, 0, 1);
    const top = sectionEl.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + progress * distance });
  }

  return (
    <section
      ref={section}
      id="necesidades"
      aria-labelledby="necesidades-title"
      className="relative [--gutter:max(1.5rem,calc((100%-72rem)/2+1.5rem))]"
      style={{ height: `calc(100svh + ${distance}px)` }}
    >
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden pt-16">
        <div className="w-[calc(var(--gutter)+26rem)] shrink-0 pl-[var(--gutter)] pr-8">
          <RevealHeading id="necesidades-title" className="font-display text-h2 font-bold leading-tight text-ink xl:text-[52px] xl:leading-[56px]">
            ¿Qué necesitas hoy?
          </RevealHeading>
          <p className="mt-4 text-body-lg text-muted">Elige por cómo te sientes</p>
        </div>

        <div
          ref={region}
          onFocus={handleFocus}
          className="relative min-w-0 flex-1 overflow-clip -ml-20 [mask-image:linear-gradient(to_right,transparent_40px,#000_calc(40px+var(--fade,0px)))]"
        >
          <ul ref={track} data-needs-track className="relative flex w-max items-start gap-6 pl-20 pr-12">
            {needs.map((need, index) => (
              <li
                key={need.slug}
                data-need-card
                className={`h-[min(420px,56svh)] shrink-0 aspect-[5/7] will-change-transform ${index % 2 ? "mt-10" : ""}`}
              >
                <Link
                  to={`/catalogo?necesidad=${need.slug}`}
                  data-cursor="Ver"
                  className="need-card group relative block h-full overflow-hidden rounded-tile bg-sage"
                >
                  <span className="need-media absolute inset-0 block">
                    <img
                      data-need-img
                      src={need.image_url}
                      alt=""
                      width={600}
                      height={840}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-t from-forest/85 via-forest/10 to-transparent" />
                  <span className="need-text absolute inset-x-0 bottom-0 block p-5 text-paper">
                    <span className="block font-display text-h4 font-bold leading-tight">{need.name}</span>
                    <span className="mt-1 block text-meta text-paper/80">{need.product_count} productos</span>
                  </span>
                  <span className="need-pill absolute bottom-5 left-5 inline-flex items-center gap-1.5 rounded-pill bg-paper px-4 py-2 text-meta font-medium text-forest">
                    Ver productos
                    <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div aria-hidden="true" className="ml-20 mr-12 mt-8 h-0.5 bg-line">
            <div className="needs-progress h-full origin-left bg-leaf" style={{ transform: "scaleX(0)" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
