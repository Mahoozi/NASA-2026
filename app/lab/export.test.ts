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

  it("puts both Saffire source flags in the CSV and in the dictionary's flag list", () => {
    const csv = runsToCsv(runs);
    const swapped =
      "length and width may be swapped in this table: Saffire-III's table and NTRS 20170008805 give 94 cm long × 40.6 cm wide";
    const airflow = "airflow 30 cm/s in this table; NTRS 20180005168 labels Saffire-III at 25 cm/s";
    const rowsOf = (id: string) => csv.split("\r\n").filter((l) => l.startsWith(`${id}:`));
    expect(rowsOf("PSI-98")).toHaveLength(2);
    for (const l of rowsOf("PSI-98")) expect(l).toContain(swapped);
    for (const l of rowsOf("PSI-100")) expect(l).toContain(airflow);
    const groups = flagTypes(runs);
    expect(groups.find((g) => g.field === "Sample size")?.types.map(([t]) => t)).toEqual([swapped]);
    expect(groups.find((g) => g.field === "Airflow")?.types.map(([t]) => t)).toContain(airflow);
  });

  it("lists every flag present in the runs under exactly one field", () => {
    const listed = flagTypes(runs).flatMap((g) => g.types.map(([t]) => t));
    expect(new Set(listed).size).toBe(listed.length);
    for (const r of runs)
      for (const f of r.flags) expect(listed).toContain(flagType(f));
  });
});
