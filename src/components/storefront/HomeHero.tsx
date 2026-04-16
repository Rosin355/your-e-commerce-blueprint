import { useEffect, useMemo, useState } from "react";
import heroBotanicalSpring from "@/assets/hero-botanical-spring.jpg";
import heroBotanicalV3 from "@/assets/hero-botanical-v3.jpg";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HomeAnnouncementBar } from "./HomeAnnouncementBar";
import { HomeHeaderOverlay } from "./HomeHeaderOverlay";

const slides = [
  {
    id: "spring",
    image: heroBotanicalSpring,
    title: "Plants that brighten\nevery space",
    subtitle: "Composizioni botaniche curate per portare calma, luce e carattere in ogni ambiente.",
  },
  {
    id: "editorial",
    image: heroBotanicalV3,
    title: "Refreshing green touch\nfor every room",
    subtitle: "Una selezione premium pensata per interni eleganti, terrazze luminose e regali di stagione.",
  },
];

export const HomeHero = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setIsReducedMotion(mediaQuery.matches);
    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (isReducedMotion) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [isReducedMotion]);

  const activeSlide = useMemo(() => slides[activeIndex], [activeIndex]);

  const goPrev = () => setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  const goNext = () => setActiveIndex((prev) => (prev + 1) % slides.length);

  return (
    <section className="relative isolate min-h-[92svh] overflow-hidden text-white md:min-h-[96svh]">
      <HomeAnnouncementBar />
      <HomeHeaderOverlay />

      {slides.map((slide, index) => (
        <img
          key={slide.id}
          src={slide.image}
          alt={slide.subtitle}
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity ${isReducedMotion ? "duration-0" : "duration-[1700ms]"} ${
            index === activeIndex ? "opacity-100" : "opacity-0"
          }`}
          loading={index === 0 ? "eager" : "lazy"}
        />
      ))}

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,24,20,0.08)_0%,rgba(18,24,20,0.2)_44%,rgba(18,24,20,0.52)_100%)]" />

      <div className="relative z-20 mx-auto flex min-h-[92svh] max-w-[1600px] flex-col justify-end px-4 pb-9 pt-28 md:min-h-[96svh] md:px-6 md:pb-12 md:pt-36">
        <div className="max-w-4xl">
          <h1
            className={`whitespace-pre-line font-heading text-[2.35rem] font-medium leading-[0.92] tracking-[-0.032em] text-white md:text-[4.35rem] lg:text-[5.9rem] ${
              isReducedMotion ? "" : "animate-fade-up"
            }`}
          >
            {activeSlide.title}
          </h1>
          <p className={`mt-4 max-w-xl text-sm leading-7 text-white/84 md:text-[1.02rem] ${isReducedMotion ? "" : "animate-fade-up-delayed"}`}>
            {activeSlide.subtitle}
          </p>
          <a href="#catalogo" className="mt-5 inline-flex text-[10px] font-semibold uppercase tracking-[0.22em] text-white/82 transition-colors hover:text-white">
            Shop now
          </a>
        </div>

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
