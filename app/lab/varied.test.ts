import { describe, expect, it } from "vitest";
import runsJson from "../../data/runs.json";
import type { Run } from "../../lib/schema";
import { whatVaried } from "./varied";

const runs = runsJson as Run[];
const table = whatVaried(runs);
const col = (id: string) => table.find((c) => c.id === id)!;

describe("what varied and what was held fixed", () => {
  it("has one column per investigation with runs", () => {
    expect(table.map((c) => c.id)).toEqual(["PSI-25", "PSI-26", "PSI-98", "PSI-99", "PSI-100"]);
    for (const c of table) expect(c.runs).toBe(runs.filter((r) => r.investigationId === c.id).length);
  });

  it("PSI-25 starting oxygen varied 13.6–22.2 across all 129 runs", () => {
    const o2 = col("PSI-25").cells.o2;
    expect(o2.status).toBe("varied");
    expect(o2.text).toMatch(/^varied: 13\.6–22\.2%/);
    expect([o2.runs, o2.total]).toEqual([129, 129]);
  });

  it("PSI-26 starting oxygen is not recorded, and keeps its flag", () => {
    const o2 = col("PSI-26").cells.o2;
    expect(o2).toMatchObject({ status: "not recorded", text: "not recorded", runs: 0 });
    expect(o2.flagTypes).toContain("oxygen not recorded in this table");
  });

  it("PSI-100 airflow matches runs.json", () => {
    const rs = runs.filter((r) => r.investigationId === "PSI-100");
    const values = [...new Set(rs.flatMap((r) => [r.flowCmS.min, r.flowCmS.max]))];
    expect(values).toHaveLength(1);
    const flow = col("PSI-100").cells.flow;
    expect(flow).toMatchObject({ status: "held fixed", text: `held fixed: ${values[0]} cm/s`, runs: rs.length });
  });

  it("never says varied when every recorded value is equal, or fixed when they differ", () => {
    for (const c of table) {
      const rs = runs.filter((r) => r.investigationId === c.id);
      const values: Record<string, unknown[]> = {
        thickness: rs.map((r) => r.material.thicknessMm),
        width: rs.map((r) => r.material.widthCm),
        diameter: rs.map((r) => r.material.diameterIn),
        o2: rs.map((r) => r.o2InitialPct),
        flow: rs.flatMap((r) => (r.flowCmS.min === null || r.flowCmS.max === null ? [] : [r.flowCmS.min, r.flowCmS.max])),
        direction: rs.map((r) => r.flowDirection),
      };
      for (const [key, vs] of Object.entries(values)) {
        const distinct = new Set(vs.filter((v) => v !== null && v !== undefined)).size;
        const status = c.cells[key].status;
        if (distinct === 0) expect(status, `${c.id} ${key}`).toBe("not recorded");
        if (distinct === 1) expect(status, `${c.id} ${key}`).toBe("held fixed");
        if (distinct > 1) expect(status, `${c.id} ${key}`).toBe("varied");
      }
    }
  });
});
