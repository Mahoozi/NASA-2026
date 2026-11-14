// Person A — what each investigation varied and what it held fixed, computed
// only from data/runs.json. Pure. A value missing from a run is "not recorded";
// nothing is filled in. Flags travel with the cells they concern.
import type { Run } from "@/lib/schema";
import { materialLabel } from "./material-label";

export type CellStatus = "varied" | "held fixed" | "not recorded" | "recorded";

export type Cell = {
  status: CellStatus;
  /** "varied: 13.6–22.2% (50 values)", "held fixed: 20 cm/s", "not recorded". */
  text: string;
  /** Runs with a value behind this cell, out of `total`. */
  runs: number;
  total: number;
  /** Runs carrying a flag about this dimension, and the flag texts. */
  flagged: number;
  flagTypes: string[];
};

export type Dimension = { key: string; label: string };

export const DIMENSIONS: Dimension[] = [
  { key: "material", label: "Material (family and shape)" },
  { key: "thickness", label: "Thickness" },
  { key: "width", label: "Width" },
  { key: "diameter", label: "Diameter" },
  { key: "o2", label: "Starting oxygen" },
  { key: "flow", label: "Airflow" },
  { key: "direction", label: "Flow direction" },
  { key: "measured", label: "Measurements recorded" },
];

/** Which flags concern which row (the importers' flag texts, see flag-types.ts). */
const FLAG_ROW: Record<string, RegExp | null> = {
  material: /material inferred|shape|spherical sample|material blank/i,
  thickness: /thickness/i,
  width: null,
  diameter: null,
  o2: /oxygen/i,
  flow: /airflow|\bfan\b/i,
  direction: /flow direction/i,
  measured: /\bCO\b/,
};

const LIST_MAX = 6;
const fmt = (n: number) => String(n);
const stripRaw = (f: string) => f.replace(/\s*\(raw:.*\)\s*$/, "");

/** Observation labels that are file ids or notes, not measurements. */
const NOT_A_MEASUREMENT = /^camera|^sample|source note|note in material/i;

function numeric(values: (number | null | undefined)[], unit: string, total: number) {
  const present = values.filter((v): v is number => v !== null && v !== undefined);
  return { present, unit, total };
}

function summariseNumbers(nums: number[], unit: string, runs: number, total: number): Omit<Cell, "flagged" | "flagTypes"> {
  if (!runs) return { status: "not recorded", text: "not recorded", runs: 0, total };
  const distinct = [...new Set(nums)].sort((a, b) => a - b);
  if (distinct.length === 1)
    return { status: "held fixed", text: `held fixed: ${fmt(distinct[0])}${unit}`, runs, total };
  const text =
    distinct.length <= LIST_MAX
      ? `varied: ${distinct.map(fmt).join(", ")}${unit}`
      : `varied: ${fmt(distinct[0])}–${fmt(distinct.at(-1)!)}${unit} (${distinct.length} values)`;
  return { status: "varied", text, runs, total };
}

function summariseLabels(labels: string[], runs: number, total: number): Omit<Cell, "flagged" | "flagTypes"> {
  if (!runs) return { status: "not recorded", text: "not recorded", runs: 0, total };
  const counts = new Map<string, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  const list = [...counts].sort((a, b) => b[1] - a[1]);
  if (list.length === 1) return { status: "held fixed", text: `held fixed: ${list[0][0]}`, runs, total };
  return { status: "varied", text: `varied: ${list.map(([l, n]) => `${l} (${n})`).join(", ")}`, runs, total };
}

