import { useCallback, useEffect, useRef, useState } from "react";
import heroOutdoorCustom1 from "@/assets/hero-outdoor-custom-1.png";
import heroOutdoorCustom2 from "@/assets/hero-outdoor-custom-2.png";
import heroOutdoorCustom3 from "@/assets/hero-outdoor-custom-3.png";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SiteHeader } from "./SiteHeader";

const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const SLIDE_MS = 1300;
const TEXT_MS = 900;
const TEXT_DELAY_MS = 260;
const TEXT_EXIT_MS = Math.round(SLIDE_MS * 0.45); // 585ms — exits before entering text arrives
const AUTOPLAY_MS = 6500;

// Scoped keyframe names avoid collisions with Tailwind utilities.
// @media prefers-reduced-motion overrides strip scale/translate motion.
const KEYFRAMES = `
  @keyframes hero-slide-enter {
    from { opacity: 0; transform: scale(1.07) translateX(1.5%); }
    to   { opacity: 1; transform: scale(1)    translateX(0); }
  }
  @keyframes hero-slide-exit {
    from { opacity: 1; transform: scale(1); }
    to   { opacity: 0; transform: scale(1.05); }
  }
  @keyframes hero-text-enter {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes hero-text-exit {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-8px); }
  }
  @keyframes hero-overlay-pulse {
    0%   { opacity: 0; }
    18%  { opacity: 0.68; }
    100% { opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    @keyframes hero-slide-enter   { from { opacity: 0; } to { opacity: 1; } }
    @keyframes hero-slide-exit    { from { opacity: 1; } to { opacity: 0; } }
    @keyframes hero-text-enter    { from { opacity: 0; } to { opacity: 1; } }
    @keyframes hero-text-exit     { from { opacity: 1; } to { opacity: 0; } }
    @keyframes hero-overlay-pulse { 0% { opacity: 0; } 50% { opacity: 0.12; } 100% { opacity: 0; } }
  }
`;

const slides = [
  {
    id: "spring",
    image: heroOutdoorCustom1,
    title: "Piante da giardino,\nscelte con cura",
    subtitle:
      "Aceri, arbusti ornamentali e fioriture pensate per dare carattere al tuo giardino, stagione dopo stagione.",
  },
  {
    id: "editorial",
    image: heroOutdoorCustom2,
    title: "Idee verdi per terrazzi,\nbalconi e giardini",
    subtitle:
      "Una selezione premium pensata per esterni luminosi, fioriture stagionali e composizioni dal gusto vivaistico.",
  },
  {
    id: "terrace",
    image: heroOutdoorCustom3,
    title: "Trasforma il tuo balcone\nin un giardino",
    subtitle:
      "Vasi di carattere, ortensie, agrumi e fioriture stagionali per vestire terrazzi e balconi con stile mediterraneo.",
  },
];

