// The intro's choreography: one GSAP timeline driving the engine's progress numbers
// and the two DOM layers (the sharp word and the headline beneath it).
import gsap from "gsap";
import type { IntroState } from "./engine";

export type IntroLayers = { word: HTMLElement; tagline: HTMLElement };

/**
 * Scenes 1 to 4: spark, burst, the weightless turning sphere cooling to blue,
 * assembly into the word, then the light sweep and the sharp lettering.
 */
export function introTimeline(s: IntroState, layers: IntroLayers): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  gsap.set([layers.word, layers.tagline], { opacity: 0 });
  gsap.set(layers.tagline, { y: 14 });

  tl.addLabel("spark", 0)
    .to(s, { spark: 1, duration: 1.0, ease: "power2.out" }, "spark")
    .addLabel("ignite", 1.0)
    .to(s, { burst: 1, duration: 0.9, ease: "none" }, "ignite")
    .to(s, { vortex: 1, duration: 1.3, ease: "power2.inOut" }, "ignite+=0.35")
    .to(s, { cool: 1, duration: 1.5, ease: "sine.inOut" }, "ignite+=0.5")
    .addLabel("form", 2.5)
    .to(s, { form: 1, duration: 1.4, ease: "power1.inOut" }, "form")
    .addLabel("reveal", 3.9)
    .to(s, { sweep: 1, duration: 0.8, ease: "power1.inOut" }, "reveal")
    .to(layers.word, { opacity: 1, duration: 0.55, ease: "power2.out" }, "reveal+=0.2")
    .to(s, { dim: 1, duration: 0.6, ease: "power2.out" }, "reveal+=0.2")
    .to(layers.tagline, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "reveal+=0.4")
    .addLabel("held", 4.9);
  return tl;
}
