// Person A — serialise the cleaned runs for download. Pure.
import type { Run } from "@/lib/schema";

const NOTE =
  "PSI-25 (BASS-II) experiment table, imported by Firebreak. One row per run. " +
  "Values are as recorded in the source; doubtful values are null and listed in flags, never corrected.";

const COLUMNS: [string, (r: Run) => string | number | null | undefined][] = [
  ["id", (r) => r.id],
  ["investigation_id", (r) => r.investigationId],
  ["pi", (r) => r.pi],
  ["test_id", (r) => r.testId],
  ["date", (r) => r.date],
  ["material_family", (r) => r.material.family],
  ["material_raw", (r) => r.material.raw],
  ["thickness_mm", (r) => r.material.thicknessMm],
  ["width_cm", (r) => r.material.widthCm],
  ["diameter_in", (r) => r.material.diameterIn],
  ["o2_initial_pct", (r) => r.o2InitialPct],
  ["o2_final_pct", (r) => r.o2FinalPct],
  ["flow_min_cm_s", (r) => r.flowCmS.min],
  ["flow_max_cm_s", (r) => r.flowCmS.max],
  ["flow_raw", (r) => r.flowCmS.raw],
  ["events", (r) => r.events.join("; ")],
  ["co2_initial_pct", (r) => r.co2.initialPct],
  ["co2_final_pct", (r) => r.co2.finalPct],
  ["co_initial_ppm", (r) => r.co.initialPpm],
  ["co_final_ppm", (r) => r.co.finalPpm],
  ["co_raw", (r) => r.co.raw],
  ["flags", (r) => r.flags.join("; ")],
  ["source_url", (r) => r.sourceUrl],
];

const cell = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const sourceUrls = (runs: Run[]) => [...new Set(runs.map((r) => r.sourceUrl))];

/** CSV with a leading `#` comment naming the source. Empty cell = null. */
export function runsToCsv(runs: Run[]): string {
  const lines = [
    `# ${NOTE} Source: ${sourceUrls(runs).join(", ")}`,
    COLUMNS.map(([name]) => name).join(","),
    ...runs.map((r) => COLUMNS.map(([, get]) => cell(get(r))).join(",")),
  ];
  return lines.join("\r\n") + "\r\n";
}

/** JSON keeps the Run[] shape from lib/schema.ts, wrapped with the source note. */
export function runsToJson(runs: Run[]): string {
  return JSON.stringify({ note: NOTE, sourceUrl: sourceUrls(runs).join(", "), runs }, null, 2) + "\n";
}
