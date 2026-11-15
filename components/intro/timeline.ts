// The scene's choreography: one GSAP timeline, scrubbed by the scroll position. Its
// length is 1, so every position below is a fraction of the scroll runway.
import gsap from "gsap";
import type { IntroState } from "./engine";

export type IntroLayers = { word: HTMLElement; tagline: HTMLElement; backdrop: HTMLElement; hint: HTMLElement };

/**
 * Scroll down: the spark bursts into a weightless turning sphere that cools to blue,
 * the points assemble into the word, a light sweeps it and the sharp lettering takes
 * over, then the word lets go and the page comes up behind it. Scroll up: the reverse.
 */
export function sceneTimeline(s: IntroState, layers: IntroLayers): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  gsap.set([layers.word, layers.tagline], { opacity: 0, scale: 1 });
  gsap.set(layers.tagline, { y: 14 });
  gsap.set(layers.backdrop, { opacity: 1 });

  tl.to(layers.hint, { opacity: 0, duration: 0.04 }, 0)
    .addLabel("ignite", 0.02)
    .to(s, { burst: 1, duration: 0.16 }, "ignite")
    .to(s, { vortex: 1, duration: 0.2, ease: "power1.inOut" }, "ignite+=0.07")
    .to(s, { cool: 1, duration: 0.2, ease: "sine.inOut" }, "ignite+=0.12")
    .addLabel("form", 0.38)
    .to(s, { form: 1, duration: 0.24, ease: "power1.inOut" }, "form")
    .addLabel("reveal", 0.62)
    .to(s, { sweep: 1, duration: 0.12 }, "reveal")
    .to(layers.word, { opacity: 1, duration: 0.08, ease: "power1.out" }, "reveal+=0.04")
    .to(s, { dim: 1, duration: 0.08 }, "reveal+=0.04")
    .to(layers.tagline, { opacity: 1, y: 0, duration: 0.08, ease: "power2.out" }, "reveal+=0.07")
    // A short hold on the finished name, then the hand-over to the page.
    .addLabel("enter", 0.84)
    .to(s, { dim: 0, duration: 0.03 }, "enter")
    .to(s, { out: 1, duration: 0.16, ease: "power1.in" }, "enter")
    .to(layers.word, { opacity: 0, scale: 1.06, duration: 0.07, ease: "power1.in" }, "enter")
    .to(layers.tagline, { opacity: 0, y: -10, duration: 0.05, ease: "power1.in" }, "enter")
    .to(layers.backdrop, { opacity: 0, duration: 0.12, ease: "power1.inOut" }, "enter+=0.03")
    .set({}, {}, 1);
  return tl;
}
