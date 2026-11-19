import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { animate, createScope, createTimeline, stagger, utils } from "animejs";
import { markIntroDone, markIntroPlaying } from "../lib/introSignal";
import { rememberIntroSeen, shouldPlayIntro } from "./introPolicy";

const SALUD = "Salud".split("");
const INTELIGENTE = "Inteligente".split("");

/** Liquid level inside the capsule when it is full, as a fraction of its height. */
const FILL = 0.88;
/** Moment the iris starts to open, in ms. */
const IRIS_AT = 1900;
const SKIP_MS = 400;

interface Geometry {
  width: number;
  height: number;
  cx: number;
  cy: number;
  /** Capsule size (3:5). */
  capW: number;
  capH: number;
  /** Wave period and amplitude of the liquid surface. */
  period: number;
  amplitude: number;
  /** Scale of the capsule-shaped hole that clears the viewport corners. */
  irisEnd: number;
}

function measure(): Geometry {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const capH = Math.min(height * 0.42, 360);
  const capW = capH * 0.6;
  const cx = width / 2;
  const cy = height / 2 - 26;
  // The capsule is a rectangle of width capW with semicircular caps: it covers the corner when
  // its straight part spans the width and its straight height spans the distance to the corner.
  const straight = (capH - capW) / 2;
  const toCorner = height / 2 + Math.abs(cy - height / 2);
  const irisEnd = Math.max(width / capW, toCorner / straight) * 1.06;
  return { width, height, cx, cy, capW, capH, period: capW * 0.9, amplitude: capH * 0.012, irisEnd };
}

function capsulePath(w: number, h: number): string {
  const r = w / 2;
  return `M${-r} ${-h / 2 + r} A${r} ${r} 0 0 1 ${r} ${-h / 2 + r} V${h / 2 - r} A${r} ${r} 0 0 1 ${-r} ${h / 2 - r} Z`;
}

/** A closed sine-wave surface (top at y = 0) that is periodic in `period`, so a sideways drift of one period loops. */
function wavePath(width: number, period: number, amplitude: number, depth: number, phase: number): string {
  const x0 = -width / 2 - period;
  const x1 = width / 2 + period;
  const points: string[] = [];
  for (let x = x0; x <= x1; x += 4) {
    const y = amplitude * Math.sin(((x - x0) / period) * Math.PI * 2 + phase);
    points.push(`${x.toFixed(1)} ${y.toFixed(2)}`);
  }
  return `M${points.join(" L")} L${x1} ${depth} L${x0} ${depth} Z`;
}

/**
 * Cinematic opening (after Essentia's logo preloader and Hydroflow's liquid), about 2.8 s: a
 * capsule draws itself and fills with a drifting liquid, the line-art logo mark draws over it,
 * the wordmark rises letter by letter and a counter runs to 100, then the capsule becomes an
 * iris that opens onto the hero. Once per browser session; skippable by button, Escape or a click
 * on the layer; it leaves the DOM when done and never traps focus.
 * `onReveal` fires when the iris starts to open (or at once when there is no intro).
 */
