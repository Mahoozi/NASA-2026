"use client";
// The intro on the home page: a spark, a burst, a weightless turning sphere, the
// particles form the project name, then they leave and the page appears behind them.
// Decoration only; it shows no data, and the line under the name is the page's own
// headline. Whether it plays is decided before first paint (should-play.ts); this
// component runs it and always ends by handing the page back.
import { useEffect, useRef } from "react";
import { INTRO_SEEN_KEY } from "./should-play";

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
  const canvas = useRef<HTMLCanvasElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const tagline = useRef<HTMLParagraphElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const skip = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "play") return;

    let over = false;
    let teardown = () => {};
    /** Hand the page back. Safe to call more than once. */
    const finish = () => {
      if (over) return;
      over = true;
      teardown();
      try {
        sessionStorage.setItem(INTRO_SEEN_KEY, "1");
      } catch {
        // Private mode: the intro may replay next visit, which is harmless.
      }
      // "enter" keeps the page's rise-in animation; the cover itself is gone.
      root.dataset.intro = "done";
    };

    // Any deliberate input ends the intro at once.
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey && !e.altKey) finish();
    };
    const opts = { passive: true } as const;
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", finish, opts);
    window.addEventListener("touchmove", finish, opts);
    window.addEventListener("pointerdown", finish, opts);
    const removeInputs = () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", finish);
      window.removeEventListener("touchmove", finish);
      window.removeEventListener("pointerdown", finish);
    };
    teardown = removeInputs;

    // Never leave the page covered: if the graphics code has not started in 4 s, skip.
    const watchdog = window.setTimeout(finish, 4000);

    const load = Promise.all([import("./engine"), import("./timeline"), import("./text-targets"), document.fonts.ready]);
    load
      .then(([{ createEngine, particleCount }, { introTimeline }, { sampleWord }]) => {
        window.clearTimeout(watchdog);
        if (over || !canvas.current || !word.current || !tagline.current || !backdrop.current) return;
        tagline.current.textContent = existingHeadline();
        // Throws where WebGL is unavailable; the catch below hands the page back.
        const engine = createEngine(canvas.current, particleCount(window.innerWidth, navigator.hardwareConcurrency ?? 4));
        const place = () =>
          engine.setTargets(
            sampleWord(word.current!, engine.count, engine.frame(), { width: window.innerWidth, height: window.innerHeight }),
          );
        place();
        window.addEventListener("resize", place);
        const tl = introTimeline(
          engine.state,
          { word: word.current, tagline: tagline.current, backdrop: backdrop.current },
          { onEnter: () => { root.dataset.intro = "enter"; }, onDone: finish },
        );
        teardown = () => {
          removeInputs();
          window.removeEventListener("resize", place);
          tl.kill();
          engine.dispose();
        };
        engine.start();
        // ?t=3.9 freezes the timeline at that second, for checking a single frame.
        const at = new URLSearchParams(window.location.search).get("t");
        if (at === null) tl.play();
        else tl.time(Number(at), true);
        skip.current?.focus({ preventScroll: true });
      })
      .catch(finish);

    return () => {
      // Stop without marking the intro as seen: React re-runs effects in development,
      // and that re-run must be able to start the intro again.
      window.clearTimeout(watchdog);
      over = true;
      teardown();
      // If the page really was left mid-intro, release the document.
      window.setTimeout(() => {
        if (!document.querySelector(".intro-cover")) delete root.dataset.intro;
      }, 0);
    };
  }, []);

  return (
    <div className="intro-cover fixed inset-0 z-50 overflow-hidden">
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
      <button
        ref={skip}
        type="button"
        className="absolute right-4 bottom-4 rounded-md border border-white/25 bg-black/40 px-3 py-2 text-sm font-medium text-white/80 backdrop-blur-sm hover:border-white/60 hover:text-white sm:right-6 sm:bottom-6"
      >
        Skip intro
      </button>
    </div>
  );
}
