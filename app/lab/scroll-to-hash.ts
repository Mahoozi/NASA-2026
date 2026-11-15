// Person A — the Lab renders on the client, so the browser's own #fragment scroll
// can run before the section exists. After the Lab has rendered, scroll the
// element named by location.hash into view, once.

type Target = { scrollIntoView(options: { behavior: "auto" | "smooth"; block: "start" }): void };
export type HashDoc = { getElementById(id: string): Target | null };

/** "#varied-heading" → "varied-heading"; null for no hash or an undecodable one. */
export function hashId(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

/**
 * Returns a function that scrolls to the hash target the first time it is
 * called and does nothing afterwards, whether or not the element was found.
 * Resolves true only when it scrolled.
 */
export function createHashScroller(doc: HashDoc, reduceMotion: () => boolean): (hash: string) => boolean {
  let done = false;
  return (hash) => {
    if (done) return false;
    done = true;
    const id = hashId(hash);
    const el = id ? doc.getElementById(id) : null;
    if (!el) return false;
    el.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
    return true;
  };
}
