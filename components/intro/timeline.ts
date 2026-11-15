// The intro's choreography: one GSAP timeline driving the engine's progress numbers
// and the DOM layers (the sharp word, the headline beneath it, the black backdrop).
import gsap from "gsap";
import type { IntroState } from "./engine";

export type IntroLayers = { word: HTMLElement; tagline: HTMLElement; backdrop: HTMLElement };
export type IntroEvents = { onEnter: () => void; onDone: () => void };

/**
 * Five scenes, about five and a half seconds:
 * spark, burst into a weightless turning sphere cooling to blue, assembly into the
 * word, the light sweep and sharp lettering, then the word breaks apart and the
 * page appears behind it.
 */
export function introTimeline(s: IntroState, layers: IntroLayers, events: IntroEvents): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true, onComplete: events.onDone });
  gsap.set([layers.word, layers.tagline], { opacity: 0, scale: 1 });
  gsap.set(layers.tagline, { y: 14 });
  gsap.set(layers.backdrop, { opacity: 1 });

  tl.addLabel("spark", 0)
    .to(s, { spark: 1, duration: 1.0, ease: "power2.out" }, "spark")
    .addLabel("ignite", 1.0)
    .to(s, { burst: 1, duration: 0.9, ease: "none" }, "ignite")
    .to(s, { vortex: 1, duration: 1.2, ease: "power2.inOut" }, "ignite+=0.3")
    .to(s, { cool: 1, duration: 1.3, ease: "sine.inOut" }, "ignite+=0.45")
    .addLabel("form", 2.3)
    .to(s, { form: 1, duration: 1.3, ease: "power1.inOut" }, "form")
    .addLabel("reveal", 3.55)
    .to(s, { sweep: 1, duration: 0.75, ease: "power1.inOut" }, "reveal")
    .to(layers.word, { opacity: 1, duration: 0.5, ease: "power2.out" }, "reveal+=0.2")
    .to(s, { dim: 1, duration: 0.55, ease: "power2.out" }, "reveal+=0.2")
    .to(layers.tagline, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, "reveal+=0.35")
    // Scene 5: the lettering lets go, the points leave outward, the page comes up behind.
    .addLabel("enter", 4.75)
    .call(events.onEnter, undefined, "enter")
    .to(s, { dim: 0, duration: 0.2, ease: "none" }, "enter")
    .to(s, { out: 1, duration: 0.85, ease: "power2.in" }, "enter")
    .to(layers.word, { opacity: 0, scale: 1.06, duration: 0.4, ease: "power2.in" }, "enter")
    .to(layers.tagline, { opacity: 0, y: -10, duration: 0.3, ease: "power2.in" }, "enter")
    .to(layers.backdrop, { opacity: 0, duration: 0.7, ease: "power1.inOut" }, "enter+=0.1");
  return tl;
}
