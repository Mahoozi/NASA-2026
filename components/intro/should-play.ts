// When the intro plays. Kept pure so the rule is tested without a browser.
export const INTRO_SEEN_KEY = "firebreak-intro-seen";

export type IntroConditions = {
  /** The path being loaded. The intro belongs to the home page only. */
  pathname: string;
  /** Already played in this browser session. */
  seen: boolean;
  /** The device asks for reduced motion. */
  reducedMotion: boolean;
  /** The browser is in data-saver mode. */
  saveData: boolean;
  /** `?intro=1` on the URL: replay on demand, for demos. */
  forced: boolean;
};

export function shouldPlayIntro(c: IntroConditions): boolean {
  if (c.pathname !== "/") return false;
  if (c.reducedMotion || c.saveData) return false;
  return c.forced || !c.seen;
}

/**
 * The same rule as a string of plain JavaScript, run inline before first paint so the
 * landing page never flashes ahead of the intro. It marks <html data-intro="play">.
 */
export const INTRO_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,l=location;if(l.pathname!=="/")return;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var n=navigator.connection;if(n&&n.saveData)return;var f=/[?&]intro=1(&|$)/.test(l.search);var s=false;try{s=sessionStorage.getItem("${INTRO_SEEN_KEY}")==="1"}catch(e){}if(f||!s)d.dataset.intro="play"}catch(e){}})();`;
