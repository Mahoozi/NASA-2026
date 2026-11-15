import { describe, expect, it } from "vitest";
import { INTRO_BOOT_SCRIPT, INTRO_SEEN_KEY, shouldPlayIntro } from "./should-play";

const base = { pathname: "/", seen: false, reducedMotion: false, saveData: false, forced: false };

describe("shouldPlayIntro", () => {
  it("plays on the first visit to the home page", () => {
    expect(shouldPlayIntro(base)).toBe(true);
  });
  it("does not replay within a session", () => {
    expect(shouldPlayIntro({ ...base, seen: true })).toBe(false);
  });
  it("replays on demand with ?intro=1", () => {
    expect(shouldPlayIntro({ ...base, seen: true, forced: true })).toBe(true);
  });
  it("never plays off the home page", () => {
    for (const pathname of ["/lab", "/ask", "/investigations/PSI-25"])
      expect(shouldPlayIntro({ ...base, pathname, forced: true })).toBe(false);
  });
  it("never plays under reduced motion or data saver, even when forced", () => {
    expect(shouldPlayIntro({ ...base, reducedMotion: true, forced: true })).toBe(false);
    expect(shouldPlayIntro({ ...base, saveData: true, forced: true })).toBe(false);
  });
});

describe("INTRO_BOOT_SCRIPT", () => {
  // Runs the inline script against a fake browser and reports whether it marked the page.
  function boot(c: typeof base): boolean {
    const dataset: Record<string, string> = {};
    const env = {
      document: { documentElement: { dataset } },
      location: { pathname: c.pathname, search: c.forced ? "?intro=1" : "" },
      matchMedia: () => ({ matches: c.reducedMotion }),
      navigator: { connection: { saveData: c.saveData } },
      sessionStorage: { getItem: (k: string) => (k === INTRO_SEEN_KEY && c.seen ? "1" : null) },
    };
    new Function(...Object.keys(env), INTRO_BOOT_SCRIPT)(...Object.values(env));
    return dataset.intro === "play";
  }

  it("agrees with shouldPlayIntro for every combination", () => {
    for (const pathname of ["/", "/lab"])
      for (const seen of [false, true])
        for (const reducedMotion of [false, true])
          for (const saveData of [false, true])
            for (const forced of [false, true]) {
              const c = { pathname, seen, reducedMotion, saveData, forced };
              expect(boot(c), JSON.stringify(c)).toBe(shouldPlayIntro(c));
            }
  });
});
