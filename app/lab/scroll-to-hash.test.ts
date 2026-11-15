import { describe, expect, it, vi } from "vitest";
import { createHashScroller, hashId } from "./scroll-to-hash";

const doc = (ids: string[]) => {
  const scrolled: { id: string; opts: unknown }[] = [];
  return {
    scrolled,
    getElementById: (id: string) =>
      ids.includes(id) ? { scrollIntoView: (opts: unknown) => void scrolled.push({ id, opts }) } : null,
  };
};

describe("hash scroll helper", () => {
  it("reads the id from a hash", () => {
    expect(hashId("#varied-heading")).toBe("varied-heading");
    expect(hashId("varied-heading")).toBe("varied-heading");
    expect(hashId("#a%20b")).toBe("a b");
    expect(hashId("")).toBeNull();
    expect(hashId("#")).toBeNull();
    expect(hashId("#%E0%A4%A")).toBeNull();
  });

  it("scrolls the target to the top of the view", () => {
    const d = doc(["varied-heading"]);
    expect(createHashScroller(d, () => false)("#varied-heading")).toBe(true);
    expect(d.scrolled).toEqual([{ id: "varied-heading", opts: { behavior: "smooth", block: "start" } }]);
  });

  it("does not animate when the visitor prefers reduced motion", () => {
    const d = doc(["limits-heading"]);
    createHashScroller(d, () => true)("#limits-heading");
    expect(d.scrolled[0].opts).toEqual({ behavior: "auto", block: "start" });
  });

  it("scrolls once, even if called again or with a different hash", () => {
    const d = doc(["a", "b"]);
    const go = createHashScroller(d, () => false);
    expect(go("#a")).toBe(true);
    expect(go("#a")).toBe(false);
    expect(go("#b")).toBe(false);
    expect(d.scrolled).toHaveLength(1);
  });

  it("does nothing without a hash or when the element is missing", () => {
    const d = doc(["a"]);
    expect(createHashScroller(d, () => false)("")).toBe(false);
    expect(createHashScroller(d, () => false)("#missing")).toBe(false);
    expect(d.scrolled).toEqual([]);
  });

  it("leaves the reduced-motion check untouched until it needs it", () => {
    const reduce = vi.fn(() => false);
    createHashScroller(doc([]), reduce)("#nothing");
    expect(reduce).not.toHaveBeenCalled();
  });
});