export function Intro({ reducedMotion, onReveal }: { reducedMotion: boolean; onReveal: () => void }) {
  const [playing, setPlaying] = useState(() => shouldPlayIntro(reducedMotion));
  const rootRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef(onReveal);
  const revealedRef = useRef(false);
  const skipRef = useRef<() => void>(() => undefined);
  const geometry = useMemo(measure, []);

  useEffect(() => {
    revealRef.current = onReveal;
  }, [onReveal]);

  // `onReveal` fires once, whichever path gets there first.
  const fireReveal = () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    revealRef.current();
  };

  // Marks the intro as playing before the first paint so first-visit dialogs wait for it.
  useLayoutEffect(() => {
    if (!playing) return undefined;
    markIntroPlaying();
    rememberIntroSeen();
    const root = rootRef.current;
    if (!root) return undefined;

    const { capH, irisEnd, period } = geometry;
    const reveal = () => fireReveal();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      reveal();
      markIntroDone();
      setPlaying(false);
    };

    const scope = createScope({ root }).add(() => {
      const counter = root.querySelector<HTMLElement>(".intro__count");
      const hole = root.querySelector<SVGElement>(".intro__hole");
      const count = { value: 0 };
      const liquidFrom = capH / 2 + geometry.amplitude + 4;
      const liquidTo = capH / 2 - capH * FILL;

      // Everything starts hidden; the intro layer only exists when scripts run.
      utils.set(".intro__draw", { strokeDashoffset: 1 });
      utils.set(".intro__liquid", { translateY: liquidFrom });
      utils.set(".intro__disc", { opacity: 0 });
      utils.set(".intro__node", { scale: 0 });
      utils.set(".intro__letter", { translateY: "115%" });
      utils.set(".intro__bar", { scaleX: 0 });

      // The two waves drift sideways forever (until the intro is reverted).
      animate(".intro__wave-a", { translateX: [0, -period], duration: 2200, ease: "linear", loop: true });
      animate(".intro__wave-b", { translateX: [-period, 0], duration: 3100, ease: "linear", loop: true });

      const timeline = createTimeline({ defaults: { ease: "outQuad" } });
      timeline
        .add(".intro__outline", { strokeDashoffset: [1, 0], duration: 600, ease: "inOutSine" }, 0)
        .add(".intro__liquid", { translateY: [liquidFrom, liquidTo], duration: 1700, ease: "inOutSine" }, 200)
        .add(".intro__bar", { scaleX: [0, 1], duration: 1700, ease: "inOutSine" }, 200)
        .add(
          count,
          {
            value: [0, 100],
            duration: 1700,
            ease: "inOutSine",
            onUpdate: () => {
              if (counter) counter.textContent = String(Math.round(count.value)).padStart(3, "0");
            },
          },
          200,
        )
        .add(".intro__disc", { opacity: [0, 1], duration: 300 }, 450)
        .add(".intro__stroke", { strokeDashoffset: [1, 0], duration: 600, ease: "inOutQuad", delay: stagger(55) }, 500)
        .add(".intro__letter", { translateY: ["115%", "0%"], duration: 450, ease: "outCubic", delay: stagger(18) }, 700)
        .add(".intro__node", { scale: [0, 1], duration: 380, ease: "outBack(3)", delay: stagger(60) }, 1350)
        .call(() => openIris(), IRIS_AT);

      // The capsule-shaped hole grows from the capsule size until it clears the viewport corners.
      let iris: ReturnType<typeof createTimeline> | null = null;
      function openIris() {
        if (iris) return iris;
        reveal();
        hole?.setAttribute("visibility", "visible");
        iris = createTimeline({ defaults: { ease: "inCubic" }, onComplete: finish });
        iris
          .add(".intro__hole", { scale: [1, irisEnd], duration: 900 }, 0)
          .add(".intro__fade", { opacity: [1, 0], duration: 450, ease: "outQuad" }, 50);
        return iris;
      }

      skipRef.current = () => {
        timeline.pause();
        const opening = openIris();
        // The iris finishes in about 0.4 s whatever it has already done.
        opening.speed = Math.max(1, (opening.duration * (1 - opening.progress)) / SKIP_MS);
      };
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") skipRef.current();
    };
    // The page does not scroll behind the intro.
    const block = (event: Event) => event.preventDefault();
    window.addEventListener("keydown", onKey);
    root.addEventListener("wheel", block, { passive: false });
    root.addEventListener("touchmove", block, { passive: false });

    return () => {
      window.removeEventListener("keydown", onKey);
      root.removeEventListener("wheel", block);
      root.removeEventListener("touchmove", block);
      scope.revert();
      markIntroDone();
      skipRef.current = () => undefined;
    };
  }, [playing, geometry]);

  // No intro (seen, reduced motion): the hero may play right away.
  useEffect(() => {
    if (!playing) fireReveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  if (!playing) return null;

  const { width, height, cx, cy, capW, capH, period, amplitude } = geometry;
  const capsule = capsulePath(capW, capH);
  const markSize = capW * 0.62;
  const waveWidth = capW;
  const depth = capH * 1.2;
  const hidden = { transformBox: "fill-box", transformOrigin: "center" } as const;

  return (
    <div ref={rootRef} className="fixed inset-0 z-[2147483647]" onClick={() => skipRef.current()}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <mask id="intro-iris" maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
            <rect x={0} y={0} width={width} height={height} fill="#fff" />
            <g transform={`translate(${cx} ${cy})`}>
              <path className="intro__hole" d={capsule} fill="#000" visibility="hidden" style={{ transformOrigin: "0 0" }} />
            </g>
          </mask>
          <clipPath id="intro-capsule">
            <path d={capsule} />
          </clipPath>
        </defs>
        <rect x={0} y={0} width={width} height={height} className="fill-paper" mask="url(#intro-iris)" />

        <g className="intro__fade" transform={`translate(${cx} ${cy})`}>
          <path d={capsule} className="fill-sage/50" />
          <g clipPath="url(#intro-capsule)">
            <g className="intro__liquid">
              <path
                className="intro__wave-b fill-leaf/40"
                d={wavePath(waveWidth, period, amplitude * 1.3, depth, 1.8)}
              />
              <path className="intro__wave-a fill-leaf/80" d={wavePath(waveWidth, period, amplitude, depth, 0)} />
            </g>
          </g>
          <path
            className="intro__outline intro__draw fill-none stroke-forest"
            d={capsule}
            pathLength={1}
            strokeWidth={2.5}
            strokeDasharray={1}
            strokeLinecap="round"
          />

          <g transform={`translate(${-markSize / 2} ${-markSize / 2}) scale(${markSize / 100})`}>
            <circle className="intro__disc fill-paper" cx={50} cy={50} r={58} />
            <g fill="none" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
              {/* Heart, left half in blue with a medical cross. */}
              <path
                className="intro__stroke intro__draw"
                pathLength={1}
                strokeDasharray={1}
                stroke="#1E6FD9"
                d="M50 88 C30 72 12 58 12 38 C12 24 22 14 34 14 C42 14 48 18 50 24"
              />
              <path
                className="intro__stroke intro__draw"
                pathLength={1}
                strokeDasharray={1}
                stroke="#1E6FD9"
                d="M31 30 V50 M21 40 H41"
              />
              {/* Right half in green: a brain-like lobe with circuit traces ending in nodes. */}
              <path
                className="intro__stroke intro__draw"
                pathLength={1}
                strokeDasharray={1}
                stroke="#2BB673"
                d="M50 24 C52 18 58 14 66 14 C78 14 88 24 88 38 C88 58 70 72 50 88"
              />
              <path
                className="intro__stroke intro__draw"
                pathLength={1}
                strokeDasharray={1}
                stroke="#2BB673"
                d="M50 34 H62 L68 28 M50 48 H74 M50 62 H64 L70 68 M50 76 H58"
              />
            </g>
            {[
              [68, 28],
              [74, 48],
              [70, 68],
              [58, 76],
            ].map(([x, y]) => (
              <circle key={`${x}:${y}`} className="intro__node" cx={x} cy={y} r={3.2} fill="#2BB673" style={hidden} />
            ))}
          </g>
        </g>
      </svg>

      <div
        className="intro__fade pointer-events-none absolute inset-x-0 text-center"
        style={{ top: cy + capH / 2 + 24 }}
        aria-hidden="true"
      >
        <p className="font-display text-h4 font-bold leading-none sm:text-h3">
          {SALUD.map((letter, index) => (
            <Letter key={`s${index}`} letter={letter} className="text-forest" />
          ))}
          <span className="inline-block w-[0.3em]" />
          {INTELIGENTE.map((letter, index) => (
            <Letter key={`i${index}`} letter={letter} className="text-leaf" />
          ))}
        </p>
      </div>

      <div
        className="intro__fade pointer-events-none absolute inset-x-6 bottom-6 flex items-end justify-between gap-6 sm:inset-x-10"
        aria-hidden="true"
      >
        <div className="h-0.5 w-[34vw] max-w-[220px] overflow-hidden bg-line">
          <div className="intro__bar h-full w-full origin-left bg-leaf" />
        </div>
        <span className="intro__count font-sans text-body-lg tabular-nums text-muted">000</span>
      </div>

      <button
        type="button"
        className="intro__fade absolute bottom-16 left-1/2 -translate-x-1/2 rounded-pill border border-line bg-paper px-4 py-2 text-meta font-medium text-ink hover:border-leaf"
        onClick={(event) => {
          event.stopPropagation();
          skipRef.current();
        }}
      >
        Saltar intro
      </button>
    </div>
  );
}

function Letter({ letter, className }: { letter: string; className: string }) {
  return (
    <span className="inline-block overflow-hidden pb-[0.2em] align-bottom">
      <span className={`intro__letter inline-block ${className}`}>{letter}</span>
    </span>
  );
}
