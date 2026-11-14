/**
 * PSI-26 (BASS) importer, tested with real rows of
 * data/raw/PSI-26_Experimental table_BASS.csv (As Run / Test # in each name).
 */
import { describe, expect, it } from "vitest";
import { bassAcceptance, BASS_FLAG, importBass, materialNotes } from "./psi_import_bass";
import { SHARED_FLAG } from "./psi_shared";

const { runs, skipped } = importBass();
const run = (id: string) => {
  const r = runs.find((x) => x.id === `PSI-26:${id}`);
  if (!r) throw new Error(`no run ${id}`);
  return r;
};

describe("PSI-26 import", () => {
  it("passes its acceptance checks", () => {
    expect(() => bassAcceptance(runs, skipped)).not.toThrow();
  });

  it("skips the SOOT Cleaning row and reports it", () => {
    expect(skipped).toEqual([
      { psiId: "PSI-26", line: 67, text: "SOOT Cleaning", reason: "no test number (maintenance row)" },
    ]);
  });

  it("r1-t1: SIBAL, no oxygen or airflow column", () => {
    expect(run("r1-t1")).toMatchObject({
      testId: "1",
      date: "2012-03-30",
      pi: "not stated in table",
      material: { family: "SIBAL fabric", raw: "SIBAL 2 cm" },
      o2InitialPct: null,
      flowCmS: { min: null, max: null, raw: "" },
      events: [],
      flags: [SHARED_FLAG.oxygenNotRecorded, SHARED_FLAG.airflowNotRecorded],
    });
  });

  it("keeps both runs that share As Run 24 (tests 12-R and 12-R2)", () => {
    expect(run("r24-t12-R").material.family).toBe("Nomex");
    expect(run("r24-t12-R2").material.family).toBe("Nomex");
  });
});

describe("material rules on real rows", () => {
  it("r15-t54 'PMMA 2 cm' takes sphere from sample 21's other rows", () => {
    expect(run("r15-t54").material.family).toBe("PMMA sphere");
    expect(run("r15-t54").flags).toContain(SHARED_FLAG.shapeFromSampleNumber);
  });
  it("r20-t30 'PMMA 1 cm' has no sphere sibling (sample 15) → other", () => {
    expect(run("r20-t30").material.family).toBe("other");
    expect(run("r20-t30").flags).toContain(SHARED_FLAG.pmmaShapeNotStated);
  });
  it("r25-t46 '2 cm sphere' is inferred PMMA", () => {
    expect(run("r25-t46").material.family).toBe("PMMA sphere");
    expect(run("r25-t46").flags).toContain(SHARED_FLAG.sphereInferredPmma);
  });
  it("candles and wax slabs are wax; ultem is other", () => {
    expect(run("r46-t82").material.family).toBe("wax");
    expect(run("r78-t74").material.family).toBe("wax");
    expect(run("r43-t16").material.family).toBe("other");
  });
});

describe("notes in the material column", () => {
  it("r44-t5b 'opposed flow' sets flow direction and is kept as an observation", () => {
    expect(run("r44-t5b").flowDirection).toBe("opposed");
    expect(run("r44-t5b").observations).toEqual([{ label: "note in material column", value: "opposed flow" }]);
  });
  it("r51-t111 'wake ign' is an observation, not a flow direction", () => {
    expect(run("r51-t111").flowDirection).toBeUndefined();
    expect(run("r51-t111").observations).toEqual([{ label: "note in material column", value: "wake ign" }]);
  });
  it("r97-t73 'oppsed' is recorded and flagged, not read as opposed", () => {
    expect(run("r97-t73").flowDirection).toBeUndefined();
    expect(run("r97-t73").flags).toContain(BASS_FLAG.oppsed);
    expect(run("r97-t73").observations).toEqual([{ label: "note in material column", value: "oppsed" }]);
  });
  it("finds every phrase in mixed text", () => {
    expect(materialNotes("candle    paraffin   wake").observations).toEqual([
      { label: "note in material column", value: "wake" },
    ]);
  });
});

describe("dates", () => {
  it("r42-t35 '6/29/`12' is kept raw and flagged", () => {
    expect(run("r42-t35").date).toBe("6/29/`12");
    expect(run("r42-t35").flags).toContain(SHARED_FLAG.dateUnparseable);
  });
  it("r104-t50 '5/15/2103' is flagged as an implausible year, not corrected", () => {
    expect(run("r104-t50").date).toBe("2103-05-15");
    expect(run("r104-t50").flags).toContain(SHARED_FLAG.dateYearImplausible);
  });
  it("r93-t38 4/26/2013 is day 116, but GMT says 113", () => {
    expect(run("r93-t38").flags).toContain(SHARED_FLAG.dateGmt);
    expect(run("r94-t39").flags).not.toContain(SHARED_FLAG.dateGmt); // same date, GMT 116
  });
});
