/**
 * Saffire importers (PSI-98, PSI-99, PSI-100), tested with real rows and
 * real cell values from data/raw/PSI-9x/100_Experimental table_SAFFIRE-*.csv.
 */
import { describe, expect, it } from "vitest";
import {
  DATE_NOT_STATED,
  importSaffire,
  parseOxygen,
  parseThickness,
  SAFFIRE_FLAG,
  saffireAcceptance,
} from "./psi_import_saffire";
import { SHARED_FLAG } from "./psi_shared";

const { runs, skipped } = importSaffire();
const run = (id: string) => {
  const r = runs.find((x) => x.id === id);
  if (!r) throw new Error(`no run ${id}`);
  return r;
};
const obs = (id: string, label: string) => run(id).observations?.find((o) => o.label === label)?.value;

describe("Saffire import", () => {
  it("passes its acceptance checks", () => {
    expect(() => saffireAcceptance(runs)).not.toThrow();
  });
  it("skips flow-visualisation and note rows and reports them", () => {
    expect(skipped.filter((s) => s.reason.startsWith("flow visualisation")).map((s) => s.psiId)).toEqual([
      "PSI-98", "PSI-98", "PSI-99", "PSI-99",
    ]);
    expect(skipped.filter((s) => s.reason.startsWith("source note"))).toHaveLength(4);
  });
  it("has no date, PI, CO2, CO or events", () => {
    expect(run("PSI-100:S1")).toMatchObject({
      date: DATE_NOT_STATED, pi: "not stated in table", events: [],
      co2: { initialPct: null, finalPct: null }, co: { initialPpm: null, finalPpm: null, raw: "" },
    });
  });
});

describe("parseOxygen (real cells)", () => {
  it("PSI-98 S2 '~ 21.5' is approximate", () => {
    expect(parseOxygen("~ 21.5")).toEqual({ initial: 21.5, final: null, flags: [SAFFIRE_FLAG.o2Approx("~ 21.5")] });
  });
  it("PSI-99 2-8 '22.1 to 22.0' is initial and final", () => {
    expect(parseOxygen("22.1 to 22.0")).toEqual({ initial: 22.1, final: 22, flags: [] });
  });
  it("PSI-98 S1 '21.5 - 21.7' is a range: initial only, flagged", () => {
    expect(parseOxygen("21.5 - 21.7")).toEqual({ initial: 21.5, final: null, flags: [SAFFIRE_FLAG.o2Range("21.5 - 21.7")] });
  });
  it("PSI-100 has no oxygen column", () => {
    expect(run("PSI-100:S2").o2InitialPct).toBeNull();
    expect(run("PSI-100:S2").flags).toContain(SHARED_FLAG.oxygenNotRecorded);
  });
});

describe("parseThickness (real cells)", () => {
  it("PSI-99 2-1 '0.27 mm'", () => expect(parseThickness("0.27 mm", undefined, "PSI-99").mm).toBe(0.27));
  it("PSI-100 S1 '.33 cm' → 3.3 mm, without float noise", () => expect(parseThickness(".33 cm", undefined, "PSI-100").mm).toBe(3.3));
  it("PSI-99 2-9 '1 cm' → 10 mm", () => expect(run("PSI-99:2-9").material.thicknessMm).toBe(10));
  it("PSI-99 2-4 '037 mm' is ambiguous and left undefined", () => {
    expect(parseThickness("037 mm", undefined, "PSI-99")).toEqual({
      mm: undefined, flags: [SAFFIRE_FLAG.thicknessAmbiguous("037 mm")], observations: [],
    });
  });
  it("PSI-99 2-8 'See Fig. 5' and 2-7 '0.85 and 0.37 mm' go to observations", () => {
    expect(run("PSI-99:2-8").material.thicknessMm).toBeUndefined();
    expect(obs("PSI-99:2-8", "sample thickness")).toBe("See Fig. 5");
    expect(obs("PSI-99:2-7", "sample thickness")).toBe("0.85 and 0.37 mm");
  });
  it("PSI-98 S1 bare 0.37 under a (cm) header → 3.7, flagged not corrected", () => {
    expect(run("PSI-98:S1").material.thicknessMm).toBe(3.7);
    expect(run("PSI-98:S1").flags).toContain(SAFFIRE_FLAG.thicknessUnit);
  });
});

describe("materials", () => {
  it("PSI-99 2-6 blank material takes 'Cotton-Fiberglass (SIBAL)' from 2-5", () => {
    expect(run("PSI-99:2-6").material).toMatchObject({ family: "SIBAL fabric", raw: "Cotton-Fiberglass (SIBAL)" });
    expect(run("PSI-99:2-6").flags).toContain(SHARED_FLAG.materialFromRowAbove);
  });
  it("PSI-99 2-9 blank material takes 'PMMA' from 2-8: other, shape not stated", () => {
    expect(run("PSI-99:2-9").material).toMatchObject({ family: "other", raw: "PMMA", thicknessMm: 10 });
    expect(run("PSI-99:2-9").flags).toEqual(
      expect.arrayContaining([SHARED_FLAG.materialFromRowAbove, SHARED_FLAG.pmmaShapeNotStated]),
    );
  });
  it("Silicone and 'PMMA & Nomex' are other", () => {
    expect(run("PSI-99:2-1").material.family).toBe("other");
    expect(run("PSI-99:2-7").material.family).toBe("other");
  });
});

describe("flow, width and observations", () => {
  it("airflow number → min = max; direction from its column", () => {
    expect(run("PSI-98:S2")).toMatchObject({ flowCmS: { min: 20, max: 20, raw: "20" }, flowDirection: "opposed" });
    expect(run("PSI-100:S1")).toMatchObject({ flowCmS: { min: 30, max: 30, raw: "30 cm/s" }, flowDirection: "concurrent" });
  });
  it("width from the width column, length as an observation", () => {
    expect(run("PSI-100:S1").material.widthCm).toBe(40.6);
    expect(obs("PSI-100:S1", "sample length")).toBe("94 cm");
    expect(obs("PSI-98:S1", "sample length (cm)")).toBe("40.6");
  });
  it("Saffire-II results are copied verbatim under clear labels", () => {
    expect(obs("PSI-99:2-5", "microgravity burn length")).toBe("29 cm");
    expect(obs("PSI-99:2-5", "microgravity spread")).toBe("2.1 mm/s");
    expect(obs("PSI-99:2-2", "1-g burn length")).toBe("7.6 cm");
    expect(obs("PSI-99:2-2", "1-g spread rate")).toBe("1.2 mm/s");
  });
  it("cells citing a note carry its text; the oxygen header's note 1 applies to every PSI-99 run", () => {
    expect(obs("PSI-99:2-7", "source note 2")).toBe("The PMMA portion was completely consumed but the Nomex was not ignited.");
    expect(obs("PSI-99:2-8", "source note 3")).toBe("This is the length of fuel with significant visible damage.");
    expect(runs.filter((r) => r.investigationId === "PSI-99").every((r) => obs(r.id, "source note 1")?.startsWith("Derived from measured CO2"))).toBe(true);
  });
});
