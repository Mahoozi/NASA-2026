// Person A — serialise the cleaned runs for download. Pure.
import type { Run } from "@/lib/schema";

const NOTE =
  "NASA PSI experiment tables, imported by Firebreak. One row per run. " +
  "Values are as recorded in the source; doubtful values are null and listed in flags, never corrected. " +
  "Observations are copied verbatim.";

export const CSV_FILENAME = "firebreak-psi-runs.csv";
export const JSON_FILENAME = "firebreak-psi-runs.json";

/** One CSV column: its header, unit (empty when none), meaning and getter. */
export type CsvColumn = {
  name: string;
  unit: string;
  description: string;
  get: (r: Run) => string | number | null | undefined;
};

/** The CSV columns, in order. The Lab's data dictionary renders this list. */
export const CSV_COLUMNS: CsvColumn[] = [
  { name: "id", unit: "", description: "Firebreak run id: investigation id and test id, e.g. PSI-25:B14.", get: (r) => r.id },
  { name: "investigation_id", unit: "", description: "NASA PSI investigation id, e.g. PSI-25.", get: (r) => r.investigationId },
  { name: "pi", unit: "", description: "Principal investigator as written in the table, or \"not stated in table\".", get: (r) => r.pi },
  { name: "test_id", unit: "", description: "Test or sample number as written in the table.", get: (r) => r.testId },
  { name: "date", unit: "YYYY-MM-DD", description: "Test date when the table gives a parseable one; otherwise the source text, flagged, or \"not stated in table\".", get: (r) => r.date },
  { name: "material_family", unit: "", description: "Firebreak material group used for matching (e.g. PMMA rod, SIBAL fabric, other).", get: (r) => r.material.family },
  { name: "material_raw", unit: "", description: "Material text copied verbatim from the table.", get: (r) => r.material.raw },
  { name: "thickness_mm", unit: "mm", description: "Sample thickness.", get: (r) => r.material.thicknessMm },
  { name: "width_cm", unit: "cm", description: "Sample width.", get: (r) => r.material.widthCm },
  { name: "diameter_in", unit: "in", description: "Rod diameter.", get: (r) => r.material.diameterIn },
  { name: "o2_initial_pct", unit: "% by volume", description: "Starting oxygen concentration.", get: (r) => r.o2InitialPct },
  { name: "o2_final_pct", unit: "% by volume", description: "Oxygen concentration at the end of the test.", get: (r) => r.o2FinalPct },
  { name: "flow_min_cm_s", unit: "cm/s", description: "Lowest airflow recorded during the test.", get: (r) => r.flowCmS.min },
  { name: "flow_max_cm_s", unit: "cm/s", description: "Highest airflow recorded during the test.", get: (r) => r.flowCmS.max },
  { name: "flow_raw", unit: "", description: "Airflow text copied verbatim from the table (BASS-II: fan and air display values).", get: (r) => r.flowCmS.raw },
  { name: "flow_direction", unit: "", description: "concurrent or opposed, when the table states it.", get: (r) => r.flowDirection },
  { name: "events", unit: "", description: "extinction, blowoff or no-ignition, from keywords in the table; empty means no keyword, outcome not recorded.", get: (r) => r.events.join("; ") },
  { name: "co2_initial_pct", unit: "% by volume", description: "Starting carbon dioxide concentration.", get: (r) => r.co2.initialPct },
  { name: "co2_final_pct", unit: "% by volume", description: "Carbon dioxide concentration at the end of the test.", get: (r) => r.co2.finalPct },
  { name: "co_initial_ppm", unit: "ppm", description: "Starting carbon monoxide reading.", get: (r) => r.co.initialPpm },
  { name: "co_final_ppm", unit: "ppm", description: "Carbon monoxide reading at the end of the test.", get: (r) => r.co.finalPpm },
  { name: "co_raw", unit: "", description: "Carbon monoxide text copied verbatim (initial → final).", get: (r) => r.co.raw },
  { name: "flags", unit: "", description: "Data-quality notes for the row, separated by \"; \". See flag types below.", get: (r) => r.flags.join("; ") },
  { name: "observations", unit: "", description: "Other result columns (e.g. Saffire burn time and burn lengths) as \"label: value\", separated by \" | \", copied verbatim.", get: (r) => (r.observations ?? []).map((o) => `${o.label}: ${o.value}`).join(" | ") },
  { name: "source_url", unit: "", description: "PSI page the table was downloaded from.", get: (r) => r.sourceUrl },
];

/** What an empty cell means in the CSV (null in the JSON). */
export const NULL_MEANING =
  "Not recorded, or flagged untrustworthy; the source value is never corrected.";

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
    CSV_COLUMNS.map((c) => c.name).join(","),
    ...runs.map((r) => CSV_COLUMNS.map((c) => cell(c.get(r))).join(",")),
  ];
  return lines.join("\r\n") + "\r\n";
}

/** JSON keeps the Run[] shape from lib/schema.ts (flowDirection and observations included), wrapped with the source note. */
export function runsToJson(runs: Run[]): string {
  return JSON.stringify({ note: NOTE, sourceUrls: sourceUrls(runs), runs }, null, 2) + "\n";
}