export const HomeHero = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Refs so stable callbacks always read the latest values without stale closures
  const activeIndexRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const cleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  activeIndexRef.current = activeIndex;
  isTransitioningRef.current = isTransitioning;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setIsReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const navigate = useCallback((nextIndex: number) => {
    if (isTransitioningRef.current) return;
    if (nextIndex === activeIndexRef.current) return;
    setPreviousIndex(activeIndexRef.current);
    setActiveIndex(nextIndex);
    setIsTransitioning(true);
    if (cleanupRef.current) clearTimeout(cleanupRef.current);
    cleanupRef.current = setTimeout(() => {
      setPreviousIndex(null);
      setIsTransitioning(false);
    }, SLIDE_MS + 200);
  }, []);

  useEffect(() => {
    if (isReducedMotion) return;
    const id = setInterval(
      () => navigate((activeIndexRef.current + 1) % slides.length),
      AUTOPLAY_MS,
    );
    return () => clearInterval(id);
  }, [isReducedMotion, navigate]);

  useEffect(
    () => () => { if (cleanupRef.current) clearTimeout(cleanupRef.current); },
    [],
  );

  const goPrev = () => navigate((activeIndexRef.current - 1 + slides.length) % slides.length);
  const goNext = () => navigate((activeIndexRef.current + 1) % slides.length);

  return (
    <section className="relative isolate min-h-[92svh] overflow-hidden text-white md:min-h-[96svh]">
      {/* SSR-safe keyframe injection — no external deps, no window access */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <SiteHeader variant="hero" />

      {/* ── Slide images ─────────────────────────────────────────── */}
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;
        const isExiting = index === previousIndex && isTransitioning;

        let style: React.CSSProperties;
        if (isExiting) {
          style = {
            zIndex: 10,
            animation: `hero-slide-exit ${SLIDE_MS}ms ${EASING} forwards`,
          };
        } else if (isActive && isTransitioning) {
          style = {
            zIndex: 20,
            animation: `hero-slide-enter ${SLIDE_MS}ms ${EASING} forwards`,
          };
        } else if (isActive) {
          // Steady state: explicit opacity prevents any FOUC on first render
          style = { zIndex: 20, opacity: 1 };
        } else {
          style = { zIndex: 0, opacity: 0 };
        }

        return (
          <img
            key={slide.id}
            src={slide.image}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center"
            style={style}
            loading={index === 0 ? "eager" : "lazy"}
          />
        );
      })}

      {/* ── Cinematic overlay pulse ───────────────────────────────── */}
      {/* Peaks at ~230 ms (18% of SLIDE_MS) — masks the text crossfade seam,
          then fades to 0 before the new text fully arrives at 260 ms delay */}
      {isTransitioning && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 25,
            background: "rgb(10,14,11)",
            animation: `hero-overlay-pulse ${SLIDE_MS}ms ${EASING} forwards`,
          }}
        />
      )}

      {/* ── Permanent gradient scrim ─────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,24,20,0.08)_0%,rgba(18,24,20,0.2)_44%,rgba(18,24,20,0.52)_100%)]"
        style={{ zIndex: 30 }}
      />

      {/* ── Content ──────────────────────────────────────────────── */}
      <div
        className="pointer-events-none relative mx-auto flex min-h-[92svh] max-w-[1600px] flex-col justify-end px-4 pb-9 pt-28 md:min-h-[96svh] md:px-6 md:pb-12 md:pt-36 [&_a]:pointer-events-auto [&_button]:pointer-events-auto"
        style={{ zIndex: 35 }}
      >
        {/* Text area — `relative` so the exiting overlay positions against it */}
        <div className="relative max-w-4xl">
          {/* Entering text — key remounts on every slide change so the animation
              always replays from `from`. The `both` fill keeps opacity:0 until
              TEXT_DELAY_MS, then holds opacity:1 after the animation ends. */}
          <div
            key={activeIndex}
            style={
              isTransitioning
                ? { animation: `hero-text-enter ${TEXT_MS}ms ${TEXT_DELAY_MS}ms ${EASING} both` }
                : undefined
            }
          >
            <h1 className="whitespace-pre-line font-heading text-[2.35rem] font-medium leading-[0.92] tracking-[-0.032em] text-white md:text-[4.35rem] lg:text-[5.9rem]">
              {slides[activeIndex].title}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/84 md:text-[1.02rem]">
              {slides[activeIndex].subtitle}
            </p>
            <a
              href="/collections/all"
              className="mt-5 inline-flex text-[10px] font-semibold uppercase tracking-[0.22em] text-white/82 transition-colors hover:text-white"
            >
              Scopri il catalogo outdoor
            </a>
          </div>

          {/* Exiting text overlay — absolute so it floats over the entering text
              without shifting layout. Exits in TEXT_EXIT_MS (585 ms), well before
              the entering text becomes visible at TEXT_DELAY_MS (260 ms). */}
          {isTransitioning && previousIndex !== null && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                animation: `hero-text-exit ${TEXT_EXIT_MS}ms ${EASING} forwards`,
              }}
            >
              <h1 className="whitespace-pre-line font-heading text-[2.35rem] font-medium leading-[0.92] tracking-[-0.032em] text-white md:text-[4.35rem] lg:text-[5.9rem]">
                {slides[previousIndex].title}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/84 md:text-[1.02rem]">
                {slides[previousIndex].subtitle}
              </p>
            </div>
          )}
        </div>

        {/* Slide counter + nav buttons */}
        <div className="mt-8 flex items-center justify-end gap-4 md:mt-10">
          <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/76">
            {String(activeIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={goPrev}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/24 bg-black/16 text-white transition-colors hover:bg-white/14"
              aria-label="Slide precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/24 bg-black/16 text-white transition-colors hover:bg-white/14"
              aria-label="Slide successiva"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
