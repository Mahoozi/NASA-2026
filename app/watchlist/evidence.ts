// Person A — flight evidence for a watchlist material, computed from data/runs.json.
// Never stored: the watchlist file holds the report's words, this holds what PSI tested.
import type { Run } from "../../lib/schema";
import type { MaterialKey } from "./types";

/**
 * Matching rule. A run matches a materialKey when one of the key's words appears, as a
 * whole word and ignoring case, in the run's material text: its family followed by its
 * raw table text ("PMMA rod 1/4" clear rod", "SIBAL fabric Cotton-Fiberglass (SIBAL)").
 * Because the family is part of that text, every PMMA family (film, slab, rod, sphere)
 * counts for "pmma", and the "SIBAL fabric" family counts for "fabric". "other" has no
 * rule: it stands for materials the report names that PSI runs do not, so no run can
 * match it and its evidence is not applicable.
 */
export const MATERIAL_WORDS: Record<MaterialKey, string[]> = {
  pmma: ["PMMA", "acrylic"],
  silicone: ["silicone"],
  nomex: ["Nomex"],
  teflon: ["Teflon", "PTFE"],
  kapton: ["Kapton"],
  polycarbonate: ["polycarbonate"],
  foam: ["foam"],
  velcro: ["Velcro"],
  fabric: ["fabric"],
  other: [],
};

export type MaterialEvidence = {
  /** False for "other": there is no rule to count runs by. */
  matchable: boolean;
  /** Runs whose material text matches the key. */
  runs: number;
  /** Of those, runs with a recorded starting oxygen. */
  withO2: number;
  /** Highest recorded starting oxygen among them, or null when none records one. */
  maxO2: number | null;
};

const patternFor = (words: string[]) =>
  new RegExp(`(?<![A-Za-z0-9])(?:${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![A-Za-z0-9])`, "i");

export const materialText = (r: Run) => `${r.material.family} ${r.material.raw}`;

export function materialEvidence(key: MaterialKey, runs: Run[]): MaterialEvidence {
  const words = MATERIAL_WORDS[key];
  if (!words.length) return { matchable: false, runs: 0, withO2: 0, maxO2: null };
  const re = patternFor(words);
  const matched = runs.filter((r) => re.test(materialText(r)));
  const o2 = matched.flatMap((r) => (r.o2InitialPct === null ? [] : [r.o2InitialPct]));
  return {
    matchable: true,
    runs: matched.length,
    withO2: o2.length,
    maxO2: o2.length ? Math.max(...o2) : null,
  };
}
