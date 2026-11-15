import { describe, expect, it } from "vitest";
import { INTRO_BOOT_SCRIPT, shouldPlayIntro } from "./should-play";

const base = { pathname: "/", hash: "", reducedMotion: false, saveData: false };

describe("shouldPlayIntro", () => {
  it("plays on the home page", () => {
    expect(shouldPlayIntro(base)).toBe(true);
  });
  it("never plays off the home page", () => {
    for (const pathname of ["/lab", "/ask", "/investigations/PSI-25"])
      expect(shouldPlayIntro({ ...base, pathname })).toBe(false);
  });
  it("steps aside for a link to a section of the home page", () => {
    expect(shouldPlayIntro({ ...base, hash: "#atlas-heading" })).toBe(false);
  });
  it("never plays under reduced motion or data saver", () => {
    expect(shouldPlayIntro({ ...base, reducedMotion: true })).toBe(false);
    expect(shouldPlayIntro({ ...base, saveData: true })).toBe(false);
  });
});

describe("INTRO_BOOT_SCRIPT", () => {
  // Runs the inline script against a fake browser and reports whether it marked the page.
  function boot(c: typeof base): boolean {
    const dataset: Record<string, string> = {};
    const env = {
      document: { documentElement: { dataset } },
      location: { pathname: c.pathname, hash: c.hash, search: "" },
      matchMedia: () => ({ matches: c.reducedMotion }),
      navigator: { connection: { saveData: c.saveData } },
    };
    new Function(...Object.keys(env), INTRO_BOOT_SCRIPT)(...Object.values(env));
    return dataset.intro === "play";
  }

  it("agrees with shouldPlayIntro for every combination", () => {
    for (const pathname of ["/", "/lab"])
      for (const hash of ["", "#atlas-heading"])
        for (const reducedMotion of [false, true])
          for (const saveData of [false, true]) {
            const c = { pathname, hash, reducedMotion, saveData };
            expect(boot(c), JSON.stringify(c)).toBe(shouldPlayIntro(c));
          }
  });
});
