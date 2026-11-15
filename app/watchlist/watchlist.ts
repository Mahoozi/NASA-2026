// Person A — what the /watchlist page shows, computed from data/hardware_watchlist.json
// (NASA's words) and data/runs.json (what PSI tested). Pure; no numbers are typed here.
import type { CorpusDoc, MaterialFamily, Run, Scenario } from "../../lib/schema";
import { presets, scenarioToQuery } from "../lab/scenario";
import { evidenceFamilies, evidenceFamily, materialEvidence, type MaterialEvidence } from "./evidence";
import type { ContextEntry, HardwareEntry, WatchlistEntry } from "./types";

export const WATCHLIST_TITLE = "ISS hardware NASA assessed for higher-oxygen cabins";

export const WATCHLIST_INTRO =
  "In 2026, NASA's Engineering and Safety Center assessed ISS life-support hardware for Exploration cabin atmospheres with lower pressure and more oxygen. For each item where the report names a material, Firebreak shows NASA's own sentence and what microgravity flight evidence PSI holds for that material.";

export const WATCHLIST_FOOTNOTE =
  "Material match is by name only: the form tested in PSI (sheet, rod, fabric) can differ from the hardware's form, such as honeycomb or foam. The report is an engineering assessment of hardware; PSI runs are flight tests of material samples. Firebreak lists both side by side and draws no conclusion about any item.";

export const NO_RUN_TEXT = "No PSI flight run with this material name";
export const NOT_MATCHED_TEXT = "Not matched: PSI run tables use different material names";

/** The context entries shown above the table, and the one the atmosphere numbers are read from. */
export const SHOWN_CONTEXT_IDS = ["context-33-subsystems", "context-limited-flammability-data"] as const;
export const ATMOSPHERES_CONTEXT_ID = "context-exploration-atmospheres";

const isHardware = (e: WatchlistEntry): e is HardwareEntry => e.kind === "hardware";
const isContext = (e: WatchlistEntry): e is ContextEntry => e.kind === "context";

/** The exact line for one row's PSI flight evidence. */
export function evidenceText(ev: MaterialEvidence): string {
  if (!ev.matchable) return NOT_MATCHED_TEXT;
  if (ev.runs === 0) return NO_RUN_TEXT;
  const o2 = ev.maxO2 === null ? "no starting O2 recorded" : `highest recorded starting O2: ${ev.maxO2}%`;
  return `${ev.runs} flight run${ev.runs === 1 ? "" : "s"} with this material name; ${o2}`;
}

export type WatchlistRow = {
  entry: HardwareEntry;
  evidence: MaterialEvidence;
  evidenceText: string;
  /** NTRS record for the report; "p. N" links here. */
  recordUrl: string;
  /** The Lab, set to the NASA Exploration Atmosphere preset plus the family holding the most matching runs. */
  labHref: string | null;
  labScenario: Scenario | null;
};

/** One row per hardware entry, in the report's page order. */
export function watchlistRows(entries: WatchlistEntry[], runs: Run[], corpus: CorpusDoc[]): WatchlistRow[] {
  const exploration = presets(runs).find((p) => p.id === "exploration")!.scenario;
  return entries
    .filter(isHardware)
    .sort((a, b) => a.page - b.page || a.id.localeCompare(b.id))
    .map((entry) => {
      const evidence = materialEvidence(entry.materialKey, runs);
      const family = evidence.runs > 0 ? evidenceFamily(entry.materialKey, runs) : null;
      const labScenario: Scenario | null = family ? { ...exploration, materialFamily: family } : null;
      return {
        entry,
        evidence,
        evidenceText: evidenceText(evidence),
        recordUrl: corpus.find((d) => d.id === entry.sourceDocId)!.url,
        labHref: labScenario ? `/lab?${scenarioToQuery(labScenario)}` : null,
        labScenario,
      };
    });
}

/** The context entries shown above the table, in the report's page order. */
export function shownContext(entries: WatchlistEntry[], corpus: CorpusDoc[]) {
  return entries
    .filter(isContext)
    .filter((c) => (SHOWN_CONTEXT_IDS as readonly string[]).includes(c.id))
    .sort((a, b) => a.page - b.page || a.id.localeCompare(b.id))
    .map((entry) => ({ entry, recordUrl: corpus.find((d) => d.id === entry.sourceDocId)!.url }));
}

export type Atmospheres = { o2a: string; psiA: string; o2b: string; psiB: string };

/**
 * The two Exploration atmospheres, read from the report's own sentence (a stored, quote-verified
 * context entry): "…10.2 pounds per square inch absolute (psia) with 26.5% O2, and 8.2 psia with 34% O2…".
 */
export function atmospheresFrom(entries: WatchlistEntry[]): Atmospheres {
  const quote = entries.find((e) => e.id === ATMOSPHERES_CONTEXT_ID)?.quote ?? "";
  const m = /(\d+(?:\.\d+)?) pounds per square inch absolute \(psia\) with (\d+(?:\.\d+)?)% O2, and (\d+(?:\.\d+)?) psia with (\d+(?:\.\d+)?)% O2/.exec(quote);
  if (!m) throw new Error("the atmospheres sentence is missing or has changed wording");
  return { psiA: m[1], o2a: m[2], psiB: m[3], o2b: m[4] };
}

/** The one computed sentence under the table. */
export function watchlistSentence(rows: WatchlistRow[], atm: Atmospheres): string {
  const withRuns = rows.filter((r) => r.evidence.runs > 0);
  const o2 = withRuns.flatMap((r) => (r.evidence.maxO2 === null ? [] : [r.evidence.maxO2]));
  const parts = [`${withRuns.length} of ${rows.length} assessed items name a material with at least one PSI flight run.`];
  if (o2.length) parts.push(`Among those runs, the highest recorded starting oxygen is ${Math.max(...o2)}%.`);
  parts.push(`The report assessed Exploration atmospheres of ${atm.o2a}% O2 at ${atm.psiA} psia and ${atm.o2b}% O2 at ${atm.psiB} psia.`);
  return parts.join(" ");
}

/**
 * For the Lab: how many watchlist items have flight evidence in a given Lab material family,
 * i.e. at least one run of that family matches the item's material name.
 */
export function familyWatchCounts(entries: WatchlistEntry[], runs: Run[]): Partial<Record<MaterialFamily, number>> {
  const counts: Partial<Record<MaterialFamily, number>> = {};
  for (const e of entries.filter(isHardware))
    for (const family of evidenceFamilies(e.materialKey, runs)) counts[family] = (counts[family] ?? 0) + 1;
  return counts;
}

export const watchlistLineText = (n: number) =>
  `NASA's NESC report assesses ${n} ISS hardware item${n === 1 ? "" : "s"} made of this material.`;
