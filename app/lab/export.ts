// Person A — serialise the cleaned runs for download. Pure.
import type { Run } from "@/lib/schema";

const NOTE =
  "NASA PSI experiment tables, imported by Firebreak. One row per run. " +
  "Values are as recorded in the source; doubtful values are null and listed in flags, never corrected. " +
  "Observations are copied verbatim.";

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
  ["flow_direction", (r) => r.flowDirection],
  ["events", (r) => r.events.join("; ")],
  ["co2_initial_pct", (r) => r.co2.initialPct],
  ["co2_final_pct", (r) => r.co2.finalPct],
  ["co_initial_ppm", (r) => r.co.initialPpm],
  ["co_final_ppm", (r) => r.co.finalPpm],
  ["co_raw", (r) => r.co.raw],
  ["flags", (r) => r.flags.join("; ")],
  ["observations", (r) => (r.observations ?? []).map((o) => `${o.label}: ${o.value}`).join(" | ")],
  ["source_url", (r) => r.sourceUrl],
];

const cell = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const sourceUrls = (runs: Run[]) => [...new Set(runs.map((r) => r.sourceUrl))];

/** CSV with a leading `#` comment naming every PSI source. Empty cell = null. */
export function runsToCsv(runs: Run[]): string {
  const lines = [
    `# ${NOTE} Sources: ${sourceUrls(runs).join(", ")}`,
    COLUMNS.map(([name]) => name).join(","),
    ...runs.map((r) => COLUMNS.map(([, get]) => cell(get(r))).join(",")),
  ];
  return lines.join("\r\n") + "\r\n";
}

/** JSON keeps the Run[] shape from lib/schema.ts (flowDirection and observations included), wrapped with the source note. */
export function runsToJson(runs: Run[]): string {
  return JSON.stringify({ note: NOTE, sourceUrls: sourceUrls(runs), runs }, null, 2) + "\n";
}
