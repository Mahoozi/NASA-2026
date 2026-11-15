"use client";
// Temporary test page for the intro engine. Removed when the intro is mounted on the home page.
import { useEffect, useRef } from "react";

export function IntroPreview() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let dispose = () => {};
    let dead = false;
    void Promise.all([import("@/components/intro/engine"), import("@/components/intro/timeline")]).then(
      ([{ createEngine, particleCount }, { igniteTimeline }]) => {
        if (dead || !canvas.current) return;
        const engine = createEngine(canvas.current, particleCount(window.innerWidth, navigator.hardwareConcurrency ?? 4));
        const tl = igniteTimeline(engine.state);
        engine.start();
        // ?t=2.5 freezes the timeline at that second, for checking a single frame.
        const at = new URLSearchParams(window.location.search).get("t");
        if (at === null) tl.play();
        else tl.time(Number(at));
        const replay = () => tl.restart();
        window.addEventListener("click", replay);
        dispose = () => {
          window.removeEventListener("click", replay);
          tl.kill();
          engine.dispose();
        };
      },
    );
    return () => {
      dead = true;
      dispose();
    };
  }, []);
  return <canvas ref={canvas} aria-hidden className="fixed inset-0 z-50 size-full bg-black" />;
}
