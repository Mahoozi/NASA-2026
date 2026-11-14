// Person A — server only (reads data/ at build/render time).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Investigation, Run } from "@/lib/schema";

export type InvestigationSource = "investigations.json" | "investigations.sample.json";

/**
 * Investigations to rank in the Lab.
 *
 * Reads Person B's data/investigations.json, falling back to the sample file
 * until it lands. TODO(B): drop the fallback once investigations.json exists.
 *
 * Any investigation id that has runs in data/runs.json but no entry in the
 * file gets a "details pending" entry built only from what the runs carry
 * (the id and the source URL). No metadata is invented; once B's file lists
 * the id, the pending entry disappears.
 */
export function loadInvestigations(runs: Run[]): {
  investigations: Investigation[];
  pendingIds: string[];
  source: InvestigationSource;
} {
  const dataDir = join(process.cwd(), "data");
  const source: InvestigationSource = existsSync(join(dataDir, "investigations.json"))
    ? "investigations.json"
    : "investigations.sample.json";
  const listed = JSON.parse(readFileSync(join(dataDir, source), "utf8")) as Investigation[];

  const known = new Set(listed.map((i) => i.id));
  const pending = new Map<string, string>();
  for (const r of runs)
    if (!known.has(r.investigationId) && !pending.has(r.investigationId))
      pending.set(r.investigationId, r.sourceUrl);

  const placeholders: Investigation[] = [...pending].map(([id, url]) => ({
    id,
    acronym: id,
    name: "Details pending in data/investigations.json",
    url,
    safetyArea: [],
    fuelPhase: [],
    facility: "",
    platform: "",
    objectives: "",
    approach: "",
    hasRunData: true,
  }));

  return { investigations: [...listed, ...placeholders], pendingIds: [...pending.keys()], source };
}
