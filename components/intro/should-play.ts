// When the home page opens with the scroll-driven particle scene. Kept pure so the
// rule is tested without a browser.
export type IntroConditions = {
  /** The path being loaded. The scene belongs to the home page only. */
  pathname: string;
  /** The URL points at a section (#atlas-heading): go straight to it. */
  hash: string;
  /** The device asks for reduced motion. */
  reducedMotion: boolean;
  /** The browser is in data-saver mode. */
  saveData: boolean;
};

export function shouldPlayIntro(c: IntroConditions): boolean {
  return c.pathname === "/" && c.hash === "" && !c.reducedMotion && !c.saveData;
}

/**
 * The same rule as a string of plain JavaScript, run inline before first paint so the
 * landing page never flashes ahead of the scene. It marks <html data-intro="play">.
 */
export const INTRO_BOOT_SCRIPT = `(function(){try{var l=location;if(l.pathname!=="/"||l.hash)return;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var n=navigator.connection;if(n&&n.saveData)return;document.documentElement.dataset.intro="play"}catch(e){}})();`;
