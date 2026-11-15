import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import corpusJson from "../../data/corpus.json";
import runsJson from "../../data/runs.json";
import watchlistJson from "../../data/hardware_watchlist.json";
import { buildWatchlist, HARDWARE_TABLE_DOC } from "../../pipeline/watchlist_build";
import type { CorpusDoc, Run } from "../../lib/schema";
import { quoteIsVerbatim } from "../lab/findings";
import { MATERIAL_WORDS, materialEvidence } from "./evidence";
import { MATERIAL_KEYS, type HardwareEntry, type WatchlistEntry } from "./types";

const corpus = corpusJson as CorpusDoc[];
const runs = runsJson as Run[];
const entries = watchlistJson as WatchlistEntry[];
const hardware = entries.filter((e): e is HardwareEntry => e.kind === "hardware");
const context = entries.filter((e) => e.kind === "context");
const docText = (id: string) => corpus.find((d) => d.id === id)!.text;
const table = docText(HARDWARE_TABLE_DOC);

describe("hardware watchlist data", () => {
  it("has 8–15 hardware entries and the two context entries", () => {
    expect(hardware.length).toBeGreaterThanOrEqual(8);
    expect(hardware.length).toBeLessThanOrEqual(15);
    expect(context.map((c) => c.id)).toEqual(["context-limited-flammability-data", "context-33-subsystems"]);
  });

  it("every quote is an exact substring of its source page (the check verifiedFindings uses)", () => {
    for (const e of entries) {
      expect(corpus.some((d) => d.id === e.sourceDocId), e.id).toBe(true);
      expect(quoteIsVerbatim(e.quote, e.sourceDocId, corpus), e.id).toBe(true);
    }
    expect(quoteIsVerbatim("not in the report", entries[0].sourceDocId, corpus)).toBe(false);
  });

  it("every materialAsWritten is a substring of its quote, and every id is unique", () => {
    for (const h of hardware) expect(h.quote, h.id).toContain(h.materialAsWritten);
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("takes hardware names and group labels from the report's Table 2, never invented", () => {
    for (const h of hardware) {
      expect(table, h.id).toContain(h.hardware);
      expect(["Life Support", "CHeCS", "Crew Systems", ""]).toContain(h.subsystem);
      if (h.subsystem) expect(table, h.id).toContain(h.subsystem);
    }
  });

  it("gives each entry the report's own page number, read from the page text", () => {
    for (const e of entries) {
      const m = /Page #: (\d+) of \d+/.exec(docText(e.sourceDocId))!;
      expect(e.page, e.id).toBe(Number(m[1]));
    }
    expect(hardware.find((h) => h.id === "minion-pmma-case")).toMatchObject({ page: 66, sourceDocId: "ntrs-20260003925-p70" });
  });

  it("uses only known material keys and covers every one", () => {
    for (const h of hardware) expect(MATERIAL_KEYS).toContain(h.materialKey);
    expect(new Set(hardware.map((h) => h.materialKey))).toEqual(new Set(MATERIAL_KEYS));
  });

  it("keeps each quote to one or two sentences", () => {
    for (const e of entries) expect((e.quote.match(/[.!?](?:\s+[A-Z])/g) ?? []).length, e.id).toBeLessThanOrEqual(1);
  });

  it("has the context sentences verbatim, with the report's own words", () => {
    const [limited, subsystems] = context;
    expect(limited.quote).toContain("NASA has limited material flammability data at O2 concentration higher than 30%");
    expect(subsystems.quote).toContain("A total of 33 subsystems and/or components");
    expect([limited.page, subsystems.page]).toEqual([29, 9]);
  });

  it("is exactly what the builder produces from the corpus", () => {
    expect(entries).toEqual(buildWatchlist(corpus));
    expect(readFileSync(join(__dirname, "../../data/hardware_watchlist.json"), "utf8")).toBe(JSON.stringify(buildWatchlist(corpus), null, 2) + "\n");
  });
});

describe("flight evidence from data/runs.json", () => {
  const run = (family: string, raw: string, o2: number | null): Run =>
    ({ id: `x:${raw}`, material: { family, raw }, o2InitialPct: o2 } as unknown as Run);

  it("pmma equals the PMMA run count, counting every PMMA family and PMMA named in the raw text", () => {
    const expected = runs.filter(
      (r) => r.material.family.startsWith("PMMA") || /\b(pmma|acrylic)\b/i.test(r.material.raw),
    );
    const ev = materialEvidence("pmma", runs);
    expect(ev.runs).toBe(expected.length);
    expect(ev.runs).toBeGreaterThan(runs.filter((r) => r.material.family.startsWith("PMMA")).length - 1);
    const o2 = expected.filter((r) => r.o2InitialPct !== null).map((r) => r.o2InitialPct!);
    expect(ev.withO2).toBe(o2.length);
    expect(ev.maxO2).toBe(Math.max(...o2));
    expect(ev.matchable).toBe(true);
  });

  it("counts the other materials the runs name, by word, ignoring case", () => {
    const count = (re: RegExp) => runs.filter((r) => re.test(`${r.material.family} ${r.material.raw}`)).length;
    expect(materialEvidence("nomex", runs).runs).toBe(count(/\bnomex\b/i));
    expect(materialEvidence("silicone", runs).runs).toBe(count(/\bsilicone\b/i));
    expect(materialEvidence("fabric", runs).runs).toBe(count(/\bfabric\b/i));
    expect(materialEvidence("nomex", runs).runs).toBeGreaterThan(0);
    expect(materialEvidence("silicone", runs).runs).toBeGreaterThan(0);
    expect(materialEvidence("fabric", runs).runs).toBeGreaterThan(0);
  });

  it("returns 0 runs and a null maximum for materials no run names", () => {
    for (const key of ["kapton", "velcro", "teflon", "polycarbonate", "foam"] as const) {
      expect(materialEvidence(key, runs), key).toEqual({ matchable: true, runs: 0, withO2: 0, maxO2: null });
    }
  });

  it("'other' has no rule: not applicable, never a misleading zero", () => {
    expect(MATERIAL_WORDS.other).toEqual([]);
    expect(materialEvidence("other", runs)).toEqual({ matchable: false, runs: 0, withO2: 0, maxO2: null });
  });

  it("matches whole words only, ignoring case, on the family and the raw text", () => {
    const sample = [
      run("Nomex", "Nomex III Natural", 21),
      run("other", "nomex natural III", null),
      run("other", "Nomexx blend", 30),
      run("wax", "foamy candle", 17),
      run("wax", "polyfoam block", 18),
      run("other", "PMMA & Nomex", 22.1),
      run("PMMA film", "1 cm 0.2 mm film", 15),
      run("SIBAL fabric", "SIBAL 2 cm", 16),
      run("other", "Silicone", null),
    ];
    expect(materialEvidence("nomex", sample)).toEqual({ matchable: true, runs: 3, withO2: 2, maxO2: 22.1 });
    expect(materialEvidence("foam", sample).runs).toBe(0);
    expect(materialEvidence("pmma", sample)).toMatchObject({ runs: 2, withO2: 2, maxO2: 22.1 });
    expect(materialEvidence("fabric", sample).runs).toBe(1);
    expect(materialEvidence("silicone", sample)).toEqual({ matchable: true, runs: 1, withO2: 0, maxO2: null });
  });
});
