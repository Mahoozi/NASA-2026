import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import investigationsJson from "../../data/investigations.json";
import runsJson from "../../data/runs.json";
import { matchInvestigations, runBreakdown } from "../../lib/match";
import type { Investigation, MaterialFamily, Run } from "../../lib/schema";
import { MATERIAL_FAMILIES, parseScenario, presets, scenarioToQuery } from "../lab/scenario";
import { ATLAS_FOOTNOTE, ATLAS_LEGEND, atlasColumns, atlasSentence, buildAtlas, cellText, listOf, type Atlas } from "./atlas";
import { EvidenceAtlas } from "./evidence-atlas";

const runs = runsJson as Run[];
const investigations = investigationsJson as Investigation[];
const atlas = buildAtlas(runs, investigations);
const html = renderToStaticMarkup(createElement(EvidenceAtlas, { runs, investigations }));
const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
const text = decode(html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
const ROOT = join(__dirname, "..", "..");

/** The Lab's own count: the runs table's matching set (lab-client.tsx), computed here from first principles. */
const labCount = (scenario: Parameters<typeof matchInvestigations>[0]) =>
  new Set(matchInvestigations(scenario, investigations, runs).flatMap((m) => m.matchingRunIds)).size;

describe("evidence gap atlas: grid", () => {
  it("has one row per Lab preset, in the Lab's order, with the preset's own values", () => {
    const list = presets(runs);
    expect(atlas.rows.map((r) => r.id)).toEqual(list.map((p) => p.id));
    expect(atlas.rows.map((r) => r.scenario)).toEqual(list.map((p) => p.scenario));
    expect(list.length).toBeGreaterThanOrEqual(5);
  });

  it("has one column per material family with a recorded starting oxygen, in the Lab form's order", () => {
    const withO2 = new Set(runs.filter((r) => r.o2InitialPct !== null).map((r) => r.material.family));
    const expected = MATERIAL_FAMILIES.filter((f) => withO2.has(f));
    expect(atlas.columns.map((c) => c.family)).toEqual(expected);
    expect(atlasColumns(runs).map((c) => c.family)).toEqual(expected);
    // A family whose runs record no starting oxygen is not a column.
    const none = MATERIAL_FAMILIES.filter((f) => !withO2.has(f));
    expect(none).toContain("PMMA sphere");
    for (const f of none) expect(atlas.columns.map((c) => c.family)).not.toContain(f);
  });

  it("gives every cell the Lab's matching-run count for preset + material", () => {
    for (const row of atlas.rows)
      for (const cell of row.cells) {
        expect(cell.scenario, `${row.id} ${cell.family}`).toEqual({ ...row.scenario, materialFamily: cell.family });
        expect(cell.n, `${row.id} ${cell.family}`).toBe(labCount(cell.scenario));
      }
    expect(atlas.rows.every((r) => r.cells.length === atlas.columns.length)).toBe(true);
    expect(atlas.total).toBe(atlas.rows.length * atlas.columns.length);
    expect(atlas.covered).toBe(atlas.rows.flatMap((r) => r.cells).filter((c) => c.n > 0).length);
  });

  it("PMMA rod under ISS cabin air matches what the Lab shows for that scenario", () => {
    const cell = atlas.rows.find((r) => r.id === "iss")!.cells.find((c) => c.family === "PMMA rod")!;
    // The Lab opens this URL; its parsed scenario and count are the cell's.
    const scenario = parseScenario(new URL(cell.href, "http://x").searchParams);
    expect(scenario).toEqual({ materialFamily: "PMMA rod", o2Pct: 21, gravity: "micro" });
    expect(labCount(scenario)).toBe(cell.n);
    // And by direct count: runs where material, oxygen and gravity each reach the Lab's match threshold.
    const brute = runs.filter((r) => {
      const b = runBreakdown(scenario, r);
      return b.materialFamily! >= 0.5 && b.o2Pct! >= 0.5 && b.gravity! >= 0.5;
    }).length;
    expect(cell.n).toBe(brute);
    expect(cell.n).toBeGreaterThan(0);
  });

  it("links every cell to the Lab with exactly its scenario", () => {
    for (const row of atlas.rows)
      for (const cell of row.cells) {
        expect(cell.href).toBe(`/lab?${scenarioToQuery(cell.scenario)}`);
        expect(parseScenario(new URL(cell.href, "http://x").searchParams)).toEqual(cell.scenario);
        expect(html).toContain(`href="${cell.href.replace(/&/g, "&amp;")}"`);
      }
  });

  it("two different covered cells give the Lab the same count the atlas shows", () => {
    const covered = atlas.rows.flatMap((r) => r.cells).filter((c) => c.n > 0);
    expect(covered.length).toBeGreaterThanOrEqual(2);
    for (const c of covered.slice(0, 2)) expect(labCount(parseScenario(new URL(c.href, "http://x").searchParams))).toBe(c.n);
  });
});

describe("evidence gap atlas: text", () => {
  it("shows N matching runs or No matching run, and the computed highest tested O2", () => {
    for (const row of atlas.rows)
      for (const cell of row.cells) {
        expect(cellText(cell.n)).toBe(cell.n > 0 ? `${cell.n} matching run${cell.n === 1 ? "" : "s"}` : "No matching run");
        const o2 = runs.filter((r) => r.material.family === cell.family && r.o2InitialPct !== null).map((r) => r.o2InitialPct!);
        expect(cell.highestO2).toBe(Math.max(...o2));
      }
    const cells = [...html.matchAll(/<span class="font-medium">([^<]*)<\/span><span class="text-muted-foreground">highest tested O2: ([^<]*)<\/span>/g)];
    expect(cells).toHaveLength(atlas.total);
    expect(cells.map((m) => m[1])).toEqual(atlas.rows.flatMap((r) => r.cells.map((c) => cellText(c.n))));
    expect(cells.map((m) => m[2])).toEqual(atlas.rows.flatMap((r) => r.cells.map((c) => `${c.highestO2}%`)));
  });

  it("has a computed sentence with the exact pattern", () => {
    const covered = atlas.rows.filter((r) => r.cells.some((c) => c.n > 0)).map((r) => r.label);
    expect(atlasSentence(atlas)).toBe(
      `${atlas.covered} of ${atlas.total} atmosphere–material combinations have at least one matching flight test; every match is in ${listOf(covered)}.`,
    );
    expect(text).toContain(atlasSentence(atlas));
    expect(atlas.coveredPresets).toEqual(covered);
  });

  it("handles one, several, and no covered atmospheres", () => {
    expect(listOf(["A"])).toBe("A");
    expect(listOf(["A", "B"])).toBe("A and B");
    expect(listOf(["A", "B", "C"])).toBe("A, B and C");
    const none: Atlas = { ...atlas, covered: 0, coveredPresets: [] };
    expect(atlasSentence(none)).toBe(`0 of ${atlas.total} atmosphere–material combinations have at least one matching flight test.`);
  });

  it("has the exact heading, legend and footnote", () => {
    expect(text).toContain("What NASA has burned, by atmosphere and material");
    expect(ATLAS_LEGEND).toBe("Filled cell: at least one matching run. Hatched cell: no matching run.");
    expect(text).toContain(ATLAS_LEGEND);
    expect(ATLAS_FOOTNOTE).toBe(
      "Matching uses the same rules as the Scenario Lab. A gap means no recorded run matches; it is not a statement about how a material would behave.",
    );
    expect(text).toContain(ATLAS_FOOTNOTE);
  });

  it("uses no banned words", () => {
    expect(text).not.toMatch(/\b(safe|unsafe|risk|rating|probability|likely)\b/i);
  });

  it("types no numbers: the component and atlas module hold no digits outside class names", () => {
    for (const file of ["app/atlas/evidence-atlas.tsx", "app/atlas/atlas.ts"]) {
      const code = readFileSync(join(ROOT, file), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      const noClasses = code.replace(/className=(\{?)(`[^`]*`|"[^"]*")\}?/g, "").replace(/const (FILLED|HATCHED) =\s*"[^"]*";/g, "");
      expect(noClasses.match(/>[^<{>]*\d[^<{>]*</g) ?? [], file).toEqual([]);
      for (const m of noClasses.matchAll(/"([^"\n]*)"|`([^`]*)`/g)) {
        const lit = (m[1] ?? m[2] ?? "").replace(/\$\{[^}]*\}/g, "");
        expect(lit, `${file}: ${lit}`).not.toMatch(/\d/);
      }
    }
  });
});

describe("evidence gap atlas: layout", () => {
  it("is in the static HTML, scrolls inside its own container with sticky row labels", () => {
    expect(html).toContain("overflow-x-auto");
    // Positioned, so the screen-reader-only text inside cannot widen the page.
    expect(html).toMatch(/class="relative max-w-full overflow-x-auto/);
    expect((html.match(/sticky left-0/g) ?? []).length).toBe(atlas.rows.length + 1);
    expect(html).not.toMatch(/text-(xs|\[1[0-3]px\])/);
  });

  it("uses neutral colours only", () => {
    expect(html).not.toMatch(/(red|amber|orange|yellow|green|emerald|lime|rose|destructive)-?/);
  });

  it("sits directly below the headline numbers on the landing page, before Why it matters", () => {
    const landing = readFileSync(join(ROOT, "app/page.tsx"), "utf8");
    const at = landing.indexOf("<EvidenceAtlas");
    expect(at).toBeGreaterThan(landing.indexOf('aria-labelledby="gap-heading"'));
    expect(at).toBeLessThan(landing.indexOf('aria-labelledby="why-heading"'));
  });

  it("columns are MaterialFamily values the Lab form offers", () => {
    for (const c of atlas.columns) expect(MATERIAL_FAMILIES).toContain(c.family as MaterialFamily);
  });
});
