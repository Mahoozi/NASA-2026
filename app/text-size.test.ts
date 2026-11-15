// Projector rule: no text smaller than 14 px anywhere on the site. This is a static
// guard over the source; the computed sizes were checked in a real browser.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx|ts|css)$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : [];
  });
const sources = [...files(join(ROOT, "app")), ...files(join(ROOT, "components"))].map((p) => ({
  path: p.slice(ROOT.length + 1),
  text: readFileSync(p, "utf8"),
}));

describe("minimum text size", () => {
  it("scans the app and component sources", () => {
    expect(sources.length).toBeGreaterThan(40);
  });

  it("uses no Tailwind class below 14 px (text-xs, text-[..px/rem] under 14 px)", () => {
    const small: string[] = [];
    for (const { path, text } of sources)
      for (const m of text.matchAll(/(?<![\w-])text-(xs|\[([0-9.]+)(px|rem)\])(?![\w-])/g)) {
        const px = m[1] === "xs" ? 12 : m[3] === "rem" ? Number(m[2]) * 16 : Number(m[2]);
        if (px < 14) small.push(`${path}: ${m[0]}`);
      }
    expect(small).toEqual([]);
  });

  it("sets no chart or SVG fontSize below 14", () => {
    const small: string[] = [];
    for (const { path, text } of sources)
      for (const m of text.matchAll(/fontSize\s*[:=]\s*\{?\s*(\d+(?:\.\d+)?)/g))
        if (Number(m[1]) < 14) small.push(`${path}: fontSize ${m[1]}`);
    expect(small).toEqual([]);
  });
});
