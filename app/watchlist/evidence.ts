// Person A — flight evidence for a watchlist material, computed from data/runs.json.
// Never stored: the watchlist file holds the report's words, this holds what PSI tested.
import type { MaterialFamily, Run } from "../../lib/schema";
import { MATERIAL_FAMILIES } from "../lab/scenario";
import type { MaterialKey } from "./types";

/**
 * Matching rule. A run matches a materialKey when one of the key's words appears, as a
 * whole word and ignoring case, in the run's material text: its family followed by its
 * raw table text ("PMMA rod 1/4" clear rod", "Nomex Nomex III Natural"). Because the
 * family is part of that text, every PMMA family (film, slab, rod, sphere) counts for
 * "pmma".
 *
 * Two keys have no rule and are not matchable: "other" (the report names materials PSI
 * runs do not) and "fabric" (the report's Durette is a different fabric from the SIBAL
 * cotton-fiberglass fabric PSI burned, so the shared word "fabric" would mislead).
 * Their evidence is "not applicable", never a zero.
 */
export const MATERIAL_WORDS: Record<MaterialKey, string[]> = {
  pmma: ["PMMA", "acrylic"],
  silicone: ["silicone"],
  nomex: ["Nomex"],
  teflon: ["Teflon", "PTFE"],
  kapton: ["Kapton"],
  ultem: ["Ultem"],
  polycarbonate: ["polycarbonate"],
  foam: ["foam"],
  velcro: ["Velcro"],
  fabric: [],
  other: [],
};

export type MaterialEvidence = {
  /** False for "other" and "fabric": there is no rule to count runs by. */
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

/**
 * The Lab material family an "Open in the Lab" link should land on: the family with the most
 * matching runs THAT RECORD A STARTING OXYGEN (ties go to the family with more matching runs
 * overall, then to the Lab form's order). Only when no matching run records an oxygen does it
 * fall back to the family with the most matching runs overall. Null when no run matches.
 */
export function evidenceFamily(key: MaterialKey, runs: Run[]): MaterialFamily | null {
  const words = MATERIAL_WORDS[key];
  if (!words.length) return null;
  const re = patternFor(words);
  const counts = new Map<MaterialFamily, { all: number; withO2: number }>();
  for (const r of runs) {
    if (!re.test(materialText(r))) continue;
    const c = counts.get(r.material.family) ?? { all: 0, withO2: 0 };
    c.all += 1;
    if (r.o2InitialPct !== null) c.withO2 += 1;
    counts.set(r.material.family, c);
  }
  const anyO2 = [...counts.values()].some((c) => c.withO2 > 0);
  const best = [...counts].sort(
    (a, b) =>
      (anyO2 ? b[1].withO2 - a[1].withO2 : 0) ||
      b[1].all - a[1].all ||
      MATERIAL_FAMILIES.indexOf(a[0]) - MATERIAL_FAMILIES.indexOf(b[0]),
  )[0];
  return best ? best[0] : null;
}

/** The Lab families of the runs matching the key. */
export function evidenceFamilies(key: MaterialKey, runs: Run[]): Set<MaterialFamily> {
  const words = MATERIAL_WORDS[key];
  if (!words.length) return new Set();
  const re = patternFor(words);
  return new Set(runs.filter((r) => re.test(materialText(r))).map((r) => r.material.family));
}
