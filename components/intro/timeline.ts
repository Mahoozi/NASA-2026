// The intro's choreography: one GSAP timeline driving the engine's progress numbers.
import gsap from "gsap";
import type { IntroState } from "./engine";

/** Scenes 1 and 2: the spark, the burst, the weightless turning sphere cooling to blue. */
export function igniteTimeline(s: IntroState): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  tl.addLabel("spark", 0)
    .to(s, { spark: 1, duration: 1.0, ease: "power2.out" }, "spark")
    .addLabel("ignite", 1.0)
    .to(s, { burst: 1, duration: 0.9, ease: "none" }, "ignite")
    .to(s, { vortex: 1, duration: 1.3, ease: "power2.inOut" }, "ignite+=0.35")
    .to(s, { cool: 1, duration: 1.5, ease: "sine.inOut" }, "ignite+=0.5");
  return tl;
}
