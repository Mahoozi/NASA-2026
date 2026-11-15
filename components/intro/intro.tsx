"use client";
// The home page's opening scene, driven by scrolling: a spark bursts into a weightless
// turning sphere, the particles form the project name, then they leave and the page
// comes up behind them. Scrolling back up plays it in reverse.
// Decoration only; it shows no data, and the line under the name is the page's own
// headline. Whether the scene exists is decided before first paint (should-play.ts).
import { useEffect, useRef } from "react";
import { ChevronDownIcon } from "lucide-react";

const NAME = "Firebreak";

/** The site's existing headline: the page's h1 if there is one, else the meta description. */
function existingHeadline(): string {
  return (
    document.querySelector("main h1")?.textContent?.trim() ||
    document.querySelector('meta[name="description"]')?.getAttribute("content") ||
    ""
  );
}

export function Intro() {
  const runway = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const tagline = useRef<HTMLParagraphElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const skip = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "play") return;

    let dead = false;
    let teardown = () => {};
    /** Remove the scene and show the page as it is without it. */
    const abandon = () => {
      teardown();
      delete root.dataset.intro;
    };
    // Never leave the page covered: if the graphics code has not started in 4 s, drop the scene.
    const watchdog = window.setTimeout(abandon, 4000);

    const load = Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
      import("./engine"),
      import("./timeline"),
      import("./text-targets"),
      document.fonts.ready,
    ]);
    load
      .then(([{ default: gsap }, { ScrollTrigger }, { createEngine, particleCount }, { sceneTimeline }, { sampleWord }]) => {
        window.clearTimeout(watchdog);
        const els = [runway, cover, canvas, word, tagline, backdrop, hint, skip].map((r) => r.current);
        if (dead || els.some((e) => !e)) return;
        gsap.registerPlugin(ScrollTrigger);
        tagline.current!.textContent = existingHeadline();
        // Throws where WebGL is unavailable; the catch below drops the scene.
        const engine = createEngine(canvas.current!, particleCount(window.innerWidth, navigator.hardwareConcurrency ?? 4));
        const place = () =>
          engine.setTargets(
            sampleWord(word.current!, engine.count, engine.frame(), { width: window.innerWidth, height: window.innerHeight }),
          );
        place();
        window.addEventListener("resize", place);

        // The spark is alight before any scrolling; everything after it follows the scroll.
        const sparkIn = gsap.to(engine.state, { spark: 1, duration: 1.1, ease: "power2.out" });
        const tl = sceneTimeline(engine.state, {
          word: word.current!, tagline: tagline.current!, backdrop: backdrop.current!, hint: hint.current!,
        });
        const end = () => runway.current!.getBoundingClientRect().bottom + window.scrollY;
        let shown = true;
        const show = (on: boolean) => {
          if (on === shown) return;
          shown = on;
          // Past the runway the cover is gone and nothing is drawn.
          cover.current!.style.display = on ? "" : "none";
          if (on) engine.start();
          else engine.stop();
        };
        const trigger = ScrollTrigger.create({
          start: 0,
          end,
          animation: tl,
          scrub: 0.5,
          invalidateOnRefresh: true,
          onUpdate: (self) => show(self.progress < 1),
          onRefresh: (self) => show(self.progress < 1),
        });
        engine.start();
        show(trigger.progress < 1);

        const onSkip = () => window.scrollTo({ top: end(), behavior: "instant" });
        skip.current!.addEventListener("click", onSkip);
        const skipButton = skip.current!;

        teardown = () => {
          skipButton.removeEventListener("click", onSkip);
          window.removeEventListener("resize", place);
          sparkIn.kill();
          trigger.kill();
          tl.kill();
          engine.dispose();
        };
      })
      .catch(abandon);

    return () => {
      dead = true;
      window.clearTimeout(watchdog);
      teardown();
      teardown = () => {};
    };
  }, []);

  return (
    <>
      {/* The scroll runway: its height is the length of the scene. Absent when the scene is off. */}
      <div ref={runway} aria-hidden className="intro-runway" />
      <div ref={cover} className="intro-cover fixed inset-0 z-50 overflow-hidden">
        <div ref={backdrop} aria-hidden className="absolute inset-0 bg-black" />
        <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />
        <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center sm:gap-6">
          <div
            ref={word}
            translate="no"
            className="text-[clamp(3.75rem,15vw,11rem)] leading-none font-extrabold tracking-tight text-foreground opacity-0 [font-stretch:75%] [text-shadow:0_0_42px_rgb(91_157_255/0.55)]"
          >
            {NAME}
          </div>
          <p ref={tagline} className="max-w-2xl text-lg text-balance text-muted-foreground opacity-0 sm:text-2xl" />
        </div>
        <div
          ref={hint}
          aria-hidden
          className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-1 text-sm font-medium text-white/70"
        >
          Scroll
          <ChevronDownIcon className="size-5 motion-safe:animate-bounce" />
        </div>
        <button
          ref={skip}
          type="button"
          className="absolute right-4 bottom-4 rounded-md border border-white/25 bg-black/40 px-3 py-2 text-sm font-medium text-white/80 backdrop-blur-sm hover:border-white/60 hover:text-white sm:right-6 sm:bottom-6"
        >
          Skip intro
        </button>
      </div>
    </>
  );
}
