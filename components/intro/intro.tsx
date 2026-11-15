"use client";
// The intro: a spark, a burst, a weightless turning sphere, then the particles form
// the project name. Decoration only; it shows no data and adds no copy of its own
// (the line under the name is the page's existing headline).
import { useEffect, useRef } from "react";

const NAME = "Firebreak";

/** The site's existing headline: the page's h1 if there is one, else the meta description. */
function existingHeadline(): string {
  return (
    document.querySelector("main h1")?.textContent?.trim() ||
    document.querySelector('meta[name="description"]')?.getAttribute("content") ||
    ""
  );
}

export function Intro({ freezeAt }: { freezeAt?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const tagline = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let dead = false;
    let dispose = () => {};
    const load = Promise.all([import("./engine"), import("./timeline"), import("./text-targets"), document.fonts.ready]);
    void load.then(([{ createEngine, particleCount }, { introTimeline }, { sampleWord }]) => {
      if (dead || !canvas.current || !word.current || !tagline.current) return;
      tagline.current.textContent = existingHeadline();
      const engine = createEngine(canvas.current, particleCount(window.innerWidth, navigator.hardwareConcurrency ?? 4));
      const place = () =>
        engine.setTargets(
          sampleWord(word.current!, engine.count, engine.frame(), { width: window.innerWidth, height: window.innerHeight }),
        );
      place();
      window.addEventListener("resize", place);
      const tl = introTimeline(engine.state, { word: word.current, tagline: tagline.current });
      engine.start();
      if (freezeAt === undefined) tl.play();
      else tl.time(freezeAt);
      dispose = () => {
        window.removeEventListener("resize", place);
        tl.kill();
        engine.dispose();
      };
    });
    return () => {
      dead = true;
      dispose();
    };
  }, [freezeAt]);

  return (
    <div aria-hidden className="fixed inset-0 z-50 overflow-hidden bg-black">
      <canvas ref={canvas} className="absolute inset-0 size-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center sm:gap-6">
        <div
          ref={word}
          translate="no"
          className="text-[clamp(3.75rem,15vw,11rem)] leading-none font-extrabold tracking-tight text-foreground opacity-0 [font-stretch:75%] [text-shadow:0_0_42px_rgb(91_157_255/0.55)]"
        >
          {NAME}
        </div>
        <p ref={tagline} className="max-w-2xl text-lg text-balance text-muted-foreground opacity-0 sm:text-2xl" />
      </div>
    </div>
  );
}
