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
import { maxStartingO2 } from "../brief/run-facts";
import {
  ATLAS_BOTTOM_LABEL,
  ATLAS_FOOTNOTE,
  ATLAS_LEGEND,
  ATLAS_O2_COLUMN,
  atlasColumns,
  atlasSentence,
  buildAtlas,
  cellText,
  columnGroups,
  headerRows,
  listOf,
  o2VsText,
  type Atlas,
} from "./atlas";
import { EvidenceAtlas } from "./evidence-atlas";

const runs = runsJson as Run[];
const investigations = investigationsJson as Investigation[];
const atlas = buildAtlas(runs, investigations);
const html = renderToStaticMarkup(createElement(EvidenceAtlas, { runs, investigations }));
const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
const text = decode(html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
const plain = (h: string) => decode(h.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
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
  it("shows N matching runs or No matching run in each cell", () => {
    for (const row of atlas.rows)
      for (const cell of row.cells)
        expect(cellText(cell.n)).toBe(cell.n > 0 ? `${cell.n} matching run${cell.n === 1 ? "" : "s"}` : "No matching run");
    // Rendered: one link per cell; its visible text (screen-reader prefix removed) is the cell text.
    const links = [...html.matchAll(/<a [^>]*href="\/lab\?[^"]*"[^>]*>([\s\S]*?)<\/a>/g)].map((m) =>
      plain(m[1].replace(/<span class="sr-only">[\s\S]*?<\/span>/, "")).trim(),
    );
    expect(links).toEqual(atlas.rows.flatMap((r) => r.cells.map((c) => cellText(c.n))));
    // Two lines: a large lead and a small line, at least 14 px.
    expect(html).toContain('<span class="text-xl leading-tight font-semibold">54</span>');
    expect(html).toContain('<span class="leading-tight">matching runs</span>');
  });

  it("moves highest tested O2 to one bottom row, one computed value per column", () => {
    const foot = html.match(/<tfoot>([\s\S]*?)<\/tfoot>/)![1];
    expect(plain(foot)).toContain(ATLAS_BOTTOM_LABEL);
    expect(ATLAS_BOTTOM_LABEL).toBe("Highest tested starting O2 (this material)");
    const values = [...foot.matchAll(/<td class="px-1\.5 py-2 align-top font-medium">([^<]*)<\/td>/g)].map((m) => m[1]);
    const expected = atlas.columns.map((c) =>
      `${Math.max(...runs.filter((r) => r.material.family === c.family && r.o2InitialPct !== null).map((r) => r.o2InitialPct!))}%`,
    );
    expect(values).toEqual(expected);
    // Not repeated inside the cells any more.
    expect(html.match(/highest tested O2/gi)).toBeNull();
  });

  it("adds an oxygen column: preset oxygen minus the highest solid-run oxygen, computed", () => {
    const max = maxStartingO2(runs);
    expect(atlas.maxSolidO2).toBe(max);
    for (const row of atlas.rows) {
      const o2 = row.scenario.o2Pct!;
      const delta = Math.round((o2 - max) * 10) / 10;
      expect(row.o2Vs.delta, row.id).toBe(delta);
      expect(row.o2Vs.text, row.id).toBe(delta > 0 ? `+${(o2 - max).toFixed(1)} points` : "within tested range");
    }
    expect(atlas.rows.map((r) => r.o2Vs.text)).toEqual([
      "within tested range", "+7.8 points", "+7.8 points", "+11.8 points", "+77.8 points",
    ]);
    expect(o2VsText(0)).toBe("within tested range");
    expect(o2VsText(-3.2)).toBe("within tested range");
    expect(o2VsText(null)).toBe("oxygen not set");
    expect(plain(html)).toContain(ATLAS_O2_COLUMN);
    expect(ATLAS_O2_COLUMN).toBe("Oxygen vs highest tested solid run");
    const col = [...html.matchAll(/<td class="border-b px-2 py-2 align-top font-medium">([^<]*)<\/td>/g)].map((m) => m[1]);
    expect(col).toEqual(atlas.rows.map((r) => r.o2Vs.text));
  });

  it("groups the PMMA columns under one header with film / slab / rod sub-headers", () => {
    const groups = columnGroups(atlas.columns);
    const pmma = groups.find((g) => g.label === "PMMA")!;
    expect(pmma.subLabels).toEqual(["film", "slab", "rod"]);
    expect(pmma.columns.map((c) => c.family)).toEqual(["PMMA film", "PMMA slab", "PMMA rod"]);
    expect(groups.map((g) => g.label)).toEqual(["PMMA", "SIBAL fabric", "Nomex", "wax", "other"]);
    expect(groups.flatMap((g) => g.columns)).toEqual(atlas.columns);
    expect(headerRows(groups)).toBe(2);
    expect(headerRows(columnGroups(atlas.columns.filter((c) => !c.family.startsWith("PMMA"))))).toBe(1);
    expect(html).toContain('colSpan="3"');
    expect(html).toMatch(/<th scope="colgroup" colSpan="3"[^>]*>PMMA<\/th>/);
    const subs = [...html.matchAll(/<th scope="col" class="min-w-24 border-b px-1\.5 pb-2 text-left font-semibold">([^<]*)<\/th>/g)].map((m) => m[1]);
    expect(subs).toEqual(["film", "slab", "rod"]);
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
      "Matching uses the same rules as the Scenario Lab. A gap means no recorded run matches; it is not a statement about how a material would behave. The Lab treats PMMA film, slab and rod as close materials, so their counts can match.",
    );
    expect(text).toContain(ATLAS_FOOTNOTE);
  });

  it("uses no banned words", () => {
    expect(text).not.toMatch(/\b(safe|unsafe|risk|rating|probability|likely)\b/i);
  });

  it("types no numbers: the component and atlas module hold no digits outside class names", () => {
    for (const file of ["app/atlas/evidence-atlas.tsx", "app/atlas/atlas.ts"]) {
      const code = readFileSync(join(ROOT, file), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      const noClasses = code.replace(/className=(\{?)(`[^`]*`|"[^"]*")\}?/g, "").replace(/const (FILLED|HATCHED|STICKY) =\s*"[^"]*";/g, "");
      expect(noClasses.match(/>[^<{>]*\d[^<{>]*</g) ?? [], file).toEqual([]);
      for (const m of noClasses.matchAll(/"([^"\n]*)"|`([^`]*)`/g)) {
        // "O2" is the chemical formula, not a number.
        const lit = (m[1] ?? m[2] ?? "").replace(/\$\{[^}]*\}/g, "").replace(/\bO2\b/g, "");
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
    // Header label, one per preset row, and the bottom row's label.
    expect((html.match(/sticky left-0/g) ?? []).length).toBe(atlas.rows.length + 2);
    // Fits its container from the lg breakpoint; below it the table keeps its width and scrolls.
    expect(html).toContain("w-max min-w-full");
    expect(html).toContain("lg:w-full lg:table-fixed");
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
