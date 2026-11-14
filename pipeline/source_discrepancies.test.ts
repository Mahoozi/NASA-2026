import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import runsJson from "../data/runs.json";
import type { Run } from "../lib/schema";
import { buildDiscrepancyReport, DISCREPANCY_REPORT, SOURCE_DISCREPANCIES } from "./source_discrepancies";

const runs = runsJson as Run[];

describe("source discrepancies", () => {
  it("puts each flag on exactly the runs its entry names", () => {
    for (const d of SOURCE_DISCREPANCIES) {
      const want = runs
        .filter((r) => r.investigationId === d.psiId && (d.samples === "all" || d.samples.includes(r.testId)))
        .map((r) => r.id);
      const got = runs.filter((r) => r.flags.includes(d.flag)).map((r) => r.id);
      expect(got, d.flag).toEqual(want);
      expect(got.length).toBeGreaterThan(0);
    }
  });

  it("keeps the source values: flags only, nothing filled in", () => {
    const get = (id: string) => runs.find((r) => r.id === id)!;
    expect(get("PSI-99:2-6").flowCmS).toMatchObject({ min: 20, max: 20 });
    for (const id of ["PSI-100:S1", "PSI-100:S2"]) {
      expect(get(id).o2InitialPct).toBeNull();
      expect(get(id).flowCmS.max).toBe(30);
      expect(get(id).material.thicknessMm).toBe(3.3);
      expect(get(id).flags).toContain("oxygen not recorded in this table");
    }
    for (const id of ["PSI-98:S1", "PSI-98:S2"]) {
      expect(get(id).material.thicknessMm).toBe(3.7);
      expect(get(id).flags).toContain("thickness unit inconsistent between Saffire tables; not corrected");
    }
    expect(runs).toHaveLength(263);
    expect(runs.filter((r) => r.o2InitialPct !== null)).toHaveLength(140);
    expect(runs.filter((r) => r.o2InitialPct === null)).toHaveLength(123);
  });

  it("the committed report is generated from the same list", () => {
    expect(readFileSync(DISCREPANCY_REPORT, "utf8")).toBe(buildDiscrepancyReport(runs));
    // The landing page counts distinct NTRS-citing flags; it must equal the list length.
    const ntrsFlags = new Set(runs.flatMap((r) => r.flags.filter((f) => /\bNTRS \d{11}\b/.test(f))));
    expect(ntrsFlags.size).toBe(SOURCE_DISCREPANCIES.length);
  });
});
