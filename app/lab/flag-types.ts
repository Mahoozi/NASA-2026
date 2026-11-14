// Person A — groups the importers' flag texts by the field they are about. Pure.
import type { Run } from "@/lib/schema";

/** Field a flag is about, by keyword in the importer's flag text. First match wins. */
const FLAG_FIELDS: { field: string; columns: string; test: RegExp }[] = [
  { field: "Oxygen", columns: "o2_initial_pct, o2_final_pct", test: /oxygen|\bO2\b/i },
  { field: "Airflow", columns: "flow_min_cm_s, flow_max_cm_s, flow_direction", test: /airflow|\bfan\b|flow direction/i },
  { field: "Carbon monoxide", columns: "co_initial_ppm, co_final_ppm", test: /\bCO\b/ },
  { field: "Date", columns: "date", test: /\bdate\b/i },
  { field: "Material", columns: "material_family, thickness_mm", test: /material|PMMA|shape|spherical|thickness/i },
];
const OTHER = { field: "Other", columns: "" };

/** "oxygen approximate in source (raw: ~ 22.1)" → "oxygen approximate in source". */
export const flagType = (flag: string) => flag.replace(/\s*\(raw:.*\)\s*$/, "");

export function flagTypes(runs: Run[]) {
  const counts = new Map<string, number>();
  for (const r of runs)
    for (const f of new Set(r.flags.map(flagType))) counts.set(f, (counts.get(f) ?? 0) + 1);
  const groups = new Map<string, { columns: string; types: [string, number][] }>();
  for (const [type, n] of [...counts].sort((a, b) => b[1] - a[1])) {
    const { field, columns } = FLAG_FIELDS.find((g) => g.test.test(type)) ?? OTHER;
    const g = groups.get(field) ?? { columns, types: [] };
    g.types.push([type, n]);
    groups.set(field, g);
  }
  return [...groups].map(([field, g]) => ({ field, ...g }));
}