function cellFor(key: string, rs: Run[]): Omit<Cell, "flagged" | "flagTypes"> {
  const total = rs.length;
  switch (key) {
    case "material":
      return summariseLabels(rs.map(materialLabel), total, total);
    case "thickness": {
      const { present } = numeric(rs.map((r) => r.material.thicknessMm), " mm", total);
      return summariseNumbers(present, " mm", present.length, total);
    }
    case "width": {
      const { present } = numeric(rs.map((r) => r.material.widthCm), " cm", total);
      return summariseNumbers(present, " cm", present.length, total);
    }
    case "diameter": {
      const { present } = numeric(rs.map((r) => r.material.diameterIn), " in", total);
      return summariseNumbers(present, " in", present.length, total);
    }
    case "o2": {
      const { present } = numeric(rs.map((r) => r.o2InitialPct), "%", total);
      return summariseNumbers(present, "%", present.length, total);
    }
    case "flow": {
      const withFlow = rs.filter((r) => r.flowCmS.min !== null && r.flowCmS.max !== null);
      const nums = withFlow.flatMap((r) => [r.flowCmS.min!, r.flowCmS.max!]);
      return summariseNumbers(nums, " cm/s", withFlow.length, total);
    }
    case "direction": {
      const dirs = rs.flatMap((r) => (r.flowDirection ? [r.flowDirection] : []));
      return summariseLabels(dirs, dirs.length, total);
    }
    case "measured": {
      const n = (f: (r: Run) => boolean) => rs.filter(f).length;
      const obsLabels = [
        ...new Set(rs.flatMap((r) => (r.observations ?? []).map((o) => o.label))),
      ].filter((l) => !NOT_A_MEASUREMENT.test(l) && !/^1-g/i.test(l));
      const parts: [string, number][] = [
        ["CO", n((r) => r.co.initialPpm !== null || r.co.finalPpm !== null)],
        ["CO2", n((r) => r.co2.initialPct !== null || r.co2.finalPct !== null)],
        ["event keywords", n((r) => r.events.length > 0)],
        [
          `observations (${obsLabels.join(", ")})`,
          n((r) => (r.observations ?? []).some((o) => obsLabels.includes(o.label))),
        ],
        ["1-g comparison", n((r) => (r.observations ?? []).some((o) => /^1-g/i.test(o.label)))],
      ];
      const recorded = parts.filter(([, k]) => k > 0);
      const runs = n((r) =>
        r.co.initialPpm !== null || r.co.finalPpm !== null ||
        r.co2.initialPct !== null || r.co2.finalPct !== null ||
        r.events.length > 0 ||
        (r.observations ?? []).some((o) => !NOT_A_MEASUREMENT.test(o.label)),
      );
      if (!recorded.length) return { status: "not recorded", text: "not recorded", runs: 0, total };
      return {
        status: "recorded",
        text: recorded.map(([l, k]) => `${l}: ${k} run${k === 1 ? "" : "s"}`).join("; "),
        runs,
        total,
      };
    }
  }
  throw new Error(`unknown dimension ${key}`);
}

/** "held fixed" / "varied" only describe the runs that record a value. */
function scoped(c: Omit<Cell, "flagged" | "flagTypes">): Omit<Cell, "flagged" | "flagTypes"> {
  if ((c.status === "held fixed" || c.status === "varied") && c.runs < c.total)
    return { ...c, text: c.text.replace(/^(held fixed|varied):/, "$1 where recorded:") };
  return c;
}

export type InvestigationColumn = { id: string; runs: number; cells: Record<string, Cell> };

/** One column per investigation with runs, in PSI id order. */
export function whatVaried(runs: Run[]): InvestigationColumn[] {
  const byInv = new Map<string, Run[]>();
  for (const r of runs) byInv.set(r.investigationId, [...(byInv.get(r.investigationId) ?? []), r]);
  const num = (id: string) => Number(id.replace(/\D/g, ""));
  return [...byInv]
    .sort((a, b) => num(a[0]) - num(b[0]))
    .map(([id, rs]) => ({
      id,
      runs: rs.length,
      cells: Object.fromEntries(
        DIMENSIONS.map(({ key }) => {
          const re = FLAG_ROW[key];
          const hits = re ? rs.filter((r) => r.flags.some((f) => re.test(f))) : [];
          const types = re
            ? [...new Set(hits.flatMap((r) => r.flags.filter((f) => re.test(f)).map(stripRaw)))]
            : [];
          return [key, { ...scoped(cellFor(key, rs)), flagged: hits.length, flagTypes: types }];
        }),
      ),
    }));
}
