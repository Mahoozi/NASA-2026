import { describe, expect, it } from "vitest";
import type { Run } from "../../lib/schema";
import runsJson from "../../data/runs.json";
import { CSV_COLUMNS, runsToCsv } from "./export";
import { flagType, flagTypes } from "./flag-types";

const runs = runsJson as Run[];

describe("CSV export and data dictionary", () => {
  it("documents exactly the columns the CSV writes, in order", () => {
    const header = runsToCsv(runs).split("\r\n")[1];
    expect(header.split(",")).toEqual(CSV_COLUMNS.map((c) => c.name));
    for (const c of CSV_COLUMNS) expect(c.description.length).toBeGreaterThan(0);
  });

  it("lists every flag present in the runs under exactly one field", () => {
    const listed = flagTypes(runs).flatMap((g) => g.types.map(([t]) => t));
    expect(new Set(listed).size).toBe(listed.length);
    for (const r of runs)
      for (const f of r.flags) expect(listed).toContain(flagType(f));
  });
});
